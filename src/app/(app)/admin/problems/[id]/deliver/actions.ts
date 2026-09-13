'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

export type TargetType = 'organization' | 'students' | 'all';
export type DeliveryMode = 'deadline' | 'no_deadline' | 'permanent';
export type GradingMode = 'manual' | 'auto_exact';

export interface AssignmentInput {
  templateId?: string; // 単一テンプレートを配信する場合(内部で1件だけのデッキに包む)
  deckId?: string; // デッキを配信する場合
  targetType: TargetType;
  targetStudentIds: string[];
  deliveryMode: DeliveryMode;
  dueAt: string | null;
  gradingMode: GradingMode;
}

export interface CreateAssignmentResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export async function createAssignment(input: AssignmentInput): Promise<CreateAssignmentResult> {
  try {
    const { supabase, userId, callerRole, callerOrgId } = await verifyAdminOrTeacher();

    let organizationId: string;
    let deckId: string;

    if (input.templateId) {
      const { data: template } = await supabase
        .from('problem_templates')
        .select('id, organization_id, title')
        .eq('id', input.templateId)
        .single();

      if (!template) return { ok: false, error: 'テンプレートが見つかりません' };
      if (callerRole === 'teacher' && (!callerOrgId || template.organization_id !== callerOrgId)) {
        return { ok: false, error: '自分の団体のテンプレートのみ配信できます' };
      }
      organizationId = template.organization_id;

      // このテンプレート1つだけを含む非表示のデッキを作成する(デッキ管理画面には出てこない)
      const { data: implicitDeck, error: deckError } = await supabase.from('problem_decks').insert({
        teacher_id: userId,
        organization_id: organizationId,
        title: template.title,
        is_implicit: true,
      }).select('id').single();
      if (deckError || !implicitDeck) return { ok: false, error: `内部デッキの作成に失敗しました: ${deckError?.message}` };

      const { error: itemError } = await supabase.from('deck_items').insert({
        parent_deck_id: implicitDeck.id,
        position: 0,
        child_kind: 'template',
        child_template_id: input.templateId,
        weight: 1,
      });
      if (itemError) return { ok: false, error: `内部デッキの構成に失敗しました: ${itemError.message}` };

      deckId = implicitDeck.id;
    } else if (input.deckId) {
      const { data: deck } = await supabase
        .from('problem_decks')
        .select('id, organization_id')
        .eq('id', input.deckId)
        .single();

      if (!deck) return { ok: false, error: 'デッキが見つかりません' };
      if (callerRole === 'teacher' && (!callerOrgId || deck.organization_id !== callerOrgId)) {
        return { ok: false, error: '自分の団体のデッキのみ配信できます' };
      }
      organizationId = deck.organization_id;
      deckId = input.deckId;
    } else {
      return { ok: false, error: '配信対象(テンプレートまたはデッキ)が指定されていません' };
    }

    if (input.targetType === 'students' && input.targetStudentIds.length === 0) {
      return { ok: false, error: '配信先の生徒を1人以上選択してください' };
    }
    if (input.targetType === 'all' && callerRole !== 'admin') {
      return { ok: false, error: '団体を問わず全員への配信は管理者のみ選択できます' };
    }
    if (input.deliveryMode === 'deadline' && !input.dueAt) {
      return { ok: false, error: '締切日時を入力してください' };
    }

    const { data, error } = await supabase.from('problem_assignments').insert({
      deck_id: deckId,
      teacher_id: userId,
      organization_id: organizationId,
      target_type: input.targetType,
      target_student_ids: input.targetType === 'students' ? input.targetStudentIds : [],
      delivery_mode: input.deliveryMode,
      due_at: input.deliveryMode === 'deadline' ? input.dueAt : null,
      grading_mode: input.gradingMode,
    }).select('id').single();

    if (error) {
      console.error('Failed to create assignment', error);
      return { ok: false, error: `配信の作成に失敗しました: ${error.message}` };
    }

    revalidatePath('/admin/assignments');
    return { ok: true, id: data.id };
  } catch (e) {
    console.error('Unexpected error in createAssignment', e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteAssignment(id: string) {
  const { supabase } = await verifyAdminOrTeacher();

  const { error } = await supabase.from('problem_assignments').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete assignment', error);
    throw new Error(`配信の削除に失敗しました: ${error.message}`);
  }

  revalidatePath('/admin/assignments');
  redirect('/admin/assignments');
}

export async function listOrganizationStudents(organizationId: string): Promise<{ id: string; name: string; student_id: string }[]> {
  const { supabase } = await verifyAdminOrTeacher();

  const { data } = await supabase
    .from('profiles')
    .select('id, name, student_id')
    .eq('organization_id', organizationId)
    .eq('role', 'student')
    .eq('status', 'active')
    .order('name');

  return data || [];
}
