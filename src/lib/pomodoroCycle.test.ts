import { describe, expect, it } from 'vitest';
import {
  advanceCycle,
  cycleExpiryMs,
  parseCycleState,
  resolveCycleState,
  serializeCycleState,
  shouldAutoEndIdleSession,
  CYCLE_EXPIRY_BUFFER_MS,
  POMOS_PER_LONG_BREAK,
  type PomodoroCycleState,
} from './pomodoroCycle';

describe('advanceCycle', () => {
  it('4回に1回、大休憩になる', () => {
    let state: PomodoroCycleState | null = null;
    const results: boolean[] = [];
    for (let i = 0; i < POMOS_PER_LONG_BREAK * 2; i++) {
      const { next, isLongBreak } = advanceCycle(state);
      results.push(isLongBreak);
      state = next;
    }
    expect(results).toEqual([false, false, false, true, false, false, false, true]);
  });

  it('Cookieが無い(中断・未経験のいずれか)状態からの1回目は必ず通常休憩になる', () => {
    // 3回連続で完了(次で大休憩になる直前の状態)
    let state: PomodoroCycleState | null = null;
    for (let i = 0; i < 3; i++) state = advanceCycle(state).next;

    // Cookieが失効した(=ブラウザから見て存在しない)状態で4回目を完了する
    const { isLongBreak, next } = advanceCycle(null);
    expect(isLongBreak).toBe(false);
    expect(next.sinceLongBreak).toBe(1);

    // 一方、Cookieがまだ生きていれば(stateがそのまま渡されれば)そのまま数え続ける
    const { isLongBreak: stillCounting } = advanceCycle(state);
    expect(stillCounting).toBe(true);
  });
});

describe('resolveCycleState', () => {
  it('Cookieが無ければ0から', () => {
    expect(resolveCycleState(null)).toEqual({ sinceLongBreak: 0 });
  });

  it('Cookieがあればそのまま返す', () => {
    const state = { sinceLongBreak: 2 };
    expect(resolveCycleState(state)).toEqual(state);
  });
});

describe('cycleExpiryMs', () => {
  it('モードの所要時間に固定の猶予(25分)を足す', () => {
    const workMs = 25 * 60 * 1000;
    expect(cycleExpiryMs(workMs)).toBe(workMs + CYCLE_EXPIRY_BUFFER_MS);
  });

  it('猶予の定数は25分', () => {
    expect(CYCLE_EXPIRY_BUFFER_MS).toBe(25 * 60 * 1000);
  });
});

describe('shouldAutoEndIdleSession', () => {
  const idle = { isRunning: false, hasSession: true, awaitingDecision: false, showRatingModal: false, cycleAlive: false };

  it('一時停止中や決定待ち画面でCookieが失効していれば自動終了する', () => {
    expect(shouldAutoEndIdleSession(idle)).toBe(true);
    expect(shouldAutoEndIdleSession({ ...idle, hasSession: false, awaitingDecision: true })).toBe(true);
  });

  it('Cookieが生きていれば終了しない', () => {
    expect(shouldAutoEndIdleSession({ ...idle, cycleAlive: true })).toBe(false);
  });

  it('実行中は、Cookieが無くても終了しない', () => {
    expect(shouldAutoEndIdleSession({ ...idle, isRunning: true })).toBe(false);
  });

  it('集中度評価の入力中は、Cookieが無くても終了しない(作業完了直後に誤って終了していた不具合)', () => {
    expect(shouldAutoEndIdleSession({ ...idle, showRatingModal: true })).toBe(false);
  });

  it('何も進行していない最初の待機画面では終了しない', () => {
    expect(shouldAutoEndIdleSession({ ...idle, hasSession: false })).toBe(false);
  });
});

describe('シリアライズ', () => {
  it('往復できる', () => {
    const state = { sinceLongBreak: 1 };
    expect(parseCycleState(serializeCycleState(state))).toEqual(state);
  });

  it('壊れた値やnullは無視してnullを返す', () => {
    expect(parseCycleState(null)).toBeNull();
    expect(parseCycleState('not json')).toBeNull();
    expect(parseCycleState('{"foo":1}')).toBeNull();
    expect(parseCycleState('{"sinceLongBreak":"x"}')).toBeNull();
  });
});
