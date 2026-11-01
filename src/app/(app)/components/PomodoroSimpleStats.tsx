import type { PomodoroAnalytics } from "@/lib/pomodoroAnalytics";
import { formatJstDate } from "@/lib/formatDate";
import { Card, Stat } from "./PomodoroAnalyticsPanel";

// 科目の偏りを表示する最大数(それ以上は「その他」にまとめる)
const MAX_SUBJECT_ROWS = 4;

function percent(share: number): string {
  return `${Math.round(share * 100)}%`;
}

export default function PomodoroSimpleStats({ analytics }: { analytics: PomodoroAnalytics | null }) {
  if (!analytics) {
    return (
      <Card title="学習の記録">
        <p className="text-sm text-slate-500">記録を取得できませんでした。時間をおいて再度お試しください。</p>
      </Card>
    );
  }
  if (!analytics.hasData) {
    return (
      <Card title="学習の記録">
        <p className="text-sm text-slate-500">データ収集中... ポモドーロを実行すると、ここに記録が表示されます。</p>
      </Card>
    );
  }

  const { habit, periods, recentCompletions, bySubject } = analytics;
  const lastCompletedAt = recentCompletions[0]?.completedAt ?? null;
  // weekly/monthlyは古い→新しい順なので、最後の要素が「直近7日」「今月」に当たる
  const recentWeek = periods.weekly[periods.weekly.length - 1] ?? null;
  const recentMonth = periods.monthly[periods.monthly.length - 1] ?? null;

  const totalSegments = bySubject.reduce((sum, s) => sum + s.segments, 0);
  const ranked = bySubject.map(s => ({ subject: s.subject, share: totalSegments > 0 ? s.segments / totalSegments : 0 }));
  const subjectShares = ranked.slice(0, MAX_SUBJECT_ROWS);
  const otherShare = ranked.slice(MAX_SUBJECT_ROWS).reduce((sum, s) => sum + s.share, 0);

  return (
    <Card title="学習の記録" note="ポモドーロの操作ログから集計しています(時刻は日本時間)">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat label="連続学習日数" value={`${habit.currentStreak}日`} />
        <Stat label="最高記録" value={`${habit.longestStreak}日`} sub="連続日数の最長" />
        <Stat label="累計学習日数" value={`${periods.cumulative.activeDays}日`} sub={`延べ${periods.cumulative.completedWork}回完了`} />
        <Stat label="最後に勉強した日" value={lastCompletedAt ? formatJstDate(lastCompletedAt) : '—'} />
        <Stat label="直近7日の完了数" value={recentWeek ? `${recentWeek.completedWork}回` : '—'} />
        <Stat label="今月の完了数" value={recentMonth ? `${recentMonth.completedWork}回` : '—'} sub="月初からの累計" />
      </div>

      {subjectShares.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">科目の偏り</p>
          <div className="flex flex-col gap-1.5">
            {subjectShares.map(s => (
              <div key={s.subject} className="flex items-center gap-2">
                <span className="text-xs text-slate-600 dark:text-slate-300 w-16 shrink-0 truncate" title={s.subject}>{s.subject}</span>
                <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.max(s.share * 100, 2)}%` }} />
                </div>
                <span className="text-[11px] text-slate-400 w-9 text-right shrink-0">{percent(s.share)}</span>
              </div>
            ))}
            {otherShare > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-16 shrink-0">その他</span>
                <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-slate-300 dark:bg-slate-600 rounded-full" style={{ width: `${Math.max(otherShare * 100, 2)}%` }} />
                </div>
                <span className="text-[11px] text-slate-400 w-9 text-right shrink-0">{percent(otherShare)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
