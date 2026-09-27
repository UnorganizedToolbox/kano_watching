// ポモドーロのアラーム音・環境音(BGM)の生成と設定の保存/読み込み。
// PomodoroTimer(実際の再生)と設定画面(試聴・選択)の両方から使う共通ロジック。

export type SoundType = 'chime' | 'retro' | 'modern';
export type BgmType = 'none' | 'white' | 'pink' | 'brown';
export type NoiseType = 'white' | 'pink' | 'brown' | 'silent';

export const SOUND_OPTIONS: { value: SoundType; label: string }[] = [
  { value: 'chime', label: 'チャイム音' },
  { value: 'retro', label: 'レトロ音' },
  { value: 'modern', label: 'モダン音' },
];

export const BGM_OPTIONS: { value: BgmType; label: string; description?: string }[] = [
  { value: 'none', label: 'BGMなし' },
  { value: 'white', label: 'ホワイトノイズ', description: '短時間の集中に向いています' },
  { value: 'pink', label: 'ピンクノイズ（雨音風）', description: 'リラックスと集中のバランスを取りたいときに向いています' },
  { value: 'brown', label: 'ブラウンノイズ（低音）', description: '長時間没頭して作業したいときに向いています' },
];

const SOUND_PREF_KEY = 'learnflow_sound_type';
const BGM_PREF_KEY = 'learnflow_bgm_type';

export function getSoundPref(): SoundType {
  try {
    const v = window.localStorage.getItem(SOUND_PREF_KEY);
    if (v === 'chime' || v === 'retro' || v === 'modern') return v;
  } catch {
    // ignore
  }
  return 'chime';
}

export function setSoundPref(value: SoundType) {
  try { window.localStorage.setItem(SOUND_PREF_KEY, value); } catch { /* ignore */ }
}

export function getBgmPref(): BgmType {
  try {
    const v = window.localStorage.getItem(BGM_PREF_KEY);
    if (v === 'none' || v === 'white' || v === 'pink' || v === 'brown') return v;
  } catch {
    // ignore
  }
  return 'none';
}

export function setBgmPref(value: BgmType) {
  try { window.localStorage.setItem(BGM_PREF_KEY, value); } catch { /* ignore */ }
}

function encodeWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numFrames = buffer.length;
  const blockAlign = numChannels * 2;
  const dataSize = numFrames * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) channelData.push(buffer.getChannelData(ch));

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const clamped = Math.max(-1, Math.min(1, channelData[ch][i]));
      view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function getOfflineAudioContextClass(): typeof OfflineAudioContext {
  return window.OfflineAudioContext || (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
}

export async function renderAlarmBlobUrl(type: SoundType): Promise<string> {
  const sampleRate = 44100;
  const duration = 3.5; // 全音色のうち最長(chime)を余裕を持ってカバー
  const OfflineCtx = getOfflineAudioContextClass();
  const offlineCtx = new OfflineCtx(1, Math.ceil(sampleRate * duration), sampleRate);

  const playNote = (frequency: number, startTime: number, dur: number, oscType: OscillatorType = 'sine') => {
    const oscillator = offlineCtx.createOscillator();
    const gainNode = offlineCtx.createGain();
    oscillator.type = oscType;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.5, startTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + dur);
    oscillator.connect(gainNode);
    gainNode.connect(offlineCtx.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + dur);
  };

  if (type === 'chime') {
    playNote(523.25, 0,   1.5, 'sine');
    playNote(659.25, 0.4, 1.5, 'sine');
    playNote(783.99, 0.8, 1.5, 'sine');
    playNote(1046.50, 1.2, 2.0, 'sine');
  } else if (type === 'retro') {
    playNote(440, 0,   0.2, 'square');
    playNote(880, 0.2, 0.4, 'square');
  } else if (type === 'modern') {
    playNote(800, 0,   0.5, 'triangle');
    playNote(1200, 0.5, 1.0, 'triangle');
  }

  const rendered = await offlineCtx.startRendering();
  return URL.createObjectURL(encodeWavBlob(rendered));
}

