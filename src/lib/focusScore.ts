// セッション集中度スコア(SFS)の暫定モデル(フェーズ1)。
//
// 【重要】ここの数値は、学術文献から導いた定数ではなく「開発チームが調整できるたたき台」
// (暫定ヒューリスティクス)である。概念(時間の確認は注意の漏れ、一時停止・中断は持続的注意の
// 破綻、休憩後の再開の遅れは着手の遅れ)は認知科学に基づくが、係数そのものは実データが
// 溜まってから統計的に決め直す前提(順序ロジスティック回帰/主成分分析、フェーズ2)。
// UIでも「暫定」と明示すること。EXPや実績など、生徒への報酬の計算には使わない
// (指標が目標化して測定の意味を失う、Goodhartの法則を避けるため)。
//
// 追加入力・LLMは一切使わず、既存の操作ログ(開始/一時停止/残り時間確認/完了/中止/放置)のみで
// 計算する。作業時間が可変になっても比較できるよう、回数は「25分あたり」に換算する。

export const FOCUS_SCORE_PARAMS = {
  referenceMin: 25, // 「25分あたり」に換算するときの基準時間
  minWorkMin: 1, // 分母が極端に小さくならないための下限(開始直後に中止した場合等)
  check: { perCheck: 10, cap: 30 }, // 25分あたり1回確認するごとに-10点、上限-30点
  pause: { perPause: 15, ratioWeight: 25, cap: 40 }, // 1回-15点 + 停止時間比率×25点、上限-40点
  transition: { freeSec: 60, perMinute: 5, cap: 15 }, // 休憩後1分までは減点なし、以降1分ごとに-5点、上限-15点
  abandonedFactor: 0.1, // 放置・終了記録なしの係数
} as const;

// 実際に動かした時間がこれ未満のものは「押し間違い」とみなし、集中度の計算に使わない
// (誤って開始してすぐ中止したものが、点数の低い「作業」として数えられてしまうのを防ぐ)。
// 放置・終了記録なしのように動かした時間が測れないものは、この判定の対象にしない。
export const MIN_SCORABLE_RUNNING_MIN = 1;

export type FocusOutcome = 'completed' | 'stopped' | 'abandoned' | 'unfinished';

export interface FocusFeatures {
  runningMin: number; // 実際に集中していた(一時停止を除く)時間
  scheduledMin: number; // 予定していた作業時間
  checks: number; // 残り時間の確認回数
  pauses: number; // 一時停止の回数
  pausedMin: number; // 一時停止していた実時間の合計
  transitionSec: number | null; // 直前の休憩の完了から、この作業を始めるまでの秒数(該当なしはnull)
  outcome: FocusOutcome;
}

export interface FocusScoreResult {
  score: number; // 0〜100
  outcomeFactor: number;
  penalties: { check: number; pause: number; transition: number };
}

export function computeSessionFocusScore(f: FocusFeatures, params = FOCUS_SCORE_PARAMS): FocusScoreResult {
  const tWork = Math.max(f.runningMin, params.minWorkMin);
  const ref = params.referenceMin;

  const check = Math.min(params.check.cap, (f.checks / tWork) * ref * params.check.perCheck);

  const pauseRatio = f.pausedMin > 0 ? f.pausedMin / (f.runningMin + f.pausedMin) : 0;
  const pause = Math.min(
    params.pause.cap,
    (f.pauses / tWork) * ref * params.pause.perPause + pauseRatio * params.pause.ratioWeight,
  );

  const transition = f.transitionSec === null
    ? 0
    : Math.min(params.transition.cap, Math.max(0, (f.transitionSec - params.transition.freeSec) / 60) * params.transition.perMinute);

  let outcomeFactor: number;
  switch (f.outcome) {
    case 'completed': outcomeFactor = 1; break;
    case 'stopped': outcomeFactor = f.scheduledMin > 0 ? Math.min(1, Math.max(0, f.runningMin / f.scheduledMin)) : 0; break;
    default: outcomeFactor = params.abandonedFactor;
  }

  const base = Math.max(0, 100 - check - pause - transition);
  return { score: base * outcomeFactor, outcomeFactor, penalties: { check, pause, transition } };
}

// 有効集中時間(分) = 集中度/100 × 作業時間。セッションをこなすほど必ず増えるので、
// 疲れた後半のセッションが平均を下げる逆インセンティブにならない。
export function effectiveFocusMinutes(score: number, runningMin: number): number {
  return (score / 100) * runningMin;
}

// 作業時間で重みを付けた平均(短く中断したセッションと、長く完走したセッションを等価に扱わない)
export function durationWeightedMean(items: { score: number; runningMin: number }[]): number | null {
  const total = items.reduce((sum, i) => sum + i.runningMin, 0);
  if (total <= 0) return null;
  return items.reduce((sum, i) => sum + i.score * i.runningMin, 0) / total;
}

// --- 個人内ベースライン(ロバスト統計: 中央値とIQR) ---

// 個人ごとの傾向(時計をよく見る/見ない)を反映するため、生徒本人の直近セッションを基準にする。
export const BASELINE_WINDOW = 20;
// これ未満の間は個人基準を作らない(コールドスタート)
export const MIN_BASELINE_SESSIONS = 5;
// 正規分布のとき IQR ≒ 1.349σ。0.7413 = 1/1.349
const IQR_TO_SIGMA = 0.7413;

function quantile(sorted: number[], p: number): number {
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export interface Baseline {
  n: number;
  median: number;
  iqr: number;
}

// scoresは古い→新しい順。直近BASELINE_WINDOW件から求める。
export function robustBaseline(scores: number[]): Baseline | null {
  const recent = scores.slice(-BASELINE_WINDOW);
  if (recent.length < MIN_BASELINE_SESSIONS) return null;
  const sorted = [...recent].sort((a, b) => a - b);
  return { n: recent.length, median: quantile(sorted, 0.5), iqr: quantile(sorted, 0.75) - quantile(sorted, 0.25) };
}

// ばらつきが全く無い(IQR=0)場合は比較できないのでnull
export function robustZ(score: number, baseline: Baseline): number | null {
  if (baseline.iqr <= 0) return null;
  return (score - baseline.median) / (IQR_TO_SIGMA * baseline.iqr);
}
