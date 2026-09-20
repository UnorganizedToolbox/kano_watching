// 「次の休憩が大休憩(15分)か通常休憩(5分)か」の判定をCookieで管理する。
//
// 以前は「DB(pomodoro_logs)上の当日合計 % 4」で大休憩を判定していたが、これには問題が
// あった: ①DBへの書き込みは非同期(fire-and-forget)のため、中断直後の再開時に競合しうる。
// ②「中断して長時間経ってから再開した1回目」が、たまたま当日通算の4の倍数目に一致すると、
// ユーザー体感としては「休んだばかりなのにまた大休憩」という違和感になる。
// このファイルでは、大休憩までの回数を「直近の大休憩、または中断からの連続回数」として
// クライアント側のCookieだけで管理し、放置(中断)を検知したら0にリセットする。
//
// 有効期限の設計(2026-09-20、ユーザー指示で再設計): 当初は「今日の24時固定」にしていたが、
// これはカレンダー日という実態と無関係な区切りだった。今は「今のモードの所要時間+25分」を
// 有効期限とし、開始・一時停止・決定待ち画面に入るたびに(そのときのモードを基準に)延長する。
// ブラウザのCookie自体が失効していれば、それをそのまま「中断」の判定として使う(=Cookieが
// 読めなければ0から数え直す)。自前でタイムスタンプを持って比較する必要がなくなる。
//
// 注意: これは「次にCookieを読んだ時点」で判定されるものであり、タブを開いたまま放置して
// いる最中に能動的に何かが起きるわけではない。放置中でも即座に終了できる手段としては、
// 一時停止中でも押せる終了ボタンを別途用意している(PomodoroTimer.tsx側)。

export interface PomodoroCycleState {
  sinceLongBreak: number; // 直近の大休憩、または中断から数えた完了回数(0〜POMOS_PER_LONG_BREAK-1)
}

export const POMOS_PER_LONG_BREAK = 4;
export const CYCLE_COOKIE_NAME = 'learnflow_pomo_cycle';
// Cookieの有効期限に上乗せする猶予。「今のモードの所要時間 + この値」が有効期限になる。
export const CYCLE_EXPIRY_BUFFER_MS = 25 * 60 * 1000;

export function cycleExpiryMs(modeDurationMs: number): number {
  return modeDurationMs + CYCLE_EXPIRY_BUFFER_MS;
}

export function serializeCycleState(state: PomodoroCycleState): string {
  return JSON.stringify(state);
}

export function parseCycleState(raw: string | null | undefined): PomodoroCycleState | null {
  if (!raw) return null;
  try {
    const obj: unknown = JSON.parse(raw);
    if (obj && typeof obj === 'object' && typeof (obj as PomodoroCycleState).sinceLongBreak === 'number') {
      return obj as PomodoroCycleState;
    }
    return null;
  } catch {
    return null;
  }
}

// Cookieが読めない(=有効期限切れ、または一度も書いていない)場合は中断とみなし0から数え直す。
// 「一度も書いていない」と「期限切れ」は区別できないが、どちらも0から始めて問題ない。
export function resolveCycleState(stored: PomodoroCycleState | null): PomodoroCycleState {
  return stored ?? { sinceLongBreak: 0 };
}

// 作業を1回完了した時点での次の状態と、それが大休憩かどうかを返す。
// 中断していた場合は自動的に0から数え直す(=中断直後の1回目は必ず通常休憩になる)。
export function advanceCycle(stored: PomodoroCycleState | null): { next: PomodoroCycleState; isLongBreak: boolean } {
  const resolved = resolveCycleState(stored);
  const count = resolved.sinceLongBreak + 1;
  const isLongBreak = count % POMOS_PER_LONG_BREAK === 0;
  return {
    next: { sinceLongBreak: isLongBreak ? 0 : count },
    isLongBreak,
  };
}

function escapeForCookieRegex(name: string): string {
  return name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&');
}

export function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapeForCookieRegex(name)}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function writeCookie(name: string, value: string, maxAgeMs: number): void {
  if (typeof document === 'undefined') return;
  const maxAgeSec = Math.max(1, Math.floor(maxAgeMs / 1000));
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAgeSec}; path=/; samesite=lax`;
}

export function clearCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; max-age=0; path=/`;
}

export function readCycleState(): PomodoroCycleState | null {
  return parseCycleState(readCookie(CYCLE_COOKIE_NAME));
}

// modeDurationMs: 今まさに始まる(または今いる)モードの所要時間(ms)。これを基準に
// 有効期限を「所要時間+25分」で(再)設定する。
export function writeCycleState(state: PomodoroCycleState, modeDurationMs: number): void {
  writeCookie(CYCLE_COOKIE_NAME, serializeCycleState(state), cycleExpiryMs(modeDurationMs));
}
