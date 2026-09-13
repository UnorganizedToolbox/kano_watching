'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { flattenDeck, totalDeckWeight, DECK_MAX_QUESTIONS, type DeckItemInput, type DeckChildKind } from "@/lib/cbt/deck";

async function verifyAdminOrTeacher() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('ログインしていません');

  const { data: profile } = await supabase.from('profiles').select('role, organization_id').eq('id', user.id).single();
  if (profile?.role !== 'admin' && profile?.role !== 'teacher') throw new Error('権限がありません');

  return {
    supabase,
    userId: user.id,
    callerRole: profile.role as 'admin' | 'teacher',
    callerOrgId: profile.organization_id as string | null,
  };
}

export interface DeckItemForm {
  childKind: DeckChildKind;
  childId: string;
  weight: number;
}

export interface DeckInput {
  id?: string;
  organizationId?: string; // 管理者が明示指定する場合のみ
  title: string;
  items: DeckItemForm[];
}

export interface SaveDeckResult {
  ok: boolean;
  error?: string;
  id?: string;
}

function sanitizeItems(input: unknown): DeckItemForm[] {
  if (!Array.isArray(input)) throw new Error('デッキの子要素の形式が不正です');
  const list = input.map((raw, i) => {
    if (!raw || typeof raw !== 'object') throw new Error(`子要素[${i}]の形式が不正です`);
    const item = raw as Record<string, unknown>;
    const childKind = item.childKind as DeckChildKind;
    const childId = String(item.childId ?? '').trim();
    const weight = Number(item.weight);
    if (childKind !== 'deck' && childKind !== 'template') throw new Error(`子要素[${i}]の種別が不正です`);
    if (!childId) throw new Error(`子要素[${i}]の参照先が選択されていません`);
    if (!Number.isFinite(weight) || weight <= 0) throw new Error(`子要素[${i}]の重みは正の数で指定してください`);
    return { childKind, childId, weight };
  });
  if (list.length === 0) throw new Error('子要素(サブデッキまたは問題)を1つ以上追加してください');
  return list;
}

// 組織内の全デッキ構成をitemsByDeck形式で読み込む(循環参照・重み検証用)
async function loadOrgDeckItemsMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
): Promise<Map<string, DeckItemInput[]>> {
  const { data: decks } = await supabase.from('problem_decks').select('id').eq('organization_id', organizationId);
  const deckIds = (decks ?? []).map(d => d.id);
  if (deckIds.length === 0) return new Map();

  const { data: items } = await supabase
    .from('deck_items')
    .select('parent_deck_id, child_kind, child_deck_id, child_template_id, weight')
    .in('parent_deck_id', deckIds);

  const map = new Map<string, DeckItemInput[]>();
  for (const row of items ?? []) {
    const list = map.get(row.parent_deck_id) ?? [];
    list.push({
      childKind: row.child_kind as DeckChildKind,
      childId: row.child_kind === 'deck' ? row.child_deck_id : row.child_template_id,
      weight: row.weight,
    });
    map.set(row.parent_deck_id, list);
  }
  return map;
}

