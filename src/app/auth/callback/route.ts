
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data?.session) {
      const session = data.session;
      
      // Save Google API token to cookies for Calendar API access
      if (session.provider_token) {
        const cookieStore = await cookies();
        cookieStore.set('google_calendar_token', session.provider_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 3600, // 1 hour (Google access tokens usually expire in 1h)
          path: '/',
        });
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
