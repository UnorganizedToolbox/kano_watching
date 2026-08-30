'use client'

import { useState } from "react";
import { ACHIEVEMENTS_DICT, AchievementCategory } from "@/lib/gamification/achievements";
import { cn } from "@/lib/utils";
import { Trophy, CalendarDays, CalendarClock, Sparkles, Star } from "lucide-react";

type TabConfig = {
  id: AchievementCategory;
  label: string;
  icon: React.ReactNode;
};

const TABS: TabConfig[] = [
  { id: 'DAILY', label: 'デイリー', icon: <CalendarDays className="w-4 h-4" /> },
  { id: 'WEEKLY', label: 'ウィークリー', icon: <CalendarClock className="w-4 h-4" /> },
  { id: 'GENERAL', label: '通常', icon: <Trophy className="w-4 h-4" /> },
  { id: 'EVENT', label: '限定', icon: <Sparkles className="w-4 h-4" /> },
];

// モックデータ：後でDB（student_achievements等）から取得する
const MOCK_PROGRESS: Record<string, number> = {
  'LOGIN_STREAK_7': 3,
  'STUDY_1HR_STREAK_3': 1,
  'TOTAL_STUDY_100HR': 42.5,
  'TOTAL_TASKS_50': 12,
  'MAX_CONTINUOUS_STUDY_18': 4.5,
  'FIRST_QUESTION': 1,
  'FIRST_FRIEND': 0,
  'FRIENDS_20': 0,
  'DAILY_1_POMO': 1,
  'DAILY_VOCAB': 0,
  'WEEKLY_7_POMO': 4,
  'WEEKLY_DAILY_5_DAYS': 2,
  'EVENT_SUMMER_80HR': 85,
};

export default function GamePortalPage() {
  const [activeTab, setActiveTab] = useState<AchievementCategory>('DAILY');

  const filteredAchievements = Object.values(ACHIEVEMENTS_DICT).filter(
    (a) => a.category === activeTab
  );

  return (
    <section className="flex-1 flex flex-col gap-6 max-w-[1000px] mx-auto w-full px-6 pt-4 pb-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-end justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-3xl font-black font-title tracking-tight text-slate-800 dark:text-white flex items-center gap-3">
            <GamepadIcon /> Game Portal
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">
            獲得した石やEXPを使って、報酬と交換しましょう。
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm font-bold bg-white dark:bg-darkbg-secondary px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
            <span className="text-xs text-slate-500">EXP</span>
            <span className="text-lg">0</span>
          </div>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
          <div className="flex items-center gap-2 text-amber-500">
            <span className="text-xs text-slate-500">無償石</span>
            <span className="text-lg">0</span>
          </div>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        {/* サイドナビゲーション（タブ） */}
        <div className="w-48 shrink-0 flex flex-col gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200",
                activeTab === tab.id
                  ? "bg-brand-500 text-white shadow-md shadow-brand-500/20 translate-x-1"
                  : "bg-white dark:bg-darkbg-secondary text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:translate-x-1 border border-slate-200 dark:border-slate-800"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* アチーブメントリスト */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="bg-white dark:bg-darkbg-secondary rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                {TABS.find(t => t.id === activeTab)?.icon}
                {TABS.find(t => t.id === activeTab)?.label} ミッション
              </h3>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                全 {filteredAchievements.length} 件
              </span>
            </div>
            
            <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {filteredAchievements.map((achieve) => {
                const currentProgress = MOCK_PROGRESS[achieve.id] || 0;
                const isCompleted = currentProgress >= achieve.maxProgress;
                const progressPercent = Math.min(100, (currentProgress / achieve.maxProgress) * 100);

                return (
                  <div key={achieve.id} className={cn(
                    "p-5 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30",
                    isCompleted && "bg-brand-50/30 dark:bg-brand-900/5"
                  )}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner border",
                          isCompleted 
                            ? "bg-gradient-to-br from-amber-300 to-amber-500 border-amber-400/50 text-white" 
                            : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
                        )}>
                          <Star className={cn("w-6 h-6", isCompleted ? "fill-white" : "")} />
                        </div>
                        <div className="flex-1">
                          <h4 className={cn(
                            "font-bold text-base mb-1",
                            isCompleted ? "text-amber-600 dark:text-amber-500" : "text-slate-700 dark:text-slate-200"
                          )}>
                            {achieve.name}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                            {achieve.description}
                          </p>
                          
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full rounded-full transition-all duration-1000",
                                  isCompleted ? "bg-amber-400" : "bg-brand-400"
                                )}
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-500 min-w-[60px] text-right">
                              {currentProgress} / {achieve.maxProgress} <span className="text-[10px] text-slate-400">{achieve.unit}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="shrink-0 flex flex-col items-end justify-center gap-2 h-full py-1">
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm">
                          <span className="text-[10px] opacity-80">EXP</span> {achieve.expReward}
                        </div>
                        {isCompleted && (
                          <span className="text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/50">
                            達成済み
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function GamepadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500">
      <line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/><rect width="20" height="12" x="2" y="6" rx="2"/>
    </svg>
  );
}
