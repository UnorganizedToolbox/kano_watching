'use client'

import { useEffect, useRef, useState } from 'react';
import { Play, Square } from 'lucide-react';
import {
  SOUND_OPTIONS, BGM_OPTIONS,
  getSoundPref, setSoundPref, getBgmPref, setBgmPref,
  renderAlarmBlobUrl, renderNoiseBlobUrl,
  type SoundType, type BgmType, type NoiseType,
} from '@/lib/pomodoroAudio';

export default function PomodoroSoundSettings() {
  const [soundType, setSoundTypeState] = useState<SoundType>('chime');
  const [bgmType, setBgmTypeState] = useState<BgmType>('none');
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setSoundTypeState(getSoundPref());
    setBgmTypeState(getBgmPref());
  }, []);

  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  const stopPreview = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlayingKey(null);
  };

  const previewAlarm = async (type: SoundType) => {
    stopPreview();
    const key = `alarm-${type}`;
    setPlayingKey(key);
    try {
      const url = await renderAlarmBlobUrl(type);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setPlayingKey(null);
      await audio.play();
    } catch (e) {
      console.error('プレビュー再生に失敗しました', e);
      setPlayingKey(null);
    }
  };

  const previewNoise = async (type: BgmType) => {
    stopPreview();
    const key = `bgm-${type}`;
    setPlayingKey(key);
    try {
      const noiseType: NoiseType = type === 'none' ? 'silent' : type;
      const url = await renderNoiseBlobUrl(noiseType);
      const audio = new Audio(url);
      audio.loop = true;
      audioRef.current = audio;
      await audio.play();
      // 試聴は鳴らしっぱなしにせず数秒で自動停止する
      setTimeout(() => {
        if (audioRef.current === audio) stopPreview();
      }, 6000);
    } catch (e) {
      console.error('プレビュー再生に失敗しました', e);
      setPlayingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-2">アラーム音</label>
        <div className="flex flex-wrap gap-2 max-w-lg">
          {SOUND_OPTIONS.map(opt => (
            <div
              key={opt.value}
              className={`flex items-center gap-2 pl-3 pr-2 py-2 rounded-lg border text-sm transition-colors ${
                soundType === opt.value
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <button type="button" onClick={() => { setSoundTypeState(opt.value); setSoundPref(opt.value); }} className="font-bold">
                {opt.label}
              </button>
              <button
                type="button"
                onClick={() => (playingKey === `alarm-${opt.value}` ? stopPreview() : previewAlarm(opt.value))}
                className="text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 p-1"
                title="試聴する"
              >
                {playingKey === `alarm-${opt.value}` ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-2">学習中の環境音（BGM）</label>
        <div className="flex flex-wrap gap-2 max-w-lg">
          {BGM_OPTIONS.map(opt => (
            <div
              key={opt.value}
              className={`flex items-center gap-2 pl-3 pr-2 py-2 rounded-lg border text-sm transition-colors ${
                bgmType === opt.value
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <button type="button" onClick={() => { setBgmTypeState(opt.value); setBgmPref(opt.value); }} className="font-bold">
                {opt.label}
              </button>
              {opt.value !== 'none' && (
                <button
                  type="button"
                  onClick={() => (playingKey === `bgm-${opt.value}` ? stopPreview() : previewNoise(opt.value))}
                  className="text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 p-1"
                  title="試聴する"
                >
                  {playingKey === `bgm-${opt.value}` ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-2">タイマー画面ではこの設定がそのまま使われ、実行中に切り替えることはできません。</p>
      </div>
    </div>
  );
}
