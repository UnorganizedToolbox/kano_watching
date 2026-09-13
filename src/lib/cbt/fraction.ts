// 計算結果が「単純な除算(トップレベルが / の式)」の場合に、既約分数として
// 整形するためのユーティリティ。実装イメージ文書 3.4.1/3.4.2 節を参照。
// 複雑な混合演算(例: {{A/B + C}})まで正確に分数のまま扱うのはスコープ外とし、
// トップレベルが単純な A/B の形の場合のみ既約分数化する。

import type { Expr } from './expression';
import { evaluate } from './expression';

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

export type FormattedValue =
  | { kind: 'integer'; text: string; isNegative: boolean }
  | { kind: 'fraction'; text: string; isNegative: boolean }
  | { kind: 'decimal'; text: string; isNegative: boolean };

// 小数の丸め誤差(0.1+0.2 等)を避けるため、実数は適度な桁数に丸める。
const REAL_PRECISION = 6;

function formatPlainNumber(n: number): FormattedValue {
  const isNegative = n < 0;
  if (Number.isInteger(n)) {
    return { kind: 'integer', text: String(Math.abs(n)), isNegative };
  }
  const rounded = Number(Math.abs(n).toFixed(REAL_PRECISION));
  return { kind: 'decimal', text: String(rounded), isNegative };
}

// expr が「トップレベルで単純な整数同士の除算」であれば、既約分数として整形する。
// それ以外は通常の数値として整形する。
export function formatEvaluatedExpr(expr: Expr, scope: Record<string, number>): FormattedValue {
  if (expr.kind === 'bin' && expr.op === '/') {
    const numerator = evaluate(expr.left, scope);
    const denominator = evaluate(expr.right, scope);
    if (Number.isInteger(numerator) && Number.isInteger(denominator) && denominator !== 0) {
      const isNegative = (numerator < 0) !== (denominator < 0);
      const g = gcd(numerator, denominator);
      const reducedNum = Math.abs(numerator) / g;
      const reducedDen = Math.abs(denominator) / g;
      if (reducedDen === 1) {
        return { kind: 'integer', text: String(reducedNum), isNegative };
      }
      return { kind: 'fraction', text: `${reducedNum}/${reducedDen}`, isNegative };
    }
  }
  const value = evaluate(expr, scope);
  return formatPlainNumber(value);
}
