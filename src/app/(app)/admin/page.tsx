export const dynamic = "force-dynamic";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2 } from "lucide-react";
import RealtimeAdminQuestions from "./components/RealtimeAdminQuestions";
import SystemConfigToggle from "./components/SystemConfigToggle";
import StudentListClient from "./components/StudentListClient";
import AdminQAManager from "./components/AdminQAManager";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
  if (profile?.role !== 'admin' && profile?.role !== 'teacher') {
    redirect('/');
  }

  // Fetch all students
  const { data: students } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'student')
    .order('created_at', { ascending: false });

  // Fetch questions (all statuses, for the Q&A management view)
  const { data: allQuestions } = await supabase
    .from('questions')
    .select(`
      *,
      profiles:student_uuid (name, student_id)
    `)
    .order('created_at', { ascending: false })
    .limit(300);

  const openCount = allQuestions?.filter(q => q.status === 'open').length || 0;

  return (
    <section className="flex-1 flex flex-col gap-6 max-w-[1400px] mx-auto w-full px-6 pt-2 pb-6">
      <div className="flex justify-between items-end mb-4">
        <div className="flex items-center gap-3">
          <SystemConfigToggle />
          {profile?.role === 'admin' && (
            <Link
              href="/admin/organizations"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-colors"
            >
              <Building2 className="w-4 h-4" />
              団体管理
            </Link>
          )}
        </div>
        <div>
          <h2 className="text-2xl font-black font-title text-slate-800 dark:text-white mb-2">管理者ダッシュボード</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">生徒の学習状況と質問を管理します</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Students List */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
          <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col min-h-[500px]">
            <StudentListClient students={students || []} />
          </div>
        </div>

        {/* Right Column: Q&A management */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
          <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-sm h-full min-h-[500px]">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-amber-50/50 dark:bg-amber-900/10 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                Q&A管理
              </h3>
              <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 px-2 py-1 rounded-lg font-bold">
                未回答 {openCount} 件
              </span>
            </div>
            <RealtimeAdminQuestions />
            <AdminQAManager questions={allQuestions || []} />
          </div>
        </div>
      </div>
    </section>
  );
}
