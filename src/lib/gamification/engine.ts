import { createClient } from "@/utils/supabase/server";
import { ACHIEVEMENTS_DICT } from "./achievements";
import { calc_Lv_from_EXP } from "./level";

export async function evaluateAchievements(userId: string) {
  const supabase = await createClient();
  
  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (!profile) return null;

  // Time boundaries based on JST/Local concept
  // DAILY: Resets at 00:00
  // WEEKLY: Resets at Monday 00:00
  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const startOfWeekDate = new Date(now.setDate(diff));
  const startOfWeekStr = startOfWeekDate.toISOString().split('T')[0];

  // Fetch all activity logs
  const { data: allLogs } = await supabase
    .from('student_activity_logs')
    .select('activity_type, activity_date, metadata')
    .eq('student_id', userId);

  const logs = allLogs || [];

  // Grouped stats calculation
  const stats = {
    DAILY: { POMODORO_COUNT: 0 },
    WEEKLY: { POMODORO_COUNT: 0 },
    GENERAL: { 
      POMODORO_COUNT: 0, 
      LOGIN_STREAK: profile.current_streak_days || 0,
      TOTAL_STUDY_HOURS: (profile.total_study_minutes || 0) / 60 
    }
  };

  const rewardedToday: string[] = [];
  const rewardedThisWeek: string[] = [];

  for (const log of logs) {
    const isToday = log.activity_date === todayStr;
    const isThisWeek = log.activity_date >= startOfWeekStr;

    if (log.activity_type === 'POMODORO_COMPLETED') {
      stats.GENERAL.POMODORO_COUNT++;
      if (isThisWeek) stats.WEEKLY.POMODORO_COUNT++;
      if (isToday) stats.DAILY.POMODORO_COUNT++;
    }

    if (log.activity_type === 'MISSION_REWARDED') {
      const mId = log.metadata?.mission_id;
      if (mId) {
        if (isThisWeek) rewardedThisWeek.push(mId);
        if (isToday) rewardedToday.push(mId);
      }
    }
  }

  // Get currently unlocked permanent achievements
  const { data: unlockedData } = await supabase
    .from('student_achievements')
    .select('achievement_id')
    .eq('student_id', userId);
    
  const unlockedIds = unlockedData?.map(a => a.achievement_id) || [];
  
  let totalExpGained = 0;
  const newlyUnlocked: any[] = [];
  const newlyRewardedMissions: string[] = [];

  // Helper to resolve progress
  const getProgress = (achieve: any) => {
    switch (achieve.id) {
      case 'TOTAL_STUDY_INFINITE': return stats.GENERAL.TOTAL_STUDY_HOURS;
      case 'LOGIN_STREAK_INFINITE':
      case 'LOGIN_STREAK_7': return stats.GENERAL.LOGIN_STREAK;
      case 'TOTAL_TASKS_INFINITE': return stats.GENERAL.POMODORO_COUNT;
      case 'DAILY_1_POMO': return stats.DAILY.POMODORO_COUNT;
      case 'WEEKLY_7_POMO': return stats.WEEKLY.POMODORO_COUNT;
      case 'WEEKLY_DAILY_5_DAYS': return 0; // Mocked for now
      default: return 0;
    }
  };

  for (const achieve of Object.values(ACHIEVEMENTS_DICT)) {
    const currentProgress = getProgress(achieve);
    
    // Process by Category
    if (achieve.category === 'DAILY') {
      if (currentProgress >= achieve.maxProgress && !rewardedToday.includes(achieve.id)) {
        newlyRewardedMissions.push(achieve.id);
        totalExpGained += achieve.expReward;
      }
    } else if (achieve.category === 'WEEKLY') {
      if (currentProgress >= achieve.maxProgress && !rewardedThisWeek.includes(achieve.id)) {
        newlyRewardedMissions.push(achieve.id);
        totalExpGained += achieve.expReward;
      }
    } else {
      // GENERAL or EVENT (Permanent)
      if (achieve.isInfinite && achieve.infiniteStep) {
        const completedTiers = Math.floor(currentProgress / achieve.infiniteStep);
        for (let i = 1; i <= completedTiers; i++) {
          const tierId = `${achieve.id}_tier_${i}`;
          if (!unlockedIds.includes(tierId)) {
            newlyUnlocked.push({ id: tierId, exp: achieve.expReward });
            totalExpGained += achieve.expReward;
            unlockedIds.push(tierId);
          }
        }
      } else {
        if (currentProgress >= achieve.maxProgress && !unlockedIds.includes(achieve.id)) {
          newlyUnlocked.push({ id: achieve.id, exp: achieve.expReward });
          totalExpGained += achieve.expReward;
          unlockedIds.push(achieve.id);
        }
      }
    }
  }

  if (newlyUnlocked.length === 0 && newlyRewardedMissions.length === 0) return null;

  // Insert new permanent achievements
  for (const u of newlyUnlocked) {
    await supabase.from('student_achievements').insert({
      student_id: userId,
      achievement_id: u.id
    });
  }

  // Insert mission reward logs
  for (const mId of newlyRewardedMissions) {
    await supabase.from('student_activity_logs').insert({
      student_id: userId,
      activity_type: 'MISSION_REWARDED',
      activity_date: todayStr,
      metadata: { mission_id: mId }
    });
  }

  // Handle EXP using pure calc_Lv_from_EXP
  const currentTotalExp = profile.exp || 0;
  const oldLevelData = calc_Lv_from_EXP(currentTotalExp);
  
  const newTotalExp = currentTotalExp + totalExpGained;
  const newLevelData = calc_Lv_from_EXP(newTotalExp);
  
  let currentStones = profile.free_stones || 0;
  let rewardStones = 0;
  
  if (newLevelData.level > oldLevelData.level) {
    rewardStones = (newLevelData.level - oldLevelData.level) * 50;
    currentStones += rewardStones;
  }
  
  const { error: profErr } = await supabase.from('profiles').update({
    exp: newTotalExp,
    free_stones: currentStones
  }).eq('id', userId);
  
  if (profErr) console.error('engine profile err:', profErr);

  return {
    achievements: newlyUnlocked,
    missions: newlyRewardedMissions,
    levelUp: (newLevelData.level > oldLevelData.level) 
      ? { oldLevel: oldLevelData.level, newLevel: newLevelData.level, rewardStones } 
      : null
  };
}
