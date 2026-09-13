import { describe, it, expect } from 'vitest';
import { buildResolutionOrder } from './dependencyGraph';
import type { VariableDef } from './types';

const v = (name: string, min: string, max: string, type: VariableDef['type'] = 'integer'): VariableDef => ({ name, type, min, max });

describe('buildResolutionOrder', () => {
  it('orders independent variables deterministically (alphabetical)', () => {
    const { order } = buildResolutionOrder([v('B', '0', '10'), v('A', '0', '10')]);
    expect(order).toEqual(['A', 'B']);
  });

  it('orders dependent variables after their dependencies', () => {
    const { order } = buildResolutionOrder([
      v('B', 'A+1', 'A+5'),
      v('A', '1', '9'),
      v('C', '0', '10'),
    ]);
    expect(order.indexOf('A')).toBeLessThan(order.indexOf('B'));
    expect(order).toHaveLength(3);
  });

  it('handles inf/-inf without creating a dependency', () => {
    const { order } = buildResolutionOrder([v('A', '-inf', 'inf')]);
    expect(order).toEqual(['A']);
  });

  it('throws on circular references', () => {
    expect(() =>
      buildResolutionOrder([v('A', 'B', '10'), v('B', 'A', '10')])
    ).toThrow(/循環参照/);
  });

  it('throws on self-reference cycles', () => {
    expect(() => buildResolutionOrder([v('A', 'A', '10')])).toThrow(/循環参照/);
  });

  it('throws when referencing an undeclared variable', () => {
    expect(() => buildResolutionOrder([v('A', '0', 'Z')])).toThrow(/未宣言/);
  });
});
