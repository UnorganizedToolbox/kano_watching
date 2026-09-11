'use client'

import { useRouter } from 'next/navigation';

export default function OrgPicker({ organizations, selectedId }: {
  organizations: { id: string; name: string }[];
  selectedId?: string;
}) {
  const router = useRouter();

  return (
    <select
      value={selectedId || ''}
      onChange={(e) => router.push(`/admin/rules?org=${e.target.value}`)}
      className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
    >
      {organizations.map(o => (
        <option key={o.id} value={o.id}>{o.name}</option>
      ))}
    </select>
  );
}
