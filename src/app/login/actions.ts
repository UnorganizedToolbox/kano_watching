'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { data: signInData, error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect('/login?error=ログインに失敗しました')
  }

  const { data: profile } = await supabase.from('profiles').select('status').eq('id', signInData.user.id).single();

  if (profile?.status === 'pending') {
    await supabase.auth.signOut();
    redirect('/login?error=' + encodeURIComponent('登録申請を確認中です。管理者の承認をお待ちください。'));
  }

  if (profile?.status === 'disabled') {
    await supabase.auth.signOut();
    redirect('/login?error=' + encodeURIComponent('このアカウントは管理者によって停止されています。'));
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
