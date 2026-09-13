export const dynamic = "force-dynamic";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AssignmentRow from "./AssignmentRow";

export default async function AdminAssignmentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
  if (profile?.role !== 'admin' && profile?.role !== 'teacher') redirect('/');

  const { data: assignments } = await supabase
    .from('problem_assignments')
    .select('id, target_type, target_student_ids, delivery_mode, due_at, grading_mode, created_at, problem_templates:template_id (title), organizations:organization_id (name)')
    .order('created_at', { ascending: false });

  return (
    <section className="flex-1 flex flex-col gap-6 max-w-[900px] mx-auto w-full px-6 pt-2 pb-6">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/admin/problems" className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-brand-600 hover:border-brand-300 transition-all shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-black font-title text-slate-800 dark:text-white">配信済み課題</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">配信した課題の一覧です。</p>
        </div>
      </div>

      <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
        {assignments && assignments.length > 0 ? (
          assignments.map((a) => (
            <AssignmentRow
              key={a.id}
              id={a.id}
              title={(a.problem_templates as unknown as { title: string } | null)?.title || '(タイトル未設定)'}
              organizationName={(a.organizations as unknown as { name: string } | null)?.name || '団体未設定'}
              targetType={a.target_type}
              targetCount={(a.target_student_ids as string[] | null)?.length ?? 0}
              deliveryMode={a.delivery_mode}
              dueAt={a.due_at}
              gradingMode={a.grading_mode}
              createdAt={a.created_at}
            />
          ))
        ) : (
          <p className="text-sm text-slate-400 px-6 py-12 text-center">まだ配信した課題はありません。</p>
        )}
      </div>
    </section>
  );
}
