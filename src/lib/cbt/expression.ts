// 四則演算(+ - * /)・括弧・変数参照のみをサポートする式パーサー/評価器。
// 範囲式(min/max)・制約・問題文中の {{式}} すべてで共通して使う。
// sqrt 等の関数は対象外(問題文中では Typst 構文としてそのまま書けるため不要)。

export type Expr =
  | { kind: 'num'; value: number }
  | { kind: 'var'; name: string }
  | { kind: 'neg'; expr: Expr }
  | { kind: 'bin'; op: '+' | '-' | '*' | '/'; left: Expr; right: Expr };

type Token =
  | { type: 'num'; value: number }
  | { type: 'ident'; value: string }
  | { type: 'punct'; value: '+' | '-' | '*' | '/' | '(' | ')' };

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      let j = i + 1;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      const text = src.slice(i, j);
      const value = Number(text);
      if (Number.isNaN(value)) throw new Error(`不正な数値です: "${text}"`);
      tokens.push({ type: 'num', value });
      i = j;
      continue;
    }
    if (/[A-Za-z]/.test(c)) {
      let j = i + 1;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      tokens.push({ type: 'ident', value: src.slice(i, j) });
      i = j;
      continue;
    }
    if ('+-*/()'.includes(c)) {
      tokens.push({ type: 'punct', value: c as '+' | '-' | '*' | '/' | '(' | ')' });
      i++;
      continue;
    }
    throw new Error(`式に不正な文字が含まれています: "${c}"`);
  }
  return tokens;
}

class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consumePunct(value: string): boolean {
    const t = this.peek();
    if (t && t.type === 'punct' && t.value === value) {
      this.pos++;
      return true;
    }
    return false;
  }

  parseExpression(): Expr {
    let left = this.parseTerm();
    for (;;) {
      if (this.consumePunct('+')) {
        left = { kind: 'bin', op: '+', left, right: this.parseTerm() };
      } else if (this.consumePunct('-')) {
        left = { kind: 'bin', op: '-', left, right: this.parseTerm() };
      } else {
        break;
      }
    }
    return left;
  }

  private parseTerm(): Expr {
    let left = this.parseUnary();
    for (;;) {
      if (this.consumePunct('*')) {
        left = { kind: 'bin', op: '*', left, right: this.parseUnary() };
      } else if (this.consumePunct('/')) {
        left = { kind: 'bin', op: '/', left, right: this.parseUnary() };
      } else {
        break;
      }
    }
    return left;
  }

  private parseUnary(): Expr {
    if (this.consumePunct('-')) {
      return { kind: 'neg', expr: this.parseUnary() };
    }
    if (this.consumePunct('+')) {
      return this.parseUnary();
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Expr {
    const t = this.peek();
    if (!t) throw new Error('式が不完全です');

    if (t.type === 'num') {
      this.pos++;
      return { kind: 'num', value: t.value };
    }
    if (t.type === 'ident') {
      this.pos++;
      return { kind: 'var', name: t.value };
    }
    if (t.type === 'punct' && t.value === '(') {
      this.pos++;
      const inner = this.parseExpression();
      if (!this.consumePunct(')')) throw new Error('括弧が閉じられていません');
      return inner;
    }
    throw new Error(`式を解析できません(予期しないトークン: ${JSON.stringify(t)})`);
  }

  isAtEnd(): boolean {
    return this.pos >= this.tokens.length;
  }
}

export function parseExpr(source: string): Expr {
  const tokens = tokenize(source);
  const parser = new Parser(tokens);
  const expr = parser.parseExpression();
  if (!parser.isAtEnd()) {
    throw new Error(`式の末尾に余分な文字があります: "${source}"`);
  }
  return expr;
}

export function evaluate(expr: Expr, scope: Record<string, number>): number {
  switch (expr.kind) {
    case 'num':
      return expr.value;
    case 'var': {
      const v = scope[expr.name];
      if (v === undefined) throw new Error(`変数 "${expr.name}" の値が確定していません`);
      return v;
    }
    case 'neg':
      return -evaluate(expr.expr, scope);
    case 'bin': {
      const l = evaluate(expr.left, scope);
      const r = evaluate(expr.right, scope);
      switch (expr.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/':
          if (r === 0) throw new Error('ゼロ除算です');
          return l / r;
      }
    }
  }
}

export function collectVariableNames(expr: Expr, out: Set<string> = new Set()): Set<string> {
  switch (expr.kind) {
    case 'num':
      break;
    case 'var':
      out.add(expr.name);
      break;
    case 'neg':
      collectVariableNames(expr.expr, out);
      break;
    case 'bin':
      collectVariableNames(expr.left, out);
      collectVariableNames(expr.right, out);
      break;
  }
  return out;
}

// {{ 式 }} かどうかを判定する(min/maxフィールド用)。単独の "inf" / "-inf" は
// 呼び出し側(resolve.ts)で別途ハンドリングする。
export function isInfLiteral(source: string): 'pos' | 'neg' | null {
  const trimmed = source.trim().toLowerCase();
  if (trimmed === 'inf') return 'pos';
  if (trimmed === '-inf') return 'neg';
  return null;
}
