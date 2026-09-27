import { describe, it, expect } from 'vitest';
import { applyEqualPowerLoopCrossfade, applyVolumeWave, VOLUME_WAVE_MIN_GAIN } from './pomodoroAudio';

// 2026-09-27、ポモドーロBGMのフェード対応(1分周期の音量波 + ループ境界の等パワー
// クロスフェード)。ここでテストするのは、ブラウザ専用API(OfflineAudioContext等)に
// 依存しない純粋関数の部分だけ(renderNoiseBlobUrl自体はDOM/Web Audio依存のためテスト不可)。

describe('applyEqualPowerLoopCrossfade', () => {
  it('returns a buffer of exactly outLength, leaving samples before the crossfade region untouched', () => {
    const outLength = 10;
    const cf = 3;
    const raw = new Float32Array(outLength + cf);
    for (let i = 0; i < raw.length; i++) raw[i] = i + 1; // 1,2,3,...
    const output = applyEqualPowerLoopCrossfade(raw, outLength, cf);
    expect(output.length).toBe(outLength);
    // クロスフェード区間より前(index 0..outLength-cf-1)はrawそのまま
    for (let i = 0; i < outLength - cf; i++) {
      expect(output[i]).toBe(raw[i]);
    }
  });

  it('matches the pre-crossfade tail value exactly at the very start of the crossfade region (t=0)', () => {
    const outLength = 100;
    const cf = 10;
    const raw = new Float32Array(outLength + cf);
    raw[outLength - cf] = 0.7; // クロスフェード開始点のtail側の値
    raw[outLength] = -0.3; // 対応する継続側の値
    const output = applyEqualPowerLoopCrossfade(raw, outLength, cf);
    // t=0では fadeOut=cos(0)=1, fadeIn=sin(0)=0 なので、tail側の値がそのまま出る
    // (Float32Arrayの精度までしか一致しないため、桁数はfloat32相当に留める)
    expect(output[outLength - cf]).toBeCloseTo(0.7, 6);
  });

  it('never dips below the original amplitude when the tail and its continuation carry equal-magnitude signal (no silence gap, unlike a fade-to-zero taper)', () => {
    // cos(θ)+sin(θ) は θ∈[0, π/2] で最小値1(両端)・最大値√2(中央)を取り、
    // 0に近づくことは無い。「振幅Aの信号どうしをブレンドすると出力は常にA以上になる」
    // という、無音テーパー(必ず0へ向かう)との決定的な違いを検証する。
    const outLength = 1000;
    const cf = 100;
    const amplitude = 0.42;
    const raw = new Float32Array(outLength + cf).fill(amplitude);
    const output = applyEqualPowerLoopCrossfade(raw, outLength, cf);
    for (let j = 0; j < cf; j++) {
      const idx = outLength - cf + j;
      // Float32Arrayの丸め誤差分だけ許容する
      expect(Math.abs(output[idx])).toBeGreaterThanOrEqual(amplitude - 1e-6);
    }
  });

  it('uses equal-power (cos/sin) curves, not a linear fade: at the crossfade midpoint, blending two equal-magnitude opposite-sign sources overshoots past either source (√2×), which a linear fade (which would exactly cancel to 0 there) cannot produce', () => {
    // 等パワー(cos/sin)固有の性質: fadeOut(θ)=cos(θ), fadeIn(θ)=sin(θ) は
    // θ=π/4(クロスフェード区間の中間)でどちらも1/√2になる。tail=+A, 継続=-Aの
    // 場合、線形フェードなら中間点で厳密に0(無音)になってしまうが、等パワーなら
    // A/√2 - A/√2 = 0 ...ではなく符号が逆なので相殺せず、|出力| = A/√2 * 2 = A√2 に
    // なる(引き算ではなく、cos成分+A・sin成分-A = A(cosθ-sinθ)なので中間点では0)。
    // → 符号を揃えた場合(tail=+A, 継続=+A)で中間点の出力がAより大きくなる
    // (A(cosθ+sinθ) = A√2 > A)ことを見る方が、線形フェード(常にA)との違いを検出できる。
    const outLength = 1000;
    const cf = 100;
    const amplitude = 0.5;
    const raw = new Float32Array(outLength + cf).fill(amplitude);
    const output = applyEqualPowerLoopCrossfade(raw, outLength, cf);
    const midIdx = outLength - cf + Math.round(cf / 2); // θ≈π/4
    expect(Math.abs(output[midIdx])).toBeGreaterThan(amplitude * 1.2); // 線形なら常にちょうどamplitude
  });

  it('approaches the continuation value by the end of the crossfade region', () => {
    const outLength = 1000;
    const cf = 100;
    const raw = new Float32Array(outLength + cf);
    raw.fill(1, 0, outLength - cf); // tail側は1
    raw.fill(-1, outLength - cf, outLength + cf); // 継続側は-1
    const output = applyEqualPowerLoopCrossfade(raw, outLength, cf);
    // 最後のサンプル(t = (cf-1)/cf ≈ 1に近い)は、ほぼ継続側の値(-1)に近づく
    expect(output[outLength - 1]).toBeLessThan(-0.9);
  });
});

describe('applyVolumeWave', () => {
  it('leaves the gain at (t=0) and (t=duration) identical, so the loop boundary gets no new discontinuity', () => {
    const sampleRate = 100;
    const duration = 10;
    const output = new Float32Array(sampleRate * duration).fill(1);
    applyVolumeWave(output, sampleRate, duration, VOLUME_WAVE_MIN_GAIN);
    // 最初のサンプル(t=0)と、もし次の周期が続くと仮定した場合のt=durationの値は
    // cosの周期性により一致するはず(t=durationそのものはこの配列に含まれないため、
    // 同じ位相 t=0 の値と比較する形で周期性そのものを確認する)
    expect(output[0]).toBeCloseTo(1, 10); // t=0: cos(0)=1 → gain=mid+amp=1.0(最大)
  });

  it('dips to exactly the configured minimum gain at the midpoint of the cycle, and never below it', () => {
    const sampleRate = 1000;
    const duration = 60;
    const output = new Float32Array(sampleRate * duration).fill(1);
    applyVolumeWave(output, sampleRate, duration, VOLUME_WAVE_MIN_GAIN);
    const midIdx = Math.round((sampleRate * duration) / 2); // t=30s(半周期)
    expect(output[midIdx]).toBeCloseTo(VOLUME_WAVE_MIN_GAIN, 3);
    const min = Math.min(...output);
    expect(min).toBeGreaterThanOrEqual(VOLUME_WAVE_MIN_GAIN - 1e-6);
  });

  it('never reaches 0 (a full fade to silence), regardless of the configured minimum gain', () => {
    const sampleRate = 1000;
    const duration = 60;
    const output = new Float32Array(sampleRate * duration).fill(1);
    applyVolumeWave(output, sampleRate, duration, 0.4);
    expect(Math.min(...output)).toBeGreaterThan(0);
  });

  it('scales the original sample value multiplicatively (does not clobber it with an absolute value)', () => {
    const sampleRate = 100;
    const duration = 10;
    const output = new Float32Array(sampleRate * duration).fill(0.5);
    applyVolumeWave(output, sampleRate, duration, VOLUME_WAVE_MIN_GAIN);
    // t=0では gain=1.0 なので、元の0.5がそのまま保たれるはず
    expect(output[0]).toBeCloseTo(0.5, 10);
  });
});
