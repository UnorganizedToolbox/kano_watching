'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { ACHIEVEMENTS_DICT } from "@/lib/gamification/achievements";

export async function unlockAchievement(achievementId: string, tier?: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const baseAchievement = ACHIEVEMENTS_DICT[achievementId];
  if (!baseAchievement) throw new Error("Invalid achievement ID");

  const finalAchievementId = tier ? `${achievementId}_tier_${tier}` : achievementId;

  const { data: existing } = await supabase
    .from('student_achievements')
    .select('id')
    .eq('student_id', user.id)
    .eq('achievement_id', finalAchievementId)
    .single();

  if (existing) {
    return { success: false, message: "Already unlocked" };
  }

  const { error: insertError } = await supabase
    .from('student_achievements')
    .insert({
      student_id: user.id,
      achievement_id: finalAchievementId
    });

  if (insertError) {
    console.error("Failed to unlock achievement:", insertError);
    return { success: false, message: insertError.message };
  }

  let leveledUp = false;
  let oldLevel = 1;
  let newLevel = 1;
  let rewardStones = 0;

  const { data: profile } = await supabase
    .from('profiles')
    .select('exp, level, free_stones')
    .eq('id', user.id)
    .single();

  if (profile) {
    let currentExp = (profile.exp || 0) + baseAchievement.expReward;
    let currentLevel = profile.level || 1;
    oldLevel = currentLevel;
    let currentStones = profile.free_stones || 0;
    
    // レベルアップ判定 (必要EXP = レベルの2乗 * 100)
    let requiredExp = currentLevel * currentLevel * 100;
    while (currentExp >= requiredExp) {
      currentExp -= requiredExp;
      currentLevel += 1;
      requiredExp = currentLevel * currentLevel * 100;
      leveledUp = true;
    }

    newLevel = currentLevel;
    
    // レベルアップ報酬 (1レベルごとに50個の無償石とする)
    if (leveledUp) {
      rewardStones = (newLevel - oldLevel) * 50;
      currentStones += rewardStones;
    }

    const { error: expError } = await supabase
      .from('profiles')
      .update({ 
        exp: currentExp,
        level: currentLevel,
        free_stones: currentStones
      })
      .eq('id', user.id);
      
    if (expError) {
       console.error("Failed to add EXP:", expError);
    }
  }

  revalidatePath('/game');
  return { 
    success: true, 
    reward: baseAchievement.expReward,
    levelUp: leveledUp ? { oldLevel, newLevel, rewardStones } : null
  };
}