export async function saveDeck(input: DeckInput): Promise<SaveDeckResult> {
  try {
    const { supabase, userId, callerRole, callerOrgId } = await verifyAdminOrTeacher();

    const title = input.title.trim();
    if (!title) return { ok: false, error: 'タイトルを入力してください' };

    let items: DeckItemForm[];
    try {
      items = sanitizeItems(input.items);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }

    const weightSum = items.reduce((s, i) => s + i.weight, 0);
    if (weightSum > DECK_MAX_QUESTIONS) {
      return { ok: false, error: `このデッキの重み合計(${weightSum})が上限(${DECK_MAX_QUESTIONS}問)を超えています` };
    }

    let organizationId: string;
    if (callerRole === 'teacher') {
      if (!callerOrgId) return { ok: false, error: 'あなたは団体に所属していません' };
      organizationId = callerOrgId;
    } else {
      if (!input.organizationId) return { ok: false, error: '団体を指定してください' };
      organizationId = input.organizationId;
    }

    // 循環参照チェック: 組織内の既存デッキ構成に、このデッキの新しい構成を重ねてflattenしてみる
    const deckKey = input.id ?? '__new__';
    const itemsByDeck = await loadOrgDeckItemsMap(supabase, organizationId);
    itemsByDeck.set(deckKey, items.map(i => ({ childKind: i.childKind, childId: i.childId, weight: i.weight })));
    try {
      const leaves = flattenDeck(deckKey, itemsByDeck);
      if (leaves.length === 0) {
        return { ok: false, error: 'デッキの中に問題テンプレートが1つも含まれていません(空のサブデッキだけでは保存できません)' };
      }
      if (totalDeckWeight(leaves) <= 0) {
        return { ok: false, error: 'デッキの重み合計が0以下です' };
      }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }

    const deckRow = {
      teacher_id: userId,
      organization_id: organizationId,
      title,
      updated_at: new Date().toISOString(),
    };

    let deckId = input.id;
    if (deckId) {
      const { error } = await supabase.from('problem_decks').update(deckRow).eq('id', deckId);
      if (error) return { ok: false, error: `デッキの更新に失敗しました: ${error.message}` };
    } else {
      const { data, error } = await supabase.from('problem_decks').insert(deckRow).select('id').single();
      if (error) return { ok: false, error: `デッキの作成に失敗しました: ${error.message}` };
      deckId = data.id;
    }

    // 子要素は毎回まるごと入れ替える(削除して作り直す)
    const { error: deleteError } = await supabase.from('deck_items').delete().eq('parent_deck_id', deckId);
    if (deleteError) return { ok: false, error: `デッキ構成の更新に失敗しました: ${deleteError.message}` };

    const { error: insertError } = await supabase.from('deck_items').insert(
      items.map((item, idx) => ({
        parent_deck_id: deckId,
        position: idx,
        child_kind: item.childKind,
        child_deck_id: item.childKind === 'deck' ? item.childId : null,
        child_template_id: item.childKind === 'template' ? item.childId : null,
        weight: item.weight,
      })),
    );
    if (insertError) return { ok: false, error: `デッキ構成の保存に失敗しました: ${insertError.message}` };

    revalidatePath('/admin/decks');
    if (input.id) revalidatePath(`/admin/decks/${input.id}/edit`);
    return { ok: true, id: deckId };
  } catch (e) {
    console.error('Unexpected error in saveDeck', e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteDeck(id: string) {
  const { supabase } = await verifyAdminOrTeacher();

  const { data: referencingItems } = await supabase
    .from('deck_items')
    .select('parent_deck_id, problem_decks:parent_deck_id (title)')
    .eq('child_deck_id', id);

  if (referencingItems && referencingItems.length > 0) {
    const titles = referencingItems.map(r => (r.problem_decks as unknown as { title: string } | null)?.title || '?').join('、');
    throw new Error(`他のデッキ(${titles})から参照されているため削除できません。先にそちらの構成から外してください。`);
  }

  const { error } = await supabase.from('problem_decks').delete().eq('id', id);
  if (error) throw new Error(`デッキの削除に失敗しました: ${error.message}`);

  revalidatePath('/admin/decks');
  redirect('/admin/decks');
}

export async function listTemplatesForPicker(organizationId: string): Promise<{ id: string; title: string }[]> {
  const { supabase } = await verifyAdminOrTeacher();
  const { data } = await supabase.from('problem_templates').select('id, title').eq('organization_id', organizationId).order('title');
  return data || [];
}

export async function listDecksForPicker(organizationId: string, excludeDeckId?: string): Promise<{ id: string; title: string }[]> {
  const { supabase } = await verifyAdminOrTeacher();
  let query = supabase.from('problem_decks').select('id, title').eq('organization_id', organizationId).order('title');
  if (excludeDeckId) query = query.neq('id', excludeDeckId);
  const { data } = await query;
  return data || [];
}

export async function listOrganizationsForAdmin(): Promise<{ id: string; name: string }[]> {
  const { supabase, callerRole } = await verifyAdminOrTeacher();
  if (callerRole !== 'admin') return [];
  const { data } = await supabase.from('organizations').select('id, name').order('name');
  return data || [];
}
