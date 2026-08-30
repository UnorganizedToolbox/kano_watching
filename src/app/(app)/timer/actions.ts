'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function askQuestion(formData: FormData) {
  const title = formData.get('title') as string;
  const body = formData.get('body') as string;

  if (!title || !body) throw new Error('タイトルと内容は必須です');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('ログインしていません');

  const { error } = await supabase.from('questions').insert({
    student_uuid: user.id,
    title,
    body,
    status: 'open'
  });

  if (error) {
    console.error('Failed to post question', error);
    throw new Error('質問の送信に失敗しました');
  }

  revalidatePath('/timer');
  return;
}

export async function logPomodoro(subject: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('ログインしていません');

  const { error } = await supabase.from('pomodoro_logs').insert({
    student_uuid: user.id,
    subject,
    duration: 25
  });

  if (error) {
    console.error('Failed to log pomodoro', error);
    throw new Error('記録の保存に失敗しました');
  }

  revalidatePath('/');
  revalidatePath('/timer');
  return;
}
