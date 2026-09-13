'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { resolveVariables } from "@/lib/cbt/resolve";
import { renderProblem, isAnswerCorrect } from "@/lib/cbt/render";
import type { VariableDef } from "@/lib/cbt/types";

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
    variables: VariableDef[];
    constraints: string[];
    problem_template: string;
    answer_templates: string[];
  };
}

async function loadAssignment(supabase: SupabaseClient, assignmentId: string): Promise<AssignmentWithTemplate> {
  const { data, error } = await supabase
    .from('problem_assignments')
    .select('id, delivery_mode, due_at, grading_mode, problem_templates:template_id (variables, constraints, problem_template, answer_templates)')
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

    const resolved = resolveVariables({
      variables: assignment.problem_templates.variables,
      constraints: assignment.problem_templates.constraints,
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
  finalAnswer: string;
}

export async function submitAttempt(input: SubmitAttemptInput): Promise<ActionResult> {
  try {
    const { supabase, userId } = await verifyStudent();

    const finalAnswer = input.finalAnswer.trim();
    if (!finalAnswer) return { ok: false, error: '最終解答を入力してください' };

    const { data: attempt, error: attemptError } = await supabase
      .from('problem_attempts')
      .select('id, student_id, resolved_variables, status')
      .eq('id', input.attemptId)
      .single();

    if (attemptError || !attempt) return { ok: false, error: '挑戦が見つかりません' };
    if (attempt.student_id !== userId) return { ok: false, error: '権限がありません' };
    if (attempt.status !== 'in_progress') return { ok: false, error: 'この挑戦はすでに提出済みです' };

    const assignment = await loadAssignment(supabase, input.assignmentId);

    let isCorrect: boolean | null = null;
    if (assignment.grading_mode === 'auto_exact') {
      const { answerTexts } = renderProblem(
        assignment.problem_templates.problem_template,
        assignment.problem_templates.answer_templates,
        attempt.resolved_variables as Record<string, number>,
      );
      isCorrect = isAnswerCorrect(finalAnswer, answerTexts);
    }

    const now = new Date().toISOString();
    const { error } = await supabase.from('problem_attempts').update({
      submitted_work: input.work,
      submitted_final_answer: finalAnswer,
      status: assignment.grading_mode === 'auto_exact' ? 'graded' : 'submitted',
      is_correct: isCorrect,
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
