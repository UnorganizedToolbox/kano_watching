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
//
// テーマだけは「変更を禁止する」だけでなく「特定の値に固定する」ことにも意味があるため、
// pinned_theme という別軸のフィールドを rules / rule_overrides に持たせる。
// pinned_theme が設定されている場合、テーマ変更の禁止(disable_theme_change)は自動的に
// 強制されているとみなし、かつそのテーマが強制適用される。

export const RULE_DEFS = [
  { key: 'disable_gamification', label: 'ゲーミフィケーション', description: 'EXP・レベル・実績・ゲームポータルの利用を禁止する' },
  { key: 'disable_questions', label: '質問箱(Q&A)', description: '生徒からの質問投稿を禁止する' },
  { key: 'disable_theme_change', label: 'テーマ変更', description: '画面テーマ(ダーク/ライト等)の変更を禁止する(特定のテーマに固定したい場合は下の「固定するテーマ」を使用)' },
  { key: 'disable_nickname_change', label: 'ニックネーム変更', description: '表示名の変更を禁止する' },
  { key: 'disable_exam_registration', label: '実力診断テストの受験', description: '実力診断テストの新規受験を禁止する' },
] as const;

export type RuleKey = typeof RULE_DEFS[number]['key'];

export const THEME_OPTIONS = [
  { value: 'theme-glass', label: 'Glassmorphism (透過ガラス・アチーブ連動壁紙)' },
  { value: 'theme-brutalist', label: 'Neo-Brutalism (ネオ・ブルータリズム)' },
  { value: 'theme-clay', label: 'Claymorphism (クレイモーフィズム)' },
  { value: 'theme-lofi', label: 'Cozy Lo-Fi (コージー・ローファイ / 勉強部屋)' },
  { value: 'theme-aurora', label: 'Aurora Night (オーロラ・ナイト / 北欧夜空)' },
  { value: 'theme-cafe', label: 'Café Macchiato (カフェ・マキアート / 珈琲トーン)' },
  { value: 'theme-matcha', label: 'Matcha Zen (和風アース抹茶色)' },
  { value: 'theme-default', label: 'Slate Standard (標準スレート)' },
] as const;

export type ThemeValue = typeof THEME_OPTIONS[number]['value'];

// 生徒単位の個別上書き
export type RuleMap = Partial<Record<RuleKey, boolean>> & { pinned_theme?: string | null };

// 団体単位の一括ルール
export type OrgRuleValue = 'off' | 'on' | 'forced';
export type OrgRuleMap = Partial<Record<RuleKey, OrgRuleValue>> & { pinned_theme?: string | null };

// 過去に boolean 形式(true/false)で保存されたデータとの互換性を保つ
export function normalizeOrgRuleValue(v: unknown): OrgRuleValue {
  if (v === true) return 'on';
  if (v === 'on' || v === 'off' || v === 'forced') return v;
  return 'off';
}

export function isValidThemeValue(v: unknown): v is ThemeValue {
  return typeof v === 'string' && THEME_OPTIONS.some(t => t.value === v);
}

// 個別管理(overrides.pinned_theme)が優先。キーが無ければ団体設定を継承する。
// null は「(団体が固定していても)固定しない」の明示的な指定。
export function resolveEffectivePinnedTheme(orgRules: OrgRuleMap | null | undefined, overrides: RuleMap | null | undefined): ThemeValue | null {
  const overrideVal = overrides?.pinned_theme;
  if (overrideVal !== undefined) {
    return isValidThemeValue(overrideVal) ? overrideVal : null;
  }
  const orgVal = orgRules?.pinned_theme;
  return isValidThemeValue(orgVal) ? orgVal : null;
}

export function resolveEffectiveRules(orgRules: OrgRuleMap | null | undefined, overrides: RuleMap | null | undefined): Record<RuleKey, boolean> {
  const effective = {} as Record<RuleKey, boolean>;
  const pinnedTheme = resolveEffectivePinnedTheme(orgRules, overrides);

  for (const { key } of RULE_DEFS) {
    if (key === 'disable_theme_change' && pinnedTheme) {
      // 特定のテーマに固定されている場合、変更禁止も自動的に強制される
      effective[key] = true;
      continue;
    }

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
