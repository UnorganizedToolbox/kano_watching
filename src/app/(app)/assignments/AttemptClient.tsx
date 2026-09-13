'use client'

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitAttempt, retryAttempt } from './actions';

interface AttemptView {
  id: string;
  status: 'in_progress' | 'submitted' | 'graded';
  submittedWork: string | null;
  submittedFinalAnswer: string | null;
  isCorrect: boolean | null;
}

export default function AttemptClient({
  assignmentId,
  attempt,
  svgDataUri,
  svgError,
  canRetry,
}: {
  assignmentId: string;
  attempt: AttemptView;
  svgDataUri: string | null;
  svgError: string | null;
  canRetry: boolean;
}) {
  const router = useRouter();
  const isLocked = attempt.status !== 'in_progress';
  const [work, setWork] = useState(attempt.submittedWork ?? '');
  const [finalAnswer, setFinalAnswer] = useState(attempt.submittedFinalAnswer ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [isRetrying, startRetryTransition] = useTransition();

  const handleSubmit = () => {
    setError(null);
    startSubmitTransition(async () => {
      const result = await submitAttempt({ attemptId: attempt.id, assignmentId, work, finalAnswer });
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error || '提出に失敗しました');
      }
    });
  };

  const handleRetry = () => {
    setError(null);
    startRetryTransition(async () => {
      const result = await retryAttempt(assignmentId);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error || '再抽選に失敗しました');
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-slate-800 dark:text-white mb-3">問題</h3>
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 overflow-auto">
          {svgError ? (
            <pre className="text-xs text-rose-500 whitespace-pre-wrap">{svgError}</pre>
          ) : svgDataUri ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={svgDataUri} alt="問題" className="max-w-full bg-white" />
          ) : (
            <p className="text-xs text-slate-400">問題を読み込めませんでした。</p>
          )}
        </div>
      </div>

      <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
        <div>
          <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-1">途中式(任意)</label>
          <textarea
            value={work}
            onChange={e => setWork(e.target.value)}
            disabled={isLocked}
            rows={4}
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 outline-none resize-none disabled:opacity-60"
          />
        </div>
        <div>
          <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-1">最終解答</label>
          <input
            value={finalAnswer}
            onChange={e => setFinalAnswer(e.target.value)}
            disabled={isLocked}
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 outline-none font-mono disabled:opacity-60"
          />
        </div>

        {attempt.status === 'graded' && (
          <p className={`text-sm font-bold ${attempt.isCorrect ? 'text-brand-600' : 'text-rose-500'}`}>
            {attempt.isCorrect ? '正解です!' : '不正解です'}
          </p>
        )}
        {attempt.status === 'submitted' && (
          <p className="text-sm font-bold text-slate-500">提出済み(採点待ち)</p>
        )}

        {error && <p className="text-rose-500 text-xs font-bold">{error}</p>}

        <div className="flex justify-end gap-3">
          {isLocked && canRetry && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {isRetrying ? '生成中...' : '解き直す'}
            </button>
          )}
          {!isLocked && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? '提出中...' : '提出する'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
