import { describe, it, expect } from 'vitest';
import { getWeekRange, toJstDayOffset, dateStringToDayIndex } from './timelineWeek';

describe('getWeekRange', () => {
  it('returns Monday-Sunday for a mid-week Wednesday (JST)', () => {
    // 2026-09-16 (水) 15:00 JST = 2026-09-16 06:00 UTC
    const nowUtcMs = Date.UTC(2026, 8, 16, 6, 0, 0);
    const range = getWeekRange(0, nowUtcMs);
    expect(range.days).toHaveLength(7);
    expect(range.days[0]).toMatchObject({ year: 2026, month: 9, date: 14, weekday: 1 }); // Mon
    expect(range.days[6]).toMatchObject({ year: 2026, month: 9, date: 20, weekday: 0 }); // Sun
    const today = range.days.find(d => d.isToday);
    expect(today).toMatchObject({ year: 2026, month: 9, date: 16 });
  });

  it('shifts by exactly 7 days for offsetWeeks=+1/-1', () => {
    const nowUtcMs = Date.UTC(2026, 8, 16, 6, 0, 0);
    const thisWeek = getWeekRange(0, nowUtcMs);
    const nextWeek = getWeekRange(1, nowUtcMs);
    const prevWeek = getWeekRange(-1, nowUtcMs);
    expect(nextWeek.weekStartUtcMs - thisWeek.weekStartUtcMs).toBe(7 * 24 * 60 * 60 * 1000);
    expect(thisWeek.weekStartUtcMs - prevWeek.weekStartUtcMs).toBe(7 * 24 * 60 * 60 * 1000);
    expect(nextWeek.days.some(d => d.isToday)).toBe(false);
  });

  it('handles a Sunday correctly as the last day of its own week', () => {
    // 2026-09-20 (日) 12:00 JST = 2026-09-20 03:00 UTC
    const nowUtcMs = Date.UTC(2026, 8, 20, 3, 0, 0);
    const range = getWeekRange(0, nowUtcMs);
    expect(range.days[0]).toMatchObject({ month: 9, date: 14 });
    expect(range.days[6]).toMatchObject({ month: 9, date: 20 });
    expect(range.days[6].isToday).toBe(true);
  });

  it('weekEndUtcMs is exactly 7 days after weekStartUtcMs', () => {
    const range = getWeekRange(0, Date.UTC(2026, 8, 16, 6, 0, 0));
    expect(range.weekEndUtcMs - range.weekStartUtcMs).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe('toJstDayOffset', () => {
  it('converts a UTC instant to the correct dayIndex/minutes within the week', () => {
    const range = getWeekRange(0, Date.UTC(2026, 8, 16, 6, 0, 0));
    // 2026-09-16 10:30 JST = 2026-09-16 01:30 UTC
    const eventUtcMs = Date.UTC(2026, 8, 16, 1, 30, 0);
    const { dayIndex, minutesSinceMidnight } = toJstDayOffset(eventUtcMs, range.weekStartUtcMs);
    expect(dayIndex).toBe(2); // Mon=0, Tue=1, Wed=2
    expect(minutesSinceMidnight).toBe(10 * 60 + 30);
  });

  it('returns dayIndex=0, minutes=0 exactly at the week start instant', () => {
    const weekStartUtcMs = Date.UTC(2026, 8, 13, 15, 0, 0); // Mon 00:00 JST
    const { dayIndex, minutesSinceMidnight } = toJstDayOffset(weekStartUtcMs, weekStartUtcMs);
    expect(dayIndex).toBe(0);
    expect(minutesSinceMidnight).toBe(0);
  });
});

describe('dateStringToDayIndex', () => {
  it('computes day offset from the week Monday for all-day event date strings', () => {
    const monday = { year: 2026, month: 9, date: 14 };
    expect(dateStringToDayIndex('2026-09-14', monday)).toBe(0);
    expect(dateStringToDayIndex('2026-09-20', monday)).toBe(6);
    expect(dateStringToDayIndex('2026-09-13', monday)).toBe(-1);
  });
});
