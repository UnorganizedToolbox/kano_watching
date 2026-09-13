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

export interface ProblemTemplateDef {
  title: string;
  variables: VariableDef[];
  constraints: string[]; // 例: ["A < B", "forall(A) A*A != B"]
  problem_template: string;
  answer_template: string;
}

export type ResolvedVariables = Record<string, number>;

export interface ResolveOptions {
  maxRetries?: number; // 1変数あたりの再抽選上限(既定100)
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
