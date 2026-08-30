export default function ProgressPage() {
  return (
    <section className="flex-1 flex flex-col gap-6 max-w-[1400px] mx-auto w-full px-6 pt-4 pb-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="shrink-0">
        <h2 className="text-xl font-bold font-title text-contrast">学習進捗 (Progress)</h2>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 h-[calc(100vh-12rem)] min-h-[520px] mb-4">
        
        {/* Progress Chart Placeholder */}
        <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm flex flex-col">
          <h4 className="font-bold font-title border-b border-slate-100 dark:border-slate-800 pb-2 mb-4 text-brand-600">科目別 学習時間推移</h4>
          <div className="flex-1 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400">
            <i className="fa-solid fa-chart-pie text-4xl mb-3"></i>
            <p className="text-sm font-medium">データ収集中...</p>
            <p className="text-xs mt-1 opacity-70">ポモドーロ機能で学習を記録するとグラフが生成されます</p>
          </div>
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
