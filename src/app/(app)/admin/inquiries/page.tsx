export const dynamic = "force-dynamic";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import InquiryForm from "../components/InquiryForm";
import InquiryList from "../components/InquiryList";

export default async function InquiriesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
  if (profile?.role !== 'admin' && profile?.role !== 'teacher') redirect('/');

  const isAdmin = profile.role === 'admin';

  const { data: inquiriesRaw } = await supabase
    .from('teacher_inquiries')
    .select(`
      *,
      profiles:teacher_id (name),
      organizations:organization_id (name)
    `)
    .order('created_at', { ascending: false });

  const inquiries = (inquiriesRaw || []) as unknown as Parameters<typeof InquiryList>[0]['inquiries'];

  return (
    <section className="flex-1 flex flex-col gap-6 max-w-[900px] mx-auto w-full px-6 pt-2 pb-6">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/admin" className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-brand-600 hover:border-brand-300 transition-all shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-black font-title text-slate-800 dark:text-white">{isAdmin ? '問い合わせ管理' : '問い合わせ'}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{isAdmin ? '教師からの問い合わせに返信します。' : '管理者への問い合わせを送信・確認できます。'}</p>
        </div>
      </div>

      {!isAdmin && <InquiryForm />}

      <InquiryList inquiries={inquiries} isAdmin={isAdmin} />
    </section>
  );
}
