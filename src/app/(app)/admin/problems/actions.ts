'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validateTemplate } from "@/lib/cbt/validate";
import { resolveTemplate } from "@/lib/cbt/resolve";
import { renderProblem } from "@/lib/cbt/render";
import { renderTypstToSvg } from "@/lib/typst";
import type { VariableDef, VarType, TemplateKind, SubQuestionDef, PairItem } from "@/lib/cbt/types";

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
  kind: TemplateKind;
  variables: VariableDef[];
  constraints: string[];
  problemTemplate: string;
  subQuestions: SubQuestionDef[]; // kind==='variable' で使用(1個なら単問、複数なら大問)
  pairs: PairItem[]; // kind==='pair_choice' で使用
}

const NAME_RE = /^[A-Za-z]+$/;
const VAR_TYPES: VarType[] = ['integer', 'real'];
const TEMPLATE_KINDS: TemplateKind[] = ['variable', 'pair_choice'];

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

function sanitizeSubQuestions(input: unknown): SubQuestionDef[] {
  if (!Array.isArray(input)) throw new Error('小問の形式が不正です');
  const list = input.map((raw, i) => {
    if (!raw || typeof raw !== 'object') throw new Error(`小問[${i}]の形式が不正です`);
    const sq = raw as Record<string, unknown>;
    const label = String(sq.label ?? '').trim();
    const points = Number(sq.points);
    const answerTemplates = Array.isArray(sq.answerTemplates)
      ? sq.answerTemplates.map(a => String(a ?? '').trim()).filter(a => a.length > 0)
      : [];

    if (!Number.isFinite(points) || points <= 0) throw new Error(`小問${label ? `「${label}」` : `[${i + 1}]`}の配点は正の数で指定してください`);
    if (answerTemplates.length === 0) throw new Error(`小問${label ? `「${label}」` : `[${i + 1}]`}の正答を1つ以上入力してください`);

    return { label, points, answerTemplates };
  });
  if (list.length === 0) throw new Error('小問を1つ以上登録してください');
  return list;
}

function sanitizePairs(input: unknown): PairItem[] {
  if (!Array.isArray(input)) throw new Error('組の形式が不正です');
  const list = input.map((raw, i) => {
    if (!raw || typeof raw !== 'object') throw new Error(`組[${i}]の形式が不正です`);
    const p = raw as Record<string, unknown>;
    const question = String(p.question ?? '').trim();
    const answer = String(p.answer ?? '').trim();
    return { question, answer };
  }).filter(p => p.question.length > 0 && p.answer.length > 0);
  if (list.length === 0) throw new Error('question/answerの組を1つ以上入力してください');
  return list;
}

export interface SaveTemplateResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export async function saveTemplate(input: TemplateInput): Promise<SaveTemplateResult> {
  try {
    const { supabase, userId, callerRole, callerOrgId } = await verifyAdminOrTeacher();

    const title = input.title.trim();
    if (!title) return { ok: false, error: 'タイトルを入力してください' };
    if (!TEMPLATE_KINDS.includes(input.kind)) return { ok: false, error: '出題種別が不正です' };

    let variables: VariableDef[] = [];
    let constraints: string[] = [];
    let subQuestions: SubQuestionDef[] = [];
    let pairs: PairItem[] = [];

    try {
      if (input.kind === 'variable') {
        if (!input.problemTemplate.trim()) return { ok: false, error: '問題文を入力してください' };
        variables = sanitizeVariables(input.variables);
        constraints = sanitizeConstraints(input.constraints);
        subQuestions = sanitizeSubQuestions(input.subQuestions);
        if (variables.length === 0) return { ok: false, error: '変数を1つ以上定義してください' };
      } else {
        pairs = sanitizePairs(input.pairs);
        subQuestions = [{ label: '', points: Number(input.subQuestions?.[0]?.points) || 1, answerTemplates: [] }];
      }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
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
    const validation = validateTemplate({ kind: input.kind, variables, constraints, pairs });
    if (!validation.ok) {
      return { ok: false, error: `保存前検証に失敗しました: ${validation.error}` };
    }

    // 問題文・正答テンプレートの {{式}} が壊れていないかも合わせて確認する
    const resolvedForCheck = resolveTemplate({ kind: input.kind, variables, constraints, pairs });
    if (resolvedForCheck.ok) {
      try {
        renderProblem({ kind: input.kind, problem_template: input.problemTemplate, subQuestions, pairs }, resolvedForCheck.values);
      } catch (e) {
        return { ok: false, error: `問題文/正答テンプレートの埋め込み評価に失敗しました: ${e instanceof Error ? e.message : String(e)}` };
      }
    }

    const row = {
      teacher_id: userId,
      organization_id: organizationId,
      title,
      kind: input.kind,
      variables,
      constraints,
      problem_template: input.problemTemplate,
      sub_questions: subQuestions,
      pairs,
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
  } catch (e) {
    console.error('Unexpected error in saveTemplate', e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
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
  kind: TemplateKind;
  variables: VariableDef[];
  constraints: string[];
  problemTemplate: string;
  subQuestions: SubQuestionDef[];
  pairs: PairItem[];
}

export type PreviewResult =
  | { ok: true; svg: string; values: Record<string, number> }
  | { ok: false; error: string };

function buildTypstSource(problemText: string, subAnswers: { label: string; points: number; answerTexts: string[] }[]): string {
  const answerLines = subAnswers.map(sa => {
    const prefix = sa.label ? `${sa.label} ` : '';
    const answerText = sa.answerTexts.length > 1 ? sa.answerTexts.join(' または ') : (sa.answerTexts[0] ?? '');
    return `正答: ${prefix}${answerText} (${sa.points}点)`;
  }).join('\n\n');
  return `#set page(width: auto, height: auto, margin: 0.6em)\n#set text(size: 16pt)\n\n${problemText}\n\n${answerLines}\n`;
}

export async function previewTemplate(input: PreviewInput): Promise<PreviewResult> {
  await verifyAdminOrTeacher();

  let variables: VariableDef[] = [];
  let constraints: string[] = [];
  let subQuestions: SubQuestionDef[] = [];
  let pairs: PairItem[] = [];

  try {
    if (input.kind === 'variable') {
      variables = sanitizeVariables(input.variables);
      constraints = sanitizeConstraints(input.constraints);
      subQuestions = sanitizeSubQuestions(input.subQuestions);
      if (variables.length === 0) return { ok: false, error: '変数を1つ以上定義してください' };
    } else {
      pairs = sanitizePairs(input.pairs);
      subQuestions = [{ label: '', points: Number(input.subQuestions?.[0]?.points) || 1, answerTemplates: [] }];
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  const resolved = resolveTemplate({ kind: input.kind, variables, constraints, pairs });
  if (!resolved.ok) {
    return { ok: false, error: resolved.error };
  }

  let problemText: string;
  let subAnswers: { label: string; points: number; answerTexts: string[] }[];
  try {
    ({ problemText, subAnswers } = renderProblem({ kind: input.kind, problem_template: input.problemTemplate, subQuestions, pairs }, resolved.values));
  } catch (e) {
    return { ok: false, error: `テンプレートの埋め込み評価に失敗しました: ${e instanceof Error ? e.message : String(e)}` };
  }

  const typstResult = renderTypstToSvg(buildTypstSource(problemText, subAnswers));
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
