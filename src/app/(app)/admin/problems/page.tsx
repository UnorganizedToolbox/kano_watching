export const dynamic = "force-dynamic";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";

export default async function ProblemTemplatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
  if (profile?.role !== 'admin' && profile?.role !== 'teacher') redirect('/');

  const { data: templates } = await supabase
    .from('problem_templates')
    .select('id, title, created_at, organizations:organization_id (name)')
    .order('created_at', { ascending: false });

  return (
    <section className="flex-1 flex flex-col gap-6 max-w-[900px] mx-auto w-full px-6 pt-2 pb-6">
      <div className="flex items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-brand-600 hover:border-brand-300 transition-all shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-2xl font-black font-title text-slate-800 dark:text-white">CBT問題テンプレート</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">変数を使った問題テンプレートを作成・管理します。</p>
          </div>
        </div>
        <Link href="/admin/problems/new" className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl transition-colors shrink-0">
          <Plus className="w-4 h-4" /> 新規作成
        </Link>
      </div>

      <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
        {templates && templates.length > 0 ? (
          templates.map((t) => (
            <Link
              key={t.id}
              href={`/admin/problems/${t.id}/edit`}
              className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div>
                <p className="font-bold text-sm text-slate-700 dark:text-slate-200">{t.title}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {(t.organizations as unknown as { name: string } | null)?.name || '団体未設定'} ・ {new Date(t.created_at).toLocaleDateString()}
                </p>
              </div>
              <span className="text-xs text-brand-600 dark:text-brand-400 font-bold">編集 →</span>
            </Link>
          ))
        ) : (
          <p className="text-sm text-slate-400 px-6 py-12 text-center">まだテンプレートがありません。「新規作成」から作成してください。</p>
        )}
      </div>
    </section>
  );
}
