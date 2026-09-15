'use client'

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitAttempt, retryAttempt, type SubResultRow } from './actions';
import { useNavLock } from '../components/NavLockContext';
import type { ScoreAdjustmentTier } from '@/lib/cbt/scoreAdjustment';

export interface QuestionView {
  svgDataUri: string | null;
  svgError: string | null;
  subQuestions: { label: string; points: number }[];
  submittedAnswers: string[];
  subResults: SubResultRow[] | null;
}

export interface ScoreBreakdown {
  rawScore: number;
  tier: ScoreAdjustmentTier;
  multiplier: number;
  adjustedScore: number;
}

const TIER_LABEL: Record<ScoreAdjustmentTier, string> = {
  early: '早期提出ボーナス',
  ontime: '',
  late: '期限超過ペナルティ',
  none: '',
};

export default function AttemptClient({
  assignmentId,
  attemptId,
  status,
  submittedWork,
  scoreBreakdown,
  questions,
  isOverdue,
}: {
  assignmentId: string;
  attemptId: string;
  status: 'in_progress' | 'submitted' | 'graded';
  submittedWork: string | null;
  scoreBreakdown: ScoreBreakdown | null;
  questions: QuestionView[];
  isOverdue: boolean;
}) {
  const router = useRouter();
  const isLocked = status !== 'in_progress';
  const [work, setWork] = useState(submittedWork ?? '');
  const [answers, setAnswers] = useState<string[][]>(
    questions.map(q => q.subQuestions.map((_, i) => q.submittedAnswers[i] ?? '')),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [isRetrying, startRetryTransition] = useTransition();

  // 問題に取り組み中(未提出)は、他の画面へ移動されると困るのでナビゲーションを封じる
  const { lock: lockNav, unlock: unlockNav } = useNavLock();
  useEffect(() => {
    if (status === 'in_progress') {
      lockNav();
      return () => unlockNav();
    }
  }, [status, lockNav, unlockNav]);

  const updateAnswer = (qIdx: number, sIdx: number, value: string) => {
    setAnswers(prev => prev.map((qa, i) => (i === qIdx ? qa.map((a, j) => (j === sIdx ? value : a)) : qa)));
  };

  const handleSubmit = () => {
    setError(null);
    startSubmitTransition(async () => {
      const result = await submitAttempt({ attemptId, assignmentId, work, answers });
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
      {questions.map((q, qIdx) => (
        <div key={qIdx} className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <h3 className="font-bold text-slate-800 dark:text-white">問題 {questions.length > 1 ? qIdx + 1 : ''}</h3>
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 overflow-auto">
            {q.svgError ? (
              <pre className="text-xs text-rose-500 whitespace-pre-wrap">{q.svgError}</pre>
            ) : q.svgDataUri ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={q.svgDataUri} alt="問題" className="max-w-full bg-white" />
            ) : (
              <p className="text-xs text-slate-400">問題を読み込めませんでした。</p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {q.subQuestions.map((sq, sIdx) => {
              const result = q.subResults?.[sIdx];
              return (
                <div key={sIdx}>
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-1">
                    {sq.label ? `${sq.label} ` : '最終解答'}
                    <span className="text-[10px] text-slate-400 font-normal ml-1">({sq.points}点)</span>
                  </label>
                  <input
                    value={answers[qIdx]?.[sIdx] ?? ''}
                    onChange={e => updateAnswer(qIdx, sIdx, e.target.value)}
                    disabled={isLocked}
                    className={`w-full px-3 py-2 text-sm border rounded-xl bg-slate-50 dark:bg-slate-900 outline-none font-mono disabled:opacity-60 ${
                      result ? (result.correct ? 'border-brand-400' : 'border-rose-400') : 'border-slate-200 dark:border-slate-700'
                    }`}
                  />
                  {result && (
                    <p className={`text-[11px] font-bold mt-1 ${result.correct ? 'text-brand-600' : 'text-rose-500'}`}>
                      {result.correct ? `正解 (+${result.earnedPoints}点)` : '不正解 (0点)'}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
        <div>
          <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-1">途中式(任意・全問共通のメモ欄)</label>
          <textarea
            value={work}
            onChange={e => setWork(e.target.value)}
            disabled={isLocked}
            rows={4}
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 outline-none resize-none disabled:opacity-60"
          />
        </div>

        {status === 'graded' && scoreBreakdown && (
          <div className="text-sm rounded-xl bg-slate-50 dark:bg-slate-900/50 p-4">
            <div className="flex justify-between text-slate-500 dark:text-slate-400 py-0.5">
              <span>正解</span>
              <span>{Math.round(scoreBreakdown.rawScore)}%</span>
            </div>
            <div className="flex justify-between text-slate-500 dark:text-slate-400 py-0.5">
              <span>誤り</span>
              <span>{Math.round(100 - scoreBreakdown.rawScore)}%</span>
            </div>
            {TIER_LABEL[scoreBreakdown.tier] && (
              <div className={`flex justify-between py-0.5 font-bold ${scoreBreakdown.tier === 'early' ? 'text-brand-600' : 'text-rose-500'}`}>
                <span>{TIER_LABEL[scoreBreakdown.tier]}</span>
                <span>{scoreBreakdown.tier === 'early' ? '+20%' : '-20%'}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline font-bold text-slate-800 dark:text-white border-t border-slate-200 dark:border-slate-700 mt-2 pt-2">
              <span>スコア</span>
              <span className="text-lg text-brand-600">{Math.round(scoreBreakdown.adjustedScore)}%</span>
            </div>
          </div>
        )}
        {status === 'submitted' && (
          <p className="text-sm font-bold text-slate-500">提出済み(採点待ち)</p>
        )}

        {error && <p className="text-rose-500 text-xs font-bold">{error}</p>}

        <div className="flex justify-end gap-3">
          {isLocked && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className={`px-4 py-2.5 border text-sm font-bold rounded-xl disabled:opacity-50 transition-colors ${
                isOverdue
                  ? 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {isRetrying ? '生成中...' : '再提出する'}
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
