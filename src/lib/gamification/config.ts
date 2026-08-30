/**
 * ゲーミフィケーション・経験値（EXP）計算用の設定ファイル
 * マジックナンバーを避け、後から数値を簡単に調整できるようにするための定数群です。
 */

export const EXP_CONFIG = {
  // ----------------------------------------------------
  // 1. テスト（課題）のEXP倍率設定
  // ----------------------------------------------------
  TEST_TASK: {
    BASE_EXP: 100, // テスト自体の基準EXP
    FIRST_TRY_PERFECT_MULTIPLIER: 1.05, // 1回目で全問正解した場合のボーナス（2回分 + α）
    
    // 期限に対するボーナス・ペナルティ倍率
    DEADLINE: {
      MAX_EARLY_BONUS: 1.2,     // 非常に早く提出した場合の最大倍率
      JUST_BEFORE: 0.8,         // 期限直前の倍率
      EXPIRED: 0.75,            // 期限切れ（固定ペナルティ。0にはしない）
    }
  },

  // ----------------------------------------------------
  // 2. 自習テストのEXP設定
  // ----------------------------------------------------
  TEST_SELF_STUDY: {
    LOWER_GRADE_MULTIPLIER: 0.2, // 学年が下の問題を解いた場合の倍率（1/5）
    // 自習テストのEXPは「前回からの正答率の上昇幅（%）」に依存する
    // 計算式: Math.max(0, 今回の正答率 - 前回の正答率) * MULTIPLIER
    PERCENTAGE_INCREASE_MULTIPLIER: 1.5, // 1%上昇するごとの獲得EXP
  },

  // ----------------------------------------------------
  // 3. アチーブメント（実績）のEXP設定
  // ----------------------------------------------------
  ACHIEVEMENTS: {
    DEFAULT_REWARD: 1, // めんどくさい時のデフォルト報酬
  }
};

/**
 * 期限切れペナルティを計算する関数
 * @param submittedAt 提出日時
 * @param deadline 期限
 * @param assignedAt 課題が出された日時
 * @returns 適用されるEXP倍率
 */
export function calculateDeadlineMultiplier(submittedAt: Date, deadline: Date, assignedAt: Date): number {
  if (submittedAt > deadline) {
    return EXP_CONFIG.TEST_TASK.DEADLINE.EXPIRED; // 期限切れは固定75%
  }

  const totalDuration = deadline.getTime() - assignedAt.getTime();
  const timeTaken = submittedAt.getTime() - assignedAt.getTime();
  const ratio = timeTaken / totalDuration; // 0.0 (即提出) 〜 1.0 (期限ギリギリ)

  // ratioが0に近いほどMAX_EARLY_BONUS(1.2)に近く、
  // ratioが1に近いほどJUST_BEFORE(0.8)に近くなる線形補間
  const max = EXP_CONFIG.TEST_TASK.DEADLINE.MAX_EARLY_BONUS;
  const min = EXP_CONFIG.TEST_TASK.DEADLINE.JUST_BEFORE;
  
  return max - (max - min) * ratio;
}
