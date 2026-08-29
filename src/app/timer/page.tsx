export default function TimerPage() {
  return (
    <section className="flex-1 flex flex-col gap-6 max-w-[1400px] mx-auto w-full px-6 pt-2 pb-6">
      <div className="flex-1 grid grid-cols-12 gap-6 h-[calc(100vh-10rem)] min-h-[600px]">
        {/* Left Column (Timer & Current task) */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
          {/* Timer Card */}
          <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center shadow-lg relative overflow-hidden flex-1 min-h-[400px]">
            <div className="absolute top-6 left-6 flex gap-2">
              <span className="px-3 py-1 bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 rounded-lg text-xs font-bold">ポモドーロ 3/4</span>
            </div>
            
            <div className="w-64 h-64 rounded-full border-8 border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center relative mb-8">
              <svg className="absolute top-0 left-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="46" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-brand-500" strokeDasharray="289" strokeDashoffset="45" strokeLinecap="round" />
              </svg>
              <span className="text-6xl font-black font-title tracking-tighter text-contrast z-10">21:45</span>
              <span className="text-sm font-bold text-slate-400 mt-2 z-10">集中モード</span>
            </div>

            <div className="flex gap-4 w-full max-w-sm">
              <button className="flex-1 py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-bold font-title text-lg shadow-md shadow-brand-500/20 transition-all active:scale-95">
                <i className="fa-solid fa-pause mr-2"></i> 停止
              </button>
              <button className="w-16 h-16 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 rounded-2xl transition-all active:scale-95">
                <i className="fa-solid fa-forward-step text-xl"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (Q&A) */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
          <div className="card-glass flex-1 bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex justify-between items-center">
              <h4 className="font-bold font-title text-contrast text-sm">質問箱 (Q&A)</h4>
              <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded font-bold">1件 回答待ち</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400"><i className="fa-solid fa-hourglass-half mr-1"></i> 先生の回答待ち</span>
                  <span className="text-[10px] text-slate-400">10分前</span>
                </div>
                <h5 className="font-bold text-sm mb-1 text-slate-700 dark:text-slate-200">青チャート例題45の(2)が分かりません</h5>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">解説の3行目から4行目への式変形で、なぜマイナスが外れるのか理解できませんでした。</p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-darkbg-secondary">
              <button className="w-full py-3 bg-slate-800 hover:bg-slate-900 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-bold transition-colors">
                <i className="fa-solid fa-pen mr-2"></i> 新しく質問する
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
