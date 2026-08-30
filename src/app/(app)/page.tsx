import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch real data
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
  const { data: pomodoros } = await supabase.from('pomodoro_logs').select('*').eq('student_uuid', user?.id).order('created_at', { ascending: false });
  const { data: diagnostics } = await supabase.from('diagnostic_results').select('*').eq('student_uuid', user?.id).order('created_at', { ascending: false });

  const latestDiagnostic = diagnostics && diagnostics.length > 0 ? diagnostics[0] : null;
  const totalPomodoros = pomodoros?.length || 0;

  return (
    <section className="flex-1 flex flex-col gap-6 max-w-[1400px] mx-auto w-full px-6 pt-2 pb-6">
      {/* Nickname sector */}
      <div className="flex justify-end items-center gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">表示名:</span>
          <span className="bg-white/50 dark:bg-darkbg-secondary/50 border border-slate-300 dark:border-slate-700 px-3 py-1 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200">{profile?.name}</span>
        </div>
      </div>

      {/* Height responsive grid */}
      <div className="flex-1 grid grid-cols-12 gap-6 items-stretch h-[calc(100vh-12rem)] min-h-[620px] mb-4">
        
        {/* Left Column (8-cols wide) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 justify-between h-full">
          {/* Countdown */}
          <div className="bg-gradient-to-r from-indigo-600 to-brand-500 text-white rounded-2xl p-6 shadow-md flex justify-between items-center shrink-0">
            <div>
              <span className="text-[10px] font-bold bg-white/20 px-2.5 py-1 rounded-full tracking-wider">本番判定シミュレータ</span>
              <h3 className="text-lg font-bold mt-1 font-title">学習セッション記録</h3>
              <p className="text-xs text-white/80">これまでのポモドーロ完了数: {totalPomodoros} 回</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] block text-white/80 font-bold">共通テストまで</span>
              <span className="text-3xl font-black font-title">138 日</span>
            </div>
          </div>

          {/* Big Chart */}
          <div className="card-glass flex-1 bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-[52%] min-h-[300px]">
            <h4 className="font-bold font-title mb-1 text-contrast text-sm">合格着地推移シミュレーション</h4>
            <div className="flex-1 relative w-full h-full bg-slate-100/50 dark:bg-slate-800/30 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700">
              {diagnostics && diagnostics.length > 0 ? (
                <span className="text-slate-500 text-sm">（ここにChart.jsでグラフが描画されます）</span>
              ) : (
                <span className="text-slate-400 text-xs">まだ診断データがありません。テストを受験してください。</span>
              )}
            </div>
          </div>

          {/* Stats Analytics cards row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 shrink-0">
            <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm transition-all">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-medium">得点のブレ幅 (標準偏差 σ)</span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-contrast">σ = --</span>
                <span className="text-xs text-slate-400 font-bold">データ不足</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">複数回の受験で表示されます</p>
            </div>

            <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm transition-all">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-medium">直近の学習フォーカス</span>
              </div>
              <div className="mt-1">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {pomodoros && pomodoros.length > 0 ? pomodoros[0].subject : '学習記録なし'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">ポモドーロタイマーの履歴より</p>
            </div>
          </div>
        </div>

        {/* Right Column (4-cols wide) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 justify-between h-full">
          {/* Diagnostic Stats */}
          <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm shrink-0">
            <h4 className="font-bold font-title mb-4 text-contrast text-sm">最新の診断結果</h4>
            {latestDiagnostic ? (
              <>
                <div className="flex items-end gap-2 mb-4">
                  <span className="text-4xl font-black text-brand-600 dark:text-brand-400">{latestDiagnostic.total_score}</span>
                  <span className="text-sm text-slate-500 dark:text-slate-400 mb-1">/ 100 pt</span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2 mb-4">
                  <p><strong>弱点:</strong> {latestDiagnostic.weaknesses || '分析中'}</p>
                </div>
                <button className="w-full mt-2 py-2 bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400 rounded-xl text-xs font-bold hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors">
                  詳細レポートを見る
                </button>
              </>
            ) : (
              <div className="py-8 text-center">
                <p className="text-xs text-slate-500 mb-3">診断テストをまだ受けていません</p>
                <button className="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-700 transition-colors">
                  実力診断テストを開始
                </button>
              </div>
            )}
          </div>

          {/* AI Advice - Flex 1 to take remaining height */}
          <div className="card-glass flex-1 bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col min-h-[250px]">
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <i className="fa-solid fa-robot text-brand-500"></i>
              <h4 className="font-bold font-title text-contrast text-sm">AI 学習ナビゲーター</h4>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex-1 overflow-y-auto">
              <p className="mb-2">{profile?.name}さん、お疲れ様です。</p>
              {latestDiagnostic?.recommendation ? (
                <p>{latestDiagnostic.recommendation}</p>
              ) : (
                <p>まずはポモドーロタイマーを使って学習を記録するか、実力診断テストを受けてみましょう。データが集まるほど、精度の高いアドバイスが可能になります。</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
