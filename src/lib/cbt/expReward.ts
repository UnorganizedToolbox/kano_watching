// CBT課題の採点結果からEXPを計算する純粋関数群。
// 実装イメージ文書(v4) 8章の計算式をベースに、2026-09-26のCBT締切倍率是正で一部変更した:
//   - deadline(期限付き): no_deadlineと同じ「自己ベストとの差分(%)」を基礎EXPに対する割合
//     として使い、締切超過時のみ提出タイミング倍率(scoreAdjustment.ts、×0.80)をかける。
//     早期提出ボーナスは廃止済み(素点ベースの倍率計算からdiffベースの計算に変更)。
//   - no_deadline(期限なし): 自己ベストとの差分(%)がそのままEXP%になる(倍率なし)
//   - permanent(恒常/単問): 素点は使わず、基礎EXP + 連続日数ボーナス(上限あり)

export interface ExpRatesConfig {
  singleBaseExp: number;
  singleStreakBonusPerDay: number;
  singleStreakBonusCapDays: number;
  assignmentBaseExp: number;
}

export const DEFAULT_EXP_RATES: ExpRatesConfig = {
  singleBaseExp: 5,
  singleStreakBonusPerDay: 0.5,
  singleStreakBonusCapDays: 10,
  assignmentBaseExp: 20,
};

// 計算式: max(0, 今回の正答率 − これまでの自己ベスト正答率) を基礎EXPに対する割合として使い、
// 締切超過時のみmultiplier(0.80)をかける(素点自体には一切倍率をかけない。表示用のスコアは
// 常にrawScoreそのまま)。例: 素点が70→80に上昇した場合、本来10%のEXPが、遅延提出時は8%になる。
export function computeDeadlineExp(rawScore: number, previousBestScore: number, multiplier: number, baseExp: number): number {
  const diff = Math.max(0, rawScore - previousBestScore);
  return baseExp * multiplier * (diff / 100);
}

// 計算式: max(0, 今回の正答率 − これまでの自己ベスト正答率) を基礎EXPに対する割合として使う。
export function computeNoDeadlineExp(rawScore: number, previousBestScore: number, baseExp: number): number {
  const diff = Math.max(0, rawScore - previousBestScore);
  return baseExp * (diff / 100);
}

// 計算式: 基礎EXP + min(連続日数, 上限日数) × 日次ボーナス
export function computePermanentExp(
  streakDays: number,
  config: Pick<ExpRatesConfig, 'singleBaseExp' | 'singleStreakBonusPerDay' | 'singleStreakBonusCapDays'>,
): number {
  return config.singleBaseExp + Math.min(streakDays, config.singleStreakBonusCapDays) * config.singleStreakBonusPerDay;
}

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

// ISO日時文字列を「JSTでの日付」(YYYY-MM-DD)に変換する。連続日数の判定はJSTの
// カレンダー日で行う(サーバーはUTCで動くため、そのまま使うと日本時間の日付と
// ズレる)。
export function toJstDateStr(isoString: string): string {
  const jstMs = new Date(isoString).getTime() + JST_OFFSET_MS;
  return new Date(jstMs).toISOString().slice(0, 10);
}

// pastDates: 過去に提出済みの日付(JST, 'YYYY-MM-DD')の集合(重複可・順不同)。
// todayStr: 今回の提出日(JST)。今回の提出を含めた連続日数を返す(最低1)。
export function computeStreakDays(pastDates: string[], todayStr: string): number {
  const dateSet = new Set(pastDates);
  let streak = 1; // 今回の提出分
  const cursor = new Date(`${todayStr}T00:00:00Z`);
  for (;;) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    const key = cursor.toISOString().slice(0, 10);
    if (dateSet.has(key)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
