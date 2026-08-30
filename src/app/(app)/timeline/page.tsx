export default function TimelinePage() {
  return (
    <section className="flex-1 flex flex-col gap-6 max-w-[1400px] mx-auto w-full px-6 pt-4 pb-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="shrink-0">
        <h2 className="text-xl font-bold font-title text-contrast">学習 Timeline (予定 ⇄ 実績)</h2>
      </div>

      <div className="flex-1 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col overflow-hidden relative h-[calc(100vh-12rem)] min-h-[520px] mb-4">
        
        <div className="flex flex-col select-none relative h-full">
          
          {/* Dates Header */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 pb-2 shrink-0">
            <div className="w-20 shrink-0 text-[10px] text-slate-500 dark:text-slate-400 font-bold flex items-end pb-1 pl-2">GMT+09</div>
            
            <div className="flex-1 grid grid-cols-7 text-center font-bold">
              <div className="text-xs py-1"><span className="block text-slate-700 dark:text-slate-300">23</span></div>
              <div className="text-xs py-1"><span className="block text-slate-700 dark:text-slate-300">24</span></div>
              <div className="text-xs py-1"><span className="block text-slate-700 dark:text-slate-300">25</span></div>
              <div className="text-xs py-1"><span className="block text-slate-700 dark:text-slate-300">26</span></div>
              <div className="text-xs py-1"><span className="block text-slate-700 dark:text-slate-300">27</span></div>
              <div className="text-xs py-1"><span className="block text-slate-700 dark:text-slate-300">28</span></div>
              <div className="text-xs py-1 relative">
                <span className="inline-flex items-center justify-center w-6 h-6 bg-brand-600 text-white font-bold rounded-full text-xs shadow-md">29</span>
              </div>
            </div>
          </div>

          {/* Full-day Events */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 pb-1.5 pt-1 shrink-0">
            <div className="w-20 shrink-0"></div>
            <div className="flex-1 px-1">
              <div className="w-full py-1 px-3 bg-brand-600/90 text-white text-[10px] font-bold rounded shadow-md border-l-4 border-indigo-700">
                夏期休暇
              </div>
            </div>
          </div>

          {/* Hourly Time Grid */}
          <div className="flex-1 flex overflow-y-auto relative mt-2">
            
            <div className="w-20 shrink-0 flex flex-col justify-between py-1 text-[10px] text-slate-600 dark:text-slate-300 font-bold text-right pr-3 border-r border-slate-200 dark:border-slate-800 min-h-[600px]">
              <div style={{ height: '48px' }}>午前10時</div>
              <div style={{ height: '48px' }}>午前11時</div>
              <div style={{ height: '48px' }}>午後12時</div>
              <div style={{ height: '48px' }}>午後1時</div>
              <div style={{ height: '48px' }}>午後2時</div>
              <div style={{ height: '48px' }}>午後3時</div>
              <div style={{ height: '48px' }}>午後4時</div>
              <div style={{ height: '48px' }}>午後5時</div>
              <div style={{ height: '48px' }}>午後6時</div>
              <div style={{ height: '48px' }}>午後7時</div>
              <div style={{ height: '48px' }}>午後8時</div>
              <div style={{ height: '48px' }}>午後9時</div>
              <div style={{ height: '48px' }}>午後10時</div>
            </div>

            <div className="flex-1 relative min-h-[600px] border-l border-slate-100 dark:border-slate-800 ml-1">
              
              <div className="absolute top-0 left-0 right-0 h-px bg-slate-100 dark:bg-slate-800" style={{ top: '0px' }}></div>
              <div className="absolute top-0 left-0 right-0 h-px bg-slate-100 dark:bg-slate-800" style={{ top: '48px' }}></div>
              <div className="absolute top-0 left-0 right-0 h-px bg-slate-100 dark:bg-slate-800" style={{ top: '96px' }}></div>
              <div className="absolute top-0 left-0 right-0 h-px bg-slate-100 dark:bg-slate-800" style={{ top: '144px' }}></div>
              <div className="absolute top-0 left-0 right-0 h-px bg-slate-100 dark:bg-slate-800" style={{ top: '192px' }}></div>
              <div className="absolute top-0 left-0 right-0 h-px bg-slate-100 dark:bg-slate-800" style={{ top: '240px' }}></div>
              <div className="absolute top-0 left-0 right-0 h-px bg-slate-100 dark:bg-slate-800" style={{ top: '288px' }}></div>
              
              <div className="absolute top-0 bottom-0 border-l border-dashed border-slate-200 dark:border-slate-800" style={{ left: '14.28%' }}></div>
              <div className="absolute top-0 bottom-0 border-l border-dashed border-slate-200 dark:border-slate-800" style={{ left: '28.56%' }}></div>
              <div className="absolute top-0 bottom-0 border-l border-dashed border-slate-200 dark:border-slate-800" style={{ left: '42.84%' }}></div>
              <div className="absolute top-0 bottom-0 border-l border-dashed border-slate-200 dark:border-slate-800" style={{ left: '57.12%' }}></div>
              <div className="absolute top-0 bottom-0 border-l border-dashed border-slate-200 dark:border-slate-800" style={{ left: '71.4%' }}></div>
              <div className="absolute top-0 bottom-0 border-l border-dashed border-slate-200 dark:border-slate-800" style={{ left: '85.68%' }}></div>

              {/* Event Blocks */}
              {/* Completed */}
              <div className="absolute bg-emerald-500/10 border-l-4 border-emerald-500 text-emerald-800 dark:text-emerald-300 rounded shadow-sm p-1.5 overflow-hidden group cursor-pointer transition-all hover:bg-emerald-500/20"
                   style={{ top: '24px', left: '1%', width: '13%', height: '96px' }}>
                <p className="text-[9px] font-bold truncate"><i className="fa-solid fa-check text-emerald-500 mr-1"></i> [済] 数I 基礎</p>
                <p className="text-[8px] opacity-70 truncate mt-0.5">Focus Gold P.12</p>
              </div>

              {/* Missed */}
              <div className="absolute bg-rose-500/10 border-l-4 border-rose-500 text-rose-800 dark:text-rose-300 rounded shadow-sm p-1.5 overflow-hidden opacity-60 group cursor-pointer transition-all hover:opacity-100"
                   style={{ top: '144px', left: '1%', width: '13%', height: '48px' }}>
                <p className="text-[9px] font-bold line-through truncate">[未] 英単語</p>
                <p className="text-[8px] opacity-70 truncate mt-0.5">Target 1900</p>
              </div>

              {/* Planned (Future) */}
              <div className="absolute bg-slate-100 dark:bg-slate-800 border-l-4 border-slate-400 text-slate-700 dark:text-slate-300 rounded shadow-sm p-1.5 overflow-hidden group cursor-pointer transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
                   style={{ top: '192px', left: '86.68%', width: '12.32%', height: '96px' }}>
                <p className="text-[9px] font-bold truncate"><i className="fa-regular fa-clock opacity-60 mr-1"></i> [予] 物理</p>
                <p className="text-[8px] opacity-70 truncate mt-0.5">力学 復習</p>
              </div>

              {/* Current Red Line */}
              <div className="absolute left-0 right-0 h-px bg-rose-500 z-10 flex items-center" style={{ top: '265px' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 -ml-0.5 shadow-sm shadow-rose-500"></div>
                <div className="text-[9px] font-bold text-rose-500 bg-white/80 dark:bg-slate-900/80 px-1 ml-1 rounded">15:30</div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
