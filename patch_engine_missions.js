const fs = require('fs');

let content = fs.readFileSync('src/lib/gamification/engine.ts', 'utf8');

// We need to rewrite evaluateAchievements to handle Daily/Weekly resets properly.
const newEngine = `import { createClient } from "@/utils/supabase/server";
import { ACHIEVEMENTS_DICT } from "./achievements";

export async function evaluateAchievements(userId: string) {
  const supabase = await createClient();
  
  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (!profile) return null;

  // Get Dates
  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday as start of week
  const startOfWeekDate = new Date(now.setDate(diff));
  const startOfWeekStr = startOfWeekDate.toISOString().split('T')[0];

  // Get daily/weekly stats
  const { count: dailyPomoCount } = await supabase
    .from('student_activity_logs')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', userId)
    .eq('activity_type', 'POMODORO_COMPLETED')
    .eq('activity_date', todayStr);

  const { count: weeklyPomoCount } = await supabase
    .from('student_activity_logs')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', userId)
    .eq('activity_type', 'POMODORO_COMPLETED')
    .gte('activity_date', startOfWeekStr);

  // Get Total Pomo Count
  const { count: totalPomoCount } = await supabase
    .from('student_activity_logs')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', userId)
    .eq('activity_type', 'POMODORO_COMPLETED');
    
  const getProgress = (id: string) => {
    switch(id) {
      case 'TOTAL_STUDY_INFINITE':
        return (profile.total_study_minutes || 0) / 60;
      case 'LOGIN_STREAK_INFINITE':
      case 'LOGIN_STREAK_7':
        return profile.current_streak_days || 0;
      case 'TOTAL_TASKS_INFINITE':
        return totalPomoCount || 0;
      case 'DAILY_1_POMO':
        return dailyPomoCount || 0;
      case 'WEEKLY_7_POMO':
        return weeklyPomoCount || 0;
      case 'WEEKLY_DAILY_5_DAYS':
        return 0; // Requires complex query, mock for now
      default:
        return 0;
    }
  };

  // Get currently unlocked permanent achievements
  const { data: unlockedData } = await supabase
    .from('student_achievements')
    .select('achievement_id')
    .eq('student_id', userId);
    
  const unlockedIds = unlockedData?.map(a => a.achievement_id) || [];

  // Get rewarded missions for today/this week
  const { data: rewardedData } = await supabase
    .from('student_activity_logs')
    .select('activity_type, metadata, activity_date')
    .eq('student_id', userId)
    .eq('activity_type', 'MISSION_REWARDED')
    .gte('activity_date', startOfWeekStr);

  const rewardedToday = rewardedData?.filter(r => r.activity_date === todayStr).map(r => r.metadata?.mission_id) || [];
  const rewardedThisWeek = rewardedData?.map(r => r.metadata?.mission_id) || [];
  
  let totalExpGained = 0;
  const newlyUnlocked = [];
  const newlyRewardedMissions = [];

  for (const achieve of Object.values(ACHIEVEMENTS_DICT)) {
    const currentProgress = getProgress(achieve.id);
    
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
      // General or Event (Permanent)
      if (achieve.isInfinite && achieve.infiniteStep) {
        const completedTiers = Math.floor(currentProgress / achieve.infiniteStep);
        for (let i = 1; i <= completedTiers; i++) {
          const tierId = \`\${achieve.id}_tier_\${i}\`;
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

  // Handle EXP and Level up
  let currentExp = (profile.exp || 0) + totalExpGained;
  let currentLevel = profile.level || 1;
  const oldLevel = currentLevel;
  let currentStones = profile.free_stones || 0;
  
  let requiredExp = currentLevel * currentLevel * 100;
  let leveledUp = false;
  
  while (currentExp >= requiredExp) {
    currentExp -= requiredExp;
    currentLevel += 1;
    requiredExp = currentLevel * currentLevel * 100;
    leveledUp = true;
  }
  
  let rewardStones = 0;
  if (leveledUp) {
    rewardStones = (currentLevel - oldLevel) * 50;
    currentStones += rewardStones;
  }
  
  const { error: profErr } = await supabase.from('profiles').update({
    exp: currentExp,
    level: currentLevel,
    free_stones: currentStones
  }).eq('id', userId);
  if (profErr) console.error('engine profile err:', profErr);

  return {
    achievements: newlyUnlocked,
    missions: newlyRewardedMissions,
    levelUp: leveledUp ? { oldLevel, newLevel: currentLevel, rewardStones } : null
  };
}
`;

fs.writeFileSync('src/lib/gamification/engine.ts', newEngine);
