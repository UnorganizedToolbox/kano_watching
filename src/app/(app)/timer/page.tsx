export const dynamic = "force-dynamic";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { askQuestion } from "./actions";
import RealtimeQuestions from "./components/RealtimeQuestions";
import PomodoroTimer from "./components/PomodoroTimer";
import QAThreadList from "./components/QAThreadList";

export default async function TimerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch open questions for this user
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('student_uuid', user.id)
    .order('created_at', { ascending: false });

  return (
    <section className="flex-1 flex flex-col gap-6 max-w-[1400px] mx-auto w-full px-6 pt-2 pb-6">
      <div className="flex-1 grid grid-cols-12 gap-6 h-[calc(100vh-10rem)] min-h-[600px]">
        {/* Left Column (Timer & Current task) */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
          <PomodoroTimer />
          <RealtimeQuestions studentId={user.id} />
        </div>

        {/* Right Column (Q&A) */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
          <div className="card-glass flex-1 bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-sm h-full max-h-[calc(100vh-10rem)]">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex justify-between items-center">
              <h4 className="font-bold font-title text-contrast text-sm">質問箱 (Q&A)</h4>
              <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded font-bold">
                {questions?.filter(q => q.status === 'open').length || 0}件 回答待ち
              </span>
            </div>
            
            <QAThreadList initialQuestions={questions || []} />
            
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-darkbg-secondary">
              <form action={askQuestion} className="flex flex-col gap-2">
                <input required type="text" name="title" placeholder="質問のタイトル (例: 青チャートP45について)" className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-900" />
                <textarea required name="body" rows={3} placeholder="質問内容を詳しく書いてください..." className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-900 resize-none"></textarea>
                
                <div className="flex items-center gap-2 mb-1">
                  <input type="file" name="image" accept="image/*" className="text-xs text-slate-500 file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-900/30 dark:file:text-brand-300 w-full" />
                </div>
                
                <button type="submit" className="w-full py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2">
                  <i className="fa-solid fa-paper-plane"></i> 質問を送信する
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
