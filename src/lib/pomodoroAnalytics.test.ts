import { describe, expect, it } from 'vitest';
import {
  analyzePomodoroEvents,
  type PomodoroEventRow,
  type PomodoroEventType,
  type PomodoroMode,
} from './pomodoroAnalytics';

// JST 2026-09-20 12:00
const NOW = new Date('2026-09-20T03:00:00Z');

const at = (base: string, addSec = 0) => new Date(Date.parse(base) + addSec * 1000).toISOString();

function ev(
  sid: string,
  mode: PomodoroMode,
  type: PomodoroEventType,
  when: string,
  metadata: Record<string, unknown> | null = null,
): PomodoroEventRow {
  return { session_id: sid, mode, event_type: type, metadata, created_at: when };
}

// 25分で完走した作業区間(START → [時間確認] → COMPLETE → [評価])
function workSegment(
  sid: string,
  start: string,
  opts: { subject?: string; rating?: number; checks?: number } = {},
): PomodoroEventRow[] {
  const rows = [ev(sid, 'WORK', 'START', start, opts.subject ? { subject: opts.subject } : {})];
  for (let i = 0; i < (opts.checks ?? 0); i++) {
    rows.push(ev(sid, 'WORK', 'CHECK_REMAINING_TIME', at(start, 60 * (i + 1))));
  }
  const complete = at(start, 1500);
  rows.push(ev(sid, 'WORK', 'COMPLETE', complete));
  if (opts.rating !== undefined) {
    rows.push(ev(sid, 'WORK', 'RATING_SUBMITTED', at(complete, 10), { rating: opts.rating }));
  }
  return rows;
}

describe('切り替えの速さ(反応時間)', () => {
  const w1 = workSegment('w1', '2026-09-19T01:00:00Z', { rating: 4 }); // 完了 01:25:00, 評価 01:25:10
  const fullFlow = [
    ...w1,
    ev('b1', 'BREAK', 'START', '2026-09-19T01:25:25Z'), // 作業完了の25秒後に休憩開始
    ev('b1', 'BREAK', 'COMPLETE', '2026-09-19T01:30:25Z'),
    ev('w2', 'WORK', 'START', '2026-09-19T01:33:45Z'), // 休憩完了の200秒後に作業開始
  ];

  it('作業完了→休憩開始、休憩完了→作業開始の反応時間を測る', () => {
    const { transitions } = analyzePomodoroEvents(fullFlow, { now: NOW });
    expect(transitions.workEndToBreakStart).toMatchObject({ count: 1, medianSec: 25, meanSec: 25, noResumeCount: 0 });
    expect(transitions.workEndToBreakStart.buckets.within1m).toBe(1);
    expect(transitions.breakEndToWorkStart).toMatchObject({ count: 1, medianSec: 200, noResumeCount: 0 });
    expect(transitions.breakEndToWorkStart.buckets.within5m).toBe(1);
    expect(transitions.ratingInputMedianSec).toBe(10);
  });

  it('イベントの並びが時系列でなくても同じ結果になる', () => {
    const shuffled = [...fullFlow].reverse();
    const a = analyzePomodoroEvents(fullFlow, { now: NOW });
    const b = analyzePomodoroEvents(shuffled, { now: NOW });
    expect(b.transitions).toEqual(a.transitions);
  });

  it('上限時間(30分)を過ぎても次を始めなかった場合は反応時間に含めず「再開せず終了」に数える', () => {
    const { transitions } = analyzePomodoroEvents(w1, { now: NOW });
    expect(transitions.workEndToBreakStart.count).toBe(0);
    expect(transitions.workEndToBreakStart.noResumeCount).toBe(1);
  });

  it('完了直後でまだ上限時間が経っていないものは、再開せず終了には数えない', () => {
    const start = at(NOW.toISOString(), -5 * 60 - 1500);
    const { transitions } = analyzePomodoroEvents(workSegment('w1', start, { rating: 3 }), { now: NOW });
    expect(transitions.workEndToBreakStart.noResumeCount).toBe(0);
    expect(transitions.workEndToBreakStart.count).toBe(0);
  });

  it('QUIT(明示的な終了)は上限時間内でも再開せず終了として数え、終了理由の集計にも入る', () => {
    const events = [
      ...w1,
      ev('w1', 'BREAK', 'QUIT', '2026-09-19T01:25:30Z', { declined_mode: 'BREAK' }),
      ev('b1', 'BREAK', 'START', '2026-09-19T05:00:00Z'),
      ev('b1', 'BREAK', 'COMPLETE', '2026-09-19T05:05:00Z'),
      ev('b1', 'WORK', 'QUIT', '2026-09-19T05:05:20Z', { declined_mode: 'WORK' }),
    ];
    const { transitions, completion } = analyzePomodoroEvents(events, { now: NOW });
    expect(transitions.workEndToBreakStart.noResumeCount).toBe(1);
    expect(transitions.breakEndToWorkStart.noResumeCount).toBe(1);
    expect(completion.quitBeforeBreak).toBe(1);
    expect(completion.quitBeforeWork).toBe(1);
  });

  it('反応時間を10秒/1分/5分/5分超に分類する', () => {
    const events: PomodoroEventRow[] = [];
    const gaps = [5, 10, 11, 60, 61, 300, 301];
    gaps.forEach((gap, i) => {
      const day = `2026-09-1${i}T01:00:00Z`;
      events.push(...workSegment(`w${i}`, day));
      events.push(ev(`b${i}`, 'BREAK', 'START', at(day, 1500 + gap)));
    });
    const { buckets } = analyzePomodoroEvents(events, { now: NOW }).transitions.workEndToBreakStart;
    expect(buckets).toEqual({ within10s: 2, within1m: 2, within5m: 2, over5m: 1 });
  });
});

