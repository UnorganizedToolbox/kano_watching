'use client'

import { useState, useTransition, useEffect } from "react";
import { ACHIEVEMENTS_DICT, AchievementCategory } from "@/lib/gamification/achievements";
import { cn } from "@/lib/utils";
import { Trophy, CalendarDays, CalendarClock, Sparkles, Star, Lock, PartyPopper } from "lucide-react";
import { unlockAchievement } from "./actions";

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

export default function GamePortalClient({ profile, unlockedIds, activityStats }: { profile: any, unlockedIds: string[], activityStats?: any }) {
  const [activeTab, setActiveTab] = useState<AchievementCategory>('DAILY');
  const [isPending, startTransition] = useTransition();
  
  const [levelUpData, setLevelUpData] = useState<{oldLevel: number, newLevel: number, rewardStones: number} | null>(null);

  const filteredAchievements = Object.values(ACHIEVEMENTS_DICT).filter(
    (a) => a.category === activeTab
  );

  const getProgress = (id: string) => {
    switch(id) {
      case 'TOTAL_STUDY_INFINITE':
        return (profile?.total_study_minutes || 0) / 60; // 時間単位
      case 'LOGIN_STREAK_INFINITE':
      case 'LOGIN_STREAK_7':
        return profile?.current_streak_days || 0;
      case 'DAILY_1_POMO':
        return activityStats?.dailyPomoCount || 0;
      case 'WEEKLY_7_POMO':
        return activityStats?.weeklyPomoCount || 0;
      case 'TOTAL_TASKS_INFINITE':
        return activityStats?.dailyPomoCount || 0; // TODO: 本来はタスク完了数を取得する
      default:
        return 0;
    }
  };

  const achievementsWithStatus: any[] = [];
  
  filteredAchievements.forEach(achieve => {
    let currentProgress = getProgress(achieve.id);

    if (achieve.isInfinite && achieve.infiniteStep) {
      const completedTiers = Math.floor(currentProgress / achieve.infiniteStep);
      for (let i = 1; i <= completedTiers; i++) {
        const tierId = `${achieve.id}_tier_${i}`;
        const isUnlockedInDb = unlockedIds.includes(tierId);
        
        achievementsWithStatus.push({
          ...achieve,
          id: tierId,
          baseId: achieve.id,
          tier: i,
          name: `${achieve.name} (${i * achieve.infiniteStep}${achieve.unit})`,
          currentProgress: i * achieve.infiniteStep,
          targetProgress: i * achieve.infiniteStep,
          isCompleted: true,
          progressPercent: 100,
          isInfiniteTier: true,
          isRewardClaimed: isUnlockedInDb
        });
      }
      
      const nextTarget = (completedTiers + 1) * achieve.infiniteStep;
      achievementsWithStatus.push({
        ...achieve,
        id: `${achieve.id}_next`,
        baseId: achieve.id,
        currentProgress: currentProgress,
        targetProgress: nextTarget,
        isCompleted: false,
        progressPercent: (currentProgress / nextTarget) * 100,
        isRewardClaimed: false
      });
    } else {
      let targetProgress = achieve.maxProgress;
      let isCompleted = currentProgress >= targetProgress;
      currentProgress = Math.min(currentProgress, targetProgress);
      const progressPercent = Math.min(100, (currentProgress / targetProgress) * 100);
      const isUnlockedInDb = unlockedIds.includes(achieve.id);

      achievementsWithStatus.push({
        ...achieve,
        baseId: achieve.id,
        currentProgress,
        targetProgress,
        isCompleted,
        progressPercent,
        isRewardClaimed: isUnlockedInDb
      });
    }
  });

  const sortedAchievements = achievementsWithStatus.sort((a, b) => {
    if (a.isCompleted && !b.isCompleted) return 1;
    if (!a.isCompleted && b.isCompleted) return -1;
    return 0;
  });

  const handleClaim = (achieve: any) => {
    startTransition(async () => {
      const res = await unlockAchievement(achieve.baseId, achieve.tier);
      if (res && res.success && res.levelUp) {
        setLevelUpData(res.levelUp);
      }
    });
  };

  return (
    <>
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
              <span className="text-xs text-slate-500">Lv.{profile?.level || 1} EXP</span>
              <span className="text-lg">{profile?.exp || 0}</span>
            </div>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
            <div className="flex items-center gap-2 text-amber-500">
              <span className="text-xs text-slate-500">無償石</span>
              <span className="text-lg">{profile?.free_stones || 0}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-6 items-start">
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

          <div className="flex-1 flex flex-col gap-4">
            <div className="bg-white dark:bg-darkbg-secondary rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  {TABS.find(t => t.id === activeTab)?.icon}
                  {TABS.find(t => t.id === activeTab)?.label} ミッション
                </h3>
              </div>
              
              <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {sortedAchievements.map((achieve) => {
                  if (achieve.isHidden && !achieve.isCompleted) {
                    return null;
                  }

                  return (
                    <div key={achieve.id} className={cn(
                      "p-5 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30",
                      achieve.isCompleted && "bg-brand-50/30 dark:bg-brand-900/5",
                      achieve.isInfiniteTier && "opacity-80" 
                    )}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner border",
                            achieve.isCompleted 
                              ? "bg-gradient-to-br from-amber-300 to-amber-500 border-amber-400/50 text-white" 
                              : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
                          )}>
                            <Star className={cn("w-6 h-6", achieve.isCompleted ? "fill-white" : "")} />
                          </div>
                          <div className="flex-1">
                            <h4 className={cn(
                              "font-bold text-base mb-1",
                              achieve.isCompleted ? "text-amber-600 dark:text-amber-500" : "text-slate-700 dark:text-slate-200"
                            )}>
                              {achieve.name} {achieve.isInfinite && !achieve.isInfiniteTier && <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-md ml-1 align-middle">反復可</span>}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                              {achieve.description}
                            </p>
                            
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                  className={cn(
                                    "h-full rounded-full transition-all duration-1000",
                                    achieve.isCompleted ? "bg-amber-400" : "bg-brand-400"
                                  )}
                                  style={{ width: `${achieve.progressPercent}%` }}
                                />
                              </div>
                              <span className="text-xs font-mono font-bold text-slate-500 min-w-[60px] text-right">
                                {Math.floor(achieve.currentProgress)} / {achieve.targetProgress} <span className="text-[10px] text-slate-400">{achieve.unit}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="shrink-0 flex flex-col items-end justify-center gap-2 h-full py-1">
                          <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm">
                            <span className="text-[10px] opacity-80">EXP</span> {achieve.expReward}
                          </div>
                          {achieve.isCompleted ? (
                            achieve.isRewardClaimed ? (
                              <span className="text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/50">
                                受取済み
                              </span>
                            ) : (
                              <button 
                                onClick={() => handleClaim(achieve)}
                                disabled={isPending}
                                className="text-[10px] font-bold text-white bg-brand-500 hover:bg-brand-600 px-3 py-1 rounded-full shadow-sm shadow-brand-500/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                              >
                                報酬受取！
                              </button>
                            )
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {sortedAchievements.filter(a => !(a.isHidden && !a.isCompleted)).length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    このカテゴリにはまだ実績がありません。
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* レベルアップモーダル */}
      {levelUpData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-darkbg-primary rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center relative overflow-hidden animate-in zoom-in-95 duration-500">
            
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-brand-500/20 to-transparent"></div>
            
            <div className="w-20 h-20 bg-gradient-to-tr from-brand-400 to-brand-600 rounded-full flex items-center justify-center shadow-lg shadow-brand-500/30 mb-6 relative z-10 border-4 border-white dark:border-darkbg-primary">
              <PartyPopper className="w-10 h-10 text-white" />
            </div>
            
            <h3 className="text-3xl font-black font-title text-slate-800 dark:text-white mb-2 z-10">
              LEVEL UP!
            </h3>
            
            <div className="flex items-center gap-4 text-xl font-bold font-mono text-slate-500 mb-6 z-10">
              <span className="opacity-50 line-through">Lv.{levelUpData.oldLevel}</span>
              <i className="fa-solid fa-arrow-right text-brand-500"></i>
              <span className="text-3xl text-brand-500">Lv.{levelUpData.newLevel}</span>
            </div>
            
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 w-full mb-6 z-10">
              <p className="text-xs font-bold text-amber-600 dark:text-amber-500 mb-2">レベルアップ報酬</p>
              <div className="flex items-center justify-center gap-2 text-2xl font-black text-amber-500">
                <i className="fa-solid fa-gem"></i>
                +{levelUpData.rewardStones} <span className="text-sm">個</span>
              </div>
            </div>
            
            <button 
              onClick={() => setLevelUpData(null)}
              className="w-full py-4 bg-slate-800 hover:bg-slate-900 dark:bg-slate-200 dark:hover:bg-white text-white dark:text-slate-900 rounded-2xl font-bold transition-all active:scale-95 z-10 shadow-lg"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function GamepadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500">
      <line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/><rect width="20" height="12" x="2" y="6" rx="2"/>
    </svg>
  );
}
