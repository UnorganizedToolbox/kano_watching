export const dynamic = "force-dynamic";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { renderProblem } from "@/lib/cbt/render";
import { renderTypstToSvg } from "@/lib/typst";
import { computeScoreAdjustment, applyScoreAdjustment } from "@/lib/cbt/scoreAdjustment";
import type { TemplateKind, SubQuestionDef, PairItem } from "@/lib/cbt/types";
import type { QuestionInstance, SubResultRow } from "../actions";
import StartAttemptButton from "../StartAttemptButton";
import AttemptClient, { type QuestionView, type ScoreBreakdown } from "../AttemptClient";

function buildProblemTypstSource(problemText: string): string {
  return `#set page(width: auto, height: auto, margin: 0.6em)\n#set text(size: 16pt)\n\n${problemText}\n`;
}

// 提出タイミングに応じたスコア倍率の内訳を組み立てる。問題自体の正答率
// (problem_attempts.score)は書き換えず、表示用にここで導出するだけ。
function buildScoreBreakdown(
  assignment: { delivery_mode: 'deadline' | 'no_deadline' | 'permanent'; due_at: string | null; created_at: string },
  rawScore: number | null,
  submittedAt: string | null,
  expAwarded: number | null,
): ScoreBreakdown | null {
  if (rawScore === null || !submittedAt) return null;
  const { tier, multiplier } = computeScoreAdjustment({
    deliveryMode: assignment.delivery_mode,
    createdAt: assignment.created_at,
    dueAt: assignment.due_at,
    submittedAt,
  });
  return { rawScore, tier, multiplier, adjustedScore: applyScoreAdjustment(rawScore, multiplier), expAwarded };
}

interface TemplateRow {
  id: string;
  kind: TemplateKind;
  problem_template: string;
  sub_questions: SubQuestionDef[];
  pairs: PairItem[];
}

export default async function AssignmentAttemptPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: assignment, error } = await supabase
    .from('problem_assignments')
    .select('id, delivery_mode, due_at, grading_mode, created_at, problem_decks:deck_id (title)')
    .eq('id', id)
    .single();

  if (error || !assignment) {
    return (
      <div className="p-8 text-center text-slate-500">
        課題が見つかりませんでした。<br />
        <Link href="/assignments" className="text-brand-600 hover:underline mt-4 inline-block">戻る</Link>
      </div>
    );
  }

  const deckTitle = (assignment.problem_decks as unknown as { title: string } | null)?.title || '(タイトル未設定)';

  const { data: attempts } = await supabase
    .from('problem_attempts')
    .select('id, questions, submitted_work, submitted_answers, status, sub_results, score, exp_awarded, submitted_at, started_at')
    .eq('assignment_id', id)
    .eq('student_id', user.id)
    .order('attempt_number', { ascending: false })
    .limit(1);

  const attempt = attempts?.[0] ?? null;

  const isOverdue = assignment.delivery_mode === 'deadline' && assignment.due_at
    ? new Date(assignment.due_at) < new Date()
    : false;

  let questionViews: QuestionView[] = [];

  if (attempt) {
    const questions = attempt.questions as QuestionInstance[];
    const uniqueIds = [...new Set(questions.map(q => q.templateId))];
    const { data: templateRows } = await supabase
      .from('problem_templates')
      .select('id, kind, problem_template, sub_questions, pairs')
      .in('id', uniqueIds);
    const templateById = new Map((templateRows ?? []).map(t => [t.id, t as TemplateRow]));
    const submittedAnswers = (attempt.submitted_answers as string[][] | null) ?? [];
    const subResultsAll = attempt.sub_results as SubResultRow[][] | null;

    questionViews = questions.map((q, qi) => {
      const template = templateById.get(q.templateId);
      if (!template) {
        return { svgDataUri: null, svgError: `テンプレート(id=${q.templateId})が見つかりません`, subQuestions: [], submittedAnswers: [], subResults: null };
      }
      try {
        const { problemText, subAnswers } = renderProblem(
          { kind: template.kind, problem_template: template.problem_template, subQuestions: template.sub_questions, pairs: template.pairs },
          q.resolvedVariables,
        );
        const result = renderTypstToSvg(buildProblemTypstSource(problemText));
        const svgDataUri = result.ok ? `data:image/svg+xml;base64,${Buffer.from(result.svg).toString('base64')}` : null;
        return {
          svgDataUri,
          svgError: result.ok ? null : result.error,
          subQuestions: subAnswers.map(sa => ({ label: sa.label, points: sa.points })),
          submittedAnswers: submittedAnswers[qi] ?? [],
          subResults: subResultsAll?.[qi] ?? null,
        };
      } catch (e) {
        return { svgDataUri: null, svgError: e instanceof Error ? e.message : String(e), subQuestions: [], submittedAnswers: [], subResults: null };
      }
    });
  }

  return (
    <section className="flex-1 flex flex-col gap-6 max-w-[700px] mx-auto w-full px-6 pt-2 pb-6">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/assignments" className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-brand-600 hover:border-brand-300 transition-all shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-black font-title text-slate-800 dark:text-white">{deckTitle}</h2>
          {isOverdue && <p className="text-xs text-rose-500 font-bold mt-0.5">締切を過ぎています</p>}
        </div>
      </div>

      {!attempt ? (
        <StartAttemptButton assignmentId={id} isOverdue={isOverdue} />
      ) : (
        <AttemptClient
          assignmentId={id}
          attemptId={attempt.id}
          status={attempt.status}
          submittedWork={attempt.submitted_work}
          scoreBreakdown={buildScoreBreakdown(assignment, attempt.score, attempt.submitted_at, attempt.exp_awarded)}
          durationSeconds={attempt.submitted_at ? Math.max(0, Math.round((new Date(attempt.submitted_at).getTime() - new Date(attempt.started_at).getTime()) / 1000)) : null}
          questions={questionViews}
          isOverdue={isOverdue}
        />
      )}
    </section>
  );
}
