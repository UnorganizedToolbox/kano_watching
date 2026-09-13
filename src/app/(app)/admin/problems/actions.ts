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
  answerTemplates: string[]; // 表記違いの別解等を複数登録できる
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

function sanitizeAnswerTemplates(input: unknown): string[] {
  if (!Array.isArray(input)) throw new Error('正答の形式が不正です');
  const list = input.map(a => String(a ?? '').trim()).filter(a => a.length > 0);
  if (list.length === 0) throw new Error('正答を1つ以上入力してください');
  return list;
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

  let variables: VariableDef[];
  let constraints: string[];
  let answerTemplates: string[];
  try {
    variables = sanitizeVariables(input.variables);
    constraints = sanitizeConstraints(input.constraints);
    answerTemplates = sanitizeAnswerTemplates(input.answerTemplates);
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
  const validation = validateTemplate({ variables, constraints });
  if (!validation.ok) {
    return { ok: false, error: `保存前検証に失敗しました: ${validation.error}` };
  }

  // 問題文・正答テンプレートの {{式}} が壊れていないかも合わせて確認する
  const resolvedForCheck = resolveVariables({ variables, constraints });
  if (resolvedForCheck.ok) {
    try {
      renderProblem(input.problemTemplate, answerTemplates, resolvedForCheck.values);
    } catch (e) {
      return { ok: false, error: `問題文/正答テンプレートの埋め込み評価に失敗しました: ${e instanceof Error ? e.message : String(e)}` };
    }
  }

  const row = {
    teacher_id: userId,
    organization_id: organizationId,
    title,
    variables,
    constraints,
    problem_template: input.problemTemplate,
    answer_templates: answerTemplates,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await supabase.from('problem_templates').update(row).eq('id', input.id);
    if (error) {
      console.error('Failed to update problem template', error);
      return { ok: false, error: `テンプレートの更新に失敗しました: ${error.message}` };
    }
    revalidatePath('/admin/problems');
    revalidatePath(`/admin/problems/${input.id}/edit`);
    return { ok: true, id: input.id };
  }

  const { data, error } = await supabase.from('problem_templates').insert(row).select('id').single();
  if (error) {
    console.error('Failed to create problem template', error);
    return { ok: false, error: `テンプレートの作成に失敗しました: ${error.message}` };
  }

  revalidatePath('/admin/problems');
  return { ok: true, id: data.id };
}

export async function deleteTemplate(id: string) {
  const { supabase } = await verifyAdminOrTeacher();

  const { error } = await supabase.from('problem_templates').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete problem template', error);
    throw new Error(`テンプレートの削除に失敗しました: ${error.message}`);
  }

  revalidatePath('/admin/problems');
  redirect('/admin/problems');
}

export interface PreviewInput {
  variables: VariableDef[];
  constraints: string[];
  problemTemplate: string;
  answerTemplates: string[];
}

export type PreviewResult =
  | { ok: true; svg: string; values: Record<string, number> }
  | { ok: false; error: string };

function buildTypstSource(problemText: string, answerTexts: string[]): string {
  const answerLine = answerTexts.length > 1
    ? `正答: ${answerTexts.join(' または ')}`
    : `正答: ${answerTexts[0] ?? ''}`;
  return `#set page(width: auto, height: auto, margin: 0.6em)\n#set text(size: 16pt)\n\n${problemText}\n\n${answerLine}\n`;
}

export async function previewTemplate(input: PreviewInput): Promise<PreviewResult> {
  await verifyAdminOrTeacher();

  let variables: VariableDef[];
  let constraints: string[];
  let answerTemplates: string[];
  try {
    variables = sanitizeVariables(input.variables);
    constraints = sanitizeConstraints(input.constraints);
    answerTemplates = sanitizeAnswerTemplates(input.answerTemplates);
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
  let answerTexts: string[];
  try {
    ({ problemText, answerTexts } = renderProblem(input.problemTemplate, answerTemplates, resolved.values));
  } catch (e) {
    return { ok: false, error: `テンプレートの埋め込み評価に失敗しました: ${e instanceof Error ? e.message : String(e)}` };
  }

  const typstResult = renderTypstToSvg(buildTypstSource(problemText, answerTexts));
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
