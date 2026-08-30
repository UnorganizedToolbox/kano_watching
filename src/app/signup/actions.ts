'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function signup(formData: FormData) {
  let hasError = false;
  let errorMsg = '';

  try {
    const supabase = await createClient()

    const data = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    }

    const { data: authData, error } = await supabase.auth.signUp(data)

    if (error) {
      console.error('Signup error:', error)
      hasError = true;
      errorMsg = 'サインアップに失敗しました。' + error.message;
    } else if (authData.user) {
      // Insert profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        student_id: formData.get('student_id') as string,
        name: formData.get('name') as string,
        email: data.email,
        role: 'student',
        status: 'active'
      })

      if (profileError) {
        console.error('Profile insert error:', profileError)
      }
    }
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
