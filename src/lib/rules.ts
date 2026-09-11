// 団体単位(一括管理) / 生徒単位(個別管理)の機能制限ルール定義。
// true = その機能が「禁止」されている状態。個別ルール(rule_overrides)にキーがある場合は
// 団体のルールより優先される。

export const RULE_DEFS = [
  { key: 'disable_gamification', label: 'ゲーミフィケーション', description: 'EXP・レベル・実績・ゲームポータルの利用を禁止する' },
  { key: 'disable_questions', label: '質問箱(Q&A)', description: '生徒からの質問投稿を禁止する' },
  { key: 'disable_theme_change', label: 'テーマ変更', description: '画面テーマ(ダーク/ライト等)の変更を禁止する' },
  { key: 'disable_nickname_change', label: 'ニックネーム変更', description: '表示名の変更を禁止する' },
  { key: 'disable_exam_registration', label: '実力診断テストの受験', description: '実力診断テストの新規受験を禁止する' },
] as const;

export type RuleKey = typeof RULE_DEFS[number]['key'];
export type RuleMap = Partial<Record<RuleKey, boolean>>;

export function resolveEffectiveRules(orgRules: RuleMap | null | undefined, overrides: RuleMap | null | undefined): Record<RuleKey, boolean> {
  const effective = {} as Record<RuleKey, boolean>;
  for (const { key } of RULE_DEFS) {
    const override = overrides?.[key];
    effective[key] = override !== undefined && override !== null ? !!override : !!orgRules?.[key];
  }
  return effective;
}
