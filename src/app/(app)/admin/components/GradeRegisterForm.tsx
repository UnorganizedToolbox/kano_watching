'use client'

import { useState, useTransition } from 'react';
import { registerGrade } from '../actions';
import { ClipboardList } from 'lucide-react';

export default function GradeRegisterForm({ studentId }: { studentId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        await registerGrade(formData);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        const form = document.getElementById(`grade-form-${studentId}`) as HTMLFormElement | null;
        form?.reset();
      } catch (e) {
        setError(e instanceof Error ? e.message : '登録に失敗しました');
      }
    });
  };

  return (
    <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center gap-2">
        <ClipboardList className="w-5 h-5 text-brand-500" />
        成績登録
      </h3>
      <form id={`grade-form-${studentId}`} action={handleSubmit} className="flex flex-col gap-3">
        <input type="hidden" name="student_id" value={studentId} />
        <div>
          <label className="text-xs font-bold text-slate-500 block mb-1">得点 (0〜100)</label>
          <input required type="number" min={0} max={100} name="total_score" className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 outline-none" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 block mb-1">弱点分野 (任意)</label>
          <input type="text" name="weaknesses" placeholder="例: 2次関数、確率" className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 outline-none" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 block mb-1">所見・アドバイス (任意)</label>
          <textarea name="recommendation" rows={2} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 outline-none resize-none" />
        </div>
        {error && <p className="text-rose-500 text-xs font-bold">{error}</p>}
        <div className="flex justify-end items-center gap-3">
          {saved && <span className="text-brand-600 text-xs font-bold">登録しました</span>}
          <button type="submit" disabled={isPending} className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition-colors">
            {isPending ? '登録中...' : '登録する'}
          </button>
        </div>
      </form>
    </div>
  );
}
