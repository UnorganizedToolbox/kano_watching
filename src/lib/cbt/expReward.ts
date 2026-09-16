// CBT課題の採点結果からEXPを計算する純粋関数群。
// 実装イメージ文書(v4) 8章の計算式をそのまま実装する。配信区分(delivery_mode)ごとに
// 計算式が異なる:
//   - deadline(期限付き): 基礎EXP × 提出タイミング倍率(scoreAdjustment.ts) × (素点/100)
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

export function computeDeadlineExp(rawScore: number, multiplier: number, baseExp: number): number {
  return baseExp * multiplier * (rawScore / 100);
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
