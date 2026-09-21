// ポモドーロ操作ログ(pomodoro_events)から、学習習慣・切り替えの速さ・完了率・集中の指標を
// 集計する純粋関数群。DBやReactには依存しない。
// 日付・時間帯の区切りは、連続日数判定(cbt/expReward.ts)と同じくJSTで行う。

import {
  computeSessionFocusScore,
  durationWeightedMean,
  effectiveFocusMinutes,
  robustBaseline,
  robustZ,
  type Baseline,
  type FocusOutcome,
} from './focusScore';

export type PomodoroMode = 'WORK' | 'BREAK' | 'LONG_BREAK';
export type PomodoroEventType =
  | 'START' | 'PAUSE' | 'STOP' | 'COMPLETE'
  | 'CHECK_REMAINING_TIME' | 'RATING_SUBMITTED' | 'QUIT' | 'ABANDONED';

export interface PomodoroEventRow {
  session_id: string;
  mode: PomodoroMode;
  event_type: PomodoroEventType;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface LatencyStats {
  count: number; // 反応時間を計測できた回数
  medianSec: number | null;
  meanSec: number | null;
  buckets: { within10s: number; within1m: number; within5m: number; over5m: number };
  noResumeCount: number; // 完了後、上限時間内に次の区間を始めなかった(または明示的に終了した)回数
}

export interface RecentCompletion {
  subject: string | null;
  startedAt: string; // ISO
  completedAt: string; // ISO
  durationMinutes: number; // 実測(一時停止時間を除く)
}

export interface FocusSessionScore {
  startedAt: string; // ISO
  subject: string | null;
  bgm: string | null; // 記録し始める(2026-09-20)より前のセッションはnull
  runningMin: number; // 実際に集中していた時間。放置・終了記録なしのものは測れないので0
  outcome: FocusOutcome;
  score: number;
  penalties: { check: number; pause: number; transition: number };
}

export interface SubjectStat {
  subject: string;
  segments: number;
  completed: number;
  completionRate: number | null;
  avgRating: number | null;
}

export interface TrendBucket {
  label: string; // 週: 最終日(JST, YYYY-MM-DD)。月: YYYY-MM
  activeDays: number;
  completedWork: number;
  studyMinutes: number; // 開始〜完了の実測時間の合計(所要時間が将来変わっても正しく集計できるよう、固定25分では計算しない)
  avgPomosPerActiveDay: number | null;
}

export interface PomodoroAnalytics {
  hasData: boolean;
  windowDays: number;
  habit: {
    activeDays: number;
    currentStreak: number; // 渡されたイベント全体(履歴)での連続日数
    longestStreak: number;
    completedWorkCount: number;
    avgPomosPerActiveDay: number | null;
    sessionCount: number; // 1時間以内の間隔で続けた作業のまとまり
    avgPomosPerSession: number | null;
    maxPomosInSession: number;
    byHour: number[]; // 長さ24(JST)。作業を始めた時間帯ごとの完了数
    byWeekday: number[]; // 長さ7(0=日)。完了数
    byWeekdayStarted: number[]; // 長さ7(0=日)。結果が確定した(進行中を除く)開始数。完了率 = byWeekday/byWeekdayStarted
    weeklyActiveDays: number[]; // 古い週→新しい週。各週の学習日数(0-7、直近windowDays日分)
  };
  transitions: {
    workEndToBreakStart: LatencyStats; // 作業終了(タイマー完了)→休憩開始ボタン
    breakEndToWorkStart: LatencyStats; // 休憩終了→次の作業開始ボタン
    ratingInputMedianSec: number | null; // 作業終了→集中度評価の送信(上の反応時間に含まれる)
  };
  completion: {
    workStarted: number; // 結果が確定した作業区間の数(進行中は除く)
    workCompleted: number;
    workStopped: number;
    workAbandoned: number; // タブを閉じた等
    workUnfinished: number; // 一時停止したまま放置など、終了記録のないもの
    workInProgress: number;
    workCompletionRate: number | null;
    breakStarted: number;
    breakCompleted: number;
    breakCompletionRate: number | null;
    shortBreakCompletionRate: number | null; // 通常休憩(5分)だけの完了率
    longBreakCompletionRate: number | null; // 大休憩(15分)だけの完了率。せっかくの休憩を取らず次に進んでいないか
    quitBeforeBreak: number; // 作業後に休憩を取らず終了した回数
    quitBeforeWork: number; // 休憩後に次の作業を始めず終了した回数
    avgPausesPerWork: number | null;
  };
  focus: {
    ratingCount: number;
    ratingSkippedCount: number; // スキップを記録し始めた以降のログのみ判別できる
    avgRating: number | null;
    recentAvgRating: number | null; // 直近7日
    previousAvgRating: number | null; // その前の7日
    avgTimeChecksPerWork: number | null; // 残り時間を確認した回数(1区間あたり)
    avgRatingWithoutChecks: number | null;
    avgRatingWithChecks: number | null;
  };
  bySubject: SubjectStat[];
  // 直近の完了(履歴全体、最大90日)。新しい順。管理画面等の「最近の学習」一覧に使う。
  recentCompletions: RecentCompletion[];
  // セッション集中度スコア(暫定、focusScore.ts)。生徒への報酬には使わない指標。
  focusScore: {
    sessionCount: number; // 履歴全体でスコアを付けたセッション数
    weightedAvg: number | null; // 直近windowDays日の、作業時間で重みを付けた平均
    daily: { date: string; sessions: number; effectiveFocusMin: number; weightedAvg: number | null }[]; // 直近14日、古い→新しい
    recentSessions: FocusSessionScore[]; // 新しい順、最大10件
    baseline: Baseline | null; // 本人の直近の完走セッションの中央値・IQR(最新を除く。5件未満はnull)
    latestRobustZ: number | null; // 最新の完走セッションの、本人のいつもとの比較(ロバストZ)
    byBgm: { bgm: string; sessions: number; avgScore: number }[]; // 完走セッションをBGM別に
  };
  // 週・月ごとの学習量の推移、連続日数の傾向、累計。windowDaysに縛られず取得できた
  // 履歴全体(最大HISTORY_DAYS日分)で集計する(短い直近ウィンドウでは傾向が見えないため)。
  trends: {
    weekly: TrendBucket[]; // 古い週→新しい週(直近7日間隔、最大 ceil(HISTORY_DAYS/7) 本)
    monthly: TrendBucket[]; // 古い月→新しい月(カレンダー月、JST)
    streakLengths: {
      averageDays: number | null; // 連続学習日数(1日だけの「連続」も1本として含む)の平均
      medianDays: number | null;
      completedStreakCount: number; // 現在進行中の連続も1本として含む
    };
    cumulative: {
      totalCompletedWork: number; // 履歴全体での完了数
      totalStudyMinutes: number; // 履歴全体での実測学習時間の合計(分)
    };
  };
}

export const DEFAULT_WINDOW_DAYS = 28;
export const HISTORY_DAYS = 90;
export const RECENT_COMPLETIONS_LIMIT = 20;

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const JST_OFFSET_MS = 9 * HOUR_MS;

// 完了後にこの時間内に次の区間を始めなければ「再開せず終了」とみなし、反応時間には含めない
const RESUME_GAP_CAP_MS = 30 * 60 * 1000;
// 終了記録のない区間は、最終イベントからこの時間が経つまでは「進行中」として完了率の分母に入れない
const IN_PROGRESS_GRACE_MS = 2 * HOUR_MS;
const STUDY_SESSION_GAP_MS = HOUR_MS;
// グループ間比較(時間確認の有無別など)は、各グループがこの件数に満たなければ出さない
const MIN_GROUP_SAMPLES = 3;
const UNKNOWN_SUBJECT = '不明';
// START時に予定時間を記録していない過去のログの作業は、当時の固定値(25分)とみなす
const DEFAULT_WORK_SCHEDULED_SEC = 25 * 60;
// 実際に動かした時間がこれ未満の作業は「押し間違い」とみなし、作業として数えない
// (完了率・集中度スコアなど、作業区間を数えるすべての集計から外す)。誤って開始してすぐ中止した
// ものが「中止した作業」として完了率を下げたり、点数の低い作業として数えられるのを防ぐ。
// 放置・終了記録なしのように動かした時間が測れないものは、この判定の対象にしない。
const MIN_COUNTABLE_WORK_MIN = 1;
const FOCUS_DAILY_DAYS = 14;
const RECENT_FOCUS_SESSIONS = 10;

function jstDayNumber(ms: number): number {
  return Math.floor((ms + JST_OFFSET_MS) / DAY_MS);
}

function jstHour(ms: number): number {
  return Math.floor(((ms + JST_OFFSET_MS) % DAY_MS) / HOUR_MS);
}

// 1970-01-01(木)を起点とする日番号から曜日(0=日)を求める
function weekdayOf(dayNumber: number): number {
  return (dayNumber + 4) % 7;
}

// jstDayNumberの逆変換。日番号からJSTでの暦日(YYYY-MM-DD)を求める。
// dayNumber*DAY_MSは「その日のJST 0時」をUTC日時として読み替えた値と一致するため、
// UTCのgetterでそのままJSTの年月日が取り出せる。
function jstDateLabel(dayNumber: number): string {
  const d = new Date(dayNumber * DAY_MS);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function jstMonthLabel(dayNumber: number): string {
  const d = new Date(dayNumber * DAY_MS);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function mean(xs: number[]): number | null {
  return xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length;
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function rate(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

export interface ParsedEvent {
  sessionId: string;
  mode: PomodoroMode;
  type: PomodoroEventType;
  meta: Record<string, unknown>;
  at: number;
}

export function parseEvents(rows: PomodoroEventRow[]): ParsedEvent[] {
  return rows
    .map((r, index) => ({ r, index, at: Date.parse(r.created_at) }))
    .filter(x => Number.isFinite(x.at))
    .sort((a, b) => a.at - b.at || a.index - b.index)
    .map(x => ({
      sessionId: x.r.session_id,
      mode: x.r.mode,
      type: x.r.event_type,
      meta: x.r.metadata ?? {},
      at: x.at,
    }));
}

type Outcome = 'completed' | 'stopped' | 'abandoned' | 'unfinished' | 'inProgress';

export interface Segment {
  sessionId: string;
  mode: PomodoroMode;
  startedAt: number;
  lastEventAt: number;
  completedAt: number | null;
  subject: string | null;
  scheduledSec: number | null; // START時に記録した予定時間(2026-09-20以降のログのみ)
  bgm: string | null; // START時に記録したBGMの種類(2026-09-20以降のログのみ)
  pauses: number;
  pausedMs: number; // 一時停止していた実時間の合計(再開せず終了した分は含まない)
  stoppedRunningMs: number | null; // 中止した時点までの、実際に動かしていた時間(一時停止を除く)
  timeChecks: number;
  rating: number | null;
  ratingSkipped: boolean;
  stopped: boolean;
  abandoned: boolean;
}

// session_id ごとに1つの区間(作業 or 休憩)にまとめる。START のない区間(集計期間より前に
// 始まったもの)は判定できないので除外する。
export function buildSegments(events: ParsedEvent[]): Segment[] {
  const bySession = new Map<string, Segment>();
  const pausedSinceBySession = new Map<string, number>();
  for (const ev of events) {
    let seg = bySession.get(ev.sessionId);
    if (!seg) {
      if (ev.type !== 'START') continue;
      seg = {
        sessionId: ev.sessionId, mode: ev.mode, startedAt: ev.at, lastEventAt: ev.at,
        completedAt: null, subject: null, scheduledSec: null, bgm: null, pauses: 0, pausedMs: 0, stoppedRunningMs: null, timeChecks: 0, rating: null, ratingSkipped: false,
        stopped: false, abandoned: false,
      };
      bySession.set(ev.sessionId, seg);
    }
    seg.lastEventAt = ev.at;
    switch (ev.type) {
      case 'START': {
        if (seg.subject === null && typeof ev.meta.subject === 'string' && ev.meta.subject) seg.subject = ev.meta.subject;
        // 予定時間・BGMは最初のSTARTの値を使う(再開のSTARTでは「残り」ではなく全体の予定時間が入るため)
        if (seg.scheduledSec === null && typeof ev.meta.scheduled_seconds === 'number' && ev.meta.scheduled_seconds > 0) seg.scheduledSec = ev.meta.scheduled_seconds;
        if (seg.bgm === null && typeof ev.meta.bgm === 'string') seg.bgm = ev.meta.bgm;
        // 一時停止からの再開。実際に一時停止していた実時間だけを積算する(所要時間の
        // 実測(completedAt - startedAt)から差し引くことで、一時停止を挟んだ区間でも
        // 「実際に集中していた時間」だけを学習時間として数えられるようにする)。
        const pausedSince = pausedSinceBySession.get(ev.sessionId);
        if (pausedSince !== undefined) {
          seg.pausedMs += ev.at - pausedSince;
          pausedSinceBySession.delete(ev.sessionId);
        }
        break;
      }
      case 'PAUSE':
        seg.pauses++;
        pausedSinceBySession.set(ev.sessionId, ev.at);
        break;
      case 'CHECK_REMAINING_TIME': seg.timeChecks++; break;
      case 'COMPLETE': seg.completedAt ??= ev.at; break;
      case 'STOP': {
        seg.stopped = true;
        // 一時停止中に中止した場合、動かしていた時間は「一時停止した時点」まで
        const runningUntil = pausedSinceBySession.get(ev.sessionId) ?? ev.at;
        seg.stoppedRunningMs = runningUntil - seg.startedAt - seg.pausedMs;
        break;
      }
      case 'ABANDONED': seg.abandoned = true; break;
      case 'RATING_SUBMITTED':
        // 「スキップ(普通とする)」は rating=3 で記録されるため、本当の3と区別して平均から除く
        if (ev.meta.skipped === true) seg.ratingSkipped = true;
        else if (typeof ev.meta.rating === 'number') seg.rating = ev.meta.rating;
        break;
      case 'QUIT': break;
    }
  }
  return [...bySession.values()];
}

function outcomeOf(seg: Segment, now: number): Outcome {
  if (seg.completedAt !== null) return 'completed';
  if (seg.stopped) return 'stopped';
  if (seg.abandoned) return 'abandoned';
  return now - seg.lastEventAt < IN_PROGRESS_GRACE_MS ? 'inProgress' : 'unfinished';
}

function latencyStats(latenciesMs: number[], noResumeCount: number): LatencyStats {
  const secs = latenciesMs.map(ms => ms / 1000);
  return {
    count: secs.length,
    medianSec: median(secs),
    meanSec: mean(secs),
    buckets: {
      within10s: secs.filter(s => s <= 10).length,
      within1m: secs.filter(s => s > 10 && s <= 60).length,
      within5m: secs.filter(s => s > 60 && s <= 300).length,
      over5m: secs.filter(s => s > 300).length,
    },
    noResumeCount,
  };
}

// 区間の完了(COMPLETE)から、次の区間の開始(別 session_id の START)までの時間を測る。
// 作業完了→休憩開始、休憩完了→作業開始、の組だけを対象にする。
function computeTransitions(events: ParsedEvent[], now: number, windowStartDay: number): PomodoroAnalytics['transitions'] {
  const workToBreak: number[] = [];
  const breakToWork: number[] = [];
  const ratingDelays: number[] = [];
  let workNoResume = 0;
  let breakNoResume = 0;

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (ev.type !== 'COMPLETE' || jstDayNumber(ev.at) < windowStartDay) continue;
    const isWork = ev.mode === 'WORK';

    let latency: number | null = null;
    let quit = false;
    let unexpectedNext = false;
    for (let j = i + 1; j < events.length; j++) {
      const next = events[j];
      if (next.at - ev.at > RESUME_GAP_CAP_MS) break;
      if (next.sessionId === ev.sessionId) {
        if (next.type === 'RATING_SUBMITTED' && isWork) ratingDelays.push(next.at - ev.at);
        if (next.type === 'QUIT') { quit = true; break; }
        continue;
      }
      const isExpectedStart = next.type === 'START' && (isWork ? next.mode !== 'WORK' : next.mode === 'WORK');
      if (isExpectedStart) latency = next.at - ev.at;
      else unexpectedNext = true; // 別タブ・別端末などの想定外の並び。どちらにも数えない
      break;
    }

    if (latency !== null) {
      (isWork ? workToBreak : breakToWork).push(latency);
    } else if (quit || (!unexpectedNext && now - ev.at >= RESUME_GAP_CAP_MS)) {
      // まだ上限時間が経っていない完了直後は「これから再開するかもしれない」ので数えない
      if (isWork) workNoResume++;
      else breakNoResume++;
    }
  }

  return {
    workEndToBreakStart: latencyStats(workToBreak, workNoResume),
    breakEndToWorkStart: latencyStats(breakToWork, breakNoResume),
    ratingInputMedianSec: median(ratingDelays.map(ms => ms / 1000)),
  };
}

function computeStreaks(activeDays: Set<number>, today: number): { current: number; longest: number } {
  // 今日まだ学習していなくても、昨日までの連続は途切れていない扱いにする
  let day = activeDays.has(today) ? today : today - 1;
  let current = 0;
  while (activeDays.has(day)) { current++; day--; }

  let longest = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of [...activeDays].sort((a, b) => a - b)) {
    run = prev !== null && d === prev + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  return { current, longest };
}

// 学習した日(activeDays)を、連続した日のまとまり(=1本の連続記録)ごとの長さの配列にする。
// 現在進行中の連続も、閉じた連続と同じように1本として含める(古い→新しい順)。
function computeStreakRuns(activeDays: Set<number>): number[] {
  const sorted = [...activeDays].sort((a, b) => a - b);
  const runs: number[] = [];
  let run = 0;
  let prev: number | null = null;
  for (const d of sorted) {
    if (prev !== null && d === prev + 1) {
      run++;
    } else {
      if (run > 0) runs.push(run);
      run = 1;
    }
    prev = d;
  }
  if (run > 0) runs.push(run);
  return runs;
}

// 実際に集中していた時間(実測)。開始〜完了の実時間から、一時停止していた実時間を差し引く
// (一時停止を挟んで再開したセッションでも、そのぶんを学習時間として水増ししないため)。
function workDurationMinutes(s: Segment): number | null {
  return s.completedAt === null ? null : (s.completedAt - s.startedAt - s.pausedMs) / 60000;
}

// 完了した作業(WORK)を、指定した日番号ごとにグルーピングするための共通の下ごしらえ。
function bucketize(
  segs: Segment[],
  keyOf: (dayNumber: number) => string,
): Map<string, { days: Set<number>; completed: number; minutes: number }> {
  const buckets = new Map<string, { days: Set<number>; completed: number; minutes: number }>();
  for (const s of segs) {
    const day = jstDayNumber(s.startedAt);
    const key = keyOf(day);
    if (!buckets.has(key)) buckets.set(key, { days: new Set(), completed: 0, minutes: 0 });
    const b = buckets.get(key)!;
    b.days.add(day);
    b.completed++;
    b.minutes += workDurationMinutes(s) ?? 0;
  }
  return buckets;
}

function toTrendBucket(label: string, b: { days: Set<number>; completed: number; minutes: number } | undefined): TrendBucket {
  const activeDays = b?.days.size ?? 0;
  const completedWork = b?.completed ?? 0;
  return {
    label,
    activeDays,
    completedWork,
    studyMinutes: Math.round(b?.minutes ?? 0),
    avgPomosPerActiveDay: rate(completedWork, activeDays),
  };
}

function computeWeeklyTrend(completedWorkAll: Segment[], today: number, historyDays: number): TrendBucket[] {
  const weeks = Math.ceil(historyDays / 7);
  const dayToWeekIndex = (day: number) => Math.floor((today - day) / 7); // 0=直近の週
  const buckets = new Map<number, { days: Set<number>; completed: number; minutes: number }>();
  for (const s of completedWorkAll) {
    const day = jstDayNumber(s.startedAt);
    const idx = dayToWeekIndex(day);
    if (idx < 0 || idx >= weeks) continue;
    if (!buckets.has(idx)) buckets.set(idx, { days: new Set(), completed: 0, minutes: 0 });
    const b = buckets.get(idx)!;
    b.days.add(day);
    b.completed++;
    b.minutes += workDurationMinutes(s) ?? 0;
  }
  return Array.from({ length: weeks }, (_, i) => {
    const idx = weeks - 1 - i; // 古い週から並べる
    const weekEnd = today - 7 * idx;
    return toTrendBucket(jstDateLabel(weekEnd), buckets.get(idx));
  });
}

function computeMonthlyTrend(completedWorkAll: Segment[], today: number, historyDays: number): TrendBucket[] {
  const oldestDay = today - historyDays + 1;
  const monthKeyOf = (day: number) => jstMonthLabel(day);
  const buckets = bucketize(completedWorkAll, monthKeyOf);
  const orderedKeys: string[] = [];
  for (let d = oldestDay; d <= today; d++) {
    const key = monthKeyOf(d);
    if (orderedKeys[orderedKeys.length - 1] !== key) orderedKeys.push(key);
  }
  return orderedKeys.map(key => toTrendBucket(key, buckets.get(key)));
}

// 実際に動かした時間(分、一時停止を除く)。完了・中止以外(放置・終了記録なし等)は測れないのでnull。
function measuredRunningMin(s: Segment): number | null {
  if (s.completedAt !== null) return Math.max(0, s.completedAt - s.startedAt - s.pausedMs) / 60000;
  if (s.stopped && s.stoppedRunningMs !== null) return Math.max(0, s.stoppedRunningMs) / 60000;
  return null;
}

// 誤って押してすぐ止めたもの(動かした時間が測れていて、1分未満の作業)
function isAccidentalPress(s: Segment): boolean {
  if (s.mode !== 'WORK') return false;
  const m = measuredRunningMin(s);
  return m !== null && m < MIN_COUNTABLE_WORK_MIN;
}

function computeFocusScores(segments: Segment[], now: number, today: number, windowStartDay: number): PomodoroAnalytics['focusScore'] {
  // segmentsは呼び出し側で押し間違いを除外済み。「直前の区間」の判定にも押し間違いが入らないので、
  // 休憩と本番の作業の間に挟まっていても、本番の「休憩後の再開の遅れ」が消えない。
  const sorted = [...segments].sort((a, b) => a.startedAt - b.startedAt);
  const scored: (FocusSessionScore & { day: number })[] = [];

  sorted.forEach((s, i) => {
    if (s.mode !== 'WORK') return;
    const outcome = outcomeOf(s, now);
    if (outcome === 'inProgress') return;

    const runningMin = measuredRunningMin(s) ?? 0;

    // 直前の区間が「完了した休憩」で、そこから30分以内に始めた場合だけ遷移の遅れとして数える
    // (それより空いたものは新しい学習の始まりであり、休憩後の再開の遅れではない)
    const prev = i > 0 ? sorted[i - 1] : null;
    const gapMs = prev && prev.mode !== 'WORK' && prev.completedAt !== null ? s.startedAt - prev.completedAt : null;
    const transitionSec = gapMs !== null && gapMs >= 0 && gapMs <= RESUME_GAP_CAP_MS ? gapMs / 1000 : null;

    const result = computeSessionFocusScore({
      runningMin,
      scheduledMin: (s.scheduledSec ?? DEFAULT_WORK_SCHEDULED_SEC) / 60,
      checks: s.timeChecks,
      pauses: s.pauses,
      pausedMin: s.pausedMs / 60000,
      transitionSec,
      outcome,
    });
    scored.push({
      startedAt: new Date(s.startedAt).toISOString(),
      subject: s.subject,
      bgm: s.bgm,
      runningMin,
      outcome,
      score: result.score,
      penalties: result.penalties,
      day: jstDayNumber(s.startedAt),
    });
  });

  const strip = (x: typeof scored[number]): FocusSessionScore => ({
    startedAt: x.startedAt, subject: x.subject, bgm: x.bgm, runningMin: x.runningMin,
    outcome: x.outcome, score: x.score, penalties: x.penalties,
  });
  const inWindow = scored.filter(x => x.day >= windowStartDay);

  const daily = Array.from({ length: FOCUS_DAILY_DAYS }, (_, k) => {
    const day = today - (FOCUS_DAILY_DAYS - 1 - k);
    const items = scored.filter(x => x.day === day);
    return {
      date: jstDateLabel(day),
      sessions: items.length,
      effectiveFocusMin: items.reduce((sum, x) => sum + effectiveFocusMinutes(x.score, x.runningMin), 0),
      weightedAvg: durationWeightedMean(items),
    };
  });

  // 個人内ベースラインは「完走したセッション」だけで作る(中止・放置の係数で下がったスコアが
  // 混ざると、その人の「いつもの集中度」が実態より低く出てしまうため)
  const completed = scored.filter(x => x.outcome === 'completed');
  const latest = completed.length > 0 ? completed[completed.length - 1] : null;
  const baseline = robustBaseline(completed.slice(0, -1).map(x => x.score));

  const bgmGroups = new Map<string, number[]>();
  for (const x of completed) {
    if (x.bgm === null) continue;
    bgmGroups.set(x.bgm, [...(bgmGroups.get(x.bgm) ?? []), x.score]);
  }

  return {
    sessionCount: scored.length,
    weightedAvg: durationWeightedMean(inWindow),
    daily,
    recentSessions: scored.slice(-RECENT_FOCUS_SESSIONS).reverse().map(strip),
    baseline,
    latestRobustZ: latest && baseline ? robustZ(latest.score, baseline) : null,
    byBgm: [...bgmGroups.entries()]
      .map(([bgm, scores]) => ({ bgm, sessions: scores.length, avgScore: scores.reduce((a, b) => a + b, 0) / scores.length }))
      .sort((a, b) => b.sessions - a.sessions),
  };
}

export function analyzePomodoroEvents(
  rows: PomodoroEventRow[],
  options: { now?: Date; windowDays?: number } = {},
): PomodoroAnalytics {
  const now = (options.now ?? new Date()).getTime();
  const windowDays = options.windowDays ?? DEFAULT_WINDOW_DAYS;
  const today = jstDayNumber(now);
  const windowStartDay = today - windowDays + 1;

  const events = parseEvents(rows);
  // 押し間違い(動かした時間が1分未満の作業)は、以降のすべての作業区間の集計から外す
  const segments = buildSegments(events).filter(s => !isAccidentalPress(s));
  const inWindow = segments.filter(s => jstDayNumber(s.startedAt) >= windowStartDay);
  const work = inWindow.filter(s => s.mode === 'WORK');
  const breaks = inWindow.filter(s => s.mode !== 'WORK');

  // --- 習慣 ---
  const completedWorkAll = segments.filter(s => s.mode === 'WORK' && s.completedAt !== null);
  const allActiveDays = new Set(completedWorkAll.map(s => jstDayNumber(s.startedAt)));
  const { current: currentStreak, longest: longestStreak } = computeStreaks(allActiveDays, today);

  const completedWork = work.filter(s => s.completedAt !== null);
  const windowActiveDays = new Set(completedWork.map(s => jstDayNumber(s.startedAt)));

  const byHour = new Array<number>(24).fill(0);
  const byWeekday = new Array<number>(7).fill(0);
  for (const s of completedWork) {
    byHour[jstHour(s.startedAt)]++;
    byWeekday[weekdayOf(jstDayNumber(s.startedAt))]++;
  }

  const weeks = Math.max(1, Math.floor(windowDays / 7));
  const weeklyActiveDays = Array.from({ length: weeks }, (_, k) => {
    const weekEnd = today - 7 * (weeks - 1 - k);
    let n = 0;
    for (let d = weekEnd - 6; d <= weekEnd; d++) if (allActiveDays.has(d)) n++;
    return n;
  });

  const sortedCompleted = [...completedWork].sort((a, b) => a.startedAt - b.startedAt);
  const sessionSizes: number[] = [];
  let prevCompletedAt: number | null = null;
  for (const s of sortedCompleted) {
    if (prevCompletedAt !== null && s.startedAt - prevCompletedAt <= STUDY_SESSION_GAP_MS) {
      sessionSizes[sessionSizes.length - 1]++;
    } else {
      sessionSizes.push(1);
    }
    prevCompletedAt = s.completedAt;
  }

  const byWeekdayStarted = new Array<number>(7).fill(0);

  // --- 完了率 ---
  const workOutcomes = work.map(s => outcomeOf(s, now));
  const breakOutcomes = breaks.map(s => outcomeOf(s, now));
  const countOf = (outcomes: Outcome[], o: Outcome) => outcomes.filter(x => x === o).length;
  const decidedWork = work.filter((_, i) => workOutcomes[i] !== 'inProgress');
  const decidedBreaks = breaks.filter((_, i) => breakOutcomes[i] !== 'inProgress');
  const workCompleted = countOf(workOutcomes, 'completed');
  const breakCompleted = countOf(breakOutcomes, 'completed');
  for (const s of decidedWork) byWeekdayStarted[weekdayOf(jstDayNumber(s.startedAt))]++;

  const decidedShortBreaks = decidedBreaks.filter(s => s.mode === 'BREAK');
  const decidedLongBreaks = decidedBreaks.filter(s => s.mode === 'LONG_BREAK');

  let quitBeforeBreak = 0;
  let quitBeforeWork = 0;
  for (const ev of events) {
    if (ev.type !== 'QUIT' || jstDayNumber(ev.at) < windowStartDay) continue;
    if (ev.meta.declined_mode === 'WORK') quitBeforeWork++;
    else if (ev.meta.declined_mode === 'BREAK' || ev.meta.declined_mode === 'LONG_BREAK') quitBeforeBreak++;
  }

  // --- 集中 ---
  const rated = decidedWork.filter(s => s.rating !== null);
  const ratingsOf = (segs: Segment[]) => segs.map(s => s.rating as number);
  const dayOf = (s: Segment) => jstDayNumber(s.startedAt);
  const withChecks = rated.filter(s => s.timeChecks > 0);
  const withoutChecks = rated.filter(s => s.timeChecks === 0);
  const canCompareChecks = withChecks.length >= MIN_GROUP_SAMPLES && withoutChecks.length >= MIN_GROUP_SAMPLES;

  // --- 科目別 ---
  const subjectMap = new Map<string, Segment[]>();
  for (const s of decidedWork) {
    const key = s.subject ?? UNKNOWN_SUBJECT;
    subjectMap.set(key, [...(subjectMap.get(key) ?? []), s]);
  }
  const bySubject: SubjectStat[] = [...subjectMap.entries()]
    .map(([subject, segs]) => {
      const completed = segs.filter(s => s.completedAt !== null).length;
      return {
        subject,
        segments: segs.length,
        completed,
        completionRate: rate(completed, segs.length),
        avgRating: mean(ratingsOf(segs.filter(s => s.rating !== null))),
      };
    })
    .sort((a, b) => b.segments - a.segments);

  // --- 週・月ごとの推移、連続日数の傾向、累計(windowDaysに縛られず履歴全体で見る) ---
  const streakRuns = computeStreakRuns(allActiveDays);
  const totalStudyMinutes = completedWorkAll.reduce((sum, s) => sum + (workDurationMinutes(s) ?? 0), 0);

  const recentCompletions: RecentCompletion[] = [...completedWorkAll]
    .sort((a, b) => (b.completedAt as number) - (a.completedAt as number))
    .slice(0, RECENT_COMPLETIONS_LIMIT)
    .map(s => ({
      subject: s.subject,
      startedAt: new Date(s.startedAt).toISOString(),
      completedAt: new Date(s.completedAt as number).toISOString(),
      durationMinutes: Math.round(workDurationMinutes(s) ?? 0),
    }));

  return {
    hasData: events.length > 0,
    windowDays,
    habit: {
      activeDays: windowActiveDays.size,
      currentStreak,
      longestStreak,
      completedWorkCount: completedWork.length,
      avgPomosPerActiveDay: rate(completedWork.length, windowActiveDays.size),
      sessionCount: sessionSizes.length,
      avgPomosPerSession: mean(sessionSizes),
      maxPomosInSession: sessionSizes.length > 0 ? Math.max(...sessionSizes) : 0,
      byHour,
      byWeekday,
      byWeekdayStarted,
      weeklyActiveDays,
    },
    transitions: computeTransitions(events, now, windowStartDay),
    completion: {
      workStarted: decidedWork.length,
      workCompleted,
      workStopped: countOf(workOutcomes, 'stopped'),
      workAbandoned: countOf(workOutcomes, 'abandoned'),
      workUnfinished: countOf(workOutcomes, 'unfinished'),
      workInProgress: countOf(workOutcomes, 'inProgress'),
      workCompletionRate: rate(workCompleted, decidedWork.length),
      breakStarted: decidedBreaks.length,
      breakCompleted,
      breakCompletionRate: rate(breakCompleted, decidedBreaks.length),
      shortBreakCompletionRate: rate(decidedShortBreaks.filter(s => s.completedAt !== null).length, decidedShortBreaks.length),
      longBreakCompletionRate: rate(decidedLongBreaks.filter(s => s.completedAt !== null).length, decidedLongBreaks.length),
      quitBeforeBreak,
      quitBeforeWork,
      avgPausesPerWork: mean(decidedWork.map(s => s.pauses)),
    },
    focus: {
      ratingCount: rated.length,
      ratingSkippedCount: decidedWork.filter(s => s.ratingSkipped).length,
      avgRating: mean(ratingsOf(rated)),
      recentAvgRating: mean(ratingsOf(rated.filter(s => dayOf(s) > today - 7))),
      previousAvgRating: mean(ratingsOf(rated.filter(s => dayOf(s) <= today - 7 && dayOf(s) > today - 14))),
      avgTimeChecksPerWork: mean(decidedWork.map(s => s.timeChecks)),
      avgRatingWithoutChecks: canCompareChecks ? mean(ratingsOf(withoutChecks)) : null,
      avgRatingWithChecks: canCompareChecks ? mean(ratingsOf(withChecks)) : null,
    },
    bySubject,
    recentCompletions,
    focusScore: computeFocusScores(segments, now, today, windowStartDay),
    trends: {
      weekly: computeWeeklyTrend(completedWorkAll, today, HISTORY_DAYS),
      monthly: computeMonthlyTrend(completedWorkAll, today, HISTORY_DAYS),
      streakLengths: {
        averageDays: mean(streakRuns),
        medianDays: median(streakRuns),
        completedStreakCount: streakRuns.length,
      },
      cumulative: {
        totalCompletedWork: completedWorkAll.length,
        totalStudyMinutes: Math.round(totalStudyMinutes),
      },
    },
  };
}
