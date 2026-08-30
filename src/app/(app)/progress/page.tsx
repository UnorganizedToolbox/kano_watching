'use client'

import { useEffect } from 'react';
import Link from 'next/link';

export default function ProgressPage() {
  useEffect(() => {
    alert('未実装です（UIガワ移植予定）');
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
      <div className="card-glass p-12 flex flex-col items-center gap-4 border border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-darkbg-secondary">
        <i className="fa-solid fa-person-digging text-4xl text-slate-400"></i>
        <h2 className="text-xl font-bold font-title">Progress は未実装です</h2>
        <p className="text-sm text-slate-500">現在開発中です。</p>
        <Link href="/" className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-bold mt-4">
          ダッシュボードに戻る
        </Link>
      </div>
    </div>
  );
}
