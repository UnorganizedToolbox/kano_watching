import type { SupabaseClient } from '@supabase/supabase-js';

export interface GoogleCalendarEvent {
  id?: string;
  summary?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
}

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

// 指定した期間([timeMinISO, timeMaxISO))のGoogleカレンダーの予定を取得する。
// Timeline(週表示)とDashboard(当日のみ)の両方から使われる共通の実装。
export async function getGoogleCalendarEventsInRange(
  supabase: SupabaseClient,
  userId: string,
  timeMinISO: string,
  timeMaxISO: string
): Promise<{ linked: boolean; events: GoogleCalendarEvent[] }> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('google_token, google_refresh_token')
    .eq('id', userId)
    .single();

  if (!profile?.google_token) {
    return { linked: false, events: [] };
  }

  // 重要: fetch()自体がネットワーク障害(DNS失敗・タイムアウト等)で例外を投げることが
  // あり、以前はここが無防備だったためダッシュボードページ全体がクラッシュしていた
  // (Promise.all内で呼ばれているため、この関数の未捕捉例外がページ全体を落とす)。
  try {
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMinISO)}&timeMax=${encodeURIComponent(timeMaxISO)}&singleEvents=true&orderBy=startTime`;

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
      console.error('Google Calendar API error:', response.status, await response.text());
      return { linked: true, events: [] };
    }

    const data = await response.json();
    return { linked: true, events: data.items || [] };
  } catch (e) {
    console.error('Unexpected error fetching Google Calendar events', e);
    return { linked: true, events: [] };
  }
}

export async function getGoogleCalendarEvents(
  supabase: SupabaseClient,
  userId: string
): Promise<{ linked: boolean; events: GoogleCalendarEvent[] }> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return getGoogleCalendarEventsInRange(supabase, userId, startOfDay.toISOString(), endOfDay.toISOString());
}
