'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { ACHIEVEMENTS_DICT } from "@/lib/gamification/achievements";

export async function debugSimulatePomodoro() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) throw new Error("Profile not found");

  const newTotalMinutes = (profile.total_study_minutes || 0) + 25;
  const currentStreak = profile.current_streak_days || 0;
  const newStreak = currentStreak === 0 ? 1 : currentStreak;
  const newExp = (profile.exp || 0) + 20;

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      total_study_minutes: newTotalMinutes,
      current_streak_days: newStreak,
      exp: newExp,
    })
    .eq('id', user.id);

  if (profileError) {
    console.error("Profile update error:", profileError);
    throw new Error(profileError.message);
  }

  const { error: logError } = await supabase
    .from('student_activity_logs')
    .insert({
      student_id: user.id,
      activity_type: 'POMODORO_COMPLETED',
      metadata: { minutes: 25 }
    });

  if (logError) {
    console.error("Log insert error:", logError);
    throw new Error(logError.message);
  }

  revalidatePath('/game');
  revalidatePath('/timer');
}

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('exp')
    .eq('id', user.id)
    .single();

  if (profile) {
    const { error: expError } = await supabase
      .from('profiles')
      .update({ exp: (profile.exp || 0) + baseAchievement.expReward })
      .eq('id', user.id);
      
    if (expError) {
       console.error("Failed to add EXP:", expError);
    }
  }

  revalidatePath('/game');
  return { success: true, reward: baseAchievement.expReward };
}

export async function resetAchievements() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error: delError } = await supabase
    .from('student_achievements')
    .delete()
    .eq('student_id', user.id);
    
  if (delError) {
     console.error("Reset del error:", delError);
     throw new Error(delError.message);
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      total_study_minutes: 0,
      current_streak_days: 0,
      exp: 0,
      level: 1
    })
    .eq('id', user.id);
    
  if (updateError) {
     console.error("Reset update error:", updateError);
     throw new Error(updateError.message);
  }

  revalidatePath('/game');
  revalidatePath('/timer');
}
