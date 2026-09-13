// テンプレート文字列内の {{式}} を、解決済みの変数値で評価した結果に置換する。
// 実装イメージ文書 3.4.1(負の数は括弧補完) / 3.4.2(既約分数化) を参照。

import { parseExpr } from './expression';
import { formatEvaluatedExpr } from './fraction';
import type { ResolvedVariables } from './types';

const PLACEHOLDER_RE = /\{\{([^{}]+)\}\}/g;

export function renderTemplate(template: string, values: ResolvedVariables): string {
  return template.replace(PLACEHOLDER_RE, (_match, inner: string) => {
    const expr = parseExpr(inner.trim());
    const formatted = formatEvaluatedExpr(expr, values);
    return formatted.isNegative ? `(-${formatted.text})` : formatted.text;
  });
}

export interface RenderedProblem {
  problemText: string;
  answerText: string;
}

export function renderProblem(
  problemTemplate: string,
  answerTemplate: string,
  values: ResolvedVariables,
): RenderedProblem {
  return {
    problemText: renderTemplate(problemTemplate, values),
    answerText: renderTemplate(answerTemplate, values),
  };
}
