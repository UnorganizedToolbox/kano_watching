import { describe, it, expect } from 'vitest';
import { parseConstraint, evaluateConstraint, constraintDependencies } from './constraints';

describe('constraints', () => {
  it('parses and evaluates simple comparisons', () => {
    const c = parseConstraint('A < B');
    expect(evaluateConstraint(c, { A: 1, B: 2 }, {})).toBe(true);
    expect(evaluateConstraint(c, { A: 2, B: 1 }, {})).toBe(false);
  });

  it('supports arithmetic expressions on both sides', () => {
    const c = parseConstraint('A/B != 1/2');
    expect(evaluateConstraint(c, { A: 1, B: 3 }, {})).toBe(true);
    expect(evaluateConstraint(c, { A: 1, B: 2 }, {})).toBe(false);
  });

  it('collects dependencies including the forall-bound variable', () => {
    const c = parseConstraint('forall(A) A*A != B');
    expect([...constraintDependencies(c)].sort()).toEqual(['A', 'B']);
  });

  it('evaluates forall: true when no A in range makes it a perfect square', () => {
    const c = parseConstraint('forall(A) A*A != B');
    // A in [1,5] -> squares are 1,4,9,16,25
    const bounds = { A: { type: 'integer' as const, min: 1, max: 5 } };
    expect(evaluateConstraint(c, { B: 10 }, bounds)).toBe(true);
    expect(evaluateConstraint(c, { B: 4 }, bounds)).toBe(false);
    expect(evaluateConstraint(c, { B: 25 }, bounds)).toBe(false);
  });

  it('throws when forall is used on a real-typed variable', () => {
    const c = parseConstraint('forall(A) A*A != B');
    const bounds = { A: { type: 'real' as const, min: 1, max: 5 } };
    expect(() => evaluateConstraint(c, { B: 10 }, bounds)).toThrow(/整数型/);
  });
});
