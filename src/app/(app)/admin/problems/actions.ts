'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validateTemplate } from "@/lib/cbt/validate";
import { resolveVariables } from "@/lib/cbt/resolve";
import { renderProblem } from "@/lib/cbt/render";
import { renderTypstToSvg } from "@/lib/typst";
import type { VariableDef, VarType } from "@/lib/cbt/types";

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

export interface TemplateInput {
  id?: string;
  organizationId?: string; // 管理者が明示指定する場合のみ
  title: string;
  variables: VariableDef[];
  constraints: string[];
  problemTemplate: string;
  answerTemplate: string;
}

const NAME_RE = /^[A-Za-z]+$/;
const VAR_TYPES: VarType[] = ['integer', 'real'];

function sanitizeVariables(input: unknown): VariableDef[] {
  if (!Array.isArray(input)) throw new Error('変数の形式が不正です');
  const seen = new Set<string>();
  return input.map((raw, i) => {
    if (!raw || typeof raw !== 'object') throw new Error(`変数[${i}]の形式が不正です`);
    const v = raw as Record<string, unknown>;
    const name = String(v.name ?? '').trim();
    const type = v.type as VarType;
    const min = String(v.min ?? '').trim();
    const max = String(v.max ?? '').trim();

    if (!NAME_RE.test(name)) throw new Error(`変数名 "${name || '(空)'}" は英字のみで指定してください`);
    if (seen.has(name)) throw new Error(`変数名 "${name}" が重複しています`);
    seen.add(name);
    if (!VAR_TYPES.includes(type)) throw new Error(`変数 "${name}" の型が不正です`);
    if (!min || !max) throw new Error(`変数 "${name}" の最小値・最大値を入力してください`);

    return { name, type, min, max };
  });
}

function sanitizeConstraints(input: unknown): string[] {
  if (!Array.isArray(input)) throw new Error('制約の形式が不正です');
  return input.map(c => String(c ?? '').trim()).filter(c => c.length > 0);
}

export interface SaveTemplateResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export async function saveTemplate(input: TemplateInput): Promise<SaveTemplateResult> {
  const { supabase, userId, callerRole, callerOrgId } = await verifyAdminOrTeacher();

  const title = input.title.trim();
  if (!title) return { ok: false, error: 'タイトルを入力してください' };
  if (!input.problemTemplate.trim()) return { ok: false, error: '問題文を入力してください' };
  if (!input.answerTemplate.trim()) return { ok: false, error: '正答テンプレートを入力してください' };

  let variables: VariableDef[];
  let constraints: string[];
  try {
    variables = sanitizeVariables(input.variables);
    constraints = sanitizeConstraints(input.constraints);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  if (variables.length === 0) {
    return { ok: false, error: '変数を1つ以上定義してください' };
  }

  let organizationId: string | null;
  if (callerRole === 'teacher') {
    if (!callerOrgId) return { ok: false, error: 'あなたは団体に所属していません' };
    organizationId = callerOrgId;
  } else {
    if (!input.organizationId) return { ok: false, error: '団体を指定してください' };
    organizationId = input.organizationId;
  }

  // 保存前検証: 実際に生成可能かどうかを確認する
  const validation = validateTemplate({ variables, constraints }, 100);
  if (!validation.ok) {
    return { ok: false, error: `保存前検証に失敗しました: ${validation.error}` };
  }

  const row = {
    teacher_id: userId,
    organization_id: organizationId,
    title,
    variables,
    constraints,
    problem_template: input.problemTemplate,
    answer_template: input.answerTemplate,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await supabase.from('problem_templates').update(row).eq('id', input.id);
    if (error) {
      console.error('Failed to update problem template', error);
      return { ok: false, error: 'テンプレートの更新に失敗しました' };
    }
    revalidatePath('/admin/problems');
    revalidatePath(`/admin/problems/${input.id}/edit`);
    return { ok: true, id: input.id };
  }

  const { data, error } = await supabase.from('problem_templates').insert(row).select('id').single();
  if (error) {
    console.error('Failed to create problem template', error);
    return { ok: false, error: 'テンプレートの作成に失敗しました' };
  }

  revalidatePath('/admin/problems');
  return { ok: true, id: data.id };
}

export async function deleteTemplate(id: string) {
  const { supabase } = await verifyAdminOrTeacher();

  const { error } = await supabase.from('problem_templates').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete problem template', error);
    throw new Error('テンプレートの削除に失敗しました');
  }

  revalidatePath('/admin/problems');
  redirect('/admin/problems');
}

export interface PreviewInput {
  variables: VariableDef[];
  constraints: string[];
  problemTemplate: string;
  answerTemplate: string;
}

export type PreviewResult =
  | { ok: true; svg: string; values: Record<string, number> }
  | { ok: false; error: string };

function buildTypstSource(problemText: string, answerText: string): string {
  return `#set page(width: auto, height: auto, margin: 0.6em)\n#set text(size: 16pt)\n\n${problemText}\n\n正答: ${answerText}\n`;
}

export async function previewTemplate(input: PreviewInput): Promise<PreviewResult> {
  await verifyAdminOrTeacher();

  let variables: VariableDef[];
  let constraints: string[];
  try {
    variables = sanitizeVariables(input.variables);
    constraints = sanitizeConstraints(input.constraints);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  if (variables.length === 0) {
    return { ok: false, error: '変数を1つ以上定義してください' };
  }

  const resolved = resolveVariables({ variables, constraints });
  if (!resolved.ok) {
    return { ok: false, error: resolved.error };
  }

  let problemText: string;
  let answerText: string;
  try {
    ({ problemText, answerText } = renderProblem(input.problemTemplate, input.answerTemplate, resolved.values));
  } catch (e) {
    return { ok: false, error: `テンプレートの埋め込み評価に失敗しました: ${e instanceof Error ? e.message : String(e)}` };
  }

  const typstResult = renderTypstToSvg(buildTypstSource(problemText, answerText));
  if (!typstResult.ok) {
    return { ok: false, error: `Typstレンダリングに失敗しました: ${typstResult.error}` };
  }

  return { ok: true, svg: typstResult.svg, values: resolved.values };
}

export async function listOrganizationsForAdmin(): Promise<{ id: string; name: string }[]> {
  const { supabase, callerRole } = await verifyAdminOrTeacher();
  if (callerRole !== 'admin') return [];

  const { data } = await supabase.from('organizations').select('id, name').order('name');
  return data || [];
}
