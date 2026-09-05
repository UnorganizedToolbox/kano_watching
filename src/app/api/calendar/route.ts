import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('google_calendar_token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Google Calendar is not linked or token expired.' }, { status: 401 });
  }

  try {
    // Fetch today's events
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const timeMin = startOfDay.toISOString();
    const timeMax = endOfDay.toISOString();

    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
         // Token expired
         return NextResponse.json({ error: 'Token expired' }, { status: 401 });
      }
      throw new Error('Failed to fetch calendar events');
    }

    const data = await response.json();
    return NextResponse.json(data.items || []);
  } catch (error: any) {
    console.error('Calendar API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
