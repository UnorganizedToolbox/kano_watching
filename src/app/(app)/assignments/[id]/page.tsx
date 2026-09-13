export const dynamic = "force-dynamic";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { renderProblem } from "@/lib/cbt/render";
import { renderTypstToSvg } from "@/lib/typst";
import StartAttemptButton from "../StartAttemptButton";
import AttemptClient from "../AttemptClient";

function buildProblemTypstSource(problemText: string): string {
  return `#set page(width: auto, height: auto, margin: 0.6em)\n#set text(size: 16pt)\n\n${problemText}\n`;
}

export default async function AssignmentAttemptPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: assignment, error } = await supabase
    .from('problem_assignments')
    .select('id, delivery_mode, due_at, grading_mode, problem_templates:template_id (title, problem_template, answer_templates)')
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

  const template = assignment.problem_templates as unknown as {
    title: string;
    problem_template: string;
    answer_templates: string[];
  };

  const { data: attempts } = await supabase
    .from('problem_attempts')
    .select('id, resolved_variables, submitted_work, submitted_final_answer, status, is_correct')
    .eq('assignment_id', id)
    .eq('student_id', user.id)
    .order('attempt_number', { ascending: false })
    .limit(1);

  const attempt = attempts?.[0] ?? null;

  const isOverdue = assignment.delivery_mode === 'deadline' && assignment.due_at
    ? new Date(assignment.due_at) < new Date()
    : false;

  let svgDataUri: string | null = null;
  let svgError: string | null = null;
  if (attempt) {
    try {
      const { problemText } = renderProblem(
        template.problem_template,
        template.answer_templates,
        attempt.resolved_variables as Record<string, number>,
      );
      const result = renderTypstToSvg(buildProblemTypstSource(problemText));
      if (result.ok) {
        svgDataUri = `data:image/svg+xml;base64,${Buffer.from(result.svg).toString('base64')}`;
      } else {
        svgError = result.error;
      }
    } catch (e) {
      svgError = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <section className="flex-1 flex flex-col gap-6 max-w-[700px] mx-auto w-full px-6 pt-2 pb-6">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/assignments" className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-brand-600 hover:border-brand-300 transition-all shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-black font-title text-slate-800 dark:text-white">{template.title}</h2>
          {isOverdue && <p className="text-xs text-rose-500 font-bold mt-0.5">締切を過ぎています</p>}
        </div>
      </div>

      {!attempt ? (
        <StartAttemptButton assignmentId={id} disabled={isOverdue} />
      ) : (
        <AttemptClient
          assignmentId={id}
          attempt={{
            id: attempt.id,
            status: attempt.status,
            submittedWork: attempt.submitted_work,
            submittedFinalAnswer: attempt.submitted_final_answer,
            isCorrect: attempt.is_correct,
          }}
          svgDataUri={svgDataUri}
          svgError={svgError}
          canRetry={!isOverdue}
        />
      )}
    </section>
  );
}
