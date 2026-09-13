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
  // 正答は複数登録できる(表記違いの別解・積分の別解等を許容するため)。
  answerTexts: string[];
}

export function renderProblem(
  problemTemplate: string,
  answerTemplates: string[],
  values: ResolvedVariables,
): RenderedProblem {
  return {
    problemText: renderTemplate(problemTemplate, values),
    answerTexts: answerTemplates.map(t => renderTemplate(t, values)),
  };
}

// 採点用: 空白(半角/全角スペース・タブ・改行)をすべて無視して比較する。
export function normalizeAnswerText(text: string): string {
  return text.replace(/[\s　]+/g, '');
}

// 生徒の解答が、複数登録された正答のいずれかと(空白を無視して)一致するか判定する。
export function isAnswerCorrect(submitted: string, acceptedAnswers: string[]): boolean {
  const normalizedSubmitted = normalizeAnswerText(submitted);
  return acceptedAnswers.some(a => normalizeAnswerText(a) === normalizedSubmitted);
}
