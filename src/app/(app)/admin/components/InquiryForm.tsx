'use client'

import { useState, useTransition } from 'react';
import { submitTeacherInquiry } from '../actions';

export default function InquiryForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        await submitTeacherInquiry(formData);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        (document.getElementById('teacher-inquiry-form') as HTMLFormElement | null)?.reset();
      } catch (e) {
        setError(e instanceof Error ? e.message : '送信に失敗しました');
      }
    });
  };

  return (
    <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">管理者への問い合わせ</h3>
      <form id="teacher-inquiry-form" action={handleSubmit} className="flex flex-col gap-3">
        <input required type="text" name="title" placeholder="件名" className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 outline-none" />
        <textarea required name="body" rows={4} placeholder="お問い合わせ内容を入力してください..." className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 outline-none resize-none" />
        {error && <p className="text-rose-500 text-xs font-bold">{error}</p>}
        <div className="flex justify-end items-center gap-3">
          {saved && <span className="text-brand-600 text-xs font-bold">送信しました</span>}
          <button type="submit" disabled={isPending} className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-colors">
            {isPending ? '送信中...' : '送信する'}
          </button>
        </div>
      </form>
    </div>
  );
}
