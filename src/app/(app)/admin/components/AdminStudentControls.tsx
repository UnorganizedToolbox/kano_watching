'use client'

import { useState, useTransition } from 'react';
import { Lock, Unlock, ShieldOff, ShieldCheck } from 'lucide-react';
import { setStudentNickname, setStudentStatus } from '../actions';

export default function AdminStudentControls({
  studentId,
  initialName,
  initialLocked,
  initialStatus,
}: {
  studentId: string;
  initialName: string;
  initialLocked: boolean;
  initialStatus: string;
}) {
  const [name, setName] = useState(initialName);
  const [locked, setLocked] = useState(initialLocked);
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState('');

  const handleSaveNickname = () => {
    setMessage('');
    startTransition(async () => {
      try {
        await setStudentNickname(studentId, name, locked);
        setMessage('保存しました。');
        setTimeout(() => setMessage(''), 3000);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : '更新に失敗しました');
      }
    });
  };

  const handleToggleStatus = () => {
    const nextStatus = status === 'disabled' ? 'active' : 'disabled';
    if (nextStatus === 'disabled' && !confirm('このアカウントを無効化しますか？次回ログイン時にアクセスできなくなります。')) {
      return;
    }
    startTransition(async () => {
      try {
        await setStudentStatus(studentId, nextStatus);
        setStatus(nextStatus);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : '更新に失敗しました');
      }
    });
  };

  return (
    <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">アカウント管理</h3>

      <label className="text-xs font-bold text-slate-500 block mb-1">ニックネーム</label>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
        />
        <button
          onClick={() => setLocked(l => !l)}
          title={locked ? '固定を解除する' : '固定する(本人は変更不可になります)'}
          className={`px-3 rounded-lg border text-xs font-bold flex items-center gap-1 transition-colors ${
            locked
              ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400'
              : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-700'
          }`}
        >
          {locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          {locked ? '固定中' : '未固定'}
        </button>
      </div>
      <button
        onClick={handleSaveNickname}
        disabled={isPending}
        className="w-full py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 mb-4"
      >
        ニックネーム設定を保存
      </button>

      <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
        <label className="text-xs font-bold text-slate-500 block mb-2">アカウント状態</label>
        <button
          onClick={handleToggleStatus}
          disabled={isPending}
          className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 ${
            status === 'disabled'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
              : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'
          }`}
        >
          {status === 'disabled' ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
          {status === 'disabled' ? 'アカウントを有効化する' : 'アカウントを無効化する'}
        </button>
      </div>

      {message && <p className="text-xs text-slate-500 mt-3">{message}</p>}
    </div>
  );
}
