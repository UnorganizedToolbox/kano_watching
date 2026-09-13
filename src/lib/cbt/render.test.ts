import { describe, it, expect } from 'vitest';
import { renderTemplate, renderProblem, normalizeAnswerText, isAnswerCorrect } from './render';

describe('renderTemplate', () => {
  it('substitutes a plain variable', () => {
    expect(renderTemplate('x = {{A}}', { A: 5 })).toBe('x = 5');
  });

  it('evaluates arithmetic expressions inside {{ }}', () => {
    expect(renderTemplate('$ x^2 - {{A+B}} x + {{A*B}} $', { A: 5, B: 6 })).toBe('$ x^2 - 11 x + 30 $');
  });

  it('wraps negative substituted values in parentheses', () => {
    expect(renderTemplate('x - {{B}}', { B: -5 })).toBe('x - (-5)');
  });

  it('reduces a single {{A/B}} expression to a fraction', () => {
    expect(renderTemplate('{{A/B}}', { A: 3, B: 6 })).toBe('1/2');
    expect(renderTemplate('{{A/B}}', { A: -3, B: 6 })).toBe('(-1/2)');
  });

  it('does not fraction-reduce two separate embeds joined by a literal slash', () => {
    // {{A}}/{{B}} は2つの独立した埋め込みであり、Typst側の自然な分数組版に任せる
    expect(renderTemplate('{{A}}/{{B}}', { A: 3, B: 6 })).toBe('3/6');
  });

  it('renders a problem with multiple accepted answers', () => {
    const { problemText, answerTexts } = renderProblem(
      '次の二次式を因数分解しなさい。 $ x^2 - {{A+B}} x + {{A*B}} $',
      ['(x - {{A}})(x - {{B}})', '(x - {{B}})(x - {{A}})'],
      { A: 1, B: 2 },
    );
    expect(problemText).toBe('次の二次式を因数分解しなさい。 $ x^2 - 3 x + 2 $');
    expect(answerTexts).toEqual(['(x - 1)(x - 2)', '(x - 2)(x - 1)']);
  });
});

describe('answer matching (whitespace-insensitive, multiple accepted answers)', () => {
  it('normalizes whitespace away', () => {
    expect(normalizeAnswerText('(x - 1)(x - 2)')).toBe('(x-1)(x-2)');
    expect(normalizeAnswerText('(x-1)(x-2)')).toBe('(x-1)(x-2)');
    expect(normalizeAnswerText('  (x - 1)\n(x - 2)  ')).toBe('(x-1)(x-2)');
  });

  it('accepts any of the registered accepted answers regardless of ordering', () => {
    const accepted = ['(x-1)(x-2)', '(x-2)(x-1)'];
    expect(isAnswerCorrect('(x-1)(x-2)', accepted)).toBe(true);
    expect(isAnswerCorrect('(x-2)(x-1)', accepted)).toBe(true);
    expect(isAnswerCorrect('(x - 2) (x - 1)', accepted)).toBe(true); // 空白違い
    expect(isAnswerCorrect('(x-3)(x-1)', accepted)).toBe(false);
  });
});
