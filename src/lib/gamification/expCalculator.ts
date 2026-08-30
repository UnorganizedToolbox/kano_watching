import { EXP_CONFIG, calculateDeadlineMultiplier } from "./config";

/**
 * 1. 課題テスト（タスク）のEXP計算
 * @param baseExp そのテストに設定された基礎EXP（設定されていなければデフォルト値）
 * @param isFirstTryPerfect 1回目で全問正解したか
 * @param assignedAt 課題が出された日時
 * @param deadline 期限日時
 * @param completedAt 全間違い直しが完了した日時
 */
export function calculateTaskTestExp(
  baseExp: number = EXP_CONFIG.TEST_TASK.BASE_EXP,
  isFirstTryPerfect: boolean,
  assignedAt: Date | null,
  deadline: Date | null,
  completedAt: Date
): number {
  let finalExp = baseExp;

  // 1回目で全問正解なら特別ボーナス（間違い直しなしで一気に2倍以上獲得）
  if (isFirstTryPerfect) {
    finalExp = baseExp * 2 * EXP_CONFIG.TEST_TASK.FIRST_TRY_PERFECT_MULTIPLIER;
  }

  // 期限が設定されている場合の倍率計算
  if (assignedAt && deadline) {
    const multiplier = calculateDeadlineMultiplier(completedAt, deadline, assignedAt);
    finalExp = finalExp * multiplier;
  }

  return Math.floor(finalExp);
}

/**
 * 2. 自習テスト（実力確認用）のEXP計算
 * @param baseExp そのテストに設定された基礎EXP
 * @param previousScoreRate 前回の正答率（0〜100）。初回は0。
 * @param currentScoreRate 今回の正答率（0〜100）
 * @param isLowerGrade 対象が自分の学年より下の問題かどうか
 */
export function calculateSelfStudyTestExp(
  baseExp: number,
  previousScoreRate: number,
  currentScoreRate: number,
  isLowerGrade: boolean
): number {
  // 前回から上昇した正答率分だけEXPを獲得（マイナスの場合は0）
  const increase = Math.max(0, currentScoreRate - previousScoreRate);
  
  if (increase === 0) {
    return 0; // 点数が下がった、または維持の場合はEXPゼロ
  }

  let finalExp = increase * EXP_CONFIG.TEST_SELF_STUDY.PERCENTAGE_INCREASE_MULTIPLIER * baseExp / 100;

  // 学年が下の場合は倍率を下げる（1/5）
  if (isLowerGrade) {
    finalExp = finalExp * EXP_CONFIG.TEST_SELF_STUDY.LOWER_GRADE_MULTIPLIER;
  }

  return Math.floor(finalExp);
}
