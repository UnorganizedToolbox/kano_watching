export const dynamic = "force-dynamic";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ProblemTemplateForm from "../ProblemTemplateForm";

export default async function NewProblemTemplatePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from('profiles').select('role, organization_id').eq('id', user?.id).single();
  if (profile?.role !== 'admin' && profile?.role !== 'teacher') redirect('/');

  const isAdmin = profile.role === 'admin';

  if (!isAdmin && !profile.organization_id) {
    return (
      <section className="flex-1 flex flex-col gap-6 max-w-[900px] mx-auto w-full px-6 pt-2 pb-6">
        <p className="text-sm text-slate-500">あなたはまだ団体に所属していません。管理者にお問い合わせください。</p>
      </section>
    );
  }

  const { data: organizations } = isAdmin
    ? await supabase.from('organizations').select('id, name').order('name')
    : { data: [] };

  if (isAdmin && (!organizations || organizations.length === 0)) {
    return (
      <section className="flex-1 flex flex-col gap-6 max-w-[900px] mx-auto w-full px-6 pt-2 pb-6">
        <p className="text-sm text-slate-500">団体がまだ登録されていません。先に<Link href="/admin/organizations" className="text-brand-600 hover:underline">団体管理</Link>から作成してください。</p>
      </section>
    );
  }

  return (
    <section className="flex-1 flex flex-col gap-6 max-w-[1200px] mx-auto w-full px-6 pt-2 pb-6">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/admin/problems" className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-brand-600 hover:border-brand-300 transition-all shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-black font-title text-slate-800 dark:text-white">新規テンプレート作成</h2>
        </div>
      </div>

      <ProblemTemplateForm organizations={organizations || []} isAdmin={isAdmin} />
    </section>
  );
}
