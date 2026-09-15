import { describe, it, expect } from 'vitest';
import { computeScoreAdjustment, applyScoreAdjustment } from './scoreAdjustment';

const CREATED = '2026-01-01T00:00:00.000Z';
const DUE = '2026-01-11T00:00:00.000Z'; // 10日間の配信期間

describe('computeScoreAdjustment', () => {
  it('returns the early tier (x1.20) when submitted within the first 10% of the window', () => {
    // 10日間の10% = 24時間以内
    const result = computeScoreAdjustment({
      deliveryMode: 'deadline',
      createdAt: CREATED,
      dueAt: DUE,
      submittedAt: '2026-01-01T12:00:00.000Z',
    });
    expect(result).toEqual({ tier: 'early', multiplier: 1.2 });
  });

  it('returns the ontime tier (x1.00) just after the early window', () => {
    const result = computeScoreAdjustment({
      deliveryMode: 'deadline',
      createdAt: CREATED,
      dueAt: DUE,
      submittedAt: '2026-01-02T01:00:00.000Z', // 早期窓(24時間)を過ぎた直後
    });
    expect(result).toEqual({ tier: 'ontime', multiplier: 1.0 });
  });

  it('returns the ontime tier right up to the deadline itself', () => {
    const result = computeScoreAdjustment({
      deliveryMode: 'deadline',
      createdAt: CREATED,
      dueAt: DUE,
      submittedAt: DUE,
    });
    expect(result).toEqual({ tier: 'ontime', multiplier: 1.0 });
  });

  it('returns the late tier (x0.80) after the deadline', () => {
    const result = computeScoreAdjustment({
      deliveryMode: 'deadline',
      createdAt: CREATED,
      dueAt: DUE,
      submittedAt: '2026-01-12T00:00:00.000Z',
    });
    expect(result).toEqual({ tier: 'late', multiplier: 0.8 });
  });

  it('returns none for no_deadline delivery regardless of timing', () => {
    const result = computeScoreAdjustment({
      deliveryMode: 'no_deadline',
      createdAt: CREATED,
      dueAt: null,
      submittedAt: '2026-06-01T00:00:00.000Z',
    });
    expect(result).toEqual({ tier: 'none', multiplier: 1.0 });
  });

  it('returns none for permanent delivery', () => {
    const result = computeScoreAdjustment({
      deliveryMode: 'permanent',
      createdAt: CREATED,
      dueAt: null,
      submittedAt: '2026-06-01T00:00:00.000Z',
    });
    expect(result).toEqual({ tier: 'none', multiplier: 1.0 });
  });
});

describe('applyScoreAdjustment', () => {
  it('multiplies the raw score by the multiplier', () => {
    expect(applyScoreAdjustment(100, 1.2)).toBeCloseTo(120);
    expect(applyScoreAdjustment(60, 1.2)).toBeCloseTo(72);
    expect(applyScoreAdjustment(60, 0.8)).toBeCloseTo(48);
    expect(applyScoreAdjustment(30, 0.8)).toBeCloseTo(24);
  });
});
