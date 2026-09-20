import { describe, expect, it } from 'vitest';
import {
  computeSessionFocusScore,
  durationWeightedMean,
  effectiveFocusMinutes,
  robustBaseline,
  robustZ,
  type FocusFeatures,
} from './focusScore';

const clean: FocusFeatures = {
  runningMin: 25, scheduledMin: 25, checks: 0, pauses: 0, pausedMin: 0, transitionSec: null, outcome: 'completed',
};

describe('computeSessionFocusScore', () => {
  it('何も減点要素がない完走は100点', () => {
    expect(computeSessionFocusScore(clean).score).toBe(100);
  });

  it('25分で残り時間を1回確認すると-10点、3回以上は上限の-30点', () => {
    expect(computeSessionFocusScore({ ...clean, checks: 1 }).penalties.check).toBeCloseTo(10);
    expect(computeSessionFocusScore({ ...clean, checks: 3 }).penalties.check).toBeCloseTo(30);
    expect(computeSessionFocusScore({ ...clean, checks: 10 }).penalties.check).toBe(30);
  });

  it('作業時間が違っても「25分あたり」に換算する(50分で2回=25分で1回と同じ)', () => {
    const long = computeSessionFocusScore({ ...clean, runningMin: 50, scheduledMin: 50, checks: 2 });
    expect(long.penalties.check).toBeCloseTo(10);
  });

  it('一時停止は1回-15点に、停止時間の比率×25点を加える(上限-40点)', () => {
    const oncePausedNoGap = computeSessionFocusScore({ ...clean, pauses: 1, pausedMin: 0 });
    expect(oncePausedNoGap.penalties.pause).toBeCloseTo(15);
    // 25分作業+25分停止 → 比率0.5 → 12.5点が加わる
    const withGap = computeSessionFocusScore({ ...clean, pauses: 1, pausedMin: 25 });
    expect(withGap.penalties.pause).toBeCloseTo(15 + 12.5);
    expect(computeSessionFocusScore({ ...clean, pauses: 5, pausedMin: 25 }).penalties.pause).toBe(40);
  });

  it('休憩後1分以内の開始は減点なし、以降1分ごとに-5点、上限-15点', () => {
    expect(computeSessionFocusScore({ ...clean, transitionSec: 60 }).penalties.transition).toBe(0);
    expect(computeSessionFocusScore({ ...clean, transitionSec: 120 }).penalties.transition).toBeCloseTo(5);
    expect(computeSessionFocusScore({ ...clean, transitionSec: 60 * 60 }).penalties.transition).toBe(15);
    expect(computeSessionFocusScore({ ...clean, transitionSec: null }).penalties.transition).toBe(0);
  });

  it('中止は進行率、放置・終了記録なしは0.1を掛ける', () => {
    const base = { ...clean, checks: 1 }; // 25分で1回確認なら基底は90点
    // 10分で中止: 確認1回は「25分あたり2.5回」相当で-25点 → 基底75点、進行率10/25=0.4を掛けて30点
    expect(computeSessionFocusScore({ ...base, outcome: 'stopped', runningMin: 10 }).score).toBeCloseTo(75 * 0.4);
    expect(computeSessionFocusScore({ ...base, outcome: 'abandoned' }).score).toBeCloseTo(9);
    expect(computeSessionFocusScore({ ...base, outcome: 'unfinished' }).score).toBeCloseTo(9);
  });

  it('減点が積み重なっても0点未満にはならない', () => {
    const worst = computeSessionFocusScore({ ...clean, checks: 9, pauses: 9, pausedMin: 50, transitionSec: 3600 });
    expect(worst.score).toBeGreaterThanOrEqual(0);
    expect(worst.score).toBe(100 - 30 - 40 - 15); // 各項目の上限の合計
  });

  it('開始直後に中止して作業時間がほぼ0でも、分母が0になって壊れない', () => {
    const r = computeSessionFocusScore({ ...clean, runningMin: 0, checks: 1, outcome: 'stopped' });
    expect(Number.isFinite(r.score)).toBe(true);
  });
});

describe('日次集計', () => {
  it('有効集中時間 = 集中度/100 × 作業時間(80点で25分×4回 = 80分)', () => {
    const total = [1, 2, 3, 4].reduce((sum) => sum + effectiveFocusMinutes(80, 25), 0);
    expect(total).toBeCloseTo(80);
  });

  it('時間加重平均: 15分・50点と45分・90点なら、単純平均70ではなく80', () => {
    expect(durationWeightedMean([{ score: 50, runningMin: 15 }, { score: 90, runningMin: 45 }])).toBeCloseTo(80);
    expect(durationWeightedMean([])).toBeNull();
  });
});

describe('個人内ベースライン(ロバスト)', () => {
  it('5件未満のうちは作らない(コールドスタート)', () => {
    expect(robustBaseline([70, 80, 90, 60])).toBeNull();
  });

  it('直近20件だけを使う', () => {
    const scores = [...Array(30).fill(10), ...Array(20).fill(80)];
    expect(robustBaseline(scores)?.median).toBe(80);
  });

  it('中央値とIQRからロバストZを求める(外れ値に引きずられない)', () => {
    const scores = [70, 72, 74, 76, 78, 80, 82, 84, 86, 5]; // 5は外れ値
    const b = robustBaseline(scores);
    expect(b).not.toBeNull();
    expect(b!.median).toBeCloseTo(77);
    const z = robustZ(90, b!);
    expect(z).not.toBeNull();
    expect(z!).toBeGreaterThan(0);
    expect(robustZ(b!.median, b!)).toBeCloseTo(0);
  });

  it('ばらつきが全く無い場合(IQR=0)は比較できないのでnull', () => {
    const b = robustBaseline([80, 80, 80, 80, 80])!;
    expect(robustZ(90, b)).toBeNull();
  });
});
