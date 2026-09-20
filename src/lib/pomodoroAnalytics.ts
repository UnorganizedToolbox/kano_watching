// ポモドーロ操作ログ(pomodoro_events)から、学習習慣・切り替えの速さ・完了率・集中の指標を
// 集計する純粋関数群。DBやReactには依存しない。
// 日付・時間帯の区切りは、連続日数判定(cbt/expReward.ts)と同じくJSTで行う。

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

export interface SubjectStat {
  subject: string;
  segments: number;
  completed: number;
  completionRate: number | null;
  avgRating: number | null;
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
    byWeekday: number[]; // 長さ7(0=日)
    weeklyActiveDays: number[]; // 古い週→新しい週。各週の学習日数(0-7)
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
}

export const DEFAULT_WINDOW_DAYS = 28;
export const HISTORY_DAYS = 90;

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

interface ParsedEvent {
  sessionId: string;
  mode: PomodoroMode;
  type: PomodoroEventType;
  meta: Record<string, unknown>;
  at: number;
}

function parseEvents(rows: PomodoroEventRow[]): ParsedEvent[] {
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

interface Segment {
  sessionId: string;
  mode: PomodoroMode;
  startedAt: number;
  lastEventAt: number;
  completedAt: number | null;
  subject: string | null;
  pauses: number;
  timeChecks: number;
  rating: number | null;
  ratingSkipped: boolean;
  stopped: boolean;
  abandoned: boolean;
}

// session_id ごとに1つの区間(作業 or 休憩)にまとめる。START のない区間(集計期間より前に
// 始まったもの)は判定できないので除外する。
function buildSegments(events: ParsedEvent[]): Segment[] {
  const bySession = new Map<string, Segment>();
  for (const ev of events) {
    let seg = bySession.get(ev.sessionId);
    if (!seg) {
      if (ev.type !== 'START') continue;
      seg = {
        sessionId: ev.sessionId, mode: ev.mode, startedAt: ev.at, lastEventAt: ev.at,
        completedAt: null, subject: null, pauses: 0, timeChecks: 0, rating: null, ratingSkipped: false,
        stopped: false, abandoned: false,
      };
      bySession.set(ev.sessionId, seg);
    }
    seg.lastEventAt = ev.at;
    switch (ev.type) {
      case 'START':
        if (seg.subject === null && typeof ev.meta.subject === 'string' && ev.meta.subject) seg.subject = ev.meta.subject;
        break;
      case 'PAUSE': seg.pauses++; break;
      case 'CHECK_REMAINING_TIME': seg.timeChecks++; break;
      case 'COMPLETE': seg.completedAt ??= ev.at; break;
      case 'STOP': seg.stopped = true; break;
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

export function analyzePomodoroEvents(
  rows: PomodoroEventRow[],
  options: { now?: Date; windowDays?: number } = {},
): PomodoroAnalytics {
  const now = (options.now ?? new Date()).getTime();
  const windowDays = options.windowDays ?? DEFAULT_WINDOW_DAYS;
  const today = jstDayNumber(now);
  const windowStartDay = today - windowDays + 1;

  const events = parseEvents(rows);
  const segments = buildSegments(events);
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

  // --- 完了率 ---
  const workOutcomes = work.map(s => outcomeOf(s, now));
  const breakOutcomes = breaks.map(s => outcomeOf(s, now));
  const countOf = (outcomes: Outcome[], o: Outcome) => outcomes.filter(x => x === o).length;
  const decidedWork = work.filter((_, i) => workOutcomes[i] !== 'inProgress');
  const decidedBreaks = breaks.filter((_, i) => breakOutcomes[i] !== 'inProgress');
  const workCompleted = countOf(workOutcomes, 'completed');
  const breakCompleted = countOf(breakOutcomes, 'completed');

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
  };
}
