// Log/Timelineページ(週表示)向けの日時計算。すべてJST(UTC+9固定、日本にDSTは無い)で
// 「月曜始まりの週」を扱う。DBにはUTCで保存されているため、表示用のJST変換とクエリ用の
// UTC変換を両方この一箇所に集約する。

export const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface WeekDay {
  dayIndex: number; // 0=月 .. 6=日
  year: number;
  month: number; // 1-12
  date: number;
  weekday: number; // 0=日..6=土 (JSのgetDay()と同じ並び、曜日ラベル表示用)
  isToday: boolean;
}

export interface WeekRange {
  weekStartUtcMs: number; // 週開始(月曜0時JST)に対応する実UTCインスタント
  weekEndUtcMs: number; // 週終了(翌週月曜0時JST)に対応する実UTCインスタント(排他的)
  days: WeekDay[];
}

// offsetWeeks=0で「今週」、-1で先週、+1で来週の月〜日を返す。
export function getWeekRange(offsetWeeks: number, nowUtcMs: number = Date.now()): WeekRange {
  const nowJstMs = nowUtcMs + JST_OFFSET_MS;
  const nowJst = new Date(nowJstMs);
  const jstDow = nowJst.getUTCDay(); // 0=日
  const daysSinceMonday = (jstDow + 6) % 7;
  const todayMidnightJstMs = Date.UTC(nowJst.getUTCFullYear(), nowJst.getUTCMonth(), nowJst.getUTCDate());
  const thisWeekMondayJstMs = todayMidnightJstMs - daysSinceMonday * DAY_MS;
  const targetMondayJstMs = thisWeekMondayJstMs + offsetWeeks * 7 * DAY_MS;

  const days: WeekDay[] = [];
  for (let i = 0; i < 7; i++) {
    const dayJstMs = targetMondayJstMs + i * DAY_MS;
    const d = new Date(dayJstMs);
    days.push({
      dayIndex: i,
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      date: d.getUTCDate(),
      weekday: d.getUTCDay(),
      isToday: dayJstMs === todayMidnightJstMs,
    });
  }

  return {
    weekStartUtcMs: targetMondayJstMs - JST_OFFSET_MS,
    weekEndUtcMs: targetMondayJstMs + 7 * DAY_MS - JST_OFFSET_MS,
    days,
  };
}

// 実UTC時刻(ms)を、表示中の週における dayIndex(0-6, 範囲外は負値/7以上) と
// その日の0時(JST)からの経過分数に変換する。イベントブロックの配置に使う。
export function toJstDayOffset(utcMs: number, weekStartUtcMs: number): { dayIndex: number; minutesSinceMidnight: number } {
  const diffMs = (utcMs + JST_OFFSET_MS) - (weekStartUtcMs + JST_OFFSET_MS);
  const dayIndex = Math.floor(diffMs / DAY_MS);
  const minutesSinceMidnight = (diffMs - dayIndex * DAY_MS) / 60000;
  return { dayIndex, minutesSinceMidnight };
}

// Googleカレンダーの終日イベントは date: "YYYY-MM-DD" (endは排他的)で返ってくる。
// タイムゾーン変換は不要(カレンダー上の日付そのもの)なので、週の月曜日からの
// 日数差だけを日付文字列の比較で計算する。
export function dateStringToDayIndex(dateStr: string, weekMonday: { year: number; month: number; date: number }): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const targetMs = Date.UTC(y, m - 1, d);
  const mondayMs = Date.UTC(weekMonday.year, weekMonday.month - 1, weekMonday.date);
  return Math.round((targetMs - mondayMs) / DAY_MS);
}
