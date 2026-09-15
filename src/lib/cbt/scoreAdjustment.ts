// 期限付き課題のスコアに、提出タイミングに応じた倍率をかける。
// 実装イメージ文書(v4) 8.1.1節の値をそのまま使う:
//   配信〜締切の期間のうち最初の10%以内に提出: ×1.20(早期)
//   それ以降・締切まで: ×1.00(中期。表示上は特に何も出さない)
//   締切後: ×0.80(超過)
//
// 重要: これは「表示用」「EXP計算用」の派生値であり、problem_attempts.score
// (採点そのままの正答率)は書き換えない。成績推移などは常に生の正答率で
// 判定するため。

export type ScoreAdjustmentTier = 'early' | 'ontime' | 'late' | 'none';

export const EARLY_WINDOW_RATIO = 0.10;
export const EARLY_MULTIPLIER = 1.20;
export const ONTIME_MULTIPLIER = 1.00;
export const LATE_MULTIPLIER = 0.80;

export interface ScoreAdjustmentInput {
  deliveryMode: 'deadline' | 'no_deadline' | 'permanent';
  createdAt: string; // 配信作成日時(ISO)
  dueAt: string | null;
  submittedAt: string; // 提出日時(ISO)
}

export interface ScoreAdjustmentResult {
  tier: ScoreAdjustmentTier;
  multiplier: number;
}

export function computeScoreAdjustment(input: ScoreAdjustmentInput): ScoreAdjustmentResult {
  // 期限なし・恒常配信には早期/超過の概念がない
  if (input.deliveryMode !== 'deadline' || !input.dueAt) {
    return { tier: 'none', multiplier: ONTIME_MULTIPLIER };
  }

  const created = new Date(input.createdAt).getTime();
  const due = new Date(input.dueAt).getTime();
  const submitted = new Date(input.submittedAt).getTime();

  if (submitted > due) {
    return { tier: 'late', multiplier: LATE_MULTIPLIER };
  }

  // 締切が配信作成日時以前(データ不整合)の場合は早期判定をスキップする
  if (due > created) {
    const earlyWindowEnd = created + EARLY_WINDOW_RATIO * (due - created);
    if (submitted <= earlyWindowEnd) {
      return { tier: 'early', multiplier: EARLY_MULTIPLIER };
    }
  }

  return { tier: 'ontime', multiplier: ONTIME_MULTIPLIER };
}

export function applyScoreAdjustment(rawScore: number, multiplier: number): number {
  return rawScore * multiplier;
}