describe('完了率', () => {
  const events: PomodoroEventRow[] = [
    ...workSegment('a', '2026-09-19T01:00:00Z'),
    ev('b', 'WORK', 'START', '2026-09-19T02:00:00Z'),
    ev('b', 'WORK', 'PAUSE', '2026-09-19T02:03:00Z'),
    ev('b', 'WORK', 'STOP', '2026-09-19T02:05:00Z'),
    ev('c', 'WORK', 'START', '2026-09-19T03:00:00Z'),
    ev('c', 'WORK', 'ABANDONED', '2026-09-19T04:30:00Z', { overdue_seconds: 3000 }),
    ev('d', 'WORK', 'START', '2026-09-19T05:00:00Z'), // 終了記録なし・かなり前 → 放置
    ev('e', 'WORK', 'START', '2026-09-20T02:50:00Z'), // 10分前に開始 → 進行中
    ev('br1', 'BREAK', 'START', '2026-09-19T01:26:00Z'),
    ev('br1', 'BREAK', 'COMPLETE', '2026-09-19T01:31:00Z'),
    ev('br2', 'BREAK', 'START', '2026-09-19T02:10:00Z'),
    ev('br2', 'BREAK', 'STOP', '2026-09-19T02:12:00Z'),
  ];

  it('作業区間を完了/中止/タブ閉じ/放置/進行中に分け、進行中は分母から除く', () => {
    const { completion } = analyzePomodoroEvents(events, { now: NOW });
    expect(completion).toMatchObject({
      workStarted: 4,
      workCompleted: 1,
      workStopped: 1,
      workAbandoned: 1,
      workUnfinished: 1,
      workInProgress: 1,
      workCompletionRate: 0.25,
    });
    expect(completion.avgPausesPerWork).toBe(0.25);
  });

  it('休憩の消化率も別に出す', () => {
    const { completion } = analyzePomodoroEvents(events, { now: NOW });
    expect(completion).toMatchObject({ breakStarted: 2, breakCompleted: 1, breakCompletionRate: 0.5 });
  });
});

