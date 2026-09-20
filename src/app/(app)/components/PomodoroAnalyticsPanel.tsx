import type { ReactNode } from "react";
import type { LatencyStats, PomodoroAnalytics } from "@/lib/pomodoroAnalytics";

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
const CARD_CLASS = "card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4";

function formatSeconds(sec: number | null): string {
  if (sec === null) return '—';
  const s = Math.round(sec);
  if (s < 60) return `${s}秒`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return m >= 10 || rest === 0 ? `${m}分` : `${m}分${rest}秒`;
}

function percent(rate: number | null): string {
  return rate === null ? '—' : `${Math.round(rate * 100)}%`;
}

function decimal(value: number | null, digits = 1): string {
  return value === null ? '—' : value.toFixed(digits);
}

// 丸めた結果が0になる差は「-0.0」ではなく「±0.0」と表示する
function signedDelta(delta: number): string {
  const rounded = Math.round(delta * 10) / 10;
  if (rounded === 0) return '±0.0';
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}`;
}

function Card({ title, note, children, className = '' }: { title: string; note?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`${CARD_CLASS} ${className}`}>
      <div>
        <h4 className="font-bold font-title text-brand-600">{title}</h4>
        {note && <p className="text-[11px] text-slate-400 mt-1">{note}</p>}
      </div>
      {children}
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

function MiniBars({ values, labels, maxValue, showValues = false, ariaLabel }: {
  values: number[];
  labels: string[];
  maxValue?: number;
  showValues?: boolean;
  ariaLabel: string;
}) {
  const max = maxValue ?? Math.max(...values, 0);
  return (
    <div role="img" aria-label={ariaLabel} className="flex items-end gap-1 h-24">
      {values.map((v, i) => (
        <div key={i} className="flex-1 min-w-0 h-full flex flex-col justify-end items-center gap-1" title={`${labels[i]}: ${v}`}>
          {showValues && <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{v}</span>}
          <div
            className={`w-full rounded-t ${v > 0 ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'}`}
            style={{ height: v > 0 && max > 0 ? `${Math.max((v / max) * 70, 4)}%` : '2px' }}
          />
          <span className="text-[9px] text-slate-400 leading-none h-2 truncate max-w-full">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

function ProgressRow({ label, done, total, rate }: { label: string; done: number; total: number; rate: number | null }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          <span className="text-base font-black text-brand-600 dark:text-brand-400">{percent(rate)}</span>
          <span className="ml-2">{done} / {total}</span>
        </span>
      </div>
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
        <div className="bg-brand-500 h-full rounded-full" style={{ width: `${Math.round((rate ?? 0) * 100)}%` }} />
      </div>
    </div>
  );
}

const LATENCY_BUCKETS: { key: keyof LatencyStats['buckets']; label: string; className: string }[] = [
  { key: 'within10s', label: '10秒以内', className: 'bg-emerald-500' },
  { key: 'within1m', label: '1分以内', className: 'bg-sky-500' },
  { key: 'within5m', label: '5分以内', className: 'bg-amber-500' },
  { key: 'over5m', label: '5分超', className: 'bg-rose-500' },
];

