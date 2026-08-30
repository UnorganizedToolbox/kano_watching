'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { data: authData, error } = await supabase.auth.signUp(data)

  if (error) {
    redirect('/signup?error=エラーが発生しました')
  }

  if (authData.user) {
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
      console.error(profileError)
    }
  }

  redirect('/')
}
