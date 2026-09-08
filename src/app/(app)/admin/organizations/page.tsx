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
    .select('id, name, created_at')
    .order('name');

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
          <FormSubmitButton
            label="追加する"
            pendingLabel="追加中..."
            className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-bold"
          />
        </form>
      </div>

      <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">団体一覧</h3>
        {organizations && organizations.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {organizations.map(org => (
              <div key={org.id} className="py-3 flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm text-slate-700 dark:text-slate-200">{org.name}</p>
                  <p className="text-[10px] text-slate-400">登録日: {new Date(org.created_at).toLocaleDateString()}</p>
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
