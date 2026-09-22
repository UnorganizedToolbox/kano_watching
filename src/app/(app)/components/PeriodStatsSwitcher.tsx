'use client'

import { useState } from "react";
import type { PeriodStats, PomodoroAnalytics, StreakPeriod } from "@/lib/pomodoroAnalytics";

type ViewKey = 'streaks' | 'cumulative' | 'weekly' | 'monthly';

const VIEW_LABELS: Record<ViewKey, string> = {
  streaks: '連続',
  cumulative: '累計',
  weekly: '週毎',
  monthly: '月毎',
};

function percent(rate: number | null): string {
  return rate === null ? '—' : `${Math.round(rate * 100)}%`;
}

function decimal(value: number | null, digits = 1): string {
  return value === null ? '—' : value.toFixed(digits);
}

function weekBucketLabel(label: string): string {
  const [, m, d] = label.split('-');
  return `${Number(m)}/${Number(d)}`;
}

function monthBucketLabel(label: string): string {
  const [y, m] = label.split('-');
  return `${y}/${Number(m)}`;
}

// 「連続・累計・週毎・月毎」のどのビューでも共通のカラム構成にする(固有の分析はここには置かない)
function StatsTable({ rows, showFocusScore }: { rows: { key: string; label: string; stats: PeriodStats; badge?: string }[]; showFocusScore: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] text-slate-400 border-b border-slate-100 dark:border-slate-800">
            <th className="py-2 pr-3 font-bold">期間</th>
            <th className="py-2 pr-3 font-bold text-right">学習日数</th>
            <th className="py-2 pr-3 font-bold text-right">完了数</th>
            <th className="py-2 pr-3 font-bold text-right">学習時間</th>
            <th className="py-2 pr-3 font-bold text-right">完了率</th>
            <th className="py-2 pr-3 font-bold text-right">休憩完了率</th>
            <th className="py-2 pr-3 font-bold text-right">平均評価</th>
            {showFocusScore && <th className="py-2 font-bold text-right">集中度</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.key} className="border-b border-slate-50 dark:border-slate-800/60 text-slate-700 dark:text-slate-200">
              <td className="py-2 pr-3 whitespace-nowrap font-bold">{r.label}{r.badge && <span className="ml-1.5 text-[10px] font-bold text-brand-600 dark:text-brand-400">{r.badge}</span>}</td>
              <td className="py-2 pr-3 text-right">{r.stats.activeDays}日</td>
              <td className="py-2 pr-3 text-right">{r.stats.completedWork}回</td>
              <td className="py-2 pr-3 text-right">{(r.stats.studyMinutes / 60).toFixed(1)}h</td>
              <td className="py-2 pr-3 text-right">{percent(r.stats.workCompletionRate)}</td>
              <td className="py-2 pr-3 text-right">{percent(r.stats.breakCompletionRate)}</td>
              <td className="py-2 pr-3 text-right">{decimal(r.stats.avgRating)}</td>
              {showFocusScore && <td className="py-2 text-right">{r.stats.avgFocusScore === null ? '—' : Math.round(r.stats.avgFocusScore)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CumulativeGrid({ stats, showFocusScore }: { stats: PeriodStats; showFocusScore: boolean }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      <Stat label="学習した日数" value={`${stats.activeDays}日`} sub={`学習日あたり ${decimal(stats.avgPomosPerActiveDay)}回`} />
      <Stat label="完了したポモドーロ" value={`${stats.completedWork}回`} />
      <Stat label="学習時間(実測)" value={`${(stats.studyMinutes / 60).toFixed(1)}時間`} />
      <Stat label="作業の完了率" value={percent(stats.workCompletionRate)} />
      <Stat label="休憩の完了率" value={percent(stats.breakCompletionRate)} />
      <Stat label="集中度評価の平均" value={decimal(stats.avgRating)} />
      <Stat label="作業1回あたりの一時停止" value={`${decimal(stats.avgPausesPerWork)}回`} />
      <Stat label="作業1回あたりの残り時間確認" value={`${decimal(stats.avgTimeChecksPerWork)}回`} />
      {showFocusScore && <Stat label="集中度スコア(暫定)の平均" value={stats.avgFocusScore === null ? '—' : `${Math.round(stats.avgFocusScore)}点`} />}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/60 px-4 py-3">
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-xl font-black text-slate-800 dark:text-white">{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

const TAB_CLASS = (active: boolean) =>
  `px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
    active
      ? 'bg-brand-600 text-white'
      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
  }`;

function streakBadge(s: StreakPeriod): string | undefined {
  return s.ongoing ? '進行中' : undefined;
}

export default function PeriodStatsSwitcher({ periods, showFocusScore }: {
  periods: PomodoroAnalytics['periods'];
  showFocusScore: boolean;
}) {
  const [view, setView] = useState<ViewKey>('cumulative');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(VIEW_LABELS) as ViewKey[]).map(key => (
          <button key={key} type="button" onClick={() => setView(key)} className={TAB_CLASS(view === key)}>
            {VIEW_LABELS[key]}
          </button>
        ))}
      </div>

      {view === 'cumulative' && (
        periods.cumulative.completedWork === 0
          ? <p className="text-sm text-slate-400">まだ集計できるデータがありません。</p>
          : <CumulativeGrid stats={periods.cumulative} showFocusScore={showFocusScore} />
      )}

      {view === 'streaks' && (
        periods.streaks.length === 0
          ? <p className="text-sm text-slate-400">まだ連続した学習記録がありません。</p>
          : <StatsTable
              showFocusScore={showFocusScore}
              rows={[...periods.streaks].reverse().map(s => ({
                key: s.startDate,
                label: s.days === 1 ? `${s.startDate}(1日)` : `${s.startDate}〜${s.endDate}(${s.days}日)`,
                stats: s,
                badge: streakBadge(s),
              }))}
            />
      )}

      {view === 'weekly' && (
        <StatsTable
          showFocusScore={showFocusScore}
          rows={[...periods.weekly].reverse().map((w, i) => ({
            key: w.label,
            label: i === 0 ? `${weekBucketLabel(w.label)}(直近7日)` : weekBucketLabel(w.label),
            stats: w,
          }))}
        />
      )}

      {view === 'monthly' && (
        <StatsTable
          showFocusScore={showFocusScore}
          rows={[...periods.monthly].reverse().map(m => ({ key: m.label, label: monthBucketLabel(m.label), stats: m }))}
        />
      )}
    </div>
  );
}
