export const dynamic = "force-dynamic";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import DeliveryForm from "./DeliveryForm";

export default async function DeliverProblemPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from('profiles').select('role, organization_id').eq('id', user?.id).single();
  if (profile?.role !== 'admin' && profile?.role !== 'teacher') redirect('/');

  const { data: template, error } = await supabase
    .from('problem_templates')
    .select('id, title, organization_id')
    .eq('id', id)
    .single();

  if (error || !template) {
    return (
      <div className="p-8 text-center text-slate-500">
        テンプレートが見つかりませんでした。<br />
        <Link href="/admin/problems" className="text-brand-600 hover:underline mt-4 inline-block">戻る</Link>
      </div>
    );
  }

  const { data: students } = await supabase
    .from('profiles')
    .select('id, name, student_id')
    .eq('organization_id', template.organization_id)
    .eq('role', 'student')
    .eq('status', 'active')
    .order('name');

  return (
    <section className="flex-1 flex flex-col gap-6 max-w-[700px] mx-auto w-full px-6 pt-2 pb-6">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/admin/problems" className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-brand-600 hover:border-brand-300 transition-all shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-black font-title text-slate-800 dark:text-white">配信設定</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">「{template.title}」を配信します。</p>
        </div>
      </div>

      <DeliveryForm target={{ kind: 'template', id: template.id }} students={students || []} isAdmin={profile.role === 'admin'} />
    </section>
  );
}
