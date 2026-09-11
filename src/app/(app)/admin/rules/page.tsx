export const dynamic = "force-dynamic";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import OrgRulesForm from "../components/OrgRulesForm";
import OrgPicker from "../components/OrgPicker";

export default async function OrgRulesPage(props: { searchParams: Promise<{ org?: string }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from('profiles').select('role, organization_id').eq('id', user?.id).single();
  if (profile?.role !== 'admin' && profile?.role !== 'teacher') redirect('/');

  const header = (
    <div className="flex items-center gap-4 mb-2">
      <Link href="/admin" className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-brand-600 hover:border-brand-300 transition-all shadow-sm">
        <ArrowLeft className="w-5 h-5" />
      </Link>
      <div>
        <h2 className="text-2xl font-black font-title text-slate-800 dark:text-white">一括管理</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">団体単位で生徒の機能制限を設定します。生徒ごとの個別設定は各生徒の詳細ページから行えます。</p>
      </div>
    </div>
  );

  if (profile.role === 'teacher') {
    if (!profile.organization_id) {
      return (
        <section className="flex-1 flex flex-col gap-6 max-w-[800px] mx-auto w-full px-6 pt-2 pb-6">
          {header}
          <p className="text-sm text-slate-500">あなたはまだ団体に所属していません。管理者にお問い合わせください。</p>
        </section>
      );
    }

    const { data: org } = await supabase.from('organizations').select('id, name, rules').eq('id', profile.organization_id).single();
    if (!org) {
      return (
        <section className="flex-1 flex flex-col gap-6 max-w-[800px] mx-auto w-full px-6 pt-2 pb-6">
          {header}
          <p className="text-sm text-slate-500">所属団体の情報が見つかりませんでした。</p>
        </section>
      );
    }

    return (
      <section className="flex-1 flex flex-col gap-6 max-w-[800px] mx-auto w-full px-6 pt-2 pb-6">
        {header}
        <OrgRulesForm organizationId={org.id} organizationName={org.name} initialRules={org.rules || {}} isAdmin={false} />
      </section>
    );
  }

  // admin: 団体を選択して設定する
  const { data: organizations } = await supabase.from('organizations').select('id, name, rules').order('name');

  if (!organizations || organizations.length === 0) {
    return (
      <section className="flex-1 flex flex-col gap-6 max-w-[800px] mx-auto w-full px-6 pt-2 pb-6">
        {header}
        <p className="text-sm text-slate-500">団体がまだ登録されていません。先に<Link href="/admin/organizations" className="text-brand-600 hover:underline">団体管理</Link>から作成してください。</p>
      </section>
    );
  }

  const selectedId = searchParams.org && organizations.some(o => o.id === searchParams.org) ? searchParams.org : organizations[0].id;
  const selectedOrg = organizations.find(o => o.id === selectedId)!;

  return (
    <section className="flex-1 flex flex-col gap-6 max-w-[800px] mx-auto w-full px-6 pt-2 pb-6">
      {header}
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-slate-500">対象団体:</span>
        <OrgPicker organizations={organizations} selectedId={selectedId} />
      </div>
      <OrgRulesForm organizationId={selectedOrg.id} organizationName={selectedOrg.name} initialRules={selectedOrg.rules || {}} isAdmin={true} />
    </section>
  );
}
