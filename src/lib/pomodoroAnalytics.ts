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

// 「連続・累計・週毎・月毎」の4つの切り替えビューで共通して使う指標。
// どのビューでも同じ意味・同じ計算方法になるよう、集計はこの1種類の関数だけで行う
// (以前は同じような数値が habit/completion/focus/trends に少しずつ違う条件で散らばっていた)。
export interface PeriodStats {
  label: string;
  activeDays: number; // 完了した作業がある日数
  completedWork: number; // 完了した作業の回数
  studyMinutes: number; // 実測学習時間(一時停止を除く)の合計
  avgPomosPerActiveDay: number | null;
  workCompletionRate: number | null; // 結果が確定した作業のうち完了した割合(押し間違いは含まない)
  breakCompletionRate: number | null; // 通常/大休憩を合わせた完了割合
  avgPausesPerWork: number | null; // 作業1回あたりの平均一時停止回数
  avgTimeChecksPerWork: number | null; // 作業1回あたりの平均「残り時間確認」回数
  avgRating: number | null; // 自己申告の集中度(1〜5、スキップは除く)の平均
  avgFocusScore: number | null; // 暫定の集中度スコア(作業時間で重みを付けた平均)
}

export interface StreakPeriod extends PeriodStats {
  days: number; // 連続日数
  startDate: string; // JST YYYY-MM-DD
  endDate: string; // JST YYYY-MM-DD
  ongoing: boolean; // 今日時点でまだ途切れていない連続か
}

