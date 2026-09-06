'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('ログインしていません');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') throw new Error('権限がありません');

  return supabase;
}

export async function setStudentStatus(studentId: string, status: 'active' | 'disabled') {
  const supabase = await verifyAdmin();

  const { error } = await supabase.from('profiles').update({ status }).eq('id', studentId).eq('role', 'student');

  if (error) {
    console.error('Failed to update student status', error);
    throw new Error('生徒のステータス更新に失敗しました');
  }

  revalidatePath('/admin');
  revalidatePath(`/admin/student/${studentId}`);
}

export async function setStudentNickname(studentId: string, name: string, locked: boolean) {
  const supabase = await verifyAdmin();

  const trimmed = name.trim();
  if (!trimmed) throw new Error('ニックネームを入力してください');

  const { error } = await supabase.from('profiles').update({ name: trimmed, nickname_locked: locked }).eq('id', studentId).eq('role', 'student');

  if (error) {
    console.error('Failed to update student nickname', error);
    throw new Error('ニックネームの更新に失敗しました');
  }

  revalidatePath('/admin');
  revalidatePath(`/admin/student/${studentId}`);
}

export async function addAdminReply(questionId: string, text: string) {
  const supabase = await verifyAdmin();

  const trimmed = text.trim();
  if (!trimmed) throw new Error('返信内容を入力してください');

  const { data: question, error: fetchError } = await supabase
    .from('questions')
    .select('replies')
    .eq('id', questionId)
    .single();

  if (fetchError || !question) {
    console.error('Failed to fetch question for reply', fetchError);
    throw new Error('質問が見つかりませんでした');
  }

  const updatedReplies = [...(question.replies || []), {
    role: 'admin',
    text: trimmed,
    created_at: new Date().toISOString(),
  }];

  const { error } = await supabase.from('questions').update({
    replies: updatedReplies,
    status: 'answered',
  }).eq('id', questionId);

  if (error) {
    console.error('Failed to add admin reply', error);
    throw new Error('返信の送信に失敗しました');
  }

  revalidatePath('/admin');
  revalidatePath('/timer');
}

export async function answerQuestion(formData: FormData) {
  const question_id = formData.get('question_id') as string;
  const answer_body = formData.get('answer_body') as string;

  if (!question_id || !answer_body) throw new Error('必要なデータがありません');

  const supabase = await verifyAdmin();

  const { error } = await supabase.from('questions').update({
    status: 'answered',
    answer_body,
    answered_at: new Date().toISOString()
  }).eq('id', question_id);

  if (error) {
    console.error('Failed to answer question', error);
    throw new Error('回答の送信に失敗しました');
  }

  revalidatePath('/admin');
  revalidatePath('/timer');
  return;
}
