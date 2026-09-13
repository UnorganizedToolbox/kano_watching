import { describe, it, expect } from 'vitest';
import { renderTemplate, renderProblem } from './render';

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

  it('renders a full problem + answer pair', () => {
    const { problemText, answerText } = renderProblem(
      '次の二次式を展開しなさい。 $ x^2 - {{A+B}} x + {{A*B}} $',
      '(x - {{A}})(x - {{B}})',
      { A: 5, B: 6 },
    );
    expect(problemText).toBe('次の二次式を展開しなさい。 $ x^2 - 11 x + 30 $');
    expect(answerText).toBe('(x - 5)(x - 6)');
  });
});
