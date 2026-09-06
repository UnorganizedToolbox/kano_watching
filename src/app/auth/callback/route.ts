
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data?.session) {
      const session = data.session;

      // Google のアクセストークン・リフレッシュトークンを profiles に保存する。
      // refresh_token は access_type=offline + prompt=consent により毎回発行される想定。
      if (session.provider_token) {
        const updatePayload: Record<string, string> = { google_token: session.provider_token };
        if (session.provider_refresh_token) {
          updatePayload.google_refresh_token = session.provider_refresh_token;
        }
        await supabase.from('profiles').update(updatePayload).eq('id', session.user.id);
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
    console.error('Auth callback error:', error)
  }

  return NextResponse.redirect(`${origin}/login?error=Google連携に失敗しました`)
}
