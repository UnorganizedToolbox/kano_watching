// 期限付き課題の提出タイミングに応じたペナルティ(遅延のみ)を判定する。
//
// 2026-09-26、ユーザー決定により早期提出ボーナス(旧×1.20)は廃止した。「何度でも解き直せる」
// 設計(反復による習熟を促す)と「早期提出ほど得点が固定的に有利になる」設計(速さを促す)が
// 同じ得点の上で矛盾しており、実質的に「提出タイミング」を測っているだけだった、との分析結果
// (2026-09-15/16、Claude/Perplexity/Gemini3者独立分析が一致)を踏まえた対応。詳細は
// CLAUDE.local.mdの「CBTスコアリング(早期提出+20%/超過-20%)の公平性問題の是正」参照。
//
// 遅延ペナルティ(×0.80)は継続するが、適用対象を素点(表示するスコア)からEXPのみに変更した
// (problem_attempts.scoreは常に採点そのままの正答率。expReward.tsのcomputeDeadlineExpを参照)。
// 通信環境要因(GIGAスクール下の帯域不足等)で締切直後の提出が不利になるリスクはEXPの多寡に
// 留まり、成績評価そのものを歪めない。

export type ScoreAdjustmentTier = 'ontime' | 'late' | 'none';

export const ONTIME_MULTIPLIER = 1.00;
export const LATE_MULTIPLIER = 0.80;

export interface ScoreAdjustmentInput {
  deliveryMode: 'deadline' | 'no_deadline' | 'permanent';
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

  const due = new Date(input.dueAt).getTime();
  const submitted = new Date(input.submittedAt).getTime();

  if (submitted > due) {
    return { tier: 'late', multiplier: LATE_MULTIPLIER };
  }

  return { tier: 'ontime', multiplier: ONTIME_MULTIPLIER };
}
