'use client'

import { useState, useTransition } from 'react';
import { setOrganizationRules } from '../actions';
import { RULE_DEFS, normalizeOrgRuleValue, type OrgRuleMap, type OrgRuleValue } from '@/lib/rules';
import { ShieldCheck } from 'lucide-react';

const OPTIONS: { value: OrgRuleValue; label: string }[] = [
  { value: 'off', label: '許可' },
  { value: 'on', label: '禁止(生徒側で上書き可)' },
  { value: 'forced', label: '強制禁止(上書き不可)' },
];

export default function OrgRulesForm({ organizationId, organizationName, initialRules, isAdmin }: {
  organizationId: string;
  organizationName: string;
  initialRules: OrgRuleMap;
  isAdmin: boolean;
}) {
  const [rules, setRules] = useState<OrgRuleMap>(() => {
    const normalized: OrgRuleMap = {};
    for (const def of RULE_DEFS) {
      normalized[def.key] = normalizeOrgRuleValue(initialRules?.[def.key]);
    }
    return normalized;
  });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const setValue = (key: typeof RULE_DEFS[number]['key'], value: OrgRuleValue) => {
    setRules(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      try {
        await setOrganizationRules(isAdmin ? organizationId : undefined, rules);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch (e) {
        setError(e instanceof Error ? e.message : '更新に失敗しました');
      }
    });
  };

  return (
    <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1 flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-brand-500" />
        一括管理: {organizationName}
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
        団体に所属する全生徒に適用される制限です。「禁止」は個別管理で生徒ごとに上書きできますが、「強制禁止」は個別管理でも変更できません。
      </p>

      <div className="space-y-3">
        {RULE_DEFS.map(def => (
          <div key={def.key} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <p className="font-bold text-sm text-slate-700 dark:text-slate-200">{def.label}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{def.description}</p>
            <div className="flex flex-wrap gap-1.5">
              {OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setValue(def.key, opt.value)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                    rules[def.key] === opt.value
                      ? opt.value === 'forced'
                        ? 'bg-rose-600 text-white'
                        : opt.value === 'on'
                        ? 'bg-amber-500 text-white'
                        : 'bg-emerald-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-rose-500 text-xs font-bold mt-4">{error}</p>}

      <div className="flex justify-end items-center gap-3 mt-5">
        {saved && <span className="text-brand-600 text-xs font-bold">保存しました</span>}
        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-colors"
        >
          {isPending ? '保存中...' : '保存する'}
        </button>
      </div>
    </div>
  );
}
