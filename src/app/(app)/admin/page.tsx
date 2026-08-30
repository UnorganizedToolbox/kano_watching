export const dynamic = "force-dynamic";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
import AdminQuestionList from "./components/AdminQuestionList";
import RealtimeAdminQuestions from "./components/RealtimeAdminQuestions";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
  if (profile?.role !== 'admin') {
    redirect('/');
  }

  // Fetch all students
  const { data: students } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'student')
    .order('created_at', { ascending: false });

  // Fetch all open questions
  const { data: openQuestions } = await supabase
    .from('questions')
    .select(`
      *,
      profiles:student_uuid (name, student_id)
    `)
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  return (
    <section className="flex-1 flex flex-col gap-6 max-w-[1400px] mx-auto w-full px-6 pt-2 pb-6">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h2 className="text-2xl font-black font-title text-slate-800 dark:text-white mb-2">管理者ダッシュボード</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">生徒の学習状況と質問を管理します</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Students List */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
          <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col min-h-[500px]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">生徒一覧</h3>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="名前やIDで検索..." className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="pb-3 font-semibold">表示ID</th>
                    <th className="pb-3 font-semibold">氏名</th>
                    <th className="pb-3 font-semibold">ステータス</th>
                    <th className="pb-3 font-semibold text-right">アクション</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {students && students.length > 0 ? (
                    students.map(student => (
                      <tr key={student.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-4 text-slate-600 dark:text-slate-300 font-mono text-xs">{student.student_id}</td>
                        <td className="py-4 font-bold text-slate-800 dark:text-slate-200">{student.name}</td>
                        <td className="py-4">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                            student.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {student.status === 'active' ? 'アクティブ' : student.status}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <Link href={`/admin/student/${student.id}`} className="text-brand-600 hover:text-brand-700 dark:text-brand-400 font-semibold text-xs bg-brand-50 dark:bg-brand-900/20 px-3 py-1.5 rounded-lg transition-colors">
                            詳細を見る
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500 text-sm">生徒が登録されていません</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Q&A inbox */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
          <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-sm h-full min-h-[500px]">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-amber-50/50 dark:bg-amber-900/10 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                未回答の質問
              </h3>
              <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 px-2 py-1 rounded-lg font-bold">
                {openQuestions?.length || 0} 件
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 dark:bg-slate-900/20">
              <RealtimeAdminQuestions />
              <AdminQuestionList questions={openQuestions || []} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