// ループ境界を「末尾を先頭側の延長分とクロスフェードする」方式でつなぐ。
// 以前は両端を無音(ゲイン0)へテーパーしていたが、これだと毎分の繋ぎ目に
// 一瞬の無音区間ができてしまい(「毎分の無音区間の原因」)、それ自体が集中を
// 途切れさせる要因になり得た。ここではraw(末尾にcrossfadeSamples分の「継続」を
// 余分に生成したもの)の末尾区間を、その継続分と等パワー(cos/sinの二乗和が
// 常に1)でブレンドする。ホワイト/ピンク/ブラウンノイズはいずれも定常な
// 確率過程なので、無音へ落とすのではなく本物の継続波形とブレンドすることで、
// 音量が一切落ちない・統計的にも自然な繋ぎ目になる。
export function applyEqualPowerLoopCrossfade(raw: Float32Array, outLength: number, crossfadeSamples: number): Float32Array {
  const output = raw.slice(0, outLength);
  const cf = Math.min(crossfadeSamples, outLength);
  for (let j = 0; j < cf; j++) {
    const t = j / cf;
    const fadeOut = Math.cos((t * Math.PI) / 2); // 1 -> 0
    const fadeIn = Math.sin((t * Math.PI) / 2); // 0 -> 1
    const idx = outLength - cf + j;
    output[idx] = raw[idx] * fadeOut + raw[outLength + j] * fadeIn;
  }
  return output;
}

// 1分(=ループ1周)周期で音量が緩やかに上下する波を、あらかじめ波形サンプル自体に
// 掛け合わせておく。iOSでは<audio>要素のvolumeプロパティが実行時に効かない機種が
// あるため、再生後から音量を制御する手段に頼れず、波形そのものに埋め込む必要がある。
// t=0とt=durationで値が完全に一致する(cosは周期durationの整数倍で連続)ため、
// ループ境界にこの音量波自体が新たな段差を生むことはない。
export function applyVolumeWave(output: Float32Array, sampleRate: number, durationSec: number, minGain: number) {
  const mid = (1 + minGain) / 2;
  const amp = (1 - minGain) / 2;
  for (let i = 0; i < output.length; i++) {
    const t = i / sampleRate;
    const gain = mid + amp * Math.cos((2 * Math.PI * t) / durationSec);
    output[i] *= gain;
  }
}

// フェードイン/アウトの音量波の最小音量(最大を1.0とした比率)。0にはしない
// (完全な無音区間を作らないことが目的のため)。
export const VOLUME_WAVE_MIN_GAIN = 0.4;

export async function renderNoiseBlobUrl(type: NoiseType): Promise<string> {
  const sampleRate = 44100;
  // ブラウザネイティブの <audio loop> はサンプル精度の完全なギャップレスループを
  // 保証しない(Web Audio の AudioBufferSourceNode.loop と違い、わずかな再同期が
  // 入ることがある)。波形側のフェードだけでは消せないため、ループ頻度そのものを
  // 下げて体感上の気になりを減らす。60秒でもファイルサイズは ~5MB程度で軽い。
  const duration = 60;
  const outLength = sampleRate * duration;
  const crossfadeSamples = Math.floor(1 * sampleRate); // 1秒(等パワークロスフェード用)
  // ループ境界のクロスフェードには「末尾より先の継続」が要るため、その分だけ
  // 余分に生成してから末尾crossfadeSamples分をブレンドし、最終的にoutLengthへ切り詰める。
  const rawLength = outLength + crossfadeSamples;
  const OfflineCtx = getOfflineAudioContextClass();
  const offlineCtx = new OfflineCtx(1, outLength, sampleRate);
  const raw = new Float32Array(rawLength);

  if (type === 'silent') {
    // BGM「なし」でもバックグラウンド再生資格を維持するための、ほぼ聞こえない音量のループ
    // (ほぼ無音なので音量波は不要)
    for (let i = 0; i < rawLength; i++) {
      raw[i] = (Math.random() * 2 - 1) * 0.0008;
    }
  } else {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0;
    let lastOut = 0;
    for (let i = 0; i < rawLength; i++) {
      const white = Math.random() * 2 - 1;
      if (type === 'white') {
        raw[i] = white * 0.1;
      } else if (type === 'pink') {
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        raw[i] = (b0 + b1 + b2 + b3 + b4 + b5 + white * 0.5362) * 0.02;
      } else if (type === 'brown') {
        const out = (lastOut + (0.02 * white)) / 1.02;
        lastOut = out;
        raw[i] = out * 0.3;
      }
    }
  }

  const output = applyEqualPowerLoopCrossfade(raw, outLength, crossfadeSamples);
  if (type !== 'silent') {
    applyVolumeWave(output, sampleRate, duration, VOLUME_WAVE_MIN_GAIN);
  }

  const buffer = offlineCtx.createBuffer(1, outLength, sampleRate);
  buffer.getChannelData(0).set(output);

  const src = offlineCtx.createBufferSource();
  src.buffer = buffer;
  src.connect(offlineCtx.destination);
  src.start();
  const rendered = await offlineCtx.startRendering();
  return URL.createObjectURL(encodeWavBlob(rendered));
}