export interface PomodoroAnalytics {
  hasData: boolean;
  windowDays: number;
  habit: {
    currentStreak: number; // 履歴全体での現在の連続日数
    longestStreak: number; // 履歴全体での最長連続日数
    sessionCount: number; // 1時間以内の間隔で続けた作業のまとまり(履歴全体)
    avgPomosPerSession: number | null;
    maxPomosInSession: number;
    byHour: number[]; // 長さ24(JST)。作業を始めた時間帯ごとの完了数(履歴全体)
    byWeekday: number[]; // 長さ7(0=日)。完了数(履歴全体)
    byWeekdayStarted: number[]; // 長さ7(0=日)。結果が確定した(進行中を除く)開始数。完了率 = byWeekday/byWeekdayStarted
  };
  transitions: {
    workEndToBreakStart: LatencyStats; // 作業終了(タイマー完了)→休憩開始ボタン
    breakEndToWorkStart: LatencyStats; // 休憩終了→次の作業開始ボタン
    ratingInputMedianSec: number | null; // 作業終了→集中度評価の送信(上の反応時間に含まれる)
  };
  completion: {
    // 内訳の詳細(期間を問わない、履歴全体)。完了率そのものはperiodsを見る。
    workStarted: number; // 結果が確定した作業区間の数(進行中は除く)
    workCompleted: number;
    workStopped: number;
    workAbandoned: number; // タブを閉じた等
    workUnfinished: number; // 一時停止したまま放置など、終了記録のないもの
    workInProgress: number;
    breakStarted: number;
    breakCompleted: number;
    shortBreakCompletionRate: number | null; // 通常休憩(5分)だけの完了率
    longBreakCompletionRate: number | null; // 大休憩(15分)だけの完了率。せっかくの休憩を取らず次に進んでいないか
    quitBeforeBreak: number; // 作業後に休憩を取らず終了した回数
    quitBeforeWork: number; // 休憩後に次の作業を始めず終了した回数
  };
  focus: {
    ratingCount: number;
    ratingSkippedCount: number; // スキップを記録し始めた以降のログのみ判別できる
    avgRatingWithoutChecks: number | null; // 「残り時間を確認しなかった作業」だけの平均評価
    avgRatingWithChecks: number | null; // 「確認した作業」だけの平均評価(各3件以上ある場合のみ)
  };
  bySubject: SubjectStat[];
  // 直近の完了(履歴全体、最大90日)。新しい順。管理画面等の「最近の学習」一覧に使う。
  recentCompletions: RecentCompletion[];
  // セッション集中度スコア(暫定、focusScore.ts)。生徒への報酬には使わない指標。
  focusScore: {
    sessionCount: number; // 履歴全体でスコアを付けたセッション数
    daily: { date: string; sessions: number; effectiveFocusMin: number; weightedAvg: number | null }[]; // 直近14日、古い→新しい
    recentSessions: FocusSessionScore[]; // 新しい順、最大10件
    baseline: Baseline | null; // 本人の直近の完走セッションの中央値・IQR(最新を除く。5件未満はnull)
    latestRobustZ: number | null; // 最新の完走セッションの、本人のいつもとの比較(ロバストZ)
    byBgm: { bgm: string; sessions: number; avgScore: number }[]; // 完走セッションをBGM別に
  };
  // 「連続・累計・週毎・月毎」で切り替えて見る共通ビュー。取得できた履歴全体(最大HISTORY_DAYS日分)
  // で集計する(windowDaysには縛られない。短い直近ウィンドウでは傾向が見えないため)。
  periods: {
    cumulative: PeriodStats; // 履歴全体、単一
    weekly: PeriodStats[]; // 古い週→新しい週(直近7日間隔、最大 ceil(HISTORY_DAYS/7) 本)
    monthly: PeriodStats[]; // 古い月→新しい月(カレンダー月、JST)
    streaks: StreakPeriod[]; // 古い→新しい連続記録ごと
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
function computeTransitions(events: ParsedEvent[], now: number): PomodoroAnalytics['transitions'] {
  const workToBreak: number[] = [];
  const breakToWork: number[] = [];
  const ratingDelays: number[] = [];
  let workNoResume = 0;
  let breakNoResume = 0;

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (ev.type !== 'COMPLETE') continue;
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

// 学習した日(activeDays)を、連続した日のまとまり(=1本の連続記録)ごとに、その日番号の配列にする
// (古い→新しい)。現在進行中の連続も、閉じた連続と同じように1本として含める。
function computeStreakRuns(activeDays: Set<number>): number[][] {
  const sorted = [...activeDays].sort((a, b) => a - b);
  const runs: number[][] = [];
  let current: number[] = [];
  let prev: number | null = null;
  for (const d of sorted) {
    if (prev !== null && d === prev + 1) {
      current.push(d);
    } else {
      if (current.length > 0) runs.push(current);
      current = [d];
    }
    prev = d;
  }
  if (current.length > 0) runs.push(current);
  return runs;
}

// 実際に集中していた時間(実測)。開始〜完了の実時間から、一時停止していた実時間を差し引く
// (一時停止を挟んで再開したセッションでも、そのぶんを学習時間として水増ししないため)。
function workDurationMinutes(s: Segment): number | null {
  return s.completedAt === null ? null : (s.completedAt - s.startedAt - s.pausedMs) / 60000;
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

// --- 「連続・累計・週毎・月毎」共通の期間集計 ---

// 期間集計に使う、1件の決定済み(進行中でない)作業の下ごしらえ。
interface WorkRecord {
  day: number; // JST日番号
  completed: boolean;
  runningMin: number; // 実測(放置・終了記録なしは0)
  pauses: number;
  timeChecks: number;
  rating: number | null; // スキップを除く実評価のみ
  focusScore: number | null; // 押し間違いは呼び出し側で既に除外済みなので常に付く
}

interface BreakRecord {
  day: number;
  completed: boolean;
}

function toPeriodStats(label: string, work: WorkRecord[], breaks: BreakRecord[]): PeriodStats {
  const activeDays = new Set(work.filter(w => w.completed).map(w => w.day)).size;
  const completedWork = work.filter(w => w.completed).length;
  const studyMinutes = work.reduce((sum, w) => sum + w.runningMin, 0);
  return {
    label,
    activeDays,
    completedWork,
    studyMinutes: Math.round(studyMinutes),
    avgPomosPerActiveDay: rate(completedWork, activeDays),
    workCompletionRate: rate(completedWork, work.length),
    breakCompletionRate: rate(breaks.filter(b => b.completed).length, breaks.length),
    avgPausesPerWork: mean(work.map(w => w.pauses)),
    avgTimeChecksPerWork: mean(work.map(w => w.timeChecks)),
    avgRating: mean(work.map(w => w.rating).filter((r): r is number => r !== null)),
    avgFocusScore: durationWeightedMean(work.filter(w => w.focusScore !== null).map(w => ({ score: w.focusScore as number, runningMin: w.runningMin }))),
  };
}

function computeCumulativePeriod(work: WorkRecord[], breaks: BreakRecord[]): PeriodStats {
  return toPeriodStats('cumulative', work, breaks);
}

function computeWeeklyPeriods(work: WorkRecord[], breaks: BreakRecord[], today: number, historyDays: number): PeriodStats[] {
  const weeks = Math.ceil(historyDays / 7);
  const dayToWeekIndex = (day: number) => Math.floor((today - day) / 7); // 0=直近の週
  const workByWeek = new Map<number, WorkRecord[]>();
  const breaksByWeek = new Map<number, BreakRecord[]>();
  for (const w of work) {
    const idx = dayToWeekIndex(w.day);
    if (idx < 0 || idx >= weeks) continue;
    workByWeek.set(idx, [...(workByWeek.get(idx) ?? []), w]);
  }
  for (const b of breaks) {
    const idx = dayToWeekIndex(b.day);
    if (idx < 0 || idx >= weeks) continue;
    breaksByWeek.set(idx, [...(breaksByWeek.get(idx) ?? []), b]);
  }
  return Array.from({ length: weeks }, (_, i) => {
    const idx = weeks - 1 - i; // 古い週から並べる
    const weekEnd = today - 7 * idx;
    return toPeriodStats(jstDateLabel(weekEnd), workByWeek.get(idx) ?? [], breaksByWeek.get(idx) ?? []);
  });
}

function computeMonthlyPeriods(work: WorkRecord[], breaks: BreakRecord[], today: number, historyDays: number): PeriodStats[] {
  const oldestDay = today - historyDays + 1;
  const workByMonth = new Map<string, WorkRecord[]>();
  const breaksByMonth = new Map<string, BreakRecord[]>();
  for (const w of work) {
    const key = jstMonthLabel(w.day);
    workByMonth.set(key, [...(workByMonth.get(key) ?? []), w]);
  }
  for (const b of breaks) {
    const key = jstMonthLabel(b.day);
    breaksByMonth.set(key, [...(breaksByMonth.get(key) ?? []), b]);
  }
  const orderedKeys: string[] = [];
  for (let d = oldestDay; d <= today; d++) {
    const key = jstMonthLabel(d);
    if (orderedKeys[orderedKeys.length - 1] !== key) orderedKeys.push(key);
  }
  return orderedKeys.map(key => toPeriodStats(key, workByMonth.get(key) ?? [], breaksByMonth.get(key) ?? []));
}

// 連続記録(活動日が途切れず並んだ期間)ごとの集計。work/breaksは、その連続記録の日範囲に
// 入るものだけを対象にする(連続に属さない日の作業は、どの連続記録にも数えない)。
function computeStreakPeriods(work: WorkRecord[], breaks: BreakRecord[], activeDays: Set<number>, today: number): StreakPeriod[] {
  const runs = computeStreakRuns(activeDays);
  return runs.map(days => {
    const dayCount = days.length;
    const daySet = new Set(days);
    const runWork = work.filter(w => daySet.has(w.day));
    const runBreaks = breaks.filter(b => daySet.has(b.day));
    const startDate = jstDateLabel(days[0]);
    const endDate = jstDateLabel(days[dayCount - 1]);
    const stats = toPeriodStats(dayCount === 1 ? startDate : `${startDate}〜${endDate}`, runWork, runBreaks);
    return { ...stats, days: dayCount, startDate, endDate, ongoing: days[dayCount - 1] >= today - 1 };
  });
}

interface ScoredWork extends FocusSessionScore {
  sessionId: string;
  day: number;
  pauses: number;
  timeChecks: number;
  rating: number | null; // スキップを除く実評価のみ
}

function computeFocusScores(segments: Segment[], now: number, today: number): PomodoroAnalytics['focusScore'] & { scored: ScoredWork[] } {
  const sorted = [...segments].sort((a, b) => a.startedAt - b.startedAt);
  const scored: ScoredWork[] = [];

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
      sessionId: s.sessionId,
      startedAt: new Date(s.startedAt).toISOString(),
      subject: s.subject,
      bgm: s.bgm,
      runningMin,
      outcome,
      score: result.score,
      penalties: result.penalties,
      day: jstDayNumber(s.startedAt),
      pauses: s.pauses,
      timeChecks: s.timeChecks,
      rating: s.ratingSkipped ? null : s.rating,
    });
  });

