// テンプレート文字列内の {{式}} を、解決済みの変数値で評価した結果に置換する。
// 実装イメージ文書 3.4.1(負の数は括弧補完) / 3.4.2(既約分数化) を参照。
//
// kind === 'pair_choice' の場合は変数展開ではなく、抽選済みの組(pair)の
// question/answer をそのまま使う(3.6節: 単問形式/ペア丸暗記型)。

import { parseExpr } from './expression';
import { formatEvaluatedExpr } from './fraction';
import type { ProblemTemplateDef, ResolvedVariables } from './types';
import { PAIR_INDEX_KEY } from './types';

const PLACEHOLDER_RE = /\{\{([^{}]+)\}\}/g;

export function renderTemplate(template: string, values: ResolvedVariables): string {
  return template.replace(PLACEHOLDER_RE, (_match, inner: string, offset: number) => {
    const expr = parseExpr(inner.trim());
    const formatted = formatEvaluatedExpr(expr, values);
    if (!formatted.isNegative) return formatted.text;
    // 文字列の先頭にある埋め込みは、前に何も無いため"x - -5"のような曖昧さが
    // 生じない。括弧を付けず素の "-5" にする(バグ修正: 正答テンプレートが
    // {{式}} だけで構成される場合、常に括弧補完すると生徒が自然に入力する
    // "-7" のような解答と一致しなくなり、正しい解答が不正解判定されていた)。
    return offset === 0 ? `-${formatted.text}` : `(-${formatted.text})`;
  });
}

export interface RenderedSubAnswer {
  label: string;
  points: number;
  answerTexts: string[];
}

export interface RenderedProblem {
  problemText: string;
  subAnswers: RenderedSubAnswer[];
}

export function renderProblem(
  template: Pick<ProblemTemplateDef, 'kind' | 'problem_template' | 'subQuestions' | 'pairs'>,
  values: ResolvedVariables,
): RenderedProblem {
  if (template.kind === 'pair_choice') {
    const pairs = template.pairs ?? [];
    const idx = values[PAIR_INDEX_KEY];
    const pair = pairs[idx];
    if (!pair) throw new Error(`抽選された組(index=${idx})が見つかりません`);

    const wrapper = template.problem_template.trim();
    const problemText = wrapper.includes('{{q}}') ? wrapper.replace(/\{\{q\}\}/g, pair.question) : pair.question;
    const points = template.subQuestions[0]?.points ?? 1;

    return {
      problemText,
      subAnswers: [{ label: '', points, answerTexts: [pair.answer] }],
    };
  }

  return {
    problemText: renderTemplate(template.problem_template, values),
    subAnswers: template.subQuestions.map(sq => ({
      label: sq.label,
      points: sq.points,
      answerTexts: sq.answerTemplates.map(t => renderTemplate(t, values)),
    })),
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
