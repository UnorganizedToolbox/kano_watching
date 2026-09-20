import type { createClient } from '@/utils/supabase/server';
import {
  analyzePomodoroEvents,
  HISTORY_DAYS,
  type PomodoroAnalytics,
  type PomodoroEventRow,
} from './pomodoroAnalytics';

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

// Supabaseは1回のリクエストで最大1000行までしか返さないため、ページを分けて取得する
const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

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
