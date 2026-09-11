'use server'

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { evaluateAchievements } from "@/lib/gamification/engine";
import { resolveEffectiveRules, type RuleMap, type OrgRuleMap } from "@/lib/rules";
import { FAVORITE_QUESTION_LIMIT, RESOLVED_QUESTION_RETENTION_LIMIT } from "@/lib/qaLimits";

// Supabase Storage の公開URLから "qa_images" バケット内のパスを逆算する。
// 例: https://xxx.supabase.co/storage/v1/object/public/qa_images/questions/foo.png -> questions/foo.png
function extractQaImagePath(url: string): string | null {
  const marker = '/qa_images/';
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

// 解決済みかつお気に入りでない質問が保持上限を超えた分を、古いものから
// 画像(storage)ごと削除する。RLSの owner 制約(教師が投稿した返信画像など)を
// 気にせず確実に削除できるよう service_role クライアントを使う。
async function cleanupOldResolvedQuestions(studentId: string) {
  const supabase = await createClient();
  const { data: eligible } = await supabase
    .from('questions')
    .select('id, image_url, replies')
    .eq('student_uuid', studentId)
    .eq('status', 'resolved')
    .eq('is_favorited', false)
    .order('created_at', { ascending: false });

  if (!eligible || eligible.length <= RESOLVED_QUESTION_RETENTION_LIMIT) return;

  const toDelete = eligible.slice(RESOLVED_QUESTION_RETENTION_LIMIT);
  const imagePaths: string[] = [];
  for (const q of toDelete) {
    if (q.image_url) {
      const p = extractQaImagePath(q.image_url);
      if (p) imagePaths.push(p);
    }
    for (const r of (q.replies as { image_url?: string | null }[] | null) || []) {
      if (r.image_url) {
        const p = extractQaImagePath(r.image_url);
        if (p) imagePaths.push(p);
      }
    }
  }

  const adminClient = createAdminClient();
  if (imagePaths.length > 0) {
    const { error: storageError } = await adminClient.storage.from('qa_images').remove(imagePaths);
    if (storageError) console.error('Failed to remove old QA images', storageError);
  }

  const { error: deleteError } = await adminClient.from('questions').delete().in('id', toDelete.map(q => q.id));
  if (deleteError) console.error('Failed to delete old resolved questions', deleteError);
}

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
  let orgRules: OrgRuleMap = {};
  if (askerProfile?.organization_id) {
    const { data: org } = await supabase.from('organizations').select('rules').eq('id', askerProfile.organization_id).single();
    orgRules = (org?.rules as OrgRuleMap) || {};
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

    const { error: uploadError } = await supabase.storage
      .from('qa_images')
      .upload(filePath, image);

    if (uploadError) {
      console.error('Failed to upload image', uploadError);
      throw new Error(`画像のアップロードに失敗しました: ${uploadError.message}`);
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

// 生徒が自分の質問スレッドに返信する。返信が来た(=先生の反応待ち)ことが分かるよう、
// 質問のステータスは常に 'open'(未回答) に戻す。
export async function replyToQuestion(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('ログインしていません');

  const questionId = formData.get('question_id') as string;
  const text = (formData.get('text') as string) || '';
  const image = formData.get('image') as File | null;
  const trimmed = text.trim();

  if (!trimmed && !(image && image.size > 0)) throw new Error('返信内容を入力してください');

  const { data: question, error: fetchError } = await supabase
    .from('questions')
    .select('replies, student_uuid, status')
    .eq('id', questionId)
    .single();

  if (fetchError || !question) throw new Error('質問が見つかりませんでした');
  if (question.student_uuid !== user.id) throw new Error('この質問に返信する権限がありません');
  if (question.status === 'resolved') throw new Error('解決済みの質問には返信できません');

  const { data: askerProfile } = await supabase.from('profiles').select('organization_id, rule_overrides').eq('id', user.id).single();
  let orgRules: OrgRuleMap = {};
  if (askerProfile?.organization_id) {
    const { data: org } = await supabase.from('organizations').select('rules').eq('id', askerProfile.organization_id).single();
    orgRules = (org?.rules as OrgRuleMap) || {};
  }
  const effective = resolveEffectiveRules(orgRules, askerProfile?.rule_overrides as RuleMap);
  if (effective.disable_questions) {
    throw new Error('教師/管理者によって質問箱の利用が禁止されています。');
  }

  let image_url: string | null = null;
  if (image && image.size > 0) {
    const fileExt = image.name.split('.').pop();
    const filePath = `replies/${user.id}-${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from('qa_images').upload(filePath, image);
    if (uploadError) {
      console.error('Failed to upload reply image', uploadError);
      throw new Error(`画像のアップロードに失敗しました: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage.from('qa_images').getPublicUrl(filePath);
    image_url = publicUrlData.publicUrl;
  }

  const updatedReplies = [...(question.replies || []), {
    role: 'student',
    text: trimmed,
    image_url,
    created_at: new Date().toISOString(),
  }];

  const { error } = await supabase.from('questions').update({
    replies: updatedReplies,
    status: 'open',
  }).eq('id', questionId);

  if (error) {
    console.error('Failed to reply to question', error);
    throw new Error('返信の送信に失敗しました');
  }

  revalidatePath('/timer');
}

export async function resolveQuestion(questionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('ログインしていません');

  const { error } = await supabase.from('questions').update({ status: 'resolved' }).eq('id', questionId).eq('student_uuid', user.id);

  if (error) {
    console.error('Failed to resolve question', error);
    throw new Error('解決済みへの変更に失敗しました');
  }

  await cleanupOldResolvedQuestions(user.id);

  revalidatePath('/timer');
}

// お気に入りの切り替え。お気に入りにした質問は自動削除の対象から外れる。
// 上限(FAVORITE_QUESTION_LIMIT)を超えて新たにお気に入りにすることはできない。
export async function toggleQuestionFavorite(questionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('ログインしていません');

  const { data: question } = await supabase.from('questions').select('student_uuid, is_favorited').eq('id', questionId).single();
  if (!question || question.student_uuid !== user.id) throw new Error('この質問を操作する権限がありません');

  const nextValue = !question.is_favorited;

  if (nextValue) {
    const { count } = await supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('student_uuid', user.id)
      .eq('is_favorited', true);

    if ((count || 0) >= FAVORITE_QUESTION_LIMIT) {
      throw new Error(`お気に入りは最大${FAVORITE_QUESTION_LIMIT}件までです`);
    }
  }

  const { error } = await supabase.from('questions').update({ is_favorited: nextValue }).eq('id', questionId);

  if (error) {
    console.error('Failed to toggle question favorite', error);
    throw new Error('お気に入りの更新に失敗しました');
  }

  revalidatePath('/timer');
  return nextValue;
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
