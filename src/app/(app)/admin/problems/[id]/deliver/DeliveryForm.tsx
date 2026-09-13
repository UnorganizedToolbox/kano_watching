'use client'

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createAssignment, type TargetType, type DeliveryMode, type GradingMode } from './actions';

export default function DeliveryForm({
  target,
  students,
}: {
  target: { kind: 'template' | 'deck'; id: string };
  students: { id: string; name: string; student_id: string }[];
}) {
  const router = useRouter();
  const [targetType, setTargetType] = useState<TargetType>('organization');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('deadline');
  const [dueAt, setDueAt] = useState('');
  const [gradingMode, setGradingMode] = useState<GradingMode>('auto_exact');

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggleStudent = (id: string) => {
    setSelectedStudents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createAssignment({
          templateId: target.kind === 'template' ? target.id : undefined,
          deckId: target.kind === 'deck' ? target.id : undefined,
          targetType,
          targetStudentIds: [...selectedStudents],
          deliveryMode,
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
          gradingMode,
        });
        if (result.ok) {
          router.push('/admin/assignments');
        } else {
          setError(result.error || '配信に失敗しました');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '配信に失敗しました');
      }
    });
  };

  return (
    <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
      <div>
        <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-2">対象(複数選択可)</label>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" checked={targetType === 'organization'} onChange={() => setTargetType('organization')} />
            団体全員
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" checked={targetType === 'students'} onChange={() => setTargetType('students')} />
            生徒を個別選択
          </label>
        </div>

        {targetType === 'students' && (
          <div className="mt-3 max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-1.5 bg-slate-50 dark:bg-slate-900">
            {students.length === 0 ? (
              <p className="text-xs text-slate-400">団体に所属する生徒がいません。</p>
            ) : (
              students.map(s => (
                <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={selectedStudents.has(s.id)} onChange={() => toggleStudent(s.id)} />
                  {s.name} <span className="text-[10px] text-slate-400 font-mono">{s.student_id}</span>
                </label>
              ))
            )}
          </div>
        )}
      </div>

      <div>
        <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-2">配信区分</label>
        <div className="flex flex-wrap gap-2">
          {([
            { value: 'deadline', label: '期限あり' },
            { value: 'no_deadline', label: '期限なし課題' },
            { value: 'permanent', label: '恒常(単問)' },
          ] as { value: DeliveryMode; label: string }[]).map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDeliveryMode(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                deliveryMode === opt.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {deliveryMode === 'deadline' && (
        <div>
          <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-2">締切日時</label>
          <input
            type="datetime-local"
            value={dueAt}
            onChange={e => setDueAt(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 outline-none"
          />
        </div>
      )}

      <div>
        <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-2">採点方法</label>
        <div className="flex flex-wrap gap-2">
          {([
            { value: 'auto_exact', label: '最終解答欄を自動採点' },
            { value: 'manual', label: '教師が手動採点' },
          ] as { value: GradingMode; label: string }[]).map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setGradingMode(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                gradingMode === opt.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-2">自動採点は「最終解答欄」のみ対象です。途中式は自動採点せず教師の確認用として保存されます。</p>
      </div>

      {error && <p className="text-rose-500 text-xs font-bold">{error}</p>}

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-colors"
        >
          {isPending ? '配信中...' : '配信する'}
        </button>
      </div>
    </div>
  );
}
