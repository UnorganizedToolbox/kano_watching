'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function answerQuestion(formData: FormData) {
  const question_id = formData.get('question_id') as string;
  const answer_body = formData.get('answer_body') as string;

  if (!question_id || !answer_body) throw new Error('必要なデータがありません');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('ログインしていません');

  // Verify admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') throw new Error('権限がありません');

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
