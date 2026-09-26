import { describe, it, expect } from 'vitest';
import {
  computeDeadlineExp,
  computeNoDeadlineExp,
  computePermanentExp,
  computeStreakDays,
  toJstDateStr,
  DEFAULT_EXP_RATES,
} from './expReward';

describe('computeDeadlineExp', () => {
  // 2026-09-26のCBT締切倍率是正: 素点そのものではなく自己ベストとの上昇分(%)を元にする
  it('scales base EXP by the improvement over the previous best, not the raw score', () => {
    expect(computeDeadlineExp(80, 70, 1.0, 100)).toBeCloseTo(10); // 70→80: 10%上昇 → 10%のEXP
    expect(computeDeadlineExp(100, 0, 1.0, 20)).toBeCloseTo(20);
  });

  it('applies the late-submission multiplier only to the improvement-based EXP', () => {
    // 70→80: 本来10%のEXPが、遅延時(x0.8)は8%になる(CLAUDE.local.mdの例と一致)
    expect(computeDeadlineExp(80, 70, 0.8, 100)).toBeCloseTo(8);
  });

  it('never returns negative EXP when the score regresses, regardless of multiplier', () => {
    expect(computeDeadlineExp(60, 80, 1.0, 20)).toBe(0);
    expect(computeDeadlineExp(60, 80, 0.8, 20)).toBe(0);
  });

  it('gives zero EXP when there is no improvement over the previous best', () => {
    expect(computeDeadlineExp(70, 70, 1.0, 20)).toBe(0);
  });
});

describe('computeNoDeadlineExp', () => {
  // 実装イメージ文書(v4) 8.1.2節の例をそのまま検証する
  it('matches the documented 5-attempt example sequence', () => {
    let best = 0;
    const scores = [50, 49, 51, 62, 50];
    const expected = [50, 0, 1, 11, 0];
    for (let i = 0; i < scores.length; i++) {
      const exp = computeNoDeadlineExp(scores[i], best, 100);
      expect(exp).toBe(expected[i]);
      best = Math.max(best, scores[i]);
    }
  });

  it('never returns a negative value when the score regresses', () => {
    expect(computeNoDeadlineExp(30, 80, 20)).toBe(0);
  });
});

describe('computePermanentExp', () => {
  it('adds the base EXP plus streak bonus for days under the cap', () => {
    const exp = computePermanentExp(3, DEFAULT_EXP_RATES);
    expect(exp).toBeCloseTo(5 + 3 * 0.5);
  });

  it('caps the streak bonus at the configured max days', () => {
    const at10 = computePermanentExp(10, DEFAULT_EXP_RATES);
    const at100 = computePermanentExp(100, DEFAULT_EXP_RATES);
    expect(at100).toBe(at10);
    expect(at10).toBeCloseTo(5 + 10 * 0.5);
  });

  it('gives just the base EXP on day 1 (no streak yet)', () => {
    expect(computePermanentExp(1, DEFAULT_EXP_RATES)).toBeCloseTo(5.5);
  });
});

describe('toJstDateStr', () => {
  it('converts a UTC instant just before JST midnight to the previous day', () => {
    // 2026-09-15 14:59 UTC = 2026-09-15 23:59 JST
    expect(toJstDateStr('2026-09-15T14:59:00Z')).toBe('2026-09-15');
    // 2026-09-15 15:00 UTC = 2026-09-16 00:00 JST
    expect(toJstDateStr('2026-09-15T15:00:00Z')).toBe('2026-09-16');
  });
});

describe('computeStreakDays', () => {
  it('returns 1 when there is no prior history', () => {
    expect(computeStreakDays([], '2026-09-16')).toBe(1);
  });

  it('counts back consecutive days ending yesterday', () => {
    const past = ['2026-09-15', '2026-09-14', '2026-09-13'];
    expect(computeStreakDays(past, '2026-09-16')).toBe(4);
  });

  it('stops counting at the first gap', () => {
    const past = ['2026-09-15', '2026-09-13']; // 09-14が欠けている
    expect(computeStreakDays(past, '2026-09-16')).toBe(2);
  });

  it('ignores a two-day-old date if yesterday is missing', () => {
    const past = ['2026-09-14'];
    expect(computeStreakDays(past, '2026-09-16')).toBe(1);
  });
});
