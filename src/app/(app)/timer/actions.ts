'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { evaluateAchievements } from "@/lib/gamification/engine";

export async function askQuestion(formData: FormData) {
  const title = formData.get('title') as string;
  const body = formData.get('body') as string;
  const image = formData.get('image') as File | null;

  if (!title || !body) throw new Error('タイトルと内容は必須です');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('ログインしていません');

  let image_url = null;

  if (image && image.size > 0) {
    const fileExt = image.name.split('.').pop();
    const fileName = `${user.id}-${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `questions/${fileName}`;

    const { error: uploadError, data } = await supabase.storage
      .from('qa_images')
      .upload(filePath, image);

    if (uploadError) {
      console.error('Failed to upload image', uploadError);
      throw new Error('画像のアップロードに失敗しました');
    }

    const { data: publicUrlData } = supabase.storage
      .from('qa_images')
      .getPublicUrl(filePath);
      
    image_url = publicUrlData.publicUrl;
  }

  const { error } = await supabase.from('questions').insert({
    student_uuid: user.id,
    title,
    body,
    image_url,
    status: 'open'
  });

  if (error) {
    console.error('Failed to post question', error);
    throw new Error('質問の送信に失敗しました');
  }

  revalidatePath('/timer');
  return;
}

export async function logPomodoro(subject: string, minutes: number = 25) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('ログインしていません');

  // 1. pomodoro_logs に記録（既存の機能）
  // ただしスキーマエラーを避けるため、今回は student_activity_logs を主とする
  const { error: pomoError } = await supabase.from('pomodoro_logs').insert({
    student_uuid: user.id,
    subject,
    duration_seconds: minutes * 60,
    event_type: 'complete'
  });
  if (pomoError) throw new Error('pomodoro_logs insert error: ' + pomoError.message);

  // 2. student_activity_logs に記録（新機能用）
  const { error: actErr } = await supabase.from('student_activity_logs').insert({
    student_id: user.id,
    activity_type: 'POMODORO_COMPLETED',
    metadata: { minutes, subject }
  });
  if (actErr) throw new Error('activity logs insert error: ' + actErr.message);

  // 3. profiles の total_study_minutes を更新
  const { data: profile } = await supabase.from('profiles').select('total_study_minutes').eq('id', user.id).single();
  if (profile) {
    const { error: profErr } = await supabase.from('profiles').update({
      total_study_minutes: (profile.total_study_minutes || 0) + minutes
    }).eq('id', user.id);
  if (profErr) throw new Error('profile update error: ' + profErr.message);
  }

  // 4. 実績とレベルアップの自動評価
  const evaluationResult = await evaluateAchievements(user.id);

  revalidatePath('/');
  revalidatePath('/timer');
  revalidatePath('/game');
  
  return evaluationResult;
}
