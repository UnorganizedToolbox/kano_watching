export const dynamic = "force-dynamic";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createOrganization } from "../actions";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import DeleteOrganizationButton from "../components/DeleteOrganizationButton";

export default async function OrganizationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
  if (profile?.role !== 'admin') redirect('/');

  const { data: organizations } = await supabase
    .from('organizations')
    .select('id, name, created_at, member_limit')
    .order('name');

  const { data: members } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('status', 'active')
    .in('role', ['student', 'teacher']);

  const memberCounts = new Map<string, number>();
  for (const m of members || []) {
    if (!m.organization_id) continue;
    memberCounts.set(m.organization_id, (memberCounts.get(m.organization_id) || 0) + 1);
  }

  return (
    <section className="flex-1 flex flex-col gap-6 max-w-[800px] mx-auto w-full px-6 pt-2 pb-6">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/admin" className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-brand-600 hover:border-brand-300 transition-all shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-black font-title text-slate-800 dark:text-white">団体管理</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">生徒の所属先となる団体(塾・学校等)を管理します</p>
        </div>
      </div>

      <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">新しい団体を追加</h3>
        <form action={createOrganization} className="flex gap-2">
          <input
            type="text"
            name="name"
            required
            placeholder="例: ○○塾"
            className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
          />
          <input
            type="number"
            name="member_limit"
            defaultValue={-1}
            min={-1}
            title="人数上限(-1で無制限)"
            className="w-24 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
          />
          <FormSubmitButton
            label="追加する"
            pendingLabel="追加中..."
            className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-bold"
          />
        </form>
        <p className="text-[10px] text-slate-400 mt-2">人数上限は -1 で無制限になります。</p>
      </div>

      <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">団体一覧</h3>
        {organizations && organizations.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {organizations.map(org => (
              <div key={org.id} className="py-3 flex justify-between items-center gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-slate-700 dark:text-slate-200">{org.name}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      {memberCounts.get(org.id) || 0} / {org.member_limit === -1 ? '無制限' : org.member_limit} 人
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono select-all mt-0.5">ID: {org.id}</p>
                </div>
                <DeleteOrganizationButton organizationId={org.id} organizationName={org.name} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">団体がまだ登録されていません。</p>
        )}
      </div>
    </section>
  );
}
