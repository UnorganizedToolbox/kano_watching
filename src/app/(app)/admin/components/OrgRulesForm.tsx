'use client'

import { useState, useTransition } from 'react';
import { setOrganizationRules } from '../actions';
import { RULE_DEFS, type RuleMap } from '@/lib/rules';
import { ShieldCheck } from 'lucide-react';

export default function OrgRulesForm({ organizationId, organizationName, initialRules, isAdmin }: {
  organizationId: string;
  organizationName: string;
  initialRules: RuleMap;
  isAdmin: boolean;
}) {
  const [rules, setRules] = useState<RuleMap>(initialRules || {});
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const toggle = (key: typeof RULE_DEFS[number]['key']) => {
    setRules(prev => ({ ...prev, [key]: !prev[key] }));
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
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">団体に所属する全生徒に適用される制限です。個別管理で生徒ごとに上書きできます。</p>

      <div className="space-y-3">
        {RULE_DEFS.map(def => (
          <label key={def.key} className="flex items-start justify-between gap-4 p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors">
            <div>
              <p className="font-bold text-sm text-slate-700 dark:text-slate-200">{def.label}を禁止</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{def.description}</p>
            </div>
            <input
              type="checkbox"
              checked={!!rules[def.key]}
              onChange={() => toggle(def.key)}
              className="w-5 h-5 mt-1 accent-brand-600 shrink-0"
            />
          </label>
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
