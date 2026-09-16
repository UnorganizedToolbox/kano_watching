import { CalendarDays, Clock, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getGoogleCalendarEventsInRange } from '@/lib/google-calendar';
import { getWeekRange, toJstDayOffset, dateStringToDayIndex } from '@/lib/timelineWeek';

// 表示する時間帯(6:00〜24:00)。この範囲外の予定・実績は上下にクリップされる。
const DISPLAY_START_HOUR = 6;
const DISPLAY_END_HOUR = 24;
const DISPLAY_START_MIN = DISPLAY_START_HOUR * 60;
const DISPLAY_END_MIN = DISPLAY_END_HOUR * 60;
const DISPLAY_RANGE_MIN = DISPLAY_END_MIN - DISPLAY_START_MIN;
const MIN_BLOCK_HEIGHT_PX = 18;

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function clampToDisplayRange(minutesSinceMidnight: number, durationMinutes: number) {
  const startMin = Math.max(minutesSinceMidnight, DISPLAY_START_MIN);
  const endMin = Math.min(minutesSinceMidnight + durationMinutes, DISPLAY_END_MIN);
  if (endMin <= DISPLAY_START_MIN || startMin >= DISPLAY_END_MIN || endMin <= startMin) return null;
  return { topPx: startMin - DISPLAY_START_MIN, heightPx: Math.max(endMin - startMin, MIN_BLOCK_HEIGHT_PX) };
}

