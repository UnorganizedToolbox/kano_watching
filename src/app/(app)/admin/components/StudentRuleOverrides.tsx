'use client'

import { useState, useTransition } from 'react';
import { setStudentRuleOverrides } from '../actions';
import { RULE_DEFS, normalizeOrgRuleValue, THEME_OPTIONS, isValidThemeValue, type RuleKey, type RuleMap, type OrgRuleMap } from '@/lib/rules';
import { ShieldCheck } from 'lucide-react';

type OverrideValue = 'inherit' | 'on' | 'off';

function toValueMap(overrides: RuleMap): Record<RuleKey, OverrideValue> {
  const v = {} as Record<RuleKey, OverrideValue>;
  for (const def of RULE_DEFS) {
    const cur = overrides?.[def.key];
    v[def.key] = cur === undefined || cur === null ? 'inherit' : cur ? 'on' : 'off';
  }
  return v;
}

// pinned_theme override の選択肢: 'inherit'(キー無し) / 'free'(明示的に null = 固定しない) / テーマ名
type ThemeOverrideValue = 'inherit' | 'free' | string;

export default function StudentRuleOverrides({ studentId, initialOverrides, orgRules }: { studentId: string; initialOverrides: RuleMap; orgRules?: OrgRuleMap }) {
  const [values, setValues] = useState<Record<RuleKey, OverrideValue>>(() => toValueMap(initialOverrides || {}));
  const [themeOverride, setThemeOverride] = useState<ThemeOverrideValue>(() => {
    if (initialOverrides?.pinned_theme === undefined) return 'inherit';
    if (initialOverrides.pinned_theme === null) return 'free';
    return isValidThemeValue(initialOverrides.pinned_theme) ? initialOverrides.pinned_theme : 'inherit';
  });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setError(null);
    const overrides: RuleMap = {};
    for (const def of RULE_DEFS) {
      const v = values[def.key];
      if (v === 'on') overrides[def.key] = true;
      else if (v === 'off') overrides[def.key] = false;
    }
    if (themeOverride === 'free') overrides.pinned_theme = null;
    else if (themeOverride !== 'inherit') overrides.pinned_theme = themeOverride;

    startTransition(async () => {
      try {
        await setStudentRuleOverrides(studentId, overrides);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch (e) {
        setError(e instanceof Error ? e.message : '更新に失敗しました');
      }
    });
  };

  const orgPinnedTheme = isValidThemeValue(orgRules?.pinned_theme) ? orgRules?.pinned_theme : null;

  return (
    <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1 flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-brand-500" />
        個別管理
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">この生徒だけに適用するルールです。「団体設定に従う」以外を選ぶと、団体の一括設定より優先されます(ただし団体側が「強制禁止」の場合は上書きできません)。</p>

      <div className="space-y-2">
        {RULE_DEFS.map(def => {
          const forced = def.key !== 'disable_theme_change' && normalizeOrgRuleValue(orgRules?.[def.key]) === 'forced';
          const themeForcedByPin = def.key === 'disable_theme_change' && !!orgPinnedTheme && themeOverride === 'inherit';
          return (
            <div key={def.key} className="py-1.5 border-b border-slate-50 dark:border-slate-800/60 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {def.label}
                  {(forced || themeForcedByPin) && <span className="ml-1.5 text-[9px] font-bold text-rose-500">(団体で強制中)</span>}
                </span>
                <select
                  value={forced ? 'on' : values[def.key]}
                  disabled={forced || themeForcedByPin}
                  onChange={(e) => {
                    setValues(prev => ({ ...prev, [def.key]: e.target.value as OverrideValue }));
                    setSaved(false);
                  }}
                  className="px-2 py-1 text-[11px] border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="inherit">団体設定に従う</option>
                  <option value="on">禁止する</option>
                  <option value="off">許可する</option>
                </select>
              </div>

              {def.key === 'disable_theme_change' && (
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400">この生徒だけテーマを固定</span>
                  <select
                    value={themeOverride}
                    onChange={(e) => { setThemeOverride(e.target.value); setSaved(false); }}
                    className="px-2 py-1 text-[11px] border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 outline-none"
                  >
                    <option value="inherit">団体設定に従う{orgPinnedTheme ? '(固定中)' : ''}</option>
                    <option value="free">固定しない(自由に選べる)</option>
                    {THEME_OPTIONS.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="text-rose-500 text-xs font-bold mt-3">{error}</p>}

      <div className="flex justify-end items-center gap-3 mt-4">
        {saved && <span className="text-brand-600 text-xs font-bold">保存しました</span>}
        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition-colors"
        >
          {isPending ? '保存中...' : '保存する'}
        </button>
      </div>
    </div>
  );
}
