'use client'

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { setStudentStatus } from '../actions';

type Student = {
  id: string;
  student_id: string;
  name: string;
  status: string;
};

export default function StudentListClient({ students }: { students: Student[] }) {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? students.filter(s => s.name?.toLowerCase().includes(q) || s.student_id?.toLowerCase().includes(q))
      : students;
    // 承認待ちを先頭に集める(対応が必要なため)
    return [...base].sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return 0;
    });
  }, [students, query]);

  const handleApprove = (student: Student) => {
    setPendingId(student.id);
    startTransition(async () => {
      try {
        await setStudentStatus(student.id, 'active');
      } catch (e) {
        alert(e instanceof Error ? e.message : '更新に失敗しました');
      } finally {
        setPendingId(null);
      }
    });
  };

  const handleToggleStatus = (student: Student) => {
    const nextStatus = student.status === 'disabled' ? 'active' : 'disabled';
    if (nextStatus === 'disabled' && !confirm(`${student.name} を無効化しますか？次回ログイン時にアクセスできなくなります。`)) {
      return;
    }
    setPendingId(student.id);
    startTransition(async () => {
      try {
        await setStudentStatus(student.id, nextStatus);
      } catch (e) {
        alert(e instanceof Error ? e.message : '更新に失敗しました');
      } finally {
        setPendingId(null);
      }
    });
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">生徒一覧</h3>
          {students.some(s => s.status === 'pending') && (
            <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 px-2 py-1 rounded-lg font-bold">
              承認待ち {students.filter(s => s.status === 'pending').length} 件
            </span>
          )}
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="名前やIDで検索..."
            className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <th className="pb-3 font-semibold">表示ID</th>
              <th className="pb-3 font-semibold">氏名</th>
              <th className="pb-3 font-semibold">ステータス</th>
              <th className="pb-3 font-semibold text-right">アクション</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.length > 0 ? (
              filtered.map(student => (
                <tr key={student.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-4 text-slate-600 dark:text-slate-300 font-mono text-xs">{student.student_id}</td>
                  <td className="py-4 font-bold text-slate-800 dark:text-slate-200">{student.name}</td>
                  <td className="py-4">
                    {student.status === 'pending' ? (
                      <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        承認待ち
                      </span>
                    ) : student.status === 'disabled' ? (
                      <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                        停止中
                      </span>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-700 text-xs">—</span>
                    )}
                  </td>
                  <td className="py-4 text-right space-x-2 whitespace-nowrap">
                    {student.status === 'pending' ? (
                      <button
                        onClick={() => handleApprove(student)}
                        disabled={isPending && pendingId === student.id}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20"
                      >
                        承認する
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleStatus(student)}
                        disabled={isPending && pendingId === student.id}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                          student.status === 'disabled'
                            ? 'text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20'
                            : 'text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-900/20'
                        }`}
                      >
                        {student.status === 'disabled' ? '有効化' : '無効化'}
                      </button>
                    )}
                    <Link href={`/admin/student/${student.id}`} className="text-brand-600 hover:text-brand-700 dark:text-brand-400 font-semibold text-xs bg-brand-50 dark:bg-brand-900/20 px-3 py-1.5 rounded-lg transition-colors">
                      詳細を見る
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-500 text-sm">
                  {students.length === 0 ? '生徒が登録されていません' : '該当する生徒が見つかりません'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
