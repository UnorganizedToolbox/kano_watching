import { describe, it, expect } from 'vitest';
import { formatJstDate, formatJstTime, formatJstDateTime } from './formatDate';

// 2026-10-11、/timerと/adminで再現したReactハイドレーションエラー(#418)への対応。
// サーバー側のデフォルトロケール(実行環境依存)とブラウザのデフォルトロケールの不一致を
// 避けるため、常にja-JP/Asia/Tokyoを明示する。ここではその固定された出力を検証する
// (実行環境のロケール設定に左右されず、どのマシンで実行しても同じ結果になることが重要)。

describe('formatJstDate', () => {
  it('formats as ja-JP date (YYYY/M/D) regardless of the input timezone', () => {
    // 2026-01-01T15:00:00Z = 2026-01-02 00:00 JST
    expect(formatJstDate('2026-01-01T15:00:00Z')).toBe('2026/1/2');
  });

  it('accepts a Date object and a timestamp number, not just an ISO string', () => {
    const iso = '2026-10-11T03:00:00Z'; // 2026-10-11 12:00 JST
    expect(formatJstDate(new Date(iso))).toBe(formatJstDate(iso));
    expect(formatJstDate(new Date(iso).getTime())).toBe(formatJstDate(iso));
  });
});

describe('formatJstTime', () => {
  it('formats as ja-JP time in JST, converting from UTC correctly', () => {
    // 2026-10-11T03:00:00Z = 2026-10-11 12:00:00 JST
    expect(formatJstTime('2026-10-11T03:00:00Z')).toBe('12:00:00');
  });
});

describe('formatJstDateTime', () => {
  it('combines the JST date and time in one ja-JP formatted string', () => {
    const result = formatJstDateTime('2026-10-11T03:00:00Z');
    expect(result).toContain('2026/10/11');
    expect(result).toContain('12:00:00');
  });
});
