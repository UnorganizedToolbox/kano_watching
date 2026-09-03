import { CalendarDays, Clock, CheckCircle2, XCircle, AlertCircle, Sparkles } from 'lucide-react';

export default function TimelinePage() {
  const hours = Array.from({ length: 13 }, (_, i) => i + 10); // 10 to 22 (10 AM to 10 PM)
  
  return (
    <section className="flex-1 flex flex-col gap-6 max-w-[1600px] mx-auto w-full px-6 pt-4 pb-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h2 className="text-2xl font-black font-title text-slate-800 dark:text-white flex items-center gap-3">
            <CalendarDays className="w-7 h-7 text-brand-500" />
            学習 Timeline
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">予定 ⇄ 実績の同期とトラッキング</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div><span className="text-xs font-bold text-slate-600 dark:text-slate-300">実績(済)</span></div>
          <div className="w-px h-3 bg-slate-300 dark:bg-slate-600 mx-1"></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-500"></div><span className="text-xs font-bold text-slate-600 dark:text-slate-300">予定</span></div>
          <div className="w-px h-3 bg-slate-300 dark:bg-slate-600 mx-1"></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-400"></div><span className="text-xs font-bold text-slate-600 dark:text-slate-300">未達</span></div>
        </div>
      </div>

      <div className="flex-1 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] flex flex-col overflow-hidden relative h-[calc(100vh-12rem)] min-h-[600px] mb-4">
        
        <div className="flex flex-col select-none relative h-full">
          
          {/* Dates Header */}
          <div className="flex border-b border-slate-200/50 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-800/30 pt-4 pb-2 shrink-0 z-10 relative shadow-sm">
            <div className="w-20 shrink-0 text-[10px] text-slate-400 font-bold flex flex-col items-center justify-end pb-1">
              <span className="bg-slate-200/50 dark:bg-slate-700/50 px-2 py-0.5 rounded-full">GMT+09</span>
            </div>
            
            <div className="flex-1 grid grid-cols-7 text-center">
              {[
                { date: 23, day: 'Mon' }, { date: 24, day: 'Tue' }, { date: 25, day: 'Wed' },
                { date: 26, day: 'Thu' }, { date: 27, day: 'Fri' }, { date: 28, day: 'Sat' },
                { date: 29, day: 'Sun', isToday: true }
              ].map((d, i) => (
                <div key={i} className="flex flex-col items-center justify-center gap-1">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${d.day === 'Sat' ? 'text-blue-500' : d.day === 'Sun' ? 'text-rose-500' : 'text-slate-400'}`}>{d.day}</span>
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-all ${d.isToday ? 'bg-brand-500 text-white shadow-md shadow-brand-500/40 ring-4 ring-brand-500/20' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                    {d.date}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Full-day Events */}
          <div className="flex border-b border-slate-200/50 dark:border-slate-700/50 pb-2 pt-2 shrink-0 bg-slate-50/10 dark:bg-slate-800/10">
            <div className="w-20 shrink-0"></div>
            <div className="flex-1 px-2 relative">
              {/* Event spans all 7 days */}
              <div className="absolute left-2 right-2 top-0 bottom-0 py-1 px-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[11px] font-bold rounded-md shadow-sm flex items-center gap-2">
                <Sparkles className="w-3 h-3" /> 夏期休暇 特別ブースト期間
              </div>
            </div>
          </div>

          {/* Hourly Time Grid */}
          <div className="flex-1 flex overflow-y-auto relative scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
            
            {/* Time Axis */}
            <div className="w-20 shrink-0 relative min-h-[780px]">
              {hours.map((hour, i) => (
                <div key={hour} className="absolute w-full pr-3 text-right text-[10px] font-bold text-slate-400 dark:text-slate-500 -translate-y-1/2" style={{ top: `${i * 60 + 30}px` }}>
                  {hour === 12 ? '正午' : hour < 12 ? `午前${hour}時` : `午後${hour - 12}時`}
                </div>
              ))}
            </div>

            {/* Grid Area */}
            <div className="flex-1 relative min-h-[780px] border-l border-slate-200/50 dark:border-slate-700/50">
              
              {/* Horizontal Lines */}
              {hours.map((hour, i) => (
                <div key={hour} className="absolute left-0 right-0 h-px bg-slate-200/50 dark:bg-slate-700/50" style={{ top: `${i * 60 + 30}px` }}></div>
              ))}
              
              {/* Vertical Lines */}
              {[1, 2, 3, 4, 5, 6].map((col) => (
                <div key={col} className="absolute top-0 bottom-0 border-l border-dashed border-slate-200/50 dark:border-slate-700/50" style={{ left: `${col * 14.2857}%` }}></div>
              ))}

              {/* Event Blocks (Mock Data mapped to exact pixel positions) */}
              {/* Assuming top: 30px is 10:00. Each hour is 60px (1px per minute). */}
              
              {/* Completed Event: 10:30 to 12:00 -> top: 30 + 30 = 60px, height: 90px */}
              <div className="absolute bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 border-l-4 border-l-emerald-500 text-emerald-800 dark:text-emerald-300 rounded-lg shadow-sm p-2 overflow-hidden group cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 z-10"
                   style={{ top: '60px', left: '0.5%', width: '13.28%', height: '90px' }}>
                <p className="text-xs font-black truncate flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />数I 基礎</p>
                <p className="text-[10px] font-medium opacity-80 mt-1">Focus Gold P.12~15</p>
                <p className="text-[9px] opacity-60 mt-1 font-mono">10:30 - 12:00</p>
              </div>

              {/* Missed Event: 13:00 to 14:00 -> top: 30 + 180 = 210px, height: 60px */}
              <div className="absolute bg-rose-50 dark:bg-rose-900/10 border border-rose-200/50 dark:border-rose-800/30 border-l-4 border-l-rose-400 text-rose-800 dark:text-rose-400 rounded-lg p-2 overflow-hidden opacity-70 group cursor-pointer transition-all hover:opacity-100 z-10"
                   style={{ top: '210px', left: '0.5%', width: '13.28%', height: '60px' }}>
                <p className="text-xs font-black line-through truncate flex items-center gap-1.5 text-rose-700/70 dark:text-rose-400/70"><XCircle className="w-3.5 h-3.5" />英単語</p>
                <p className="text-[10px] font-medium opacity-80 mt-0.5 line-through">Target 1900</p>
              </div>

              {/* Planned Event (Future): 15:00 to 16:30 on Sunday (Day 6) -> top: 30 + 300 = 330px, height: 90px */}
              <div className="absolute bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 border-l-4 border-l-brand-400 text-slate-800 dark:text-slate-200 rounded-lg shadow-sm p-2 overflow-hidden group cursor-pointer transition-all hover:shadow-md hover:border-brand-400 z-10"
                   style={{ top: '330px', left: '85.71%', width: '13.78%', height: '90px' }}>
                <p className="text-xs font-black truncate flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-brand-500" />物理 復習</p>
                <p className="text-[10px] font-medium opacity-80 mt-1 text-slate-500 dark:text-slate-400">力学全般</p>
                <p className="text-[9px] opacity-60 mt-1 font-mono text-brand-600 dark:text-brand-400">15:00 - 16:30</p>
              </div>

              {/* Current Time Line: e.g., 15:30 -> top: 30 + 330 = 360px */}
              <div className="absolute left-0 right-0 h-0.5 bg-rose-500 z-20 flex items-center pointer-events-none" style={{ top: '360px' }}>
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 -ml-1.5 shadow-[0_0_8px_rgba(244,63,94,0.8)] relative">
                  <div className="absolute inset-0 rounded-full bg-rose-400 animate-ping opacity-75"></div>
                </div>
                <div className="text-[10px] font-black text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 px-1.5 py-0.5 rounded shadow-sm ml-1">15:30</div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
