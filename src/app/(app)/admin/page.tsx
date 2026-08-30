import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";

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
              {openQuestions && openQuestions.length > 0 ? (
                openQuestions.map(q => (
                  <div key={q.id} className="bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-700/50 rounded-xl p-4 transition-all shadow-sm cursor-pointer group">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 flex items-center justify-center text-[10px] font-bold">
                          {q.profiles?.name?.charAt(0) || 'S'}
                        </div>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{q.profiles?.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{new Date(q.created_at).toLocaleDateString()}</span>
                    </div>
                    <h5 className="font-bold text-sm mb-1 text-slate-800 dark:text-slate-100 group-hover:text-brand-600 transition-colors">{q.title}</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{q.body}</p>
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                      <button className="text-[10px] font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-3 py-1 rounded-md">
                        回答する
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400">
                  <i className="fa-solid fa-mug-hot text-3xl mb-3 text-slate-300 dark:text-slate-600"></i>
                  <p className="text-sm font-medium">現在、未回答の質問はありません。</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
