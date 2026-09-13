export const dynamic = "force-dynamic";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PlaygroundClient from "./PlaygroundClient";

export default async function PlaygroundPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
  if (profile?.role !== 'admin') redirect('/admin');

  return (
    <section className="flex-1 flex flex-col gap-6 max-w-[1200px] mx-auto w-full px-6 pt-2 pb-6">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/admin" className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-brand-600 hover:border-brand-300 transition-all shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-black font-title text-slate-800 dark:text-white">Typst Playground</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">CBT問題作成機能の検証用ツール。Typstソースを入力してレンダリング結果を確認できます(管理者限定)。</p>
        </div>
      </div>

      <PlaygroundClient />
    </section>
  );
}
