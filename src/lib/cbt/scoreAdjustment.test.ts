import { describe, it, expect } from 'vitest';
import { computeScoreAdjustment } from './scoreAdjustment';

const DUE = '2026-01-11T00:00:00.000Z';

describe('computeScoreAdjustment', () => {
  it('returns the ontime tier (x1.00) for any submission at or before the deadline', () => {
    const result = computeScoreAdjustment({
      deliveryMode: 'deadline',
      dueAt: DUE,
      submittedAt: '2026-01-01T00:00:00.000Z', // 早期でも早期ボーナスは廃止済み(ontime扱い)
    });
    expect(result).toEqual({ tier: 'ontime', multiplier: 1.0 });
  });

  it('returns the ontime tier right up to the deadline itself', () => {
    const result = computeScoreAdjustment({
      deliveryMode: 'deadline',
      dueAt: DUE,
      submittedAt: DUE,
    });
    expect(result).toEqual({ tier: 'ontime', multiplier: 1.0 });
  });

  it('returns the late tier (x0.80) after the deadline', () => {
    const result = computeScoreAdjustment({
      deliveryMode: 'deadline',
      dueAt: DUE,
      submittedAt: '2026-01-12T00:00:00.000Z',
    });
    expect(result).toEqual({ tier: 'late', multiplier: 0.8 });
  });

  it('returns none for no_deadline delivery regardless of timing', () => {
    const result = computeScoreAdjustment({
      deliveryMode: 'no_deadline',
      dueAt: null,
      submittedAt: '2026-06-01T00:00:00.000Z',
    });
    expect(result).toEqual({ tier: 'none', multiplier: 1.0 });
  });

  it('returns none for permanent delivery', () => {
    const result = computeScoreAdjustment({
      deliveryMode: 'permanent',
      dueAt: null,
      submittedAt: '2026-06-01T00:00:00.000Z',
    });
    expect(result).toEqual({ tier: 'none', multiplier: 1.0 });
  });
});
