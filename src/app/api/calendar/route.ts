import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getGoogleCalendarEvents } from '@/lib/google-calendar';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'ログインしていません' }, { status: 401 });
  }

  const { linked, events } = await getGoogleCalendarEvents(supabase, user.id);

  if (!linked) {
    return NextResponse.json({ error: 'Google Calendar is not linked.' }, { status: 401 });
  }

  return NextResponse.json(events);
}
