'use client'

import { useState } from "react";
import type { PomodoroAnalytics } from "@/lib/pomodoroAnalytics";
import PomodoroAnalyticsPanel from "./PomodoroAnalyticsPanel";
import PomodoroSimpleStats from "./PomodoroSimpleStats";

// 管理者画面向け。簡易表示は生徒自身のダッシュボードと同じ内容(PomodoroSimpleStats)、
// 詳細表示は従来通りの全指標(PomodoroAnalyticsPanel)を表示する。
export default function PomodoroStatsSwitcher({ analytics, showFocusScore = false }: {
  analytics: PomodoroAnalytics | null;
  showFocusScore?: boolean;
}) {
  const [detailed, setDetailed] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={() => setDetailed(false)}
            aria-pressed={!detailed}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              !detailed ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            簡易表示
          </button>
          <button
            type="button"
            onClick={() => setDetailed(true)}
            aria-pressed={detailed}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              detailed ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            詳細表示
          </button>
        </div>
      </div>

      {detailed
        ? <PomodoroAnalyticsPanel analytics={analytics} showFocusScore={showFocusScore} />
        : <PomodoroSimpleStats analytics={analytics} />}
    </div>
  );
}
