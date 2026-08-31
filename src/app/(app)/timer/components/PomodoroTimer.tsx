'use client'

import { useState, useEffect, useRef } from 'react';
import { logPomodoro } from '../actions';
import { cn } from '@/lib/utils';

type TimerMode = 'WORK' | 'BREAK';

const WORK_TIME = 25 * 60;
const BREAK_TIME = 5 * 60;

// Web Audio APIを用いたビープ音生成
function playBeepSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // 和音を作成（メロディアスなチャイム音）
    const playNote = (frequency: number, startTime: number, duration: number) => {
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime + startTime);
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime + startTime);
      gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + startTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + startTime + duration);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start(audioCtx.currentTime + startTime);
      oscillator.stop(audioCtx.currentTime + startTime + duration);
    };

    // キンコンカンコン風
    playNote(523.25, 0, 1.5); // C5
    playNote(659.25, 0.4, 1.5); // E5
    playNote(783.99, 0.8, 1.5); // G5
    playNote(1046.50, 1.2, 2.0); // C6
    
  } catch (e) {
    console.error("Audio playback failed", e);
  }
}

// Web Speech APIを用いた音声読み上げ
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

export default function PomodoroTimer() {
  const [timeLeft, setTimeLeft] = useState(WORK_TIME);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<TimerMode>('WORK');
  const [subject, setSubject] = useState('数学');
  const [pomoCount, setPomoCount] = useState(0);
  
  // 休憩開始時間の記録（「ある意味の怠惰」実績などの計算用。今回はUI表示のみ）
  const [breakStartTime, setBreakStartTime] = useState<number | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      handleTimerComplete();
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const handleTimerComplete = async () => {
    // 音を鳴らす（タブが非アクティブでも動作する）
    playBeepSound();

    if (mode === 'WORK') {
      speakText("ポモドーロが終了しました。5分間の休憩に入ります。");
      
      // バックエンドに記録を保存
      try {
        await logPomodoro(subject);
      } catch (e) {
        console.error("Failed to log pomodoro", e);
      }

      setPomoCount(p => p + 1);
      setMode('BREAK');
      setTimeLeft(BREAK_TIME);
      setBreakStartTime(Date.now());
      
      // 自動で休憩タイマーを開始するかどうかはお好みですが、ここでは待機させます。
    } else {
      speakText("休憩が終わりました。次のポモドーロを開始しましょう。");
      setMode('WORK');
      setTimeLeft(WORK_TIME);
      setBreakStartTime(null);
    }
  };

  const toggleTimer = () => setIsRunning(!isRunning);

  const switchMode = (newMode: TimerMode) => {
    setMode(newMode);
    setIsRunning(false);
    setTimeLeft(newMode === 'WORK' ? WORK_TIME : BREAK_TIME);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  // モードに応じた配色の決定
  const isWork = mode === 'WORK';
  
  return (
    <div className={cn(
      "card-glass border rounded-3xl p-10 flex flex-col items-center justify-center shadow-lg relative overflow-hidden flex-1 min-h-[400px] transition-colors duration-1000",
      isWork 
        ? "bg-white dark:bg-darkbg-secondary border-slate-200 dark:border-slate-800" 
        : "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50"
    )}>
      <div className="absolute top-6 left-6 flex gap-2 z-20">
        <button 
          onClick={() => switchMode('WORK')}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
            isWork ? "bg-brand-500 text-white shadow-md shadow-brand-500/30" : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"
          )}
        >
          ポモドーロ
        </button>
        <button 
          onClick={() => switchMode('BREAK')}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
            !isWork ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30" : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"
          )}
        >
          休憩
        </button>
      </div>
      
      <div className="absolute top-6 right-6 z-20">
        <span className="text-xs font-bold text-slate-400">今日: {pomoCount} 回完了</span>
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
            <option value="数学">数学</option>
            <option value="英語">英語</option>
            <option value="物理">物理</option>
            <option value="化学">化学</option>
          </select>
        </div>
      )}

      <div className={cn(
        "w-64 h-64 rounded-full border-8 flex flex-col items-center justify-center relative mb-8 transition-colors duration-1000",
        isWork 
          ? (isRunning ? "border-brand-400 dark:border-brand-500" : "border-slate-100 dark:border-slate-800")
          : (isRunning ? "border-emerald-400 dark:border-emerald-500" : "border-emerald-100 dark:border-emerald-900/50")
      )}>
        <span className={cn(
          "text-6xl font-black font-title tracking-tighter z-10",
          isWork ? "text-slate-800 dark:text-white" : "text-emerald-700 dark:text-emerald-400"
        )}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
        <span className={cn(
          "text-sm font-bold mt-2 z-10",
          isWork ? "text-slate-400" : "text-emerald-600/70 dark:text-emerald-400/70"
        )}>
          {isWork ? '集中モード' : 'リラックス'}
        </span>
      </div>

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
        
        {/* For testing purposes, adding a quick complete button */}
        <button 
          onClick={() => setTimeLeft(2)} 
          className="flex-none px-6 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold text-sm shadow-md transition-all active:scale-95"
          title="テスト用: 残り2秒にする"
        >
          <i className="fa-solid fa-forward"></i>
        </button>
      </div>
    </div>
  );
}
