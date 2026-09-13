// 制約(constraints)のパース・評価。
// 通常の比較制約: "A < B", "A/B != 1/2" など。
// 全称量化制約: "forall(A) A*A != B" (Aの宣言済み範囲内の全整数について成り立つ必要がある)。

import { parseExpr, evaluate, collectVariableNames, type Expr } from './expression';

export type CompareOp = '<' | '<=' | '>' | '>=' | '==' | '!=';

interface Comparison {
  left: Expr;
  op: CompareOp;
  right: Expr;
}

export type ParsedConstraint =
  | { kind: 'simple'; source: string; comparison: Comparison }
  | { kind: 'forall'; source: string; boundVar: string; comparison: Comparison };

const COMPARE_OPS: CompareOp[] = ['<=', '>=', '==', '!=', '<', '>']; // 長い演算子を先に判定

function splitComparison(source: string): { leftSrc: string; op: CompareOp; rightSrc: string } {
  for (const op of COMPARE_OPS) {
    const idx = source.indexOf(op);
    if (idx !== -1) {
      return {
        leftSrc: source.slice(0, idx),
        op,
        rightSrc: source.slice(idx + op.length),
      };
    }
  }
  throw new Error(`比較演算子が見つかりません: "${source}"`);
}

function parseComparison(source: string): Comparison {
  const { leftSrc, op, rightSrc } = splitComparison(source);
  return {
    left: parseExpr(leftSrc),
    op,
    right: parseExpr(rightSrc),
  };
}

const FORALL_RE = /^forall\s*\(\s*([A-Za-z][A-Za-z0-9_]*)\s*\)\s*(.+)$/;

export function parseConstraint(source: string): ParsedConstraint {
  const trimmed = source.trim();
  const forallMatch = trimmed.match(FORALL_RE);
  if (forallMatch) {
    const [, boundVar, rest] = forallMatch;
    return {
      kind: 'forall',
      source,
      boundVar,
      comparison: parseComparison(rest),
    };
  }
  return {
    kind: 'simple',
    source,
    comparison: parseComparison(trimmed),
  };
}

function compare(op: CompareOp, l: number, r: number): boolean {
  switch (op) {
    case '<': return l < r;
    case '<=': return l <= r;
    case '>': return l > r;
    case '>=': return l >= r;
    case '==': return l === r;
    case '!=': return l !== r;
  }
}

// 制約の評価に必要な変数名の集合(forallの束縛変数も含む。
// 束縛変数自身の値は使わないが、範囲(bounds)が確定している必要があるため、
// 「その変数が解決済みであること」を待つためのシンプルな仕組みとして含める)。
export function constraintDependencies(c: ParsedConstraint): Set<string> {
  const names = new Set<string>();
  collectVariableNames(c.comparison.left, names);
  collectVariableNames(c.comparison.right, names);
  if (c.kind === 'forall') {
    names.add(c.boundVar);
  }
  return names;
}

export interface VariableBounds {
  type: 'integer' | 'real';
  min: number;
  max: number;
}

// 通常の比較制約を評価する。
export function evaluateSimple(c: Extract<ParsedConstraint, { kind: 'simple' }>, scope: Record<string, number>): boolean {
  const l = evaluate(c.comparison.left, scope);
  const r = evaluate(c.comparison.right, scope);
  return compare(c.comparison.op, l, r);
}

// forall制約を評価する。boundVarの宣言済み範囲(bounds)を総当たりし、
// 全ての値で比較が成り立つか確認する。
export function evaluateForall(
  c: Extract<ParsedConstraint, { kind: 'forall' }>,
  scope: Record<string, number>,
  boundVarBounds: VariableBounds,
): boolean {
  if (boundVarBounds.type !== 'integer') {
    throw new Error(`forall(${c.boundVar}) は整数型の変数にのみ使用できます`);
  }
  const { min, max } = boundVarBounds;
  for (let v = min; v <= max; v++) {
    const innerScope = { ...scope, [c.boundVar]: v };
    const l = evaluate(c.comparison.left, innerScope);
    const r = evaluate(c.comparison.right, innerScope);
    if (!compare(c.comparison.op, l, r)) {
      return false;
    }
  }
  return true;
}

export function evaluateConstraint(
  c: ParsedConstraint,
  scope: Record<string, number>,
  bounds: Record<string, VariableBounds>,
): boolean {
  if (c.kind === 'simple') {
    return evaluateSimple(c, scope);
  }
  const boundVarBounds = bounds[c.boundVar];
  if (!boundVarBounds) throw new Error(`変数 "${c.boundVar}" の範囲が確定していません`);
  return evaluateForall(c, scope, boundVarBounds);
}
