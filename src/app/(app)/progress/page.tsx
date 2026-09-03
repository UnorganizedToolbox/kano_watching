import { createClient } from "@/utils/supabase/server";

export default async function ProgressPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const subjectStats: Record<string, { minutes: number, ratings: number[], avgRating: number }> = {};
  
  if (user) {
    const { data: logs } = await supabase
      .from('student_activity_logs')
      .select('metadata')
      .eq('student_id', user.id)
      .eq('activity_type', 'POMODORO_COMPLETED');
      
    if (logs) {
      logs.forEach(log => {
        const meta = log.metadata as { subject?: string, minutes?: number, concentrationRating?: number } | null;
        if (!meta) return;
        const subj = meta.subject || '不明';
        const mins = meta.minutes || 0;
        const rating = meta.concentrationRating;
        
        if (!subjectStats[subj]) {
          subjectStats[subj] = { minutes: 0, ratings: [], avgRating: 0 };
        }
        subjectStats[subj].minutes += mins;
        if (rating) {
          subjectStats[subj].ratings.push(rating);
        }
      });
      
      for (const subj of Object.keys(subjectStats)) {
        const ratings = subjectStats[subj].ratings;
        subjectStats[subj].avgRating = ratings.length > 0 
          ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
          : 0;
      }
    }
  }

  const maxMinutes = Math.max(...Object.values(subjectStats).map(s => s.minutes), 60);

  return (
    <section className="flex-1 flex flex-col gap-6 max-w-[1400px] mx-auto w-full px-6 pt-4 pb-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="shrink-0">
        <h2 className="text-xl font-bold font-title text-contrast">学習進捗 (Progress)</h2>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 h-[calc(100vh-12rem)] min-h-[520px] mb-4">
        
        {/* Progress Chart */}
        <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm flex flex-col">
          <h4 className="font-bold font-title border-b border-slate-100 dark:border-slate-800 pb-2 mb-4 text-brand-600">科目別 学習時間と集中度</h4>
          
          {Object.keys(subjectStats).length === 0 ? (
            <div className="flex-1 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400">
              <i className="fa-solid fa-chart-pie text-4xl mb-3"></i>
              <p className="text-sm font-medium">データ収集中...</p>
              <p className="text-xs mt-1 opacity-70">ポモドーロ機能で学習を記録するとグラフが生成されます</p>
            </div>
          ) : (
            <div className="flex-1 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700 p-6 overflow-y-auto">
              <div className="space-y-6">
                {Object.entries(subjectStats)
                  .sort((a, b) => b[1].minutes - a[1].minutes)
                  .map(([subj, stats]) => (
                  <div key={subj} className="flex flex-col gap-2">
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{subj}</span>
                      <div className="text-right">
                        <span className="text-sm font-bold text-brand-600 dark:text-brand-400">{stats.minutes} 分</span>
                        <span className="text-xs text-slate-500 ml-2">
                          集中度: {stats.avgRating ? <><i className="fa-solid fa-star text-amber-400 mr-1"></i>{stats.avgRating.toFixed(1)}</> : '-'}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-brand-500 h-full rounded-full transition-all duration-1000" 
                        style={{ width: `${Math.min((stats.minutes / maxMinutes) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Competency Radar Placeholder */}
        <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm flex flex-col">
          <h4 className="font-bold font-title border-b border-slate-100 dark:border-slate-800 pb-2 mb-4 text-indigo-600">実力診断 レーダーチャート</h4>
          <div className="flex-1 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400">
            <i className="fa-solid fa-chart-line text-4xl mb-3"></i>
            <p className="text-sm font-medium">データ収集中...</p>
            <p className="text-xs mt-1 opacity-70">実力診断テストを受験するとスキルマップが生成されます</p>
          </div>
        </div>

      </div>
    </section>
  );
}