describe('学習習慣', () => {
  const dayAt = (day: string) => workSegment(`s-${day}`, `${day}T01:00:00Z`); // JST 10:00

  it('今日まだ学習していなくても昨日までの連続日数を現在の連続日数とする', () => {
    const events = ['2026-09-15', '2026-09-17', '2026-09-18', '2026-09-19'].flatMap(dayAt);
    const { habit } = analyzePomodoroEvents(events, { now: NOW });
    expect(habit.currentStreak).toBe(3);
    expect(habit.longestStreak).toBe(3);
  });

  it('日付・時間帯はJSTで判定する(UTC 15:30 は翌日 JST 0:30)', () => {
    const events = [
      ...['2026-09-17', '2026-09-18', '2026-09-19'].flatMap(dayAt),
      ...workSegment('late', '2026-09-19T15:30:00Z'),
    ];
    const { habit } = analyzePomodoroEvents(events, { now: NOW });
    expect(habit.currentStreak).toBe(4);
    expect(habit.byHour[0]).toBe(1);
    expect(habit.byHour[10]).toBe(3);
  });

  it('曜日別の完了数を集計する(2026-09-19は土曜)', () => {
    const { habit } = analyzePomodoroEvents(dayAt('2026-09-19'), { now: NOW });
    expect(habit.byWeekday[6]).toBe(1);
    expect(habit.byWeekday.reduce((a, b) => a + b, 0)).toBe(1);
  });

  it('集計期間より前の学習は期間内の指標に含めず、連続日数(履歴)にだけ使う', () => {
    const { habit } = analyzePomodoroEvents(dayAt('2026-08-01'), { now: NOW });
    expect(habit.completedWorkCount).toBe(0);
    expect(habit.activeDays).toBe(0);
    expect(habit.longestStreak).toBe(1);
  });

  it('週ごとの学習日数を古い週から並べる', () => {
    const events = ['2026-09-20', '2026-09-19', '2026-09-13'].flatMap(day => workSegment(`s-${day}`, `${day}T01:00:00Z`));
    const { habit } = analyzePomodoroEvents(events, { now: NOW });
    // 直近7日(9/14-9/20)は2日、その前の7日(9/7-9/13)は1日
    expect(habit.weeklyActiveDays).toEqual([0, 0, 1, 2]);
  });

  it('1時間以内の間隔で続けた作業を1回の学習セッションとしてまとめる', () => {
    const events = [
      ...workSegment('s1', '2026-09-19T01:00:00Z'), // 完了 01:25
      ...workSegment('s2', '2026-09-19T01:35:00Z'), // 10分後に開始 → 同じセッション
      ...workSegment('s3', '2026-09-19T05:00:00Z'), // 数時間後 → 別セッション
    ];
    const { habit } = analyzePomodoroEvents(events, { now: NOW });
    expect(habit).toMatchObject({
      completedWorkCount: 3,
      activeDays: 1,
      avgPomosPerActiveDay: 3,
      sessionCount: 2,
      avgPomosPerSession: 1.5,
      maxPomosInSession: 2,
    });
  });
});

describe('集中の指標', () => {
  const mk = (prefix: string, base: string, ratings: number[], checks: number) =>
    ratings.flatMap((rating, i) => workSegment(`${prefix}${i}`, at(base, i * 3600), { rating, checks }));

  it('直近7日とその前7日の評価平均、時間確認の有無別の平均を出す', () => {
    const events = [
      ...mk('r', '2026-09-19T00:00:00Z', [5, 5, 4], 0), // 直近7日・時間確認なし
      ...mk('p', '2026-09-10T00:00:00Z', [3, 3, 2], 2), // その前7日・時間確認2回
    ];
    const { focus } = analyzePomodoroEvents(events, { now: NOW });
    expect(focus.ratingCount).toBe(6);
    expect(focus.recentAvgRating).toBeCloseTo(14 / 3);
    expect(focus.previousAvgRating).toBeCloseTo(8 / 3);
    expect(focus.avgTimeChecksPerWork).toBe(1);
    expect(focus.avgRatingWithoutChecks).toBeCloseTo(14 / 3);
    expect(focus.avgRatingWithChecks).toBeCloseTo(8 / 3);
  });

  it('評価のスキップ(rating=3, skipped)は平均に含めず、スキップ回数として数える', () => {
    const skipped = workSegment('sk', '2026-09-19T10:00:00Z');
    skipped.push(ev('sk', 'WORK', 'RATING_SUBMITTED', '2026-09-19T10:26:00Z', { rating: 3, skipped: true }));
    const events = [...workSegment('r0', '2026-09-19T00:00:00Z', { rating: 5 }), ...skipped];
    const { focus } = analyzePomodoroEvents(events, { now: NOW });
    expect(focus.ratingCount).toBe(1);
    expect(focus.ratingSkippedCount).toBe(1);
    expect(focus.avgRating).toBe(5);
  });

  it('グループの件数が少ないうちは時間確認の有無別の比較を出さない', () => {
    const events = [
      ...mk('r', '2026-09-19T00:00:00Z', [5, 5], 0),
      ...mk('p', '2026-09-10T00:00:00Z', [3, 3, 2], 2),
    ];
    const { focus } = analyzePomodoroEvents(events, { now: NOW });
    expect(focus.avgRatingWithChecks).toBeNull();
    expect(focus.avgRatingWithoutChecks).toBeNull();
  });
});

