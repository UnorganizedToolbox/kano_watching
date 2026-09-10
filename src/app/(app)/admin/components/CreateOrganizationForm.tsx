'use client'

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createOrganization } from '../actions';

export default function CreateOrganizationForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [memberLimit, setMemberLimit] = useState('-1');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set('name', name);
        formData.set('member_limit', memberLimit);
        await createOrganization(formData);
        setName('');
        setMemberLimit('-1');
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : '団体の作成に失敗しました');
      }
    });
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="例: ○○塾"
          className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
        />
        <input
          type="number"
          value={memberLimit}
          onChange={(e) => setMemberLimit(e.target.value)}
          min={-1}
          title="人数上限(-1で無制限)"
          className="w-24 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
        />
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-bold disabled:opacity-50"
        >
          {isPending ? '追加中...' : '追加する'}
        </button>
      </form>
      <p className="text-[10px] text-slate-400 mt-2">人数上限は -1 で無制限になります。</p>
      {error && <p className="text-xs text-rose-500 mt-2 font-bold">{error}</p>}
    </div>
  );
}
