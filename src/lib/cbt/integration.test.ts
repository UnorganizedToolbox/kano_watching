import { describe, it, expect } from 'vitest';
import { resolveVariables } from './resolve';
import { renderProblem } from './render';
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
  answer_template: '(x - {{A}})(x - {{B}})',
};

describe('CBT engine integration (real randomness)', () => {
  it('validateTemplate confirms the template is satisfiable', () => {
    const result = validateTemplate(template, 50);
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

      const { problemText, answerText } = renderProblem(template.problem_template, template.answer_template, result.values);
      expect(problemText).toContain(String(A + B < 0 ? `(${A + B})` : A + B));
      expect(answerText).toContain(`x - ${A}`);
    }
  });
});
