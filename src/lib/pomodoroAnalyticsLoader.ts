import type { createClient } from '@/utils/supabase/server';
import {
  analyzePomodoroEvents,
  buildSegments,
  parseEvents,
  HISTORY_DAYS,
  type PomodoroAnalytics,
  type PomodoroEventRow,
} from './pomodoroAnalytics';

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

// Supabaseは1回のリクエストで最大1000行までしか返さないため、ページを分けて取得する
const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

// pomodoro_events(詳細な操作ログ)がこのアプリにおけるポモドーロ完了の唯一の記録元。
// 以前は「完了したセッションのサマリ」として別テーブル(pomodoro_logs)にも書いていたが、
// 同じ完了を2つのテーブルで別々に数えることになり、画面ごとに件数・学習時間が微妙に
// ずれる原因になっていた(例: タイマーが0になった直後にタブを閉じて集中度評価をしなかった
// 場合、pomodoro_eventsにはCOMPLETEが記録されるがpomodoro_logsには記録されない、等)。
// 2026-09-20以降、完了数・学習時間を表示する箇所はすべてこのファイルの関数(または
// loadPomodoroAnalytics)経由でpomodoro_eventsから求める。

// 生徒1人分のポモドーロ操作ログを取得して集計する。閲覧権限はRLSに任せる
// (本人・同じ団体の教師・管理者のみ読める)。取得に失敗した場合は、
// 「データなし」と区別できるよう null を返す。
export async function loadPomodoroAnalytics(
  supabase: ServerSupabase,
  studentId: string,
  now: Date = new Date(),
): Promise<PomodoroAnalytics | null> {
  const since = new Date(now.getTime() - HISTORY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const rows: PomodoroEventRow[] = [];

  // 新しい順に取る。万一上限に達しても、古いログが欠けるだけで最新の状況は失われない
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await supabase
      .from('pomodoro_events')
      .select('session_id, mode, event_type, metadata, created_at')
      .eq('student_uuid', studentId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      console.error('Failed to load pomodoro events for analytics', error);
      return null;
    }
    rows.push(...(data as PomodoroEventRow[]));
    if (data.length < PAGE_SIZE) break;
  }

  return analyzePomodoroEvents(rows, { now });
}

// 完了した作業(WORK)の件数だけを数える軽量版。全件取得(loadPomodoroAnalytics)が不要な
// 場面(ダッシュボードの通算回数、「今日: N回」バッジ等)向け。sinceISOを省略すると全期間。
export async function countCompletedWork(
  supabase: ServerSupabase,
  studentId: string,
  sinceISO?: string,
): Promise<number> {
  let query = supabase
    .from('pomodoro_events')
    .select('id', { count: 'exact', head: true })
    .eq('student_uuid', studentId)
    .eq('mode', 'WORK')
    .eq('event_type', 'COMPLETE');
  if (sinceISO) query = query.gte('created_at', sinceISO);

  const { count, error } = await query;
  if (error) {
    console.error('Failed to count completed pomodoros', error);
    return 0;
  }
  return count ?? 0;
}

// 複数の生徒について、指定時刻以降に完了した作業(WORK)の件数を一括で数える
// (団体の学習状況ページの「今日 N回」表示用。生徒ごとに問い合わせるとN+1になるため一括取得する)。
export async function countCompletedWorkByStudent(
  supabase: ServerSupabase,
  studentIds: string[],
  sinceISO: string,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (studentIds.length === 0) return counts;

  const { data, error } = await supabase
    .from('pomodoro_events')
    .select('student_uuid')
    .in('student_uuid', studentIds)
    .eq('mode', 'WORK')
    .eq('event_type', 'COMPLETE')
    .gte('created_at', sinceISO);

  if (error) {
    console.error('Failed to count completed pomodoros by student', error);
    return counts;
  }
  for (const row of (data as { student_uuid: string }[] | null) ?? []) {
    counts.set(row.student_uuid, (counts.get(row.student_uuid) ?? 0) + 1);
  }
  return counts;
}

export interface CompletedWorkSegment {
  subject: string | null;
  startedAt: number; // epoch ms
  completedAt: number; // epoch ms
  durationMinutes: number; // 実測(一時停止時間を除く)
}

// 一時停止で長時間空くケースを取りこぼさないよう、範囲の少し前まで遡って取得する
// (完了(completedAt)がsinceISO以降のものだけを結果に含めるので、遡り分は開始点の
// 補完にしか使わない)。
const SEGMENT_LOOKBACK_BUFFER_MS = 24 * 60 * 60 * 1000;

// 完了した作業(WORK)を、開始・完了時刻と科目つきで取得する(週間タイムライン等の表示用)。
// completedAtがrange内([sinceISO, untilISO))にあるものだけを返す。
export async function loadCompletedWorkSegments(
  supabase: ServerSupabase,
  studentId: string,
  range: { sinceISO: string; untilISO: string },
): Promise<CompletedWorkSegment[]> {
  const fetchSinceISO = new Date(Date.parse(range.sinceISO) - SEGMENT_LOOKBACK_BUFFER_MS).toISOString();
  const rows: PomodoroEventRow[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await supabase
      .from('pomodoro_events')
      .select('session_id, mode, event_type, metadata, created_at')
      .eq('student_uuid', studentId)
      .eq('mode', 'WORK')
      .gte('created_at', fetchSinceISO)
      .lt('created_at', range.untilISO)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      console.error('Failed to load pomodoro work segments', error);
      return [];
    }
    rows.push(...(data as PomodoroEventRow[]));
    if (data.length < PAGE_SIZE) break;
  }

  const sinceMs = Date.parse(range.sinceISO);
  const untilMs = Date.parse(range.untilISO);
  return buildSegments(parseEvents(rows))
    .filter((s): s is typeof s & { completedAt: number } =>
      s.completedAt !== null && s.completedAt >= sinceMs && s.completedAt < untilMs)
    .map(s => ({
      subject: s.subject,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      durationMinutes: (s.completedAt - s.startedAt - s.pausedMs) / 60000,
    }))
    .sort((a, b) => a.startedAt - b.startedAt);
}
