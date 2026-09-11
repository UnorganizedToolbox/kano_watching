'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { evaluateAchievements } from "@/lib/gamification/engine";
import { resolveEffectiveRules, type RuleMap } from "@/lib/rules";

export async function askQuestion(formData: FormData) {
  const supabase = await createClient();

  // Check if questions are disabled by admin
  const { data: configLogs } = await supabase
    .from('student_activity_logs')
    .select('metadata')
    .eq('activity_type', 'SYSTEM_CONFIG')
    .order('created_at', { ascending: false })
    .limit(1);

  if (configLogs && configLogs.length > 0 && configLogs[0].metadata) {
    const meta = configLogs[0].metadata as any;
    if (meta.questions_enabled === false) {
      throw new Error('現在、管理者によって質問の受付が一時的に停止されています。');
    }
  }

  // --- End Check ---

  const title = formData.get('title') as string;
  const body = formData.get('body') as string;
  const image = formData.get('image') as File | null;

  if (!title || !body) throw new Error('タイトルと内容は必須です');

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('ログインしていません');

  const { data: askerProfile } = await supabase.from('profiles').select('organization_id, rule_overrides').eq('id', user.id).single();
  let orgRules: RuleMap = {};
  if (askerProfile?.organization_id) {
    const { data: org } = await supabase.from('organizations').select('rules').eq('id', askerProfile.organization_id).single();
    orgRules = (org?.rules as RuleMap) || {};
  }
  const effective = resolveEffectiveRules(orgRules, askerProfile?.rule_overrides as RuleMap);
  if (effective.disable_questions) {
    throw new Error('教師/管理者によって質問の投稿が禁止されています。');
  }

  // April Fools Easter Egg
  const today = new Date();
  const isAprilFirst = today.getMonth() === 3 && today.getDate() === 1;
  const isAprilFoolTag = title.includes('#Aprilfool') || body.includes('#Aprilfool');

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

  // Easter Egg Intercept
  if (isAprilFirst && isAprilFoolTag) {
    const randomScore = Math.floor(Math.random() * 101);
    const { error } = await supabase.from('questions').insert({
      student_uuid: user.id,
      title,
      body,
      image_url,
      status: 'answered',
      answer_body: `🎉 エイプリルフール特別判定！
あなたの嘘の点数は... 【 ${randomScore}点 】 です！`
    });

    if (error) {
      console.error('Failed to post april fool question', error);
      throw new Error('質問の送信に失敗しました');
    }

    revalidatePath('/timer');
    return;
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

type PomodoroEventType = 'START' | 'PAUSE' | 'STOP' | 'COMPLETE' | 'CHECK_REMAINING_TIME' | 'RATING_SUBMITTED' | 'QUIT' | 'ABANDONED';
type PomodoroMode = 'WORK' | 'BREAK' | 'LONG_BREAK';

export async function logPomodoroEvent(
  sessionId: string,
  mode: PomodoroMode,
  eventType: PomodoroEventType,
  metadata: Record<string, unknown> = {}
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from('pomodoro_events').insert({
    student_uuid: user.id,
    session_id: sessionId,
    mode,
    event_type: eventType,
    metadata,
  });

  if (error) console.error('Failed to log pomodoro event', error);
}

export async function logPomodoro(subject: string, minutes: number = 25, concentrationRating?: number, memo?: string) {
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
  const metadata: Record<string, string | number> = { minutes, subject };
  if (concentrationRating) metadata.concentrationRating = concentrationRating;
  if (memo) metadata.memo = memo;

  const { error: actErr } = await supabase.from('student_activity_logs').insert({
    student_id: user.id,
    activity_type: 'POMODORO_COMPLETED',
    metadata
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
