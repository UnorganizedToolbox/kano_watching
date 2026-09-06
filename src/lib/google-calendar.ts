import type { SupabaseClient } from '@supabase/supabase-js';

// Google のアクセストークンは約1時間で失効する。refresh_token を使って
// oauth2.googleapis.com から新しいアクセストークンを取得し直す。
async function refreshGoogleAccessToken(refreshToken: string): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET が設定されていません');
    return null;
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    console.error('Google access token refresh failed:', await response.text());
    return null;
  }

  const data = await response.json();
  return data.access_token as string;
}

export async function getGoogleCalendarEvents(
  supabase: SupabaseClient,
  userId: string
): Promise<{ linked: boolean; events: any[] }> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('google_token, google_refresh_token')
    .eq('id', userId)
    .single();

  if (!profile?.google_token) {
    return { linked: false, events: [] };
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startOfDay.toISOString()}&timeMax=${endOfDay.toISOString()}&singleEvents=true&orderBy=startTime`;

  let accessToken = profile.google_token as string;
  let response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });

  if (response.status === 401 && profile.google_refresh_token) {
    const newAccessToken = await refreshGoogleAccessToken(profile.google_refresh_token);
    if (!newAccessToken) {
      return { linked: true, events: [] };
    }
    accessToken = newAccessToken;
    await supabase.from('profiles').update({ google_token: newAccessToken }).eq('id', userId);
    response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  }

  if (!response.ok) {
    return { linked: true, events: [] };
  }

  const data = await response.json();
  return { linked: true, events: data.items || [] };
}
