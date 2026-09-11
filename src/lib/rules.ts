// 団体単位(一括管理) / 生徒単位(個別管理)の機能制限ルール定義。
//
// 団体側 (organizations.rules) は3段階:
//   'off'    - 制限なし(既定)
//   'on'     - 制限する。ただし個別管理で生徒ごとに上書き可能
//   'forced' - 強制的に制限する。個別管理での上書きを無視する
//
// 生徒側 (profiles.rule_overrides) は2択(真偽値)で、団体側が 'forced' でない場合のみ有効:
//   true  - 禁止する
//   false - 許可する
//   (キーが無い場合は団体設定を継承)

export const RULE_DEFS = [
  { key: 'disable_gamification', label: 'ゲーミフィケーション', description: 'EXP・レベル・実績・ゲームポータルの利用を禁止する' },
  { key: 'disable_questions', label: '質問箱(Q&A)', description: '生徒からの質問投稿を禁止する' },
  { key: 'disable_theme_change', label: 'テーマ変更', description: '画面テーマ(ダーク/ライト等)の変更を禁止する' },
  { key: 'disable_nickname_change', label: 'ニックネーム変更', description: '表示名の変更を禁止する' },
  { key: 'disable_exam_registration', label: '実力診断テストの受験', description: '実力診断テストの新規受験を禁止する' },
] as const;

export type RuleKey = typeof RULE_DEFS[number]['key'];

// 生徒単位の個別上書き
export type RuleMap = Partial<Record<RuleKey, boolean>>;

// 団体単位の一括ルール
export type OrgRuleValue = 'off' | 'on' | 'forced';
export type OrgRuleMap = Partial<Record<RuleKey, OrgRuleValue>>;

// 過去に boolean 形式(true/false)で保存されたデータとの互換性を保つ
export function normalizeOrgRuleValue(v: unknown): OrgRuleValue {
  if (v === true) return 'on';
  if (v === 'on' || v === 'off' || v === 'forced') return v;
  return 'off';
}

export function resolveEffectiveRules(orgRules: OrgRuleMap | null | undefined, overrides: RuleMap | null | undefined): Record<RuleKey, boolean> {
  const effective = {} as Record<RuleKey, boolean>;
  for (const { key } of RULE_DEFS) {
    const orgVal = normalizeOrgRuleValue(orgRules?.[key]);

    if (orgVal === 'forced') {
      effective[key] = true;
      continue;
    }

    const override = overrides?.[key];
    effective[key] = override !== undefined && override !== null ? !!override : orgVal === 'on';
  }
  return effective;
}
