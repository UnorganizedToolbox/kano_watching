'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function signup(formData: FormData) {
  let hasError = false;
  let errorMsg = '';

  try {
    const supabase = await createClient()

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const student_id = formData.get('student_id') as string;
    const name = formData.get('name') as string;

    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          student_id,
          name
        }
      }
    })

    if (error) {
      console.error('Signup error:', error)
      hasError = true;
      errorMsg = 'サインアップに失敗しました。' + error.message;
    }
    // Profile is now automatically inserted by Supabase Postgres Trigger on auth.users!
  } catch (err) {
    console.error('Unexpected error in signup:', err)
    hasError = true;
    errorMsg = 'サーバーエラーが発生しました。環境変数が設定されているか確認してください。';
  }

  if (hasError) {
    redirect('/signup?error=' + encodeURIComponent(errorMsg))
  } else {
    redirect('/')
  }
}