function formatHm(minutesSinceMidnight: number) {
  const totalMin = Math.round(minutesSinceMidnight);
  const h = Math.floor(totalMin / 60) % 24;
  const m = ((totalMin % 60) + 60) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function dayColumnStyle(dayIndex: number) {
  return { left: `${(dayIndex / 7) * 100}%`, width: `${100 / 7}%` };
}

interface PositionedBlock {
  dayIndex: number;
  topPx: number;
  heightPx: number;
  title: string;
  startLabel: string;
  endLabel: string;
}

interface AllDayBlock {
  dayIndex: number;
  span: number;
  title: string;
}

export default async function TimelinePage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const params = await searchParams;
  const weekOffset = Number.parseInt(params.week ?? '0', 10) || 0;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const week = getWeekRange(weekOffset);
  const weekStartIso = new Date(week.weekStartUtcMs).toISOString();
  const weekEndIso = new Date(week.weekEndUtcMs).toISOString();
  const weekMonday = week.days[0];

  const [{ data: pomodoros }, { linked: googleLinked, events: calendarEvents }] = await Promise.all([
    supabase
      .from('pomodoro_logs')
      .select('subject, duration_seconds, created_at')
      .eq('student_uuid', user.id)
      .eq('event_type', 'complete')
      .gte('created_at', weekStartIso)
      .lt('created_at', weekEndIso),
    getGoogleCalendarEventsInRange(supabase, user.id, weekStartIso, weekEndIso),
  ]);

  const pomodoroBlocks: PositionedBlock[] = [];
  for (const p of pomodoros ?? []) {
    const endMs = new Date(p.created_at as string).getTime();
    const durationSec = p.duration_seconds ?? 1500;
    const startMs = endMs - durationSec * 1000;
    const { dayIndex, minutesSinceMidnight } = toJstDayOffset(startMs, week.weekStartUtcMs);
    if (dayIndex < 0 || dayIndex > 6) continue;
    const clamped = clampToDisplayRange(minutesSinceMidnight, durationSec / 60);
    if (!clamped) continue;
    pomodoroBlocks.push({
      dayIndex,
      topPx: clamped.topPx,
      heightPx: clamped.heightPx,
      title: p.subject ?? '学習',
      startLabel: formatHm(minutesSinceMidnight),
      endLabel: formatHm(minutesSinceMidnight + durationSec / 60),
    });
  }

  const calendarBlocks: PositionedBlock[] = [];
  const allDayBlocks: AllDayBlock[] = [];
  for (const ev of calendarEvents) {
    if (ev.start?.date && !ev.start?.dateTime) {
      const startIdx = dateStringToDayIndex(ev.start.date, weekMonday);
      const endIdxExclusive = dateStringToDayIndex(ev.end?.date ?? ev.start.date, weekMonday);
      const clampedStart = Math.max(startIdx, 0);
      const clampedEnd = Math.min(endIdxExclusive, 7);
      if (clampedEnd <= clampedStart) continue;
      allDayBlocks.push({ dayIndex: clampedStart, span: clampedEnd - clampedStart, title: ev.summary || '(タイトルなし)' });
      continue;
    }
    if (!ev.start?.dateTime) continue;
    const startMs = new Date(ev.start.dateTime).getTime();
    const endMs = ev.end?.dateTime ? new Date(ev.end.dateTime).getTime() : startMs + 60 * 60 * 1000;
    const { dayIndex, minutesSinceMidnight } = toJstDayOffset(startMs, week.weekStartUtcMs);
    if (dayIndex < 0 || dayIndex > 6) continue;
    const durationMin = Math.max((endMs - startMs) / 60000, 15);
    const clamped = clampToDisplayRange(minutesSinceMidnight, durationMin);
    if (!clamped) continue;
    calendarBlocks.push({
      dayIndex,
      topPx: clamped.topPx,
      heightPx: clamped.heightPx,
      title: ev.summary || '(タイトルなし)',
      startLabel: formatHm(minutesSinceMidnight),
      endLabel: formatHm(minutesSinceMidnight + durationMin),
    });
  }

  const now = toJstDayOffset(new Date().getTime(), week.weekStartUtcMs);
  const showNowLine = now.dayIndex >= 0 && now.dayIndex <= 6 && now.minutesSinceMidnight >= DISPLAY_START_MIN && now.minutesSinceMidnight <= DISPLAY_END_MIN;

  const hours = Array.from({ length: DISPLAY_END_HOUR - DISPLAY_START_HOUR }, (_, i) => i + DISPLAY_START_HOUR);

  return (
    <section className="flex-1 flex flex-col gap-6 max-w-[1600px] mx-auto w-full px-6 pt-4 pb-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-end shrink-0 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black font-title text-slate-800 dark:text-white flex items-center gap-3">
            <CalendarDays className="w-7 h-7 text-brand-500" />
            学習 Timeline
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {weekMonday.year}年{weekMonday.month}月{weekMonday.date}日 〜 {week.days[6].year}年{week.days[6].month}月{week.days[6].date}日
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div><span className="text-xs font-bold text-slate-600 dark:text-slate-300">実績(ポモドーロ)</span></div>
            <div className="w-px h-3 bg-slate-300 dark:bg-slate-600 mx-1"></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-500"></div><span className="text-xs font-bold text-slate-600 dark:text-slate-300">予定(カレンダー)</span></div>
          </div>

          <div className="flex items-center gap-1 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
            <Link href={`/timeline?week=${weekOffset - 1}`} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
              <ChevronLeft className="w-4 h-4" />
            </Link>
            {weekOffset !== 0 && (
              <Link href="/timeline" className="px-3 py-1.5 rounded-lg text-xs font-bold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20">
                今週
              </Link>
            )}
            <Link href={`/timeline?week=${weekOffset + 1}`} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {!googleLinked && (
        <div className="shrink-0 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <i className="fa-brands fa-google"></i>
          Googleカレンダーが未連携のため、予定は表示されていません。
          <Link href="/settings?tab=sync" className="font-bold text-brand-600 dark:text-brand-400 hover:underline">設定から連携する</Link>
        </div>
      )}

      <div className="flex-1 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] flex flex-col overflow-hidden relative h-[calc(100vh-14rem)] min-h-[600px] mb-4">

        <div className="flex flex-col select-none relative h-full">

          {/* Dates Header */}
          <div className="flex border-b border-slate-200/50 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-800/30 pt-4 pb-2 shrink-0 z-10 relative shadow-sm">
            <div className="w-20 shrink-0 text-[10px] text-slate-400 font-bold flex flex-col items-center justify-end pb-1">
              <span className="bg-slate-200/50 dark:bg-slate-700/50 px-2 py-0.5 rounded-full">GMT+09</span>
            </div>

            <div className="flex-1 grid grid-cols-7 text-center">
              {week.days.map((d) => (
                <div key={d.dayIndex} className="flex flex-col items-center justify-center gap-1">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${d.weekday === 6 ? 'text-blue-500' : d.weekday === 0 ? 'text-rose-500' : 'text-slate-400'}`}>{WEEKDAY_LABELS[d.weekday]}</span>
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-all ${d.isToday ? 'bg-brand-500 text-white shadow-md shadow-brand-500/40 ring-4 ring-brand-500/20' : 'text-slate-700 dark:text-slate-200'}`}>
                    {d.date}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Full-day Events */}
          {allDayBlocks.length > 0 && (
            <div className="flex border-b border-slate-200/50 dark:border-slate-700/50 pb-2 pt-2 shrink-0 bg-slate-50/10 dark:bg-slate-800/10">
              <div className="w-20 shrink-0"></div>
              <div className="flex-1 px-2 relative h-7">
                {allDayBlocks.map((b, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 py-1 px-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[11px] font-bold rounded-md shadow-sm flex items-center gap-2 truncate"
                    style={{ left: `calc(${(b.dayIndex / 7) * 100}% + 4px)`, width: `calc(${(b.span / 7) * 100}% - 8px)` }}
                  >
                    {b.title}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hourly Time Grid */}
          <div className="flex-1 flex overflow-y-auto relative scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">

            {/* Time Axis */}
            <div className="w-20 shrink-0 relative" style={{ minHeight: `${DISPLAY_RANGE_MIN}px` }}>
              {hours.map((hour, i) => (
                <div key={hour} className="absolute w-full pr-3 text-right text-[10px] font-bold text-slate-400 dark:text-slate-500 -translate-y-1/2" style={{ top: `${i * 60 + 30}px` }}>
                  {hour === 12 ? '正午' : hour < 12 ? `午前${hour}時` : hour === 24 ? '深夜0時' : `午後${hour - 12}時`}
                </div>
              ))}
            </div>

            {/* Grid Area */}
            <div className="flex-1 relative border-l border-slate-200/50 dark:border-slate-700/50" style={{ minHeight: `${DISPLAY_RANGE_MIN}px` }}>

              {/* Horizontal Lines */}
              {hours.map((hour, i) => (
                <div key={hour} className="absolute left-0 right-0 h-px bg-slate-200/50 dark:bg-slate-700/50" style={{ top: `${i * 60 + 30}px` }}></div>
              ))}

              {/* Vertical Lines */}
              {[1, 2, 3, 4, 5, 6].map((col) => (
                <div key={col} className="absolute top-0 bottom-0 border-l border-dashed border-slate-200/50 dark:border-slate-700/50" style={{ left: `${col * (100 / 7)}%` }}></div>
              ))}

              {/* Google Calendar Events */}
              {calendarBlocks.map((b, i) => (
                <div
                  key={`cal-${i}`}
                  className="absolute bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 border-l-4 border-l-brand-400 text-slate-800 dark:text-slate-200 rounded-lg shadow-sm p-2 overflow-hidden z-10"
                  style={{ ...dayColumnStyle(b.dayIndex), top: `${b.topPx}px`, height: `${b.heightPx}px`, marginLeft: '2px', width: `calc(${100 / 7}% - 4px)` }}
                >
                  <p className="text-xs font-black truncate flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-brand-500 shrink-0" />{b.title}</p>
                  <p className="text-[9px] opacity-60 mt-1 font-mono text-brand-600 dark:text-brand-400">{b.startLabel} - {b.endLabel}</p>
                </div>
              ))}

              {/* Pomodoro (実績) Blocks */}
              {pomodoroBlocks.map((b, i) => (
                <div
                  key={`pomo-${i}`}
                  className="absolute bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 border-l-4 border-l-emerald-500 text-emerald-800 dark:text-emerald-300 rounded-lg shadow-sm p-2 overflow-hidden z-10"
                  style={{ ...dayColumnStyle(b.dayIndex), top: `${b.topPx}px`, height: `${b.heightPx}px`, marginLeft: '2px', width: `calc(${100 / 7}% - 4px)` }}
                >
                  <p className="text-xs font-black truncate flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />{b.title}</p>
                  <p className="text-[9px] opacity-60 mt-1 font-mono">{b.startLabel} - {b.endLabel}</p>
                </div>
              ))}

              {/* Current Time Line */}
              {showNowLine && (
                <div
                  className="absolute h-0.5 bg-rose-500 z-20 flex items-center pointer-events-none"
                  style={{ top: `${now.minutesSinceMidnight - DISPLAY_START_MIN}px`, left: `${(now.dayIndex / 7) * 100}%`, width: `${100 / 7}%` }}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 -ml-1.5 shadow-[0_0_8px_rgba(244,63,94,0.8)] relative">
                    <div className="absolute inset-0 rounded-full bg-rose-400 animate-ping opacity-75"></div>
                  </div>
                  <div className="text-[10px] font-black text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 px-1.5 py-0.5 rounded shadow-sm ml-1">
                    {formatHm(now.minutesSinceMidnight)}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
