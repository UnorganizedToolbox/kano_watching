'use client'

import { useState } from 'react';
import { ACHIEVEMENTS_DICT } from '@/lib/gamification/achievements';
import { Trophy, Star, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  profile: any;
  unlockedIds: string[];
}

export default function AchievementsClient({ profile, unlockedIds }: Props) {
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'EVENT'>('GENERAL');

  // Filter and enrich achievements
  const sortedAchievements = Object.values(ACHIEVEMENTS_DICT)
    .filter(a => a.category === activeTab)
    .map(achieve => {
      const isCompleted = unlockedIds.includes(achieve.id);
      
      // Calculate progress based on profile data (simplified for UI)
      let currentProgress = 0;
      switch(achieve.id) {
        case 'TOTAL_STUDY_INFINITE':
          currentProgress = (profile?.total_study_minutes || 0) / 60;
          break;
        case 'LOGIN_STREAK_INFINITE':
        case 'LOGIN_STREAK_7':
          currentProgress = profile?.current_streak_days || 0;
          break;
        case 'TOTAL_TASKS_INFINITE':
          currentProgress = 0; // Mocked
          break;
      }
      
      if (isCompleted) {
        currentProgress = achieve.maxProgress;
      } else {
        currentProgress = Math.min(currentProgress, achieve.maxProgress);
      }
      
      const progressPercent = (currentProgress / achieve.maxProgress) * 100;
      
      return {
        ...achieve,
        isCompleted,
        currentProgress,
        progressPercent
      };
    })
    .sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
      return 0; // Maintain source order
    });

  return (
    <div className="max-w-[1000px] mx-auto w-full pt-4 pb-12 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black font-title text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
            <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-2xl flex items-center justify-center rotate-3 shadow-sm border border-brand-200 dark:border-brand-800/50">
              <Trophy className="w-6 h-6" />
            </div>
            アチーブメント（実績）
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">これまでの学習の軌跡と獲得した称号</p>
        </div>
      </div>

      <div className="bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="flex border-b border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('GENERAL')}
            className={cn(
              "flex-1 py-4 text-sm font-bold transition-colors",
              activeTab === 'GENERAL' 
                ? "text-brand-600 dark:text-brand-400 border-b-2 border-brand-500 bg-brand-50/30 dark:bg-brand-900/10" 
                : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            )}
          >
            一般実績 (称号)
          </button>
          <button
            onClick={() => setActiveTab('EVENT')}
            className={cn(
              "flex-1 py-4 text-sm font-bold transition-colors",
              activeTab === 'EVENT' 
                ? "text-brand-600 dark:text-brand-400 border-b-2 border-brand-500 bg-brand-50/30 dark:bg-brand-900/10" 
                : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            )}
          >
            イベント・限定実績
          </button>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
          {sortedAchievements.map((achieve) => {
            if (achieve.isHidden && !achieve.isCompleted) {
              return (
                <div key={achieve.id} className="p-6 flex items-center gap-6 opacity-40 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="w-14 h-14 rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <Lock className="w-6 h-6 text-slate-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-700 dark:text-slate-300">？？？</h4>
                    <p className="text-xs text-slate-500">条件は秘密です。</p>
                  </div>
                </div>
              );
            }

            return (
              <div key={achieve.id} className={cn(
                "p-6 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30 flex items-center gap-6",
                achieve.isCompleted && "bg-brand-50/30 dark:bg-brand-900/5"
              )}>
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-inner border",
                  achieve.isCompleted 
                    ? "bg-gradient-to-br from-amber-300 to-amber-500 border-amber-400/50 text-white" 
                    : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
                )}>
                  <Trophy className={cn("w-8 h-8", achieve.isCompleted ? "fill-amber-100 text-amber-200" : "")} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className={cn(
                      "font-bold text-lg",
                      achieve.isCompleted ? "text-amber-600 dark:text-amber-500" : "text-slate-700 dark:text-slate-200"
                    )}>
                      {achieve.name}
                    </h4>
                    {achieve.isCompleted && (
                      <span className="text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/50">
                        獲得済み称号
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                    {achieve.description}
                  </p>
                  
                  {!achieve.isCompleted && (
                    <div className="flex items-center gap-3 max-w-md">
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-1000 bg-brand-400"
                          style={{ width: `${Math.max(0, Math.min(100, achieve.progressPercent))}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-500 min-w-[60px] text-right">
                        {Math.floor(achieve.currentProgress)} / {achieve.maxProgress} <span className="text-[10px] text-slate-400">{achieve.unit}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {sortedAchievements.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">
              実績がありません。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
