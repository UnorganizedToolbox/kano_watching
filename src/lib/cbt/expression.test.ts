import { describe, it, expect } from 'vitest';
import { parseExpr, evaluate, collectVariableNames, isInfLiteral } from './expression';

describe('expression parser/evaluator', () => {
  it('evaluates basic arithmetic with correct precedence', () => {
    expect(evaluate(parseExpr('1 + 2 * 3'), {})).toBe(7);
    expect(evaluate(parseExpr('(1 + 2) * 3'), {})).toBe(9);
    expect(evaluate(parseExpr('10 / 2 / 5'), {})).toBe(1);
    expect(evaluate(parseExpr('2 - 3 - 4'), {})).toBe(-5);
  });

  it('handles unary minus', () => {
    expect(evaluate(parseExpr('-5'), {})).toBe(-5);
    expect(evaluate(parseExpr('-(2+3)'), {})).toBe(-5);
    expect(evaluate(parseExpr('3 - -2'), {})).toBe(5);
  });

  it('substitutes variables from scope', () => {
    expect(evaluate(parseExpr('A + B'), { A: 3, B: 4 })).toBe(7);
    expect(evaluate(parseExpr('A * B - C'), { A: 5, B: 6, C: 1 })).toBe(29);
  });

  it('throws for undefined variables', () => {
    expect(() => evaluate(parseExpr('A + 1'), {})).toThrow(/A/);
  });

  it('throws for division by zero', () => {
    expect(() => evaluate(parseExpr('1/0'), {})).toThrow(/ゼロ除算/);
  });

  it('throws for malformed expressions', () => {
    expect(() => parseExpr('1 +')).toThrow();
    expect(() => parseExpr('(1 + 2')).toThrow();
    expect(() => parseExpr('1 2')).toThrow();
  });

  it('collects referenced variable names', () => {
    const names = collectVariableNames(parseExpr('A + B * (C - A)'));
    expect([...names].sort()).toEqual(['A', 'B', 'C']);
  });

  it('detects inf literals', () => {
    expect(isInfLiteral('inf')).toBe('pos');
    expect(isInfLiteral(' -inf ')).toBe('neg');
    expect(isInfLiteral('Inf')).toBe('pos');
    expect(isInfLiteral('A+1')).toBeNull();
  });
});
