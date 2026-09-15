'use client'

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { startAttempt } from './actions';

export default function StartAttemptButton({ assignmentId, isOverdue }: { assignmentId: string; isOverdue?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleStart = () => {
    setError(null);
    startTransition(async () => {
      const result = await startAttempt(assignmentId);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error || '開始に失敗しました');
      }
    });
  };

  return (
    <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm flex flex-col items-center gap-4 text-center">
      <p className="text-sm text-slate-500 dark:text-slate-400">「開始する」を押すと問題が生成されます。</p>
      {error && <p className="text-rose-500 text-xs font-bold">{error}</p>}
      <button
        onClick={handleStart}
        disabled={isPending}
        className={`px-8 py-3 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-colors ${
          isOverdue ? 'bg-slate-400 hover:bg-slate-500' : 'bg-brand-600 hover:bg-brand-700'
        }`}
      >
        {isPending ? '生成中...' : '開始する'}
      </button>
      {isOverdue && <p className="text-xs text-rose-500">締切を過ぎています。開始できますが、スコアに超過ペナルティ(×0.8)が適用されます。</p>}
    </div>
  );
}
