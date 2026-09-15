'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { resolveTemplate } from "@/lib/cbt/resolve";
import { renderProblem, isAnswerCorrect } from "@/lib/cbt/render";
import { flattenDeck, totalDeckWeight, drawDeckTemplateIds, type DeckItemInput, type DeckChildKind } from "@/lib/cbt/deck";
import type { TemplateKind, SubQuestionDef, PairItem, VariableDef, ResolvedVariables } from "@/lib/cbt/types";

async function verifyStudent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('ログインしていません');
  return { supabase, userId: user.id };
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

interface AssignmentRow {
  id: string;
  deck_id: string;
  delivery_mode: 'deadline' | 'no_deadline' | 'permanent';
  due_at: string | null;
  grading_mode: 'manual' | 'auto_exact';
}

async function loadAssignment(supabase: SupabaseClient, assignmentId: string): Promise<AssignmentRow> {
  const { data, error } = await supabase
    .from('problem_assignments')
    .select('id, deck_id, delivery_mode, due_at, grading_mode')
    .eq('id', assignmentId)
    .single();
  if (error || !data) throw new Error('配信が見つかりません');
  return data as AssignmentRow;
}

// デッキのツリーを、配信対象のデッキを起点にBFSで必要な分だけ読み込む
// (組織全体を読み込まず、参照されているデッキだけを辿る)。
async function loadDeckItemsRecursively(supabase: SupabaseClient, rootDeckId: string): Promise<Map<string, DeckItemInput[]>> {
  const itemsByDeck = new Map<string, DeckItemInput[]>();
  const visited = new Set<string>();
  let frontier = [rootDeckId];

  while (frontier.length > 0) {
    const toFetch = frontier.filter(id => !visited.has(id));
    toFetch.forEach(id => visited.add(id));
    if (toFetch.length === 0) break;

    const { data: rows } = await supabase
      .from('deck_items')
      .select('parent_deck_id, child_kind, child_deck_id, child_template_id, weight')
      .in('parent_deck_id', toFetch);

    const nextFrontier: string[] = [];
    for (const row of rows ?? []) {
      const list = itemsByDeck.get(row.parent_deck_id) ?? [];
      const childKind = row.child_kind as DeckChildKind;
      const childId = childKind === 'deck' ? row.child_deck_id : row.child_template_id;
      list.push({ childKind, childId, weight: row.weight });
      itemsByDeck.set(row.parent_deck_id, list);
      if (childKind === 'deck' && row.child_deck_id) nextFrontier.push(row.child_deck_id);
    }
    frontier = nextFrontier;
  }

  return itemsByDeck;
}

interface TemplateRow {
  id: string;
  kind: TemplateKind;
  variables: VariableDef[];
  constraints: string[];
  problem_template: string;
  sub_questions: SubQuestionDef[];
  pairs: PairItem[];
}

async function loadTemplatesByIds(supabase: SupabaseClient, ids: string[]): Promise<Map<string, TemplateRow>> {
  const uniqueIds = [...new Set(ids)];
  const { data } = await supabase
    .from('problem_templates')
    .select('id, kind, variables, constraints, problem_template, sub_questions, pairs')
    .in('id', uniqueIds);
  return new Map((data ?? []).map(t => [t.id, t as TemplateRow]));
}

export interface QuestionInstance {
  templateId: string;
  resolvedVariables: ResolvedVariables;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  attemptId?: string;
}