describe('科目別', () => {
  it('科目ごとの区間数・完了率・平均評価を出し、科目の記録がないものは「不明」にまとめる', () => {
    const events = [
      ...workSegment('m1', '2026-09-19T01:00:00Z', { subject: '数学', rating: 4 }),
      ...workSegment('m2', '2026-09-19T03:00:00Z', { subject: '数学', rating: 5 }),
      ev('e1', 'WORK', 'START', '2026-09-19T05:00:00Z', { subject: '英語' }),
      ev('e1', 'WORK', 'STOP', '2026-09-19T05:03:00Z'),
      ...workSegment('u1', '2026-09-19T07:00:00Z'),
    ];
    const { bySubject } = analyzePomodoroEvents(events, { now: NOW });
    const find = (s: string) => bySubject.find(x => x.subject === s);
    expect(find('数学')).toEqual({ subject: '数学', segments: 2, completed: 2, completionRate: 1, avgRating: 4.5 });
    expect(find('英語')).toEqual({ subject: '英語', segments: 1, completed: 0, completionRate: 0, avgRating: null });
    expect(find('不明')).toMatchObject({ segments: 1, completed: 1 });
    expect(bySubject[0].subject).toBe('数学');
  });
});

describe('データなし', () => {
  it('イベントが空でも例外を出さず、比率はnullで返す', () => {
    const result = analyzePomodoroEvents([], { now: NOW });
    expect(result.hasData).toBe(false);
    expect(result.completion.workCompletionRate).toBeNull();
    expect(result.habit.currentStreak).toBe(0);
    expect(result.habit.byHour).toHaveLength(24);
    expect(result.habit.byWeekday).toHaveLength(7);
    expect(result.transitions.workEndToBreakStart).toMatchObject({ count: 0, medianSec: null, noResumeCount: 0 });
    expect(result.bySubject).toEqual([]);
    expect(result.trends.weekly.length).toBeGreaterThan(0);
    // 履歴の範囲(最大90日)に含まれるカレンダー月は、データがなくても0埋めで並ぶ
    expect(result.trends.monthly.length).toBeGreaterThan(0);
    expect(result.trends.monthly.every(m => m.completedWork === 0)).toBe(true);
    expect(result.trends.streakLengths).toEqual({ averageDays: null, medianDays: null, completedStreakCount: 0 });
    expect(result.trends.cumulative).toEqual({ totalCompletedWork: 0, totalStudyMinutes: 0 });
  });
});

describe('曜日別の完了率', () => {
  it('完了数だけでなく開始数も出し、完了率を導出できるようにする', () => {
    const events = [
      ...workSegment('a', '2026-09-19T01:00:00Z'), // 土曜, 完了
      ev('b', 'WORK', 'START', '2026-09-19T05:00:00Z'), // 土曜, 中止(開始のみ)
      ev('b', 'WORK', 'STOP', '2026-09-19T05:03:00Z'),
    ];
    const { habit } = analyzePomodoroEvents(events, { now: NOW });
    expect(habit.byWeekday[6]).toBe(1);
    expect(habit.byWeekdayStarted[6]).toBe(2);
  });
});

