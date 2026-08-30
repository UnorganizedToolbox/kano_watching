import { EXP_CONFIG } from "./config";

export type AchievementCategory = 'GENERAL' | 'DAILY' | 'WEEKLY' | 'EVENT';

export interface AchievementDef {
  id: string;
  category: AchievementCategory;
  name: string;          // 特徴的な名前（フレーバーテキスト）
  description: string;   // 実際の達成条件
  expReward: number;     // 獲得EXP（一旦デフォルトは1）
  maxProgress: number;   // 達成に必要な最大プログレス値（無限の場合は1ステップあたりの値）
  unit: string;          // 単位（回、日、時間、人など）
  isHidden?: boolean;    // シークレット実績かどうか
  isInfinite?: boolean;  // 無限に達成可能かどうか（10, 20, 30...など）
  infiniteStep?: number; // 無限の場合のステップ幅
}

export const ACHIEVEMENTS_DICT: Record<string, AchievementDef> = {
  // ==========================================
  // GENERAL (通常実績)
  // ==========================================
  LOGIN_STREAK_INFINITE: {
    id: 'LOGIN_STREAK_INFINITE',
    category: 'GENERAL',
    name: '日々の積み重ね',
    description: '累計ログイン日数が一定数に達するごとに達成',
    expReward: EXP_CONFIG.ACHIEVEMENTS.DEFAULT_REWARD,
    maxProgress: 10,
    unit: '日',
    isInfinite: true,
    infiniteStep: 10,
  },
  LOGIN_STREAK_7: {
    id: 'LOGIN_STREAK_7',
    category: 'GENERAL',
    name: '継続は力なり',
    description: '7日連続でログインする',
    expReward: EXP_CONFIG.ACHIEVEMENTS.DEFAULT_REWARD,
    maxProgress: 7,
    unit: '日',
  },
  STUDY_1HR_STREAK_3: {
    id: 'STUDY_1HR_STREAK_3',
    category: 'GENERAL',
    name: 'ゾーンへの入り口',
    description: '1時間以上の勉強を3日連続で達成する',
    expReward: EXP_CONFIG.ACHIEVEMENTS.DEFAULT_REWARD,
    maxProgress: 3,
    unit: '日',
  },
  TOTAL_STUDY_INFINITE: {
    id: 'TOTAL_STUDY_INFINITE',
    category: 'GENERAL',
    name: '精神と時の部屋の住人',
    description: '累計勉強時間が一定数に達するごとに達成',
    expReward: EXP_CONFIG.ACHIEVEMENTS.DEFAULT_REWARD,
    maxProgress: 10,
    unit: '時間',
    isInfinite: true,
    infiniteStep: 10,
  },
  TOTAL_TASKS_INFINITE: {
    id: 'TOTAL_TASKS_INFINITE',
    category: 'GENERAL',
    name: 'タスククラッシャー',
    description: '累計タスク達成数が一定数に達するごとに達成',
    expReward: EXP_CONFIG.ACHIEVEMENTS.DEFAULT_REWARD,
    maxProgress: 10,
    unit: '個',
    isInfinite: true,
    infiniteStep: 10,
  },
  MAX_CONTINUOUS_STUDY_18: {
    id: 'MAX_CONTINUOUS_STUDY_18',
    category: 'GENERAL',
    name: '限界突破（※健康には注意）',
    description: '最高連続勉強時間が18時間に到達する（これ以上のやりすぎアチーブは存在しない）',
    expReward: EXP_CONFIG.ACHIEVEMENTS.DEFAULT_REWARD,
    maxProgress: 18,
    unit: '時間',
  },
  FIRST_QUESTION: {
    id: 'FIRST_QUESTION',
    category: 'GENERAL',
    name: '探求の第一歩',
    description: '初めて質問箱で質問を送信する',
    expReward: EXP_CONFIG.ACHIEVEMENTS.DEFAULT_REWARD,
    maxProgress: 1,
    unit: '回',
  },
  FIRST_FRIEND: {
    id: 'FIRST_FRIEND',
    category: 'GENERAL',
    name: '孤独な戦いの終わり',
    description: '初めてフレンドを作る',
    expReward: EXP_CONFIG.ACHIEVEMENTS.DEFAULT_REWARD,
    maxProgress: 1,
    unit: '人',
  },
  FRIENDS_20: {
    id: 'FRIENDS_20',
    category: 'GENERAL',
    name: '学びのネットワーク',
    description: 'フレンドが20人に到達する',
    expReward: EXP_CONFIG.ACHIEVEMENTS.DEFAULT_REWARD,
    maxProgress: 20,
    unit: '人',
  },

  // ==========================================
  // DAILY (デイリー)
  // ==========================================
  DAILY_1_POMO: {
    id: 'DAILY_1_POMO',
    category: 'DAILY',
    name: '今日のウォーミングアップ',
    description: '1ポモドーロ（25分）を達成する',
    expReward: EXP_CONFIG.ACHIEVEMENTS.DEFAULT_REWARD,
    maxProgress: 1,
    unit: '回',
  },
  DAILY_VOCAB: {
    id: 'DAILY_VOCAB',
    category: 'DAILY',
    name: '忘却曲線との戦い',
    description: '今日の単語テストを解く',
    expReward: EXP_CONFIG.ACHIEVEMENTS.DEFAULT_REWARD,
    maxProgress: 1,
    unit: '回',
  },

  // ==========================================
  // WEEKLY (ウィークリー)
  // ==========================================
  WEEKLY_7_POMO: {
    id: 'WEEKLY_7_POMO',
    category: 'WEEKLY',
    name: '週末の充足感',
    description: '1週間で7ポモドーロ達成する',
    expReward: EXP_CONFIG.ACHIEVEMENTS.DEFAULT_REWARD,
    maxProgress: 7,
    unit: '回',
  },
  WEEKLY_DAILY_5_DAYS: {
    id: 'WEEKLY_DAILY_5_DAYS',
    category: 'WEEKLY',
    name: '平日パーフェクト',
    description: 'デイリークエストを週に5日達成する',
    expReward: EXP_CONFIG.ACHIEVEMENTS.DEFAULT_REWARD,
    maxProgress: 5,
    unit: '日',
  },

  // ==========================================
  // EVENT (イベント) - 期間内のみ表示されるものなど
  // ==========================================
  EVENT_SUMMER_80HR: {
    id: 'EVENT_SUMMER_80HR',
    category: 'EVENT',
    name: '夏休みが本番',
    description: '7/27〜8/23の間に80時間以上勉強する',
    expReward: EXP_CONFIG.ACHIEVEMENTS.DEFAULT_REWARD * 10,
    maxProgress: 80,
    unit: '時間',
    // UI側で期間内のみ表示するよう制御可能
  },
  EVENT_SANTA_WAITING: {
    id: 'EVENT_SANTA_WAITING',
    category: 'EVENT',
    name: 'サンタ待機中',
    description: 'クリスマスイブの夜（12/24 18:00〜23:59）に勉強する',
    expReward: EXP_CONFIG.ACHIEVEMENTS.DEFAULT_REWARD * 5,
    maxProgress: 1,
    unit: '回',
    isHidden: true, // 1日限定なので隠しアチーブ
  },
  EVENT_NEW_YEAR_GHOST: {
    id: 'EVENT_NEW_YEAR_GHOST',
    category: 'EVENT',
    name: '俺、年明けの瞬間現世にいなかったんだよね',
    description: '1/1 0:00ちょうどにポモドーロタイマーが稼働している',
    expReward: EXP_CONFIG.ACHIEVEMENTS.DEFAULT_REWARD * 5,
    maxProgress: 1,
    unit: '回',
    isHidden: true,
  },
  EVENT_VALENTINE_EXAM: {
    id: 'EVENT_VALENTINE_EXAM',
    category: 'EVENT',
    name: 'バレンタイン試験',
    description: '2/14にテストを実施する',
    expReward: EXP_CONFIG.ACHIEVEMENTS.DEFAULT_REWARD * 3,
    maxProgress: 1,
    unit: '回',
    isHidden: true,
  },
  EVENT_WHITE_DAY_RETURN: {
    id: 'EVENT_WHITE_DAY_RETURN',
    category: 'EVENT',
    name: 'チョコのお返試験',
    description: '3/14にテストを実施し、かつバレンタイン試験時の正答率を上回る（100%の場合は100%維持）',
    expReward: EXP_CONFIG.ACHIEVEMENTS.DEFAULT_REWARD * 5,
    maxProgress: 1,
    unit: '回',
    isHidden: true,
  },
  EVENT_HALLOWEEN_STUDY: {
    id: 'EVENT_HALLOWEEN_STUDY',
    category: 'EVENT',
    name: 'スタディ・オア・スタディ・アンド・トリート',
    description: '10/31に1ポモドーロ回し、かつテストを1つクリアする（イタズラかお菓子かは結果次第...？）',
    expReward: EXP_CONFIG.ACHIEVEMENTS.DEFAULT_REWARD * 3,
    maxProgress: 1,
    unit: '回',
    isHidden: true,
  }
};
