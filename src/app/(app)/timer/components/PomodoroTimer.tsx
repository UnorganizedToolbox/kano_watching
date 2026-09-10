'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { logPomodoro, logPomodoroEvent } from '../actions';
import { cn } from '@/lib/utils';
import { PartyPopper, Lock } from 'lucide-react';
import { getSoundPref, getBgmPref, renderAlarmBlobUrl, renderNoiseBlobUrl, type SoundType, type BgmType, type NoiseType } from '@/lib/pomodoroAudio';
import { getSubjectOptions, OTHER_SUBJECT, type GradeLevel } from '@/lib/subjects';

type TimerMode = 'WORK' | 'BREAK' | 'LONG_BREAK';

const WORK_TIME = 25 * 60;
const BREAK_TIME = 5 * 60;
const LONG_BREAK_TIME = 15 * 60;
const POMOS_PER_LONG_BREAK = 4;
const ABANDON_THRESHOLD_MS = 20 * 60 * 1000; // Startしたまま20分超過放置でタブを閉じたとみなす
const STORAGE_KEY = 'learnflow_pomodoro_state_v1';

function durationFor(mode: TimerMode) {
  return mode === 'WORK' ? WORK_TIME : mode === 'LONG_BREAK' ? LONG_BREAK_TIME : BREAK_TIME;
}

type PersistedState = {
  mode: TimerMode;
  targetEndTime: number | null;
  isRunning: boolean;
  timeLeft: number;
  sessionId: string | null;
  pomoCount: number;
  awaitingDecision: boolean;
};

function loadPersistedState(): PersistedState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as PersistedState : null;
  } catch {
    return null;
  }
}

function savePersistedState(state: PersistedState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage が使えない環境(プライベートモード等)では無視する
  }
}

function clearPersistedState() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}


function speakText(text: string) {
  try {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 1.0;
      utterance.pitch = 1.2;
      window.speechSynthesis.speak(utterance);
    }
  } catch (e) {
    console.error("Speech synthesis failed", e);
  }
}