  const strip = (x: typeof scored[number]): FocusSessionScore => ({
    startedAt: x.startedAt, subject: x.subject, bgm: x.bgm, runningMin: x.runningMin,
    outcome: x.outcome, score: x.score, penalties: x.penalties,
  });

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
    daily,
    recentSessions: scored.slice(-RECENT_FOCUS_SESSIONS).reverse().map(strip),
    baseline,
    latestRobustZ: latest && baseline ? robustZ(latest.score, baseline) : null,
    byBgm: [...bgmGroups.entries()]
      .map(([bgm, scores]) => ({ bgm, sessions: scores.length, avgScore: scores.reduce((a, b) => a + b, 0) / scores.length }))
      .sort((a, b) => b.sessions - a.sessions),
    scored,
  };
}

export function analyzePomodoroEvents(
  rows: PomodoroEventRow[],
  options: { now?: Date; windowDays?: number } = {},
): PomodoroAnalytics {
  const now = (options.now ?? new Date()).getTime();
  const windowDays = options.windowDays ?? DEFAULT_WINDOW_DAYS;
  const today = jstDayNumber(now);

  const events = parseEvents(rows);
  // 押し間違い(動かした時間が1分未満の作業)は、以降のすべての作業区間の集計から外す
  const allSegments = buildSegments(events);
  const accidentalSessionIds = new Set(allSegments.filter(isAccidentalPress).map(s => s.sessionId));
  const segments = allSegments.filter(s => !accidentalSessionIds.has(s.sessionId));

  const work = segments.filter(s => s.mode === 'WORK');
  const breaks = segments.filter(s => s.mode !== 'WORK');

  // --- 習慣(期間で区切らない、パターン系の分析) ---
  const completedWorkAll = segments.filter(s => s.mode === 'WORK' && s.completedAt !== null);
  const allActiveDays = new Set(completedWorkAll.map(s => jstDayNumber(s.startedAt)));
  const { current: currentStreak, longest: longestStreak } = computeStreaks(allActiveDays, today);

  const byHour = new Array<number>(24).fill(0);
  const byWeekday = new Array<number>(7).fill(0);
  for (const s of completedWorkAll) {
    byHour[jstHour(s.startedAt)]++;
    byWeekday[weekdayOf(jstDayNumber(s.startedAt))]++;
  }

  const sortedCompleted = [...completedWorkAll].sort((a, b) => a.startedAt - b.startedAt);
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

  // --- 完了率の内訳(履歴全体) ---
  const workOutcomes = work.map(s => outcomeOf(s, now));
  const breakOutcomes = breaks.map(s => outcomeOf(s, now));
  const countOf = (outcomes: Outcome[], o: Outcome) => outcomes.filter(x => x === o).length;
  const decidedWork = work.filter((_, i) => workOutcomes[i] !== 'inProgress');
  const decidedBreaks = breaks.filter((_, i) => breakOutcomes[i] !== 'inProgress');
  for (const s of decidedWork) byWeekdayStarted[weekdayOf(jstDayNumber(s.startedAt))]++;

  const decidedShortBreaks = decidedBreaks.filter(s => s.mode === 'BREAK');
  const decidedLongBreaks = decidedBreaks.filter(s => s.mode === 'LONG_BREAK');

  let quitBeforeBreak = 0;
  let quitBeforeWork = 0;
  for (const ev of events) {
    if (ev.type !== 'QUIT') continue;
    if (ev.meta.declined_mode === 'WORK') quitBeforeWork++;
    else if (ev.meta.declined_mode === 'BREAK' || ev.meta.declined_mode === 'LONG_BREAK') quitBeforeBreak++;
  }

  // --- 集中(固有の比較分析) ---
  const rated = decidedWork.filter(s => s.rating !== null);
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
        avgRating: mean(segs.map(s => s.rating).filter((r): r is number => r !== null)),
      };
    })
    .sort((a, b) => b.segments - a.segments);

  const recentCompletions: RecentCompletion[] = [...completedWorkAll]
    .sort((a, b) => (b.completedAt as number) - (a.completedAt as number))
    .slice(0, RECENT_COMPLETIONS_LIMIT)
    .map(s => ({
      subject: s.subject,
      startedAt: new Date(s.startedAt).toISOString(),
      completedAt: new Date(s.completedAt as number).toISOString(),
      durationMinutes: Math.round(workDurationMinutes(s) ?? 0),
    }));

  // --- 集中度スコア + 「連続・累計・週毎・月毎」共通ビューの材料 ---
  const { scored, ...focusScore } = computeFocusScores(segments, now, today);
  const workRecords: WorkRecord[] = scored.map(x => ({
    day: x.day,
    completed: x.outcome === 'completed',
    runningMin: x.runningMin,
    pauses: x.pauses,
    timeChecks: x.timeChecks,
    rating: x.rating,
    focusScore: x.score,
  }));

  const breakRecords: BreakRecord[] = decidedBreaks.map(s => ({
    day: jstDayNumber(s.startedAt),
    completed: s.completedAt !== null,
  }));

  return {
    hasData: events.length > 0,
    windowDays,
    habit: {
      currentStreak,
      longestStreak,
      sessionCount: sessionSizes.length,
      avgPomosPerSession: mean(sessionSizes),
      maxPomosInSession: sessionSizes.length > 0 ? Math.max(...sessionSizes) : 0,
      byHour,
      byWeekday,
      byWeekdayStarted,
    },
    // 切り替えの速さは生イベントから直接計算するので、押し間違いの区間のイベントを取り除いて渡す
    // (休憩完了→押し間違いの開始、が「再開」として測られないように)。
    transitions: computeTransitions(events.filter(e => !accidentalSessionIds.has(e.sessionId)), now),
    completion: {
      workStarted: decidedWork.length,
      workCompleted: countOf(workOutcomes, 'completed'),
      workStopped: countOf(workOutcomes, 'stopped'),
      workAbandoned: countOf(workOutcomes, 'abandoned'),
      workUnfinished: countOf(workOutcomes, 'unfinished'),
      workInProgress: countOf(workOutcomes, 'inProgress'),
      breakStarted: decidedBreaks.length,
      breakCompleted: countOf(breakOutcomes, 'completed'),
      shortBreakCompletionRate: rate(decidedShortBreaks.filter(s => s.completedAt !== null).length, decidedShortBreaks.length),
      longBreakCompletionRate: rate(decidedLongBreaks.filter(s => s.completedAt !== null).length, decidedLongBreaks.length),
      quitBeforeBreak,
      quitBeforeWork,
    },
    focus: {
      ratingCount: rated.length,
      ratingSkippedCount: decidedWork.filter(s => s.ratingSkipped).length,
      avgRatingWithoutChecks: canCompareChecks ? mean(withoutChecks.map(s => s.rating as number)) : null,
      avgRatingWithChecks: canCompareChecks ? mean(withChecks.map(s => s.rating as number)) : null,
    },
    bySubject,
    recentCompletions,
    focusScore,
    periods: {
      cumulative: computeCumulativePeriod(workRecords, breakRecords),
      weekly: computeWeeklyPeriods(workRecords, breakRecords, today, HISTORY_DAYS),
      monthly: computeMonthlyPeriods(workRecords, breakRecords, today, HISTORY_DAYS),
      streaks: computeStreakPeriods(workRecords, breakRecords, allActiveDays, today),
    },
  };
}

