'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { resolveTemplate } from "@/lib/cbt/resolve";
import { renderProblem, isAnswerCorrect } from "@/lib/cbt/render";
import type { VariableDef, TemplateKind, SubQuestionDef, PairItem } from "@/lib/cbt/types";

async function verifyStudent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('ログインしていません');
  return { supabase, userId: user.id };
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

interface AssignmentWithTemplate {
  id: string;
  delivery_mode: 'deadline' | 'no_deadline' | 'permanent';
  due_at: string | null;
  grading_mode: 'manual' | 'auto_exact';
  problem_templates: {
    kind: TemplateKind;
    variables: VariableDef[];
    constraints: string[];
    problem_template: string;
    sub_questions: SubQuestionDef[];
    pairs: PairItem[];
  };
}

async function loadAssignment(supabase: SupabaseClient, assignmentId: string): Promise<AssignmentWithTemplate> {
  const { data, error } = await supabase
    .from('problem_assignments')
    .select('id, delivery_mode, due_at, grading_mode, problem_templates:template_id (kind, variables, constraints, problem_template, sub_questions, pairs)')
    .eq('id', assignmentId)
    .single();
  if (error || !data) throw new Error('配信が見つかりません');
  return data as unknown as AssignmentWithTemplate;
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

    if (assignment.delivery_mode === 'deadline' && assignment.due_at && new Date(assignment.due_at) < new Date()) {
      return { ok: false, error: '締切を過ぎているため開始できません' };
    }

    const { count } = await supabase
      .from('problem_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('assignment_id', assignmentId)
      .eq('student_id', userId);

    const resolved = resolveTemplate({
      kind: assignment.problem_templates.kind,
      variables: assignment.problem_templates.variables,
      constraints: assignment.problem_templates.constraints,
      pairs: assignment.problem_templates.pairs,
    });
    if (!resolved.ok) {
      return { ok: false, error: `問題の生成に失敗しました: ${resolved.error}` };
    }

    const { data, error } = await supabase.from('problem_attempts').insert({
      assignment_id: assignmentId,
      student_id: userId,
      attempt_number: (count ?? 0) + 1,
      resolved_variables: resolved.values,
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

export interface SubmitAttemptInput {
  attemptId: string;
  assignmentId: string;
  work: string;
  answers: string[]; // 小問ごとの最終解答(subQuestionsと同じ順序)
}

export async function submitAttempt(input: SubmitAttemptInput): Promise<ActionResult> {
  try {
    const { supabase, userId } = await verifyStudent();

    const { data: attempt, error: attemptError } = await supabase
      .from('problem_attempts')
      .select('id, student_id, resolved_variables, status')
      .eq('id', input.attemptId)
      .single();

    if (attemptError || !attempt) return { ok: false, error: '挑戦が見つかりません' };
    if (attempt.student_id !== userId) return { ok: false, error: '権限がありません' };
    if (attempt.status !== 'in_progress') return { ok: false, error: 'この挑戦はすでに提出済みです' };

    const assignment = await loadAssignment(supabase, input.assignmentId);

    const { subAnswers } = renderProblem(
      {
        kind: assignment.problem_templates.kind,
        problem_template: assignment.problem_templates.problem_template,
        subQuestions: assignment.problem_templates.sub_questions,
        pairs: assignment.problem_templates.pairs,
      },
      attempt.resolved_variables as Record<string, number>,
    );

    if (input.answers.some(a => !a.trim())) {
      return { ok: false, error: 'すべての解答欄を入力してください' };
    }

    let score: number | null = null;
    let subResults: { label: string; points: number; earnedPoints: number; submittedAnswer: string; correct: boolean }[] | null = null;

    if (assignment.grading_mode === 'auto_exact') {
      let totalPoints = 0;
      let earnedTotal = 0;
      subResults = subAnswers.map((sa, i) => {
        const submittedAnswer = input.answers[i] ?? '';
        const correct = isAnswerCorrect(submittedAnswer, sa.answerTexts);
        totalPoints += sa.points;
        const earnedPoints = correct ? sa.points : 0;
        earnedTotal += earnedPoints;
        return { label: sa.label, points: sa.points, earnedPoints, submittedAnswer, correct };
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
