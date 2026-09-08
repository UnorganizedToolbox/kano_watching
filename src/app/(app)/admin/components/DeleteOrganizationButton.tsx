'use client'

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { deleteOrganization } from '../actions';

export default function DeleteOrganizationButton({ organizationId, organizationName }: { organizationId: string; organizationName: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const handleDelete = () => {
    if (!confirm(`「${organizationName}」を削除しますか？所属している生徒の所属は解除されます。`)) return;
    setError('');
    startTransition(async () => {
      try {
        await deleteOrganization(organizationId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : '削除に失敗しました');
      }
    });
  };

  return (
    <div className="text-right">
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="text-rose-500 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 disabled:opacity-50"
        title="削除する"
      >
        <Trash2 className="w-4 h-4" />
      </button>
      {error && <p className="text-[10px] text-rose-500 mt-1">{error}</p>}
    </div>
  );
}