describe('休憩の種類別の完了率', () => {
  it('通常休憩と大休憩を分けて完了率を出す', () => {
    const events = [
      ev('s1', 'BREAK', 'START', '2026-09-19T01:00:00Z'),
      ev('s1', 'BREAK', 'COMPLETE', '2026-09-19T01:05:00Z'),
      ev('s2', 'BREAK', 'START', '2026-09-19T02:00:00Z'),
      ev('s2', 'BREAK', 'STOP', '2026-09-19T02:02:00Z'),
      ev('s3', 'LONG_BREAK', 'START', '2026-09-19T03:00:00Z'),
      ev('s3', 'LONG_BREAK', 'STOP', '2026-09-19T03:02:00Z'),
    ];
    const { completion } = analyzePomodoroEvents(events, { now: NOW });
    expect(completion.shortBreakCompletionRate).toBe(0.5);
    expect(completion.longBreakCompletionRate).toBe(0);
  });
});

describe('週・月ごとの推移', () => {
  const dayAt = (day: string) => workSegment(`s-${day}`, `${day}T01:00:00Z`); // JST 10:00

  it('直近の週ほど新しく並び、学習日数・完了数・時間を集計する', () => {
    const events = [...dayAt('2026-09-20'), ...dayAt('2026-08-01')];
    const { trends } = analyzePomodoroEvents(events, { now: NOW });
    const last = trends.weekly[trends.weekly.length - 1];
    expect(last.label).toBe('2026-09-20');
    expect(last).toMatchObject({ activeDays: 1, completedWork: 1, avgPomosPerActiveDay: 1 });
    expect(last.studyMinutes).toBeCloseTo(25, 0);
    // windowDays(既定28日)を超えて、履歴全体(最大90日)を集計対象にする
    expect(trends.weekly.some(w => w.completedWork > 0 && w.label !== last.label)).toBe(true);
  });

  it('直近7日間(今日から6日前まで)は同じ週バケットにまとめる', () => {
    const events = [...dayAt('2026-09-20'), ...dayAt('2026-09-14')];
    const { trends } = analyzePomodoroEvents(events, { now: NOW });
    const last = trends.weekly[trends.weekly.length - 1];
    expect(last).toMatchObject({ activeDays: 2, completedWork: 2 });
  });

  it('月ごとにカレンダー月で集計し、データがない月も0で含める', () => {
    const events = [...dayAt('2026-09-20'), ...dayAt('2026-07-05')];
    const { trends } = analyzePomodoroEvents(events, { now: NOW });
    const byLabel = new Map(trends.monthly.map(m => [m.label, m]));
    expect(byLabel.get('2026-09')).toMatchObject({ completedWork: 1 });
    expect(byLabel.get('2026-07')).toMatchObject({ completedWork: 1 });
    expect(byLabel.get('2026-08')).toMatchObject({ completedWork: 0, activeDays: 0 });
    // 履歴の取得上限(90日)ぶんの月が古い→新しい順にすべて並ぶ(2026-09-20の90日前は2026-06)
    expect(trends.monthly.map(m => m.label)).toEqual(['2026-06', '2026-07', '2026-08', '2026-09']);
  });
});

describe('連続日数の傾向', () => {
  const dayAt = (day: string) => workSegment(`s-${day}`, `${day}T01:00:00Z`);

  it('複数の連続記録の長さから平均・中央値を出す(現在進行中も1本として含む)', () => {
    const events = [
      ...['2026-08-01', '2026-08-02', '2026-08-03'].flatMap(dayAt), // 3日連続(閉じている)
      ...['2026-09-19', '2026-09-20'].flatMap(dayAt), // 2日連続(進行中)
    ];
    const { trends } = analyzePomodoroEvents(events, { now: NOW });
    expect(trends.streakLengths).toEqual({ averageDays: 2.5, medianDays: 2.5, completedStreakCount: 2 });
  });
});

describe('累計', () => {
  const dayAt = (day: string) => workSegment(`s-${day}`, `${day}T01:00:00Z`);

  it('履歴全体での完了数と実測学習時間の合計を出す', () => {
    const events = [...dayAt('2026-09-20'), ...dayAt('2026-09-18')];
    const { trends } = analyzePomodoroEvents(events, { now: NOW });
    expect(trends.cumulative.totalCompletedWork).toBe(2);
    expect(trends.cumulative.totalStudyMinutes).toBeCloseTo(50, 0);
  });
});
