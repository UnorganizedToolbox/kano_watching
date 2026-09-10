export const dynamic = "force-dynamic";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Flame, Coffee, Moon } from "lucide-react";

const RUNNING_EVENTS = new Set(['START', 'CHECK_REMAINING_TIME']);

export default async function TeacherPomodoroPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from('profiles').select('role, organization_id').eq('id', user?.id).single();
  if (profile?.role !== 'teacher') redirect('/admin');

  if (!profile.organization_id) {
    return (
      <section className="flex-1 flex flex-col gap-6 max-w-[900px] mx-auto w-full px-6 pt-2 pb-6">
        <div className="flex items-center gap-4 mb-2">
          <Link href="/admin" className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-brand-600 hover:border-brand-300 transition-all shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h2 className="text-2xl font-black font-title text-slate-800 dark:text-white">団体の学習状況</h2>
        </div>
        <p className="text-sm text-slate-500">あなたはまだ団体に所属していません。管理者にお問い合わせください。</p>
      </section>
    );
  }

  const { data: students } = await supabase
    .from('profiles')
    .select('id, name, student_id')
    .eq('organization_id', profile.organization_id)
    .eq('role', 'student')
    .eq('status', 'active')
    .order('name');

  const studentIds = (students || []).map(s => s.id);
  const safeIds = studentIds.length > 0 ? studentIds : ['00000000-0000-0000-0000-000000000000'];

  const { data: recentEvents } = await supabase
    .from('pomodoro_events')
    .select('student_uuid, event_type, mode, metadata, created_at')
    .in('student_uuid', safeIds)
    .order('created_at', { ascending: false })
    .limit(500);

  type EventRow = { student_uuid: string; event_type: string; mode: string; metadata: { subject?: string } | null; created_at: string };
  const latestEventByStudent = new Map<string, EventRow>();
  for (const ev of (recentEvents as EventRow[] | null) || []) {
    if (!latestEventByStudent.has(ev.student_uuid)) {
      latestEventByStudent.set(ev.student_uuid, ev);
    }
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { data: todaysLogs } = await supabase
    .from('pomodoro_logs')
    .select('student_uuid')
    .in('student_uuid', safeIds)
    .gte('created_at', startOfDay.toISOString());

  const todayCounts = new Map<string, number>();
  for (const log of todaysLogs || []) {
    todayCounts.set(log.student_uuid, (todayCounts.get(log.student_uuid) || 0) + 1);
  }

  return (
    <section className="flex-1 flex flex-col gap-6 max-w-[900px] mx-auto w-full px-6 pt-2 pb-6">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/admin" className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-brand-600 hover:border-brand-300 transition-all shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-black font-title text-slate-800 dark:text-white">団体の学習状況</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">手本を見せましょう。生徒の学習状況が一覧で確認できます。</p>
        </div>
      </div>

      <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        {students && students.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {students.map(student => {
              const ev = latestEventByStudent.get(student.id);
              const isRunning = ev ? RUNNING_EVENTS.has(ev.event_type) : false;
              const isWork = ev?.mode === 'WORK';
              const isLongBreak = ev?.mode === 'LONG_BREAK';

              return (
                <div key={student.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-700 dark:text-slate-200">{student.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{student.student_id}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {isRunning ? (
                      <span className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${
                        isWork
                          ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      }`}>
                        {isWork ? <Flame className="w-3.5 h-3.5" /> : isLongBreak ? <Moon className="w-3.5 h-3.5" /> : <Coffee className="w-3.5 h-3.5" />}
                        {isWork ? `集中中${ev?.metadata?.subject ? `（${ev.metadata.subject}）` : ''}` : isLongBreak ? '大休憩中' : '休憩中'}
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-400">
                        オフライン
                      </span>
                    )}
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 w-20 text-right">
                      今日 {todayCounts.get(student.id) || 0} 回
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400">団体に所属する生徒がまだいません。</p>
        )}
      </div>
    </section>
  );
}
