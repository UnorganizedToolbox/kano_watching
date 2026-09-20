import { describe, expect, it } from 'vitest';
import {
  advanceCycle,
  isInterrupted,
  msUntilNextMidnight,
  parseCycleState,
  resolveCycleState,
  serializeCycleState,
  touchCycleActivity,
  INTERRUPTION_THRESHOLD_MS,
  POMOS_PER_LONG_BREAK,
  type PomodoroCycleState,
} from './pomodoroCycle';

const T0 = Date.parse('2026-09-20T03:00:00Z');

describe('advanceCycle', () => {
  it('4回に1回、大休憩になる', () => {
    let state: PomodoroCycleState | null = null;
    const results: boolean[] = [];
    for (let i = 0; i < POMOS_PER_LONG_BREAK * 2; i++) {
      const { next, isLongBreak } = advanceCycle(state, T0 + i * 1000);
      results.push(isLongBreak);
      state = next;
    }
    expect(results).toEqual([false, false, false, true, false, false, false, true]);
  });

  it('中断(放置しきい値超え)からの再開後、1回目は必ず通常休憩になる', () => {
    // 3回連続で完了(次で大休憩になる直前の状態)
    let state: PomodoroCycleState | null = null;
    for (let i = 0; i < 3; i++) state = advanceCycle(state, T0 + i * 1000).next;

    // しきい値を超えて長時間放置してから4回目を完了する
    const lastActivityAt = T0 + 2 * 1000;
    const resumedAt = lastActivityAt + INTERRUPTION_THRESHOLD_MS + 1;
    const { isLongBreak, next } = advanceCycle(state, resumedAt);
    expect(isLongBreak).toBe(false);
    expect(next.sinceLongBreak).toBe(1);
  });

  it('しきい値以内の再開なら、中断とみなさずそのまま数え続ける', () => {
    let state: PomodoroCycleState | null = null;
    for (let i = 0; i < 3; i++) state = advanceCycle(state, T0 + i * 1000).next;
    const lastActivityAt = T0 + 2 * 1000;
    const resumedAt = lastActivityAt + INTERRUPTION_THRESHOLD_MS - 1;
    const { isLongBreak } = advanceCycle(state, resumedAt);
    expect(isLongBreak).toBe(true);
  });
});

describe('isInterrupted / resolveCycleState', () => {
  it('Cookie自体がない場合は中断とみなさない(区別できないため)', () => {
    expect(isInterrupted(null, T0)).toBe(false);
    expect(resolveCycleState(null, T0)).toEqual({ sinceLongBreak: 0, lastActivityAt: T0 });
  });

  it('しきい値ちょうどは中断としない(超えた場合のみ)', () => {
    const state = { sinceLongBreak: 2, lastActivityAt: T0 };
    expect(isInterrupted(state, T0 + INTERRUPTION_THRESHOLD_MS)).toBe(false);
    expect(isInterrupted(state, T0 + INTERRUPTION_THRESHOLD_MS + 1)).toBe(true);
  });

  it('中断していればsinceLongBreakを0に戻す', () => {
    const state = { sinceLongBreak: 3, lastActivityAt: T0 };
    const resolved = resolveCycleState(state, T0 + INTERRUPTION_THRESHOLD_MS + 1);
    expect(resolved.sinceLongBreak).toBe(0);
  });
});

describe('touchCycleActivity', () => {
  it('中断していなければカウントを保ったまま時刻だけ更新する', () => {
    const state = { sinceLongBreak: 2, lastActivityAt: T0 };
    const touched = touchCycleActivity(state, T0 + 1000);
    expect(touched).toEqual({ sinceLongBreak: 2, lastActivityAt: T0 + 1000 });
  });

  it('中断していればカウントを0にリセットしてから時刻を更新する', () => {
    const state = { sinceLongBreak: 2, lastActivityAt: T0 };
    const touched = touchCycleActivity(state, T0 + INTERRUPTION_THRESHOLD_MS + 1);
    expect(touched).toEqual({ sinceLongBreak: 0, lastActivityAt: T0 + INTERRUPTION_THRESHOLD_MS + 1 });
  });
});

describe('シリアライズ', () => {
  it('往復できる', () => {
    const state = { sinceLongBreak: 1, lastActivityAt: T0 };
    expect(parseCycleState(serializeCycleState(state))).toEqual(state);
  });

  it('壊れた値やnullは無視してnullを返す', () => {
    expect(parseCycleState(null)).toBeNull();
    expect(parseCycleState('not json')).toBeNull();
    expect(parseCycleState('{"foo":1}')).toBeNull();
    expect(parseCycleState('{"sinceLongBreak":"x","lastActivityAt":1}')).toBeNull();
  });
});

describe('msUntilNextMidnight', () => {
  it('翌日0時までのミリ秒を返す', () => {
    const now = new Date('2026-09-20T14:30:00');
    const expected = new Date('2026-09-21T00:00:00').getTime() - now.getTime();
    expect(msUntilNextMidnight(now)).toBe(expected);
  });

  it('23:59:59.999のような境界でも0にならない(次の日を指す)', () => {
    const now = new Date(2026, 8, 20, 23, 59, 59, 999);
    expect(msUntilNextMidnight(now)).toBe(1);
  });
});
