'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function askQuestion(formData: FormData) {
  const title = formData.get('title') as string;
  const body = formData.get('body') as string;

  if (!title || !body) return { error: 'タイトルと内容は必須です' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'ログインしていません' };

  const { error } = await supabase.from('questions').insert({
    student_uuid: user.id,
    title,
    body,
    status: 'open'
  });

  if (error) {
    console.error('Failed to post question', error);
    return { error: '質問の送信に失敗しました' };
  }

  revalidatePath('/timer');
  return { success: true };
}
