import { createClient } from "@/utils/supabase/server";
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

  // Get daily/weekly stats (mocked as total for now, or just query properly)
  const { count: dailyPomoCount } = await supabase
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
      case 'DAILY_1_POMO':
      case 'WEEKLY_7_POMO':
      case 'TOTAL_TASKS_INFINITE':
        return dailyPomoCount || 0;
      default:
        return 0;
    }
  };

  // Get currently unlocked
  const { data: unlockedData } = await supabase
    .from('student_achievements')
    .select('achievement_id')
    .eq('student_id', userId);
    
  const unlockedIds = unlockedData?.map(a => a.achievement_id) || [];
  
  let totalExpGained = 0;
  const newlyUnlocked = [];

  for (const achieve of Object.values(ACHIEVEMENTS_DICT)) {
    const currentProgress = getProgress(achieve.id);
    
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

  if (newlyUnlocked.length === 0) return null;

  // Insert new achievements
  for (const u of newlyUnlocked) {
    const { error: achErr } = await supabase.from('student_achievements').insert({
      student_id: userId,
      achievement_id: u.id
    });
    if (achErr) console.error('achieve insert err:', achErr);
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
    levelUp: leveledUp ? { oldLevel, newLevel: currentLevel, rewardStones } : null
  };
}
