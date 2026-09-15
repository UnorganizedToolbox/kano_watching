export const dynamic = "force-dynamic";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import DeliveryForm from "../../../problems/[id]/deliver/DeliveryForm";

// datetime-local入力欄はローカルタイムゾーンの"YYYY-MM-DDTHH:mm"を要求する
function toLocalDatetimeInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function EditAssignmentPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from('profiles').select('role, organization_id').eq('id', user?.id).single();
  if (profile?.role !== 'admin' && profile?.role !== 'teacher') redirect('/');

  const { data: assignment, error } = await supabase
    .from('problem_assignments')
    .select('id, organization_id, target_type, target_student_ids, delivery_mode, due_at, grading_mode, problem_decks:deck_id (title)')
    .eq('id', id)
    .single();

  if (error || !assignment) {
    return (
      <div className="p-8 text-center text-slate-500">
        配信が見つかりませんでした。<br />
        <Link href="/admin/assignments" className="text-brand-600 hover:underline mt-4 inline-block">戻る</Link>
      </div>
    );
  }

  const deckTitle = (assignment.problem_decks as unknown as { title: string } | null)?.title || '(タイトル未設定)';

  const { data: students } = await supabase
    .from('profiles')
    .select('id, name, student_id')
    .eq('organization_id', assignment.organization_id)
    .eq('role', 'student')
    .eq('status', 'active')
    .order('name');

  return (
    <section className="flex-1 flex flex-col gap-6 max-w-[700px] mx-auto w-full px-6 pt-2 pb-6">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/admin/assignments" className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-brand-600 hover:border-brand-300 transition-all shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-black font-title text-slate-800 dark:text-white">配信設定の編集</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">「{deckTitle}」の配信対象・期限・採点方法を変更します。</p>
        </div>
      </div>

      <DeliveryForm
        target={{ kind: 'deck', id: id }}
        students={students || []}
        isAdmin={profile.role === 'admin'}
        existing={{
          id: assignment.id,
          targetType: assignment.target_type,
          targetStudentIds: (assignment.target_student_ids as string[] | null) || [],
          deliveryMode: assignment.delivery_mode,
          dueAt: assignment.due_at ? toLocalDatetimeInputValue(assignment.due_at) : '',
          gradingMode: assignment.grading_mode,
        }}
      />
    </section>
  );
}
