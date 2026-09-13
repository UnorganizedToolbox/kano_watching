import { describe, it, expect } from 'vitest';
import { parseExpr } from './expression';
import { formatEvaluatedExpr } from './fraction';

describe('formatEvaluatedExpr', () => {
  it('reduces a simple integer division to lowest terms', () => {
    const r = formatEvaluatedExpr(parseExpr('A/B'), { A: 3, B: 6 });
    expect(r).toEqual({ kind: 'fraction', text: '1/2', isNegative: false });
  });

  it('collapses to an integer when it divides evenly', () => {
    const r = formatEvaluatedExpr(parseExpr('A/B'), { A: 6, B: 3 });
    expect(r).toEqual({ kind: 'integer', text: '2', isNegative: false });
  });

  it('tracks the sign separately from the magnitude', () => {
    const r = formatEvaluatedExpr(parseExpr('A/B'), { A: -3, B: 6 });
    expect(r).toEqual({ kind: 'fraction', text: '1/2', isNegative: true });
    const r2 = formatEvaluatedExpr(parseExpr('A/B'), { A: 3, B: -6 });
    expect(r2).toEqual({ kind: 'fraction', text: '1/2', isNegative: true });
  });

  it('formats non-division expressions as plain integers', () => {
    const r = formatEvaluatedExpr(parseExpr('A+B'), { A: 5, B: 6 });
    expect(r).toEqual({ kind: 'integer', text: '11', isNegative: false });
  });

  it('formats negative plain integers with the sign tracked separately', () => {
    const r = formatEvaluatedExpr(parseExpr('A'), { A: -5 });
    expect(r).toEqual({ kind: 'integer', text: '5', isNegative: true });
  });
});