export default function PomodoroTimer({ gradeLevel }: { gradeLevel: GradeLevel | null }) {
  const subjectOptions = getSubjectOptions(gradeLevel);
  const [timeLeft, setTimeLeft] = useState(WORK_TIME);
  const [targetEndTime, setTargetEndTime] = useState<number | null>(null);
  const workerRef = React.useRef<Worker | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<TimerMode>('WORK');
  const [subject, setSubject] = useState(subjectOptions[0]);
  const [customSubject, setCustomSubject] = useState('');
  const effectiveSubject = subject === OTHER_SUBJECT ? (customSubject.trim() || OTHER_SUBJECT) : subject;
  const [levelUpData, setLevelUpData] = useState<{oldLevel: number, newLevel: number, rewardStones: number} | null>(null);
  const [pomoCount, setPomoCount] = useState(0);
  const [showTime, setShowTime] = useState(false);
  // アラーム音・BGMの種類は設定画面で選ぶ。タイマー実行中に切り替えると
  // バックグラウンド再生の「解錠」がやり直しになり不安定になるため、ここでは変更不可。
  const [soundType] = useState<SoundType>(() => getSoundPref());
  const [bgmType] = useState<BgmType>(() => getBgmPref());
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [awaitingDecision, setAwaitingDecision] = useState(false);
  const hasHydratedRef = useRef(false);

  const bgmAudioElRef = useRef<HTMLAudioElement | null>(null);
  const alarmAudioElRef = useRef<HTMLAudioElement | null>(null);
  const alarmUrlCacheRef = useRef<Partial<Record<SoundType, string>>>({});
  const noiseUrlCacheRef = useRef<Partial<Record<NoiseType, string>>>({});

  const getAlarmUrl = useCallback(async (type: SoundType) => {
    if (!alarmUrlCacheRef.current[type]) {
      alarmUrlCacheRef.current[type] = await renderAlarmBlobUrl(type);
    }
    return alarmUrlCacheRef.current[type]!;
  }, []);

  const getNoiseUrl = useCallback(async (type: NoiseType) => {
    if (!noiseUrlCacheRef.current[type]) {
      noiseUrlCacheRef.current[type] = await renderNoiseBlobUrl(type);
    }
    return noiseUrlCacheRef.current[type]!;
  }, []);

  // 選択中の音色・BGMをあらかじめ裏でレンダリング/キャッシュしておく。
  // これにより「開始」を押した瞬間には既に生成済みで、ユーザー操作から
  // 間を置かずに play() を呼べる(ブラウザの自動再生ポリシー対策)。
  useEffect(() => { void getAlarmUrl(soundType); }, [soundType, getAlarmUrl]);
  useEffect(() => { void getNoiseUrl(bgmType === 'none' ? 'silent' : bgmType); }, [bgmType, getNoiseUrl]);

  useEffect(() => {
    const alarmCache = alarmUrlCacheRef.current;
    const noiseCache = noiseUrlCacheRef.current;
    return () => {
      Object.values(alarmCache).forEach(url => url && URL.revokeObjectURL(url));
      Object.values(noiseCache).forEach(url => url && URL.revokeObjectURL(url));
    };
  }, []);

  // タイマー開始(ユーザー操作)のタイミングで、BGM要素とアラーム要素の両方を
  // 一度再生→アラームは即座に一時停止して「解錠」しておく。BGMが「なし」でも
  // ごく微小な音量のループを鳴らし続け、バックグラウンドでの再生資格を維持する。
  const startAudioForSession = useCallback(async () => {
    const noiseType: NoiseType = bgmType === 'none' ? 'silent' : bgmType;
    const [noiseUrl, alarmUrl] = await Promise.all([getNoiseUrl(noiseType), getAlarmUrl(soundType)]);

    const bgmEl = bgmAudioElRef.current;
    if (bgmEl) {
      bgmEl.src = noiseUrl;
      bgmEl.loop = true;
      bgmEl.volume = bgmType === 'none' ? 0.02 : 0.5;
      try { await bgmEl.play(); } catch (e) { console.error('BGM playback failed', e); }
    }

    const alarmEl = alarmAudioElRef.current;
    if (alarmEl) {
      alarmEl.src = alarmUrl;
      alarmEl.volume = 1.0;
      try {
        await alarmEl.play();
        alarmEl.pause();
        alarmEl.currentTime = 0;
      } catch (e) {
        console.error('Alarm priming failed', e);
      }
    }

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'LearnFlow ポモドーロタイマー',
        artist: mode === 'WORK' ? '集中中...' : '休憩中...',
      });
    }
  }, [bgmType, soundType, getNoiseUrl, getAlarmUrl, mode]);

  const stopSessionAudio = useCallback(() => {
    bgmAudioElRef.current?.pause();
  }, []);

  const playAlarm = useCallback(() => {
    stopSessionAudio();
    const alarmEl = alarmAudioElRef.current;
    if (alarmEl) {
      alarmEl.currentTime = 0;
      void alarmEl.play().catch((e) => console.error('Alarm playback failed', e));
    }
  }, [stopSessionAudio]);

  const handleTimerComplete = useCallback(() => {
    playAlarm();
    if (sessionId) void logPomodoroEvent(sessionId, mode, 'COMPLETE');

    if (mode === 'WORK') {
      speakText("ポモドーロが終了しました。集中度を評価してください。");
      setShowRatingModal(true);
    } else {
      speakText("休憩が終わりました。次のポモドーロを開始しましょう。");
      setMode('WORK');
      setTimeLeft(WORK_TIME);
      setTargetEndTime(null);
      setAwaitingDecision(true);
    }
  }, [playAlarm, mode, sessionId]);

  // 初回マウント時: リロード等で失われたタイマー状態を localStorage から復元する。
  // Start したまま ABANDON_THRESHOLD_MS 以上経過している場合は「タブを閉じた」とみなし、
  // ABANDONED イベントを記録して破棄する(復元しない)。
  useEffect(() => {
    const saved = loadPersistedState();
    if (saved) {
      if (saved.isRunning && saved.targetEndTime) {
        const overdueMs = Date.now() - saved.targetEndTime;
        if (overdueMs > ABANDON_THRESHOLD_MS) {
          if (saved.sessionId) {
            void logPomodoroEvent(saved.sessionId, saved.mode, 'ABANDONED', { overdue_seconds: Math.round(overdueMs / 1000) });
          }
          setPomoCount(saved.pomoCount);
          clearPersistedState();
        } else {
          setMode(saved.mode);
          setSessionId(saved.sessionId);
          setPomoCount(saved.pomoCount);
          setTargetEndTime(saved.targetEndTime);
          setTimeLeft(Math.max(0, Math.round((saved.targetEndTime - Date.now()) / 1000)));
          setIsRunning(true);
        }
      } else {
        setMode(saved.mode);
        setTimeLeft(saved.timeLeft);
        setSessionId(saved.sessionId);
        setPomoCount(saved.pomoCount);
        setAwaitingDecision(saved.awaitingDecision);
      }
    }
    hasHydratedRef.current = true;
  }, []);

  // 現在のタイマー状態を localStorage に保存し、リロード後も復元できるようにする
  useEffect(() => {
    if (!hasHydratedRef.current) return;
    savePersistedState({ mode, targetEndTime, isRunning, timeLeft, sessionId, pomoCount, awaitingDecision });
  }, [mode, targetEndTime, isRunning, timeLeft, sessionId, pomoCount, awaitingDecision]);


  // Setup Web Worker for accurate background timing (bypasses iOS Safari throttling)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const workerCode = `
        let timer = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (timer) clearInterval(timer);
            timer = setInterval(() => self.postMessage('tick'), 500);
          } else if (e.data === 'stop') {
            if (timer) clearInterval(timer);
            timer = null;
          }
        };
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      workerRef.current = new Worker(workerUrl);
      
      // Request Notification permission for background alerts
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      return () => {
        workerRef.current?.terminate();
        URL.revokeObjectURL(workerUrl);
      };
    }
  }, []);

  // Timer Tick Logic (Driven by Web Worker OR fallback interval)
  useEffect(() => {
    const tick = () => {
      if (isRunning && targetEndTime) {
        const now = Date.now();
        const remaining = Math.max(0, Math.round((targetEndTime - now) / 1000));
        setTimeLeft(remaining);
        
        if (remaining <= 0) {
          setIsRunning(false);
          setTargetEndTime(null);
          workerRef.current?.postMessage('stop');
          handleTimerComplete();
          
          // Trigger background notification for iOS/Desktop
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification("ポモドーロ完了！", {
              body: mode === 'WORK' ? "集中セッションが完了しました。休憩しましょう！" : "休憩が終了しました。学習を再開しましょう！",
              icon: '/icon.png'
            });
          }
        }
      }
    };

    let fallbackInterval: NodeJS.Timeout;
    if (isRunning && targetEndTime) {
      if (workerRef.current) {
        workerRef.current.onmessage = tick;
        workerRef.current.postMessage('start');
      } else {
        fallbackInterval = setInterval(tick, 500);
      }
    } else {
      workerRef.current?.postMessage('stop');
    }

    return () => {
      if (fallbackInterval) clearInterval(fallbackInterval);
      if (workerRef.current) workerRef.current.onmessage = null;
    };
  }, [isRunning, targetEndTime, mode, handleTimerComplete]);


  const handleRatingSubmit = (rating: number) => {
    setShowRatingModal(false);
    if (sessionId) void logPomodoroEvent(sessionId, 'WORK', 'RATING_SUBMITTED', { rating });

    // 先に休憩画面へ切り替える。DB書き込み(logPomodoro/実績評価)の完了は待たない。
    const nextPomoCount = pomoCount + 1;
    const isLongBreak = nextPomoCount % POMOS_PER_LONG_BREAK === 0;
    setPomoCount(nextPomoCount);
    setMode(isLongBreak ? 'LONG_BREAK' : 'BREAK');
    setTimeLeft(isLongBreak ? LONG_BREAK_TIME : BREAK_TIME);
    setTargetEndTime(null);
    setAwaitingDecision(true);

    // 記録とレベルアップ判定はバックグラウンドで実行し、結果が来たらモーダルで通知する
    logPomodoro(effectiveSubject, 25, rating)
      .then((res) => {
        if (res?.levelUp) setLevelUpData(res.levelUp);
      })
      .catch((e) => {
        console.error("Failed to log pomodoro", e);
      });
  };

  const toggleTimer = () => {
    if (!isRunning) {
      const isFreshSegment = !sessionId || awaitingDecision;
      const sid = isFreshSegment ? crypto.randomUUID() : sessionId!;
      if (isFreshSegment) setSessionId(sid);
      setAwaitingDecision(false);
      setIsRunning(true);
      setTargetEndTime(Date.now() + timeLeft * 1000);
      void startAudioForSession(); // ユーザー操作のタイミングで BGM・アラームを解錠する
      void logPomodoroEvent(sid, mode, 'START', mode === 'WORK' ? { subject: effectiveSubject } : {});
    } else {
      setIsRunning(false);
      setTargetEndTime(null);
      workerRef.current?.postMessage('stop');
      stopSessionAudio();
      if (sessionId) void logPomodoroEvent(sessionId, mode, 'PAUSE');
    }
  };

  const handleStop = () => {
    stopSessionAudio();
    if (sessionId) void logPomodoroEvent(sessionId, mode, 'STOP');
    setIsRunning(false);
    setTargetEndTime(null);
    setTimeLeft(durationFor(mode));
    setAwaitingDecision(false);
    setSessionId(null);
  };

  const handleQuit = () => {
    if (sessionId) void logPomodoroEvent(sessionId, mode, 'QUIT', { declined_mode: mode });
    setAwaitingDecision(false);
    setMode('WORK');
    setTimeLeft(WORK_TIME);
    setTargetEndTime(null);
    setIsRunning(false);
    setSessionId(null);
    clearPersistedState();
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const isWork = mode === 'WORK';
  const modeLabel = mode === 'WORK' ? '集中 (25分)' : mode === 'LONG_BREAK' ? '大休憩 (15分)' : '休憩 (5分)';

  return (
    <>
      <audio ref={bgmAudioElRef} playsInline className="hidden" />
      <audio ref={alarmAudioElRef} playsInline className="hidden" />
      <div className={cn(
        "card-glass border rounded-3xl p-10 flex flex-col items-center justify-center shadow-lg relative overflow-hidden flex-1 min-h-[400px] transition-colors duration-1000",
        isWork
          ? "bg-white dark:bg-darkbg-secondary border-slate-200 dark:border-slate-800"
          : "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50"
      )}>
        <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-6 z-20">
          <span className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all shrink-0",
            isWork ? "bg-brand-500 text-white" : "bg-emerald-500 text-white"
          )}>
            現在のモード: {modeLabel}
          </span>

          <span className="text-xs font-bold text-slate-400 py-1 shrink-0">今日: {pomoCount} 回</span>
        </div>

        {isWork && (
          <div className="mb-6 flex flex-col items-center gap-2 z-10 transition-opacity">
            <label className="text-xs font-bold text-slate-500">学習科目</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isRunning}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {subjectOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {subject === OTHER_SUBJECT && (
              <input
                type="text"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                disabled={isRunning}
                placeholder="科目名を入力"
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 w-40 text-center"
              />
            )}
          </div>
        )}

        <div className={cn(
          "w-64 h-64 rounded-full border-8 flex flex-col items-center justify-center relative mb-8 transition-colors duration-1000",
          isWork 
            ? (isRunning ? "border-brand-400 dark:border-brand-500" : "border-slate-100 dark:border-slate-800")
            : (isRunning ? "border-emerald-400 dark:border-emerald-500" : "border-emerald-100 dark:border-emerald-900/50")
        )}>
          {isWork && isRunning && !showTime ? (
            <div className="flex flex-col items-center justify-center text-slate-400 z-10">
              <Lock className="w-12 h-12 mb-2 opacity-50" />
              <span className="text-xl font-bold tracking-widest opacity-50">集中</span>
            </div>
          ) : (
            <span className={cn(
              "text-6xl font-black font-title tracking-tighter z-10",
              isWork ? "text-slate-800 dark:text-white" : "text-emerald-700 dark:text-emerald-400"
            )}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          )}
          
          <span className={cn(
            "text-sm font-bold mt-2 z-10",
            isWork ? "text-slate-600 dark:text-slate-300" : "text-emerald-700 dark:text-emerald-300"
          )}>
            {mode === 'WORK' ? '集中モード' : mode === 'LONG_BREAK' ? '大休憩' : 'リラックス'}
          </span>
        </div>

        {isWork && !showTime && isRunning ? (
          <button
            onClick={() => {
              setShowTime(true);
              if (sessionId) void logPomodoroEvent(sessionId, mode, 'CHECK_REMAINING_TIME');
              setTimeout(() => setShowTime(false), 3000);
            }}
            className="mb-8 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-4 py-2 rounded-full hover:bg-slate-200 transition-colors"
          >
            残り時間を確認する
          </button>
        ) : (
          <div className="mb-8 h-8"></div>
        )}

        {awaitingDecision && !isRunning ? (
          <div className="flex gap-4 w-full max-w-sm z-10">
            <button
              onClick={toggleTimer}
              className={cn(
                "flex-1 py-4 text-white rounded-2xl font-bold font-title text-lg shadow-md transition-all active:scale-95",
                isWork ? "bg-brand-600 hover:bg-brand-700 shadow-brand-500/20" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
              )}
            >
              <i className="fa-solid fa-play mr-2"></i>
              {isWork ? '学習を再開する' : mode === 'LONG_BREAK' ? '大休憩を開始する' : '休憩を開始する'}
            </button>
            <button
              onClick={handleQuit}
              className="flex-none px-6 py-4 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold shadow-md transition-all active:scale-95"
            >
              終了する
            </button>
          </div>
        ) : (
          <div className="flex gap-4 w-full max-w-sm z-10">
            <button
              onClick={toggleTimer}
              className={cn(
                "flex-1 py-4 text-white rounded-2xl font-bold font-title text-lg shadow-md transition-all active:scale-95",
                isRunning
                  ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20"
                  : (isWork ? "bg-brand-600 hover:bg-brand-700 shadow-brand-500/20" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20")
              )}
            >
              {isRunning ? <><i className="fa-solid fa-pause mr-2"></i> 一時停止</> : <><i className="fa-solid fa-play mr-2"></i> 開始</>}
            </button>

            {isRunning && (
              <button
                onClick={handleStop}
                className="flex-none px-6 py-4 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold shadow-md transition-all active:scale-95"
              >
                <i className="fa-solid fa-stop mr-2"></i> 中止
              </button>
            )}
          </div>
        )}
      </div>

      {levelUpData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-darkbg-primary rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center relative overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-brand-500/20 to-transparent"></div>
            <div className="w-20 h-20 bg-gradient-to-tr from-brand-400 to-brand-600 rounded-full flex items-center justify-center shadow-lg shadow-brand-500/30 mb-6 relative z-10 border-4 border-white dark:border-darkbg-primary">
              <PartyPopper className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-3xl font-black font-title text-slate-800 dark:text-white mb-2 z-10">LEVEL UP!</h3>
            <div className="flex items-center gap-4 text-xl font-bold font-mono text-slate-500 mb-6 z-10">
              <span className="opacity-50 line-through">Lv.{levelUpData.oldLevel}</span>
              <i className="fa-solid fa-arrow-right text-brand-500"></i>
              <span className="text-3xl text-brand-500">Lv.{levelUpData.newLevel}</span>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 w-full mb-6 z-10">
              <p className="text-xs font-bold text-amber-600 dark:text-amber-500 mb-2">レベルアップ報酬</p>
              <div className="flex items-center justify-center gap-2 text-2xl font-black text-amber-500">
                <i className="fa-solid fa-gem"></i>
                +{levelUpData.rewardStones} <span className="text-sm">個</span>
              </div>
            </div>
            <button onClick={() => setLevelUpData(null)} className="w-full py-4 bg-slate-800 hover:bg-slate-900 dark:bg-slate-200 dark:hover:bg-white text-white dark:text-slate-900 rounded-2xl font-bold transition-all active:scale-95 z-10 shadow-lg">閉じる</button>
          </div>
        </div>
      )}

      {showRatingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-darkbg-primary rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
            <h3 className="text-2xl font-black font-title text-slate-800 dark:text-white mb-4">集中度の評価</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">今回のポモドーロセッションの集中度を1(低)〜5(高)で評価してください。</p>
            <div className="flex gap-3 mb-6 w-full justify-center">
              {[1, 2, 3, 4, 5].map(rating => (
                <button
                  key={rating}
                  onClick={() => handleRatingSubmit(rating)}
                  className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-100 hover:bg-brand-100 dark:bg-slate-800 dark:hover:bg-brand-900/30 text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 text-xl font-bold transition-all active:scale-90 border-2 border-transparent hover:border-brand-500"
                >
                  {rating}
                </button>
              ))}
            </div>
            <button 
              onClick={() => handleRatingSubmit(3)} 
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline underline-offset-4"
            >
              スキップ（普通とする）
            </button>
          </div>
        </div>
      )}
    </>
  );
}
