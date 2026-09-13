// CBT問題作成・配信機能: 変数解決エンジンの型定義。
// 詳細仕様は「CBT問題作成・配信機能 実装イメージ文書 v4」を参照。

export type VarType = 'integer' | 'real';

export interface VariableDef {
  name: string; // 英字のみ
  type: VarType;
  // 定数・他の変数を含む式・"inf" / "-inf" のいずれか
  min: string;
  max: string;
}

export type TemplateKind = 'variable' | 'pair_choice';

export interface SubQuestionDef {
  label: string; // 例: "(1)"。大問でなければ空文字でよい
  points: number;
  // 正答は複数登録できる((x-1)(x-2) と (x-2)(x-1) のように書き方が違うだけの
  // 別解や、積分の別の書き方などをすべて正答として扱えるようにするため)。
  answerTemplates: string[];
}

// kind: 'pair_choice' 用。1組をランダムに選び、questionを問題文として提示し、
// answerを唯一の正答として完答判定する(英単語の丸暗記のような用途)。
export interface PairItem {
  question: string;
  answer: string;
}

export interface ProblemTemplateDef {
  title: string;
  kind: TemplateKind;
  variables: VariableDef[];
  constraints: string[]; // 例: ["A < B", "forall(A) A*A != B"]
  problem_template: string;
  // kind === 'variable' のとき、複数あれば大問(小問ごとに配点・別解を持つ)。
  subQuestions: SubQuestionDef[];
  // kind === 'pair_choice' のときのみ使用。
  pairs?: PairItem[];
}

export type ResolvedVariables = Record<string, number>;
// kind === 'pair_choice' の場合、resolvedVariables は { pairIndex: N } の形で
// 選ばれた組のインデックスを保持する(スキーマを分けずに使い回すため)。
export const PAIR_INDEX_KEY = 'pairIndex';

export interface ResolveOptions {
  maxRetries?: number; // 1変数あたりの再抽選上限(既定100)
  maxRestarts?: number; // 1変数の再抽選上限に達した際、試行全体をやり直す回数の上限(既定50)
  random?: () => number; // 乱数源の差し替え(テスト用)
}

export interface ResolveSuccess {
  ok: true;
  values: ResolvedVariables;
}

export interface ResolveFailure {
  ok: false;
  error: string;
}

export type ResolveResult = ResolveSuccess | ResolveFailure;

// 型ごとの inf / -inf の実用上限(実装イメージ文書 3.1節で決定)
export const PRACTICAL_BOUND: Record<VarType, number> = {
  integer: 100000,
  real: 100000,
};

export const DEFAULT_MAX_RETRIES = 100;
export const DEFAULT_MAX_RESTARTS = 50;