export async function startAttempt(assignmentId: string): Promise<ActionResult> {
  try {
    const { supabase, userId } = await verifyStudent();
    const assignment = await loadAssignment(supabase, assignmentId);

    // 締切後でも開始・解き直しは常に許可する(締切超過ペナルティは
    // 提出タイミングに応じてスコアに反映される。開始自体をブロックしない)。

    const itemsByDeck = await loadDeckItemsRecursively(supabase, assignment.deck_id);
    let leaves;
    try {
      leaves = flattenDeck(assignment.deck_id, itemsByDeck);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
    if (leaves.length === 0) {
      return { ok: false, error: 'このデッキには問題が登録されていません' };
    }

    const count = Math.max(1, Math.round(totalDeckWeight(leaves)));
    const drawnTemplateIds = drawDeckTemplateIds(leaves, count);
    const templateById = await loadTemplatesByIds(supabase, drawnTemplateIds);

    const questions: QuestionInstance[] = [];
    for (const templateId of drawnTemplateIds) {
      const template = templateById.get(templateId);
      if (!template) return { ok: false, error: `テンプレート(id=${templateId})が見つかりません` };

      const resolved = resolveTemplate({
        kind: template.kind,
        variables: template.variables,
        constraints: template.constraints,
        pairs: template.pairs,
      });
      if (!resolved.ok) {
        return { ok: false, error: `問題の生成に失敗しました: ${resolved.error}` };
      }
      questions.push({ templateId, resolvedVariables: resolved.values });
    }

    const { count: attemptCount } = await supabase
      .from('problem_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('assignment_id', assignmentId)
      .eq('student_id', userId);

    const { data, error } = await supabase.from('problem_attempts').insert({
      assignment_id: assignmentId,
      student_id: userId,
      attempt_number: (attemptCount ?? 0) + 1,
      questions,
    }).select('id').single();

    if (error) {
      console.error('Failed to create attempt', error);
      return { ok: false, error: `問題の生成に失敗しました: ${error.message}` };
    }

    revalidatePath(`/assignments/${assignmentId}`);
    revalidatePath('/assignments');
    return { ok: true, attemptId: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function retryAttempt(assignmentId: string): Promise<ActionResult> {
  return startAttempt(assignmentId);
}

export interface SubResultRow {
  label: string;
  points: number;
  earnedPoints: number;
  submittedAnswer: string;
  correct: boolean;
}

export interface SubmitAttemptInput {
  attemptId: string;
  assignmentId: string;
  work: string;
  answers: string[][]; // answers[問題index][小問index]
}

export async function submitAttempt(input: SubmitAttemptInput): Promise<ActionResult> {
  try {
    const { supabase, userId } = await verifyStudent();

    const { data: attempt, error: attemptError } = await supabase
      .from('problem_attempts')
      .select('id, student_id, questions, status')
      .eq('id', input.attemptId)
      .single();

    if (attemptError || !attempt) return { ok: false, error: '挑戦が見つかりません' };
    if (attempt.student_id !== userId) return { ok: false, error: '権限がありません' };
    if (attempt.status !== 'in_progress') return { ok: false, error: 'この挑戦はすでに提出済みです' };

    const questions = attempt.questions as QuestionInstance[];
    if (input.answers.length !== questions.length) {
      return { ok: false, error: '解答の数が問題数と一致しません' };
    }
    if (input.answers.some(qa => qa.some(a => !a.trim()))) {
      return { ok: false, error: 'すべての解答欄を入力してください' };
    }

    const assignment = await loadAssignment(supabase, input.assignmentId);
    const templateById = await loadTemplatesByIds(supabase, questions.map(q => q.templateId));

    let score: number | null = null;
    let subResults: SubResultRow[][] | null = null;

    if (assignment.grading_mode === 'auto_exact') {
      let totalPoints = 0;
      let earnedTotal = 0;
      subResults = questions.map((q, qi) => {
        const template = templateById.get(q.templateId);
        if (!template) throw new Error(`テンプレート(id=${q.templateId})が見つかりません`);

        const { subAnswers } = renderProblem(
          { kind: template.kind, problem_template: template.problem_template, subQuestions: template.sub_questions, pairs: template.pairs },
          q.resolvedVariables,
        );
        const qAnswers = input.answers[qi] ?? [];

        return subAnswers.map((sa, si) => {
          const submittedAnswer = qAnswers[si] ?? '';
          const correct = isAnswerCorrect(submittedAnswer, sa.answerTexts);
          totalPoints += sa.points;
          const earnedPoints = correct ? sa.points : 0;
          earnedTotal += earnedPoints;
          return { label: sa.label, points: sa.points, earnedPoints, submittedAnswer, correct };
        });
      });
      score = totalPoints > 0 ? (earnedTotal / totalPoints) * 100 : 0;
    }

    const now = new Date().toISOString();
    const { error } = await supabase.from('problem_attempts').update({
      submitted_work: input.work,
      submitted_answers: input.answers,
      status: assignment.grading_mode === 'auto_exact' ? 'graded' : 'submitted',
      sub_results: subResults,
      score,
      submitted_at: now,
      graded_at: assignment.grading_mode === 'auto_exact' ? now : null,
    }).eq('id', input.attemptId);

    if (error) {
      console.error('Failed to submit attempt', error);
      return { ok: false, error: `提出に失敗しました: ${error.message}` };
    }

    revalidatePath(`/assignments/${input.assignmentId}`);
    revalidatePath('/assignments');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
