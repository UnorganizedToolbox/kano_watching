// 「次の休憩が大休憩(15分)か通常休憩(5分)か」の判定と、タイマー画面の放置検出をCookieだけで
// 完結させるためのロジック。
//
// 以前は「DB(pomodoro_logs)上の当日合計 % 4」で大休憩を判定していたが、これには2つの問題が
// あった: ①DBへの書き込みは非同期(fire-and-forget)のため、中断直後の再開時に競合しうる。
// ②「中断して長時間経ってから再開した1回目」が、たまたま当日通算の4の倍数目に一致すると、
// ユーザー体感としては「休んだばかりなのにまた大休憩」という違和感になる。
// このファイルでは、大休憩までの回数を「直近の大休憩、または中断からの連続回数」として
// クライアント側のCookieだけで管理し、放置(中断)を検知したら0にリセットする。
// Cookieの有効期限は常に「今日の24時(=翌日0時)」に固定し、日付をまたいだ古い状態が
// 残らないようにする(dateKey方式の手動比較をしなくて済む)。

export interface PomodoroCycleState {
  sinceLongBreak: number; // 直近の大休憩、または中断から数えた完了回数(0〜POMOS_PER_LONG_BREAK-1)
  lastActivityAt: number; // 最後に何か操作(開始/一時停止/中止/完了等)した時刻(epoch ms)
}

export const POMOS_PER_LONG_BREAK = 4;
// 実行中のタイマー・決定待ち画面(休憩/次の学習を始める前)のどちらにも使う共通の放置しきい値。
export const INTERRUPTION_THRESHOLD_MS = 20 * 60 * 1000;
export const CYCLE_COOKIE_NAME = 'learnflow_pomo_cycle';

export function msUntilNextMidnight(now: Date): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

export function serializeCycleState(state: PomodoroCycleState): string {
  return JSON.stringify(state);
}

export function parseCycleState(raw: string | null | undefined): PomodoroCycleState | null {
  if (!raw) return null;
  try {
    const obj: unknown = JSON.parse(raw);
    if (
      obj && typeof obj === 'object' &&
      typeof (obj as PomodoroCycleState).sinceLongBreak === 'number' &&
      typeof (obj as PomodoroCycleState).lastActivityAt === 'number'
    ) {
      return obj as PomodoroCycleState;
    }
    return null;
  } catch {
    return null;
  }
}

// 放置しきい値を超えている(=中断とみなす)かどうか。Cookie自体が存在しない場合は
// 「まだ一度も記録していない」だけであり中断とは区別できないため false を返す。
export function isInterrupted(stored: PomodoroCycleState | null, now: number): boolean {
  if (!stored) return false;
  return now - stored.lastActivityAt > INTERRUPTION_THRESHOLD_MS;
}

// 中断していれば0にリセットし、していなければそのまま返す
export function resolveCycleState(stored: PomodoroCycleState | null, now: number): PomodoroCycleState {
  if (!stored || isInterrupted(stored, now)) {
    return { sinceLongBreak: 0, lastActivityAt: now };
  }
  return stored;
}

// 作業を1回完了した時点での次の状態と、それが大休憩かどうかを返す。
// 中断していた場合は自動的に0から数え直す(=中断直後の1回目は必ず通常休憩になる)。
export function advanceCycle(stored: PomodoroCycleState | null, now: number): { next: PomodoroCycleState; isLongBreak: boolean } {
  const resolved = resolveCycleState(stored, now);
  const count = resolved.sinceLongBreak + 1;
  const isLongBreak = count % POMOS_PER_LONG_BREAK === 0;
  return {
    next: { sinceLongBreak: isLongBreak ? 0 : count, lastActivityAt: now },
    isLongBreak,
  };
}

// sinceLongBreakは変えずに「最後に活動した時刻」だけ更新する(開始・一時停止・中止・終了などの操作時に呼ぶ)。
// 既に中断とみなされる状態から復帰する場合は、resolveCycleStateと同じ理由でカウントを0に戻す。
export function touchCycleActivity(stored: PomodoroCycleState | null, now: number): PomodoroCycleState {
  const resolved = resolveCycleState(stored, now);
  return { ...resolved, lastActivityAt: now };
}

function escapeForCookieRegex(name: string): string {
  return name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&');
}

export function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapeForCookieRegex(name)}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// 有効期限は常に「今日の24時(=翌日0時)」固定。日付をまたいだ瞬間に自動で失効する。
export function writeCookie(name: string, value: string, now: Date): void {
  if (typeof document === 'undefined') return;
  const maxAgeSec = Math.max(1, Math.floor(msUntilNextMidnight(now) / 1000));
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAgeSec}; path=/; samesite=lax`;
}

export function clearCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; max-age=0; path=/`;
}

export function readCycleState(): PomodoroCycleState | null {
  return parseCycleState(readCookie(CYCLE_COOKIE_NAME));
}

export function writeCycleState(state: PomodoroCycleState, now: Date): void {
  writeCookie(CYCLE_COOKIE_NAME, serializeCycleState(state), now);
}
