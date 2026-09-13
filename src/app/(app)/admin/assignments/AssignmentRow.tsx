'use client'

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteAssignment } from '../problems/[id]/deliver/actions';

const DELIVERY_MODE_LABEL: Record<string, string> = {
  deadline: '期限あり',
  no_deadline: '期限なし',
  permanent: '恒常',
};
const GRADING_MODE_LABEL: Record<string, string> = {
  manual: '手動採点',
  auto_exact: '自動採点',
};

export default function AssignmentRow({
  id,
  title,
  organizationName,
  targetType,
  targetCount,
  deliveryMode,
  dueAt,
  gradingMode,
  createdAt,
}: {
  id: string;
  title: string;
  organizationName: string;
  targetType: string;
  targetCount: number;
  deliveryMode: string;
  dueAt: string | null;
  gradingMode: string;
  createdAt: string;
}) {
  const [isDeleting, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    if (!confirm('この配信を削除しますか?生徒の挑戦データも削除されます。この操作は取り消せません。')) return;
    startTransition(async () => {
      try {
        await deleteAssignment(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : '削除に失敗しました');
      }
    });
  };

  return (
    <div className="flex items-center justify-between px-6 py-4 gap-4">
      <div className="min-w-0">
        <p className="font-bold text-sm text-slate-700 dark:text-slate-200 truncate">{title}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          {organizationName} ・ {targetType === 'organization' ? '団体全員' : targetType === 'all' ? '全団体・全員' : `生徒${targetCount}名`} ・ {DELIVERY_MODE_LABEL[deliveryMode]}
          {dueAt && ` (締切 ${new Date(dueAt).toLocaleString()})`} ・ {GRADING_MODE_LABEL[gradingMode]} ・ {new Date(createdAt).toLocaleDateString()}
        </p>
        {error && <p className="text-rose-500 text-xs font-bold mt-1">{error}</p>}
      </div>
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="p-2 text-slate-400 hover:text-rose-500 transition-colors shrink-0 disabled:opacity-50"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
