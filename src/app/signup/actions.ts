'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const name = formData.get('name') as string;
  const birthdate = formData.get('birthdate') as string;
  const affiliation = formData.get('affiliation') as string;

  if (!email || !password || !name || !birthdate) {
    redirect('/signup?error=' + encodeURIComponent('必須項目を入力してください'));
  }

  const headersList = await headers();
  const host = headersList.get('host');
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  const origin = `${protocol}://${host}`;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, birthdate, affiliation },
      emailRedirectTo: `${origin}/auth/callback?next=/signup/pending`,
    },
  });

  if (error) {
    console.error('Signup error:', error);
    redirect('/signup?error=' + encodeURIComponent('登録に失敗しました。' + error.message));
  }

  redirect('/signup/verify?email=' + encodeURIComponent(email));
}

export async function resendSignupEmail(email: string, _formData: FormData) {
  const supabase = await createClient();
  const headersList = await headers();
  const host = headersList.get('host');
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  const origin = `${protocol}://${host}`;

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/signup/pending`,
    },
  });

  if (error) {
    console.error('Resend confirmation email error:', error);
    redirect(`/signup/verify?email=${encodeURIComponent(email)}&error=` + encodeURIComponent('確認メールの再送信に失敗しました。'));
  }

  redirect(`/signup/verify?email=${encodeURIComponent(email)}&resent=1`);
}
