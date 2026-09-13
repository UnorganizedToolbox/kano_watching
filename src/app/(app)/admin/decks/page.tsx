export const dynamic = "force-dynamic";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Send } from "lucide-react";

export default async function DecksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
  if (profile?.role !== 'admin' && profile?.role !== 'teacher') redirect('/');

  const { data: decks } = await supabase
    .from('problem_decks')
    .select('id, title, created_at, organizations:organization_id (name)')
    .eq('is_implicit', false)
    .order('created_at', { ascending: false });

  return (
    <section className="flex-1 flex flex-col gap-6 max-w-[900px] mx-auto w-full px-6 pt-2 pb-6">
      <div className="flex items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-4">
          <Link href="/admin/problems" className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-brand-600 hover:border-brand-300 transition-all shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-2xl font-black font-title text-slate-800 dark:text-white">デッキ管理</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">複数の問題テンプレート・サブデッキを束ねて配信単位を作ります。</p>
          </div>
        </div>
        <Link href="/admin/decks/new" className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl transition-colors shrink-0">
          <Plus className="w-4 h-4" /> 新規作成
        </Link>
      </div>

      <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
        {decks && decks.length > 0 ? (
          decks.map((d) => (
            <div key={d.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors gap-4">
              <Link href={`/admin/decks/${d.id}/edit`} className="min-w-0 flex-1">
                <p className="font-bold text-sm text-slate-700 dark:text-slate-200 truncate">{d.title}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {(d.organizations as unknown as { name: string } | null)?.name || '団体未設定'} ・ {new Date(d.created_at).toLocaleDateString()}
                </p>
              </Link>
              <div className="flex items-center gap-4 shrink-0">
                <Link href={`/admin/decks/${d.id}/deliver`} className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 font-bold transition-colors">
                  <Send className="w-3.5 h-3.5" /> 配信
                </Link>
                <Link href={`/admin/decks/${d.id}/edit`} className="text-xs text-brand-600 dark:text-brand-400 font-bold">編集 →</Link>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-400 px-6 py-12 text-center">まだデッキがありません。「新規作成」から作成してください。</p>
        )}
      </div>
    </section>
  );
}
