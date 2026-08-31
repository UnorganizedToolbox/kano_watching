'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { ACHIEVEMENTS_DICT } from "@/lib/gamification/achievements";

// デバッグ用: ポモドーロを完了したことにして経験値や進捗を進める
export async function debugSimulatePomodoro() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // プロフィール取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) throw new Error("Profile not found");

  // 1ポモドーロ (25分) 追加
  const newTotalMinutes = (profile.total_study_minutes || 0) + 25;
  const currentStreak = profile.current_streak_days || 0;
  const newStreak = currentStreak === 0 ? 1 : currentStreak; // とりあえず1日目とする

  // EXP追加 (仮でポモドーロ完了で20EXPとする)
  const newExp = (profile.exp || 0) + 20;

  // DB更新
  await supabase
    .from('profiles')
    .update({
      total_study_minutes: newTotalMinutes,
      current_streak_days: newStreak,
      exp: newExp,
    })
    .eq('id', user.id);

  // 日常アクションログを追加
  await supabase
    .from('student_activity_logs')
    .insert({
      student_id: user.id,
      activity_type: 'POMODORO_COMPLETED',
      metadata: { minutes: 25 }
    });

  revalidatePath('/game');
  revalidatePath('/timer');
}

// 実績のアンロック処理
export async function unlockAchievement(achievementId: string, tier?: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const baseAchievement = ACHIEVEMENTS_DICT[achievementId];
  if (!baseAchievement) throw new Error("Invalid achievement ID");

  const finalAchievementId = tier ? `${achievementId}_tier_${tier}` : achievementId;

  // 既に取得済みかチェック
  const { data: existing } = await supabase
    .from('student_achievements')
    .select('id')
    .eq('student_id', user.id)
    .eq('achievement_id', finalAchievementId)
    .single();

  if (existing) {
    return { success: false, message: "Already unlocked" };
  }

  // 取得レコード挿入
  const { error } = await supabase
    .from('student_achievements')
    .insert({
      student_id: user.id,
      achievement_id: finalAchievementId
    });

  if (error) {
    console.error("Failed to unlock achievement:", error);
    return { success: false, message: error.message };
  }

  // EXP付与
  const { data: profile } = await supabase
    .from('profiles')
    .select('exp')
    .eq('id', user.id)
    .single();

  if (profile) {
    await supabase
      .from('profiles')
      .update({ exp: (profile.exp || 0) + baseAchievement.expReward })
      .eq('id', user.id);
  }

  revalidatePath('/game');
  return { success: true, reward: baseAchievement.expReward };
}

export async function resetAchievements() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // アチーブメント履歴を削除
  await supabase
    .from('student_achievements')
    .delete()
    .eq('student_id', user.id);

  // プロフィールのEXP等をリセット
  await supabase
    .from('profiles')
    .update({
      total_study_minutes: 0,
      current_streak_days: 0,
      exp: 0,
      level: 1
    })
    .eq('id', user.id);

  revalidatePath('/game');
  revalidatePath('/timer');
}
