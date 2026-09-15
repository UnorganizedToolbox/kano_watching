export const dynamic = "force-dynamic";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

type DeliveryMode = 'deadline' | 'no_deadline' | 'permanent';

interface AssignmentRow {
  id: string;
  delivery_mode: DeliveryMode;
  due_at: string | null;
  grading_mode: 'manual' | 'auto_exact';
  problem_decks: { title: string } | null;
}

const DELIVERY_MODE_LABEL: Record<DeliveryMode, string> = {
  deadline: '期限あり',
  no_deadline: '期限なし',
  permanent: '恒常',
};

export default async function StudentAssignmentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // profile/assignments/attemptsは互いに独立したデータなので並列に取得する
  const [{ data: profile }, { data: assignments }, { data: attempts }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase
      .from('problem_assignments')
      .select('id, delivery_mode, due_at, grading_mode, problem_decks:deck_id (title)')
      .order('created_at', { ascending: false }),
    supabase
      .from('problem_attempts')
      .select('assignment_id, attempt_number, status, score')
      .eq('student_id', user.id)
      .order('attempt_number', { ascending: false }),
  ]);
  if (profile?.role !== 'student') redirect('/');

  const latestByAssignment = new Map<string, { status: string; score: number | null }>();
  for (const a of attempts || []) {
    if (!latestByAssignment.has(a.assignment_id)) {
      latestByAssignment.set(a.assignment_id, { status: a.status, score: a.score });
    }
  }

  const statusLabel = (a: AssignmentRow) => {
    const latest = latestByAssignment.get(a.id);
    if (!latest) return { text: '未着手', className: 'bg-slate-100 dark:bg-slate-800 text-slate-500' };
    if (latest.status === 'in_progress') return { text: '挑戦中', className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' };
    if (a.grading_mode === 'auto_exact' && latest.score !== null) {
      const rounded = Math.round(latest.score);
      return rounded >= 100
        ? { text: `${rounded}%`, className: 'bg-brand-100 dark:bg-brand-900/30 text-brand-600' }
        : { text: `${rounded}%`, className: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600' };
    }
    return { text: '提出済み', className: 'bg-slate-100 dark:bg-slate-800 text-slate-500' };
  };

  return (
    <section className="flex-1 flex flex-col gap-6 max-w-[900px] mx-auto w-full px-6 pt-2 pb-6">
      <div>
        <h2 className="text-2xl font-black font-title text-slate-800 dark:text-white">課題</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">配信された問題に挑戦しましょう。</p>
      </div>

      <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
        {assignments && assignments.length > 0 ? (
          assignments.map((raw) => {
            const a = raw as unknown as AssignmentRow;
            const status = statusLabel(a);
            const isOverdue = a.delivery_mode === 'deadline' && a.due_at ? new Date(a.due_at) < new Date() : false;
            return (
              <Link
                key={a.id}
                href={`/assignments/${a.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors gap-4"
              >
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-700 dark:text-slate-200 truncate">{a.problem_decks?.title || '(タイトル未設定)'}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {DELIVERY_MODE_LABEL[a.delivery_mode]}
                    {a.delivery_mode === 'deadline' && a.due_at && ` ・ 締切 ${new Date(a.due_at).toLocaleString()}`}
                    {isOverdue && <span className="text-rose-500 font-bold"> (締切超過)</span>}
                  </p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${status.className}`}>{status.text}</span>
              </Link>
            );
          })
        ) : (
          <p className="text-sm text-slate-400 px-6 py-12 text-center">まだ配信された課題はありません。</p>
        )}
      </div>
    </section>
  );
}
