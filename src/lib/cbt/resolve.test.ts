import { describe, it, expect } from 'vitest';
import { resolveVariables } from './resolve';
import type { VariableDef } from './types';

const v = (name: string, min: string, max: string, type: VariableDef['type'] = 'integer'): VariableDef => ({ name, type, min, max });

// count個の整数値[0, count)から index番目を確実に引かせるための乱数値。
// (idx+0.5)/count は浮動小数点の丸め方向に関わらず floor(random()*count) === idx になる。
function pick(idx: number, count: number): number {
  return (idx + 0.5) / count;
}

function sequenceRandom(values: number[]): () => number {
  let i = 0;
  return () => {
    if (i >= values.length) throw new Error(`sequence exhausted at index ${i}`);
    return values[i++];
  };
}

describe('resolveVariables', () => {
  it('resolves independent variables within their declared range', () => {
    const result = resolveVariables({
      variables: [v('A', '1', '9'), v('C', '0', '10')],
      constraints: [],
    }, { random: sequenceRandom([pick(3, 9), pick(7, 11)]) });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.values.A).toBe(4); // 1 + 3
      expect(result.values.C).toBe(7); // 0 + 7
    }
  });

  it('resolves dependent ranges using already-resolved values (B depends on A)', () => {
    const result = resolveVariables({
      variables: [v('B', 'A+1', 'A+5'), v('A', '1', '9')],
      constraints: [],
    }, { random: sequenceRandom([pick(2, 9), pick(0, 5)]) }); // A=1+2=3, B in [4,8] pick idx0 -> 4

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.values.A).toBe(3);
      expect(result.values.B).toBe(4);
    }
  });

  it('retries only the current variable when a constraint is violated', () => {
    // A in [1,9] を先に決めた後、B in [1,9] が A と一致しないよう制約する
    const result = resolveVariables({
      variables: [v('A', '1', '9'), v('B', '1', '9')],
      constraints: ['A != B'],
    }, { random: sequenceRandom([pick(2, 9), pick(2, 9), pick(5, 9)]) }); // A=3, Bの1回目=3(違反,再抽選), 2回目=6

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.values.A).toBe(3);
      expect(result.values.B).toBe(6);
    }
  });

  it('fails with a clear error after exceeding the retry limit', () => {
    const result = resolveVariables({
      variables: [v('A', '1', '1'), v('B', '1', '1')],
      constraints: ['A != B'], // 常に不可能(A,Bともに1固定)
    }, { maxRetries: 3, random: sequenceRandom(new Array(10).fill(0)) });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/A != B/);
      expect(result.error).toMatch(/3回試行/);
    }
  });

  it('uses the practical bound for inf/-inf', () => {
    const result = resolveVariables({
      variables: [v('A', '-inf', 'inf')],
      constraints: [],
    }, { random: sequenceRandom([0]) });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.values.A).toBe(-100000);
    }
  });

  it('errors when the resolved range is inverted (min > max)', () => {
    const result = resolveVariables({
      variables: [v('A', '10', '1')],
      constraints: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/範囲が不正/);
    }
  });

  it('errors on circular dependencies before attempting to resolve', () => {
    const result = resolveVariables({
      variables: [v('A', 'B', '10'), v('B', 'A', '10')],
      constraints: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/循環参照/);
  });

  it('enforces forall(A) A*A != B by rejecting perfect squares for B', () => {
    // A in [1,5] (squares: 1,4,9,16,25), B in [0,30]
    // 1回目のB抽選は4(平方数なので違反), 2回目は10(平方数でないのでOK)
    const result = resolveVariables({
      variables: [v('A', '1', '5'), v('B', '0', '30')],
      constraints: ['forall(A) A*A != B'],
    }, { random: sequenceRandom([pick(0, 5), pick(4, 31), pick(10, 31)]) });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.values.B).toBe(10);
      expect(Number.isInteger(Math.sqrt(result.values.B))).toBe(false);
    }
  });

  it('resolves the quadratic-expansion example end to end', () => {
    // A in [1,9], B: -inf..A+5, constraint A*A != B (Bが平方数でない)
    const result = resolveVariables({
      variables: [v('A', '1', '9'), v('B', '-inf', 'A+5')],
      constraints: ['A < B'],
    }, { random: sequenceRandom([pick(4, 9), pick(100008, 100011)]) }); // A=5, Bの範囲は[-100000,10] (幅100011) -> B=8

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.values.A).toBe(5);
      expect(result.values.B).toBeGreaterThan(result.values.A);
      expect(result.values.B).toBeLessThanOrEqual(10);
    }
  });
});