function LatencyBlock({ title, stats }: { title: string; stats: LatencyStats }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-baseline gap-2 flex-wrap">
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{title}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          中央値 <b className="text-base font-black text-brand-600 dark:text-brand-400">{formatSeconds(stats.medianSec)}</b>
          <span className="ml-2">平均 {formatSeconds(stats.meanSec)}</span>
        </span>
      </div>
      {stats.count > 0 ? (
        <>
          <div className="flex w-full h-2.5 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
            {LATENCY_BUCKETS.map(b => stats.buckets[b.key] > 0 && (
              <div key={b.key} className={b.className} style={{ width: `${(stats.buckets[b.key] / stats.count) * 100}%` }} />
            ))}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
            {LATENCY_BUCKETS.map(b => (
              <li key={b.key} className="flex items-center gap-1.5">
                <span className={`inline-block w-2 h-2 rounded-full ${b.className}`} />
                {b.label} {stats.buckets[b.key]}回
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-xs text-slate-400">計測できたデータがまだありません</p>
      )}
      {stats.noResumeCount > 0 && (
        <p className="text-[11px] text-slate-400">30分以内に次を始めず終了: {stats.noResumeCount}回(上の集計には含めていません)</p>
      )}
    </div>
  );
}

export default function PomodoroAnalyticsPanel({ analytics }: { analytics: PomodoroAnalytics | null }) {
  if (!analytics) {
    return (
      <Card title="学習習慣と集中の分析">
        <p className="text-sm text-slate-500">分析データを取得できませんでした。時間をおいて再度お試しください。</p>
      </Card>
    );
  }
  if (!analytics.hasData) {
    return (
      <Card title="学習習慣と集中の分析">
        <p className="text-sm text-slate-500">データ収集中... ポモドーロを実行すると、習慣や集中の傾向がここに表示されます。</p>
      </Card>
    );
  }

  const { habit, transitions, completion, focus, bySubject, windowDays } = analytics;
  const weeks = habit.weeklyActiveDays.length;
  const weekLabels = habit.weeklyActiveDays.map((_, i) => (i === weeks - 1 ? '直近7日' : `${weeks - 1 - i}週前`));
  const hourLabels = habit.byHour.map((_, h) => (h % 6 === 0 ? String(h) : ''));
  const ratingDelta = focus.recentAvgRating !== null && focus.previousAvgRating !== null
    ? focus.recentAvgRating - focus.previousAvgRating
    : null;
  const workInterruptions = completion.workStopped + completion.workAbandoned + completion.workUnfinished;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-bold font-title text-slate-800 dark:text-white">学習習慣と集中の分析</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          直近{windowDays}日間のポモドーロ操作ログから集計しています(時刻は日本時間)。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="学習習慣" note="タイマーが最後まで進んだ作業の回数をもとにしています">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="学習した日数" value={`${habit.activeDays} / ${windowDays}日`} />
            <Stat label="現在の連続日数" value={`${habit.currentStreak}日`} sub={`最長 ${habit.longestStreak}日(直近90日)`} />
            <Stat label="完了したポモドーロ" value={`${habit.completedWorkCount}回`} sub={`学習した日あたり ${decimal(habit.avgPomosPerActiveDay)}回`} />
            <Stat label="1回の学習での連続数" value={`平均 ${decimal(habit.avgPomosPerSession)}回`} sub={`最長 ${habit.maxPomosInSession}回(1時間以内の間隔で続けたもの)`} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">週ごとの学習日数(7日中)</p>
            <MiniBars values={habit.weeklyActiveDays} labels={weekLabels} maxValue={7} showValues ariaLabel="週ごとの学習日数" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">始めた時間帯(時)</p>
            <MiniBars values={habit.byHour} labels={hourLabels} ariaLabel="作業を始めた時間帯ごとの完了数" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">曜日別の完了数</p>
            <MiniBars values={habit.byWeekday} labels={WEEKDAY_LABELS} showValues ariaLabel="曜日ごとの完了数" />
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <Card title="切り替えの速さ" note="タイマーが終わってから、次のスタートボタンを押すまでの時間です">
            <LatencyBlock title="作業が終わってから休憩を始めるまで" stats={transitions.workEndToBreakStart} />
            <LatencyBlock title="休憩が終わってから作業を始めるまで" stats={transitions.breakEndToWorkStart} />
            {transitions.ratingInputMedianSec !== null && (
              <p className="text-[11px] text-slate-400">
                作業後の時間には、集中度を入力する時間(中央値 {formatSeconds(transitions.ratingInputMedianSec)})が含まれます。
              </p>
            )}
          </Card>

          <Card title="完了率" note="結果が確定した区間だけを数えています(実行中のものは含みません)">
            <ProgressRow label="作業を最後までやり切った割合" done={completion.workCompleted} total={completion.workStarted} rate={completion.workCompletionRate} />
            <ProgressRow label="休憩を最後まで取った割合" done={completion.breakCompleted} total={completion.breakStarted} rate={completion.breakCompletionRate} />
            <ul className="text-xs text-slate-500 dark:text-slate-400 flex flex-col gap-1">
              {workInterruptions > 0 && (
                <li>
                  途中で終わった作業 {workInterruptions}回
                  (中止 {completion.workStopped} / タブを閉じた等 {completion.workAbandoned} / 一時停止のまま放置など {completion.workUnfinished})
                </li>
              )}
              <li>作業1回あたりの一時停止 {decimal(completion.avgPausesPerWork)}回</li>
              <li>作業後に休憩を取らず終えた回数 {completion.quitBeforeBreak}回</li>
              <li>休憩後に次の作業を始めず終えた回数 {completion.quitBeforeWork}回</li>
            </ul>
          </Card>

          <Card title="集中の指標" note="集中度の自己評価(1〜5)と、残り時間の確認回数から見ています">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="集中度の平均" value={decimal(focus.avgRating)} sub={`評価 ${focus.ratingCount}回${focus.ratingSkippedCount > 0 ? ` / スキップ ${focus.ratingSkippedCount}回` : ''}`} />
              <Stat
                label="直近7日の平均"
                value={decimal(focus.recentAvgRating)}
                sub={ratingDelta === null ? '比較できるデータがまだありません' : `その前の7日 ${decimal(focus.previousAvgRating)}(${signedDelta(ratingDelta)})`}
              />
              <Stat label="残り時間の確認" value={`${decimal(focus.avgTimeChecksPerWork)}回`} sub="作業1回あたりの平均" />
              <Stat
                label="確認の有無で比べた集中度"
                value={focus.avgRatingWithChecks === null ? '—' : `${decimal(focus.avgRatingWithoutChecks)} / ${decimal(focus.avgRatingWithChecks)}`}
                sub={focus.avgRatingWithChecks === null ? '各3回以上たまると表示されます' : '確認なし / 確認あり'}
              />
            </div>
          </Card>
        </div>
      </div>

      <Card title="科目別の完了率と集中度">
        {bySubject.length === 0 ? (
          <p className="text-sm text-slate-500">まだ集計できる作業の記録がありません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="py-2 pr-4 font-bold">科目</th>
                  <th className="py-2 pr-4 font-bold text-right">作業回数</th>
                  <th className="py-2 pr-4 font-bold text-right">完了率</th>
                  <th className="py-2 font-bold text-right">集中度の平均</th>
                </tr>
              </thead>
              <tbody>
                {bySubject.map(s => (
                  <tr key={s.subject} className="border-b border-slate-50 dark:border-slate-800/60 text-slate-700 dark:text-slate-200">
                    <td className="py-2 pr-4 font-bold">{s.subject}</td>
                    <td className="py-2 pr-4 text-right">{s.segments}回</td>
                    <td className="py-2 pr-4 text-right">{percent(s.completionRate)}<span className="text-[11px] text-slate-400 ml-1">({s.completed}/{s.segments})</span></td>
                    <td className="py-2 text-right">{decimal(s.avgRating)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <details className="text-xs text-slate-500 dark:text-slate-400">
        <summary className="cursor-pointer font-bold">指標の定義と注意点</summary>
        <ul className="list-disc pl-5 mt-2 flex flex-col gap-1">
          <li>完了 = タイマーが最後まで進んだ区間。中止・タブを閉じた・一時停止のまま放置(最後の操作から2時間以上)は「途中で終わった」として数えます。</li>
          <li>切り替えの速さ = タイマー完了から次のスタートボタンまで。30分以内に次を始めなかった場合は「再開せず終了」として除外します。</li>
          <li>1回の学習 = 前の作業が終わってから1時間以内に次の作業を始めた、ひと続きのまとまり。</li>
          <li>集中度の平均には「スキップ(普通とする)」を含めません。ただしスキップの記録を始める前のデータは、本当の「3」と区別できません。</li>
          <li>数値は行動の記録から見た傾向で、能力や意欲の優劣を示すものではありません。</li>
        </ul>
      </details>
    </div>
  );
}
