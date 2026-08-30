'use client'

import { useState, useEffect } from 'react';
import { logPomodoro } from '../actions';

export default function PomodoroTimer() {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [subject, setSubject] = useState('数学');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      logPomodoro(subject);
      alert('ポモドーロ完了！お疲れ様でした。学習記録が保存されました。');
      setTimeLeft(25 * 60); // Reset
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, subject]);

  const toggleTimer = () => setIsRunning(!isRunning);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center shadow-lg relative overflow-hidden flex-1 min-h-[400px]">
      <div className="absolute top-6 left-6 flex gap-2">
        <span className="px-3 py-1 bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 rounded-lg text-xs font-bold">ポモドーロ</span>
      </div>
      
      <div className="mb-6 flex flex-col items-center gap-2 z-10">
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

      <div className="w-64 h-64 rounded-full border-8 border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center relative mb-8">
        <span className="text-6xl font-black font-title tracking-tighter text-contrast z-10">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
        <span className="text-sm font-bold text-slate-400 mt-2 z-10">集中モード</span>
      </div>

      <div className="flex gap-4 w-full max-w-sm z-10">
        <button 
          onClick={toggleTimer} 
          className={`flex-1 py-4 text-white rounded-2xl font-bold font-title text-lg shadow-md transition-all active:scale-95 ${
            isRunning ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/20'
          }`}
        >
          {isRunning ? <><i className="fa-solid fa-pause mr-2"></i> 一時停止</> : <><i className="fa-solid fa-play mr-2"></i> 開始</>}
        </button>
        
        {/* For testing purposes, adding a quick complete button */}
        <button 
          onClick={() => setTimeLeft(1)} 
          className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold font-title text-lg shadow-md shadow-emerald-500/20 transition-all active:scale-95"
          title="テスト用: 1秒にする"
        >
          <i className="fa-solid fa-forward mr-2"></i> スキップ (テスト)
        </button>
      </div>
    </div>
  );
}
