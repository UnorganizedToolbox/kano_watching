import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, BarChart2, MessageCircle } from "lucide-react";

export default async function StudentDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const studentId = params.id;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
  if (adminProfile?.role !== 'admin') redirect('/');

  // Fetch student profile
  const { data: student, error: studentError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', studentId)
    .single();

  if (studentError || !student) {
    return (
      <div className="p-8 text-center text-slate-500">
        生徒が見つかりませんでした。<br/>
        <Link href="/admin" className="text-brand-600 hover:underline mt-4 inline-block">戻る</Link>
      </div>
    );
  }

  // Fetch Pomodoro logs
  const { data: pomodoros } = await supabase
    .from('pomodoro_logs')
    .select('*')
    .eq('student_uuid', studentId)
    .order('created_at', { ascending: false });

  // Fetch Diagnostic Results
  const { data: diagnostics } = await supabase
    .from('diagnostic_results')
    .select('*')
    .eq('student_uuid', studentId)
    .order('created_at', { ascending: false });

  // Fetch Questions
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('student_uuid', studentId)
    .order('created_at', { ascending: false });

  return (
    <section className="flex-1 flex flex-col gap-6 max-w-[1200px] mx-auto w-full px-6 pt-2 pb-6">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/admin" className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-brand-600 hover:border-brand-300 transition-all shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black font-title text-slate-800 dark:text-white">{student.name}</h2>
            <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
              student.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-600'
            }`}>
              {student.status === 'active' ? 'アクティブ' : student.status}
            </span>
          </div>
          <p className="text-sm text-slate-500 font-mono mt-1">ID: {student.student_id} | 登録日: {new Date(student.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Diagnostics Card */}
        <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm md:col-span-2">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-brand-500" />
            診断テスト履歴
          </h3>
          <div className="space-y-4">
            {diagnostics && diagnostics.length > 0 ? (
              diagnostics.map((diag, i) => (
                <div key={diag.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 flex gap-6 items-center">
                  <div className="text-center shrink-0">
                    <div className="text-sm text-slate-500">第{diagnostics.length - i}回</div>
                    <div className="text-2xl font-black text-brand-600 dark:text-brand-400">{diag.total_score}<span className="text-xs text-slate-400 font-normal">点</span></div>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 mb-1">受験日: {new Date(diag.created_at).toLocaleDateString()}</p>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">弱点: {diag.weaknesses || '分析中'}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">まだ診断テストを受験していません。</p>
            )}
          </div>
        </div>

        {/* Stats Column */}
        <div className="flex flex-col gap-6">
          <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand-500" />
              学習時間 (ポモドーロ)
            </h3>
            <div className="text-4xl font-black text-slate-800 dark:text-white mb-2">{pomodoros?.length || 0} <span className="text-sm text-slate-500 font-normal">回完了</span></div>
            <p className="text-xs text-slate-400 mb-4">推定学習時間: {((pomodoros?.length || 0) * 25) / 60} 時間</p>
            
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
              {pomodoros && pomodoros.map(log => (
                <div key={log.id} className="text-xs flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-slate-600 dark:text-slate-300">{log.subject}</span>
                  <span className="text-slate-400">{new Date(log.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-brand-500" />
              質問履歴
            </h3>
            <div className="text-2xl font-black text-slate-800 dark:text-white mb-4">{questions?.length || 0} <span className="text-sm text-slate-500 font-normal">件</span></div>
            
            <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
              {questions && questions.map(q => (
                <div key={q.id} className="text-xs p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <div className="flex justify-between mb-1">
                    <span className="font-bold truncate max-w-[120px]" title={q.title}>{q.title}</span>
                    <span className={q.status === 'open' ? 'text-amber-500' : 'text-emerald-500'}>{q.status === 'open' ? '未回答' : '回答済'}</span>
                  </div>
                  <span className="text-slate-400 text-[10px]">{new Date(q.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
