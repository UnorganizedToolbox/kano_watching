import { describe, it, expect } from 'vitest';
import { resolveVariables } from './resolve';
import { renderProblem, isAnswerCorrect } from './render';
import { validateTemplate } from './validate';
import type { ProblemTemplateDef } from './types';

// 実装イメージ文書 3.5節の例をそのまま使った統合テスト。実際の Math.random を使い、
// 多数回実行しても常に制約を満たした値が生成されることを確認する。
const template: ProblemTemplateDef = {
  title: '2次式の因数分解',
  variables: [
    { name: 'A', type: 'integer', min: '1', max: '9' },
    { name: 'B', type: 'integer', min: '-inf', max: 'A+5' },
    { name: 'C', type: 'integer', min: '0', max: '10' },
  ],
  constraints: ['A*A != B'],
  problem_template: '次の二次式を展開しなさい。 $ x^2 - {{A+B}} x + {{A*B}} $',
  answer_templates: ['(x - {{A}})(x - {{B}})', '(x - {{B}})(x - {{A}})'],
};

describe('CBT engine integration (real randomness)', () => {
  it('validateTemplate confirms the template is satisfiable', () => {
    const result = validateTemplate(template, 20);
    expect(result.ok).toBe(true);
  });

  it('repeatedly resolves and renders without violating constraints', () => {
    for (let i = 0; i < 200; i++) {
      const result = resolveVariables(template);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;

      const { A, B, C } = result.values;
      expect(Number.isInteger(A)).toBe(true);
      expect(A).toBeGreaterThanOrEqual(1);
      expect(A).toBeLessThanOrEqual(9);
      expect(B).toBeLessThanOrEqual(A + 5);
      expect(C).toBeGreaterThanOrEqual(0);
      expect(C).toBeLessThanOrEqual(10);
      expect(A * A).not.toBe(B); // 制約 A*A != B

      const { problemText, answerTexts } = renderProblem(template.problem_template, template.answer_templates, result.values);
      expect(problemText).toContain(String(A + B < 0 ? `(${A + B})` : A + B));
      expect(answerTexts[0]).toContain(`x - ${A}`);

      // どちらの順序の別解を生徒が書いても正解として扱われる(空白違いも許容)
      expect(isAnswerCorrect(answerTexts[0], answerTexts)).toBe(true);
      expect(isAnswerCorrect(answerTexts[1], answerTexts)).toBe(true);
      // 空白を余分に挟んでも(空白は無視して比較するので)正解として扱われる
      expect(isAnswerCorrect(answerTexts[0].replace(/\(/g, ' ( ').replace(/\)/g, ' ) '), answerTexts)).toBe(true);
    }
  });

  // 実際に報告されたバグの再現テスト: 独立した2変数A,B(共に[0,100])に
  // 制約 "A<B" だけを課すという、ごく普通のテンプレート。修正前は
  // 「たまたまA=100を引く」と即座に生成不能と誤判定されていた
  // (1回の検証内でP(A=100)≈1/101なので、20回検証すると高確率で誤判定が
  // 発生していた)。この単純な独立変数+単純な順序制約という組み合わせで
  // validateTemplateが安定して成功することを確認する。
  it('does not spuriously fail validation for a simple "A < B" template (regression)', () => {
    const simpleTemplate = {
      variables: [
        { name: 'A', type: 'integer' as const, min: '0', max: '100' },
        { name: 'B', type: 'integer' as const, min: '0', max: '100' },
      ],
      constraints: ['A < B'],
    };

    for (let i = 0; i < 20; i++) {
      const result = validateTemplate(simpleTemplate, 5);
      expect(result.ok).toBe(true);
    }
  });
});
