export const dynamic = "force-dynamic";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { askQuestion } from "./actions";
import RealtimeQuestions from "./components/RealtimeQuestions";
import PomodoroTimer from "./components/PomodoroTimer";

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
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {questions && questions.length > 0 ? (
                questions.map(q => (
                  <div key={q.id} className={`border rounded-xl p-4 ${q.status === 'open' ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700' : 'bg-brand-50/50 dark:bg-brand-900/10 border-brand-100 dark:border-brand-900/50'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-xs font-bold ${q.status === 'open' ? 'text-amber-600 dark:text-amber-400' : 'text-brand-600 dark:text-brand-400'}`}>
                        {q.status === 'open' ? <><i className="fa-solid fa-hourglass-half mr-1"></i> 先生の回答待ち</> : <><i className="fa-solid fa-check mr-1"></i> 回答済み</>}
                      </span>
                      <span className="text-[10px] text-slate-400">{new Date(q.created_at).toLocaleDateString()}</span>
                    </div>
                    <h5 className="font-bold text-sm mb-1 text-slate-700 dark:text-slate-200">{q.title}</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-wrap">{q.body}</p>
                    
                    {q.image_url && (
                      <div className="mt-3 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                        {/* Using standard img for external arbitrary URLs to avoid Next.js domain config issues */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={q.image_url} alt="添付画像" className="max-w-full h-auto max-h-48 object-contain" />
                      </div>
                    )}
                    
                    {q.status === 'answered' && q.answer_body && (
                      <div className="mt-3 pt-3 border-t border-brand-100 dark:border-brand-800/50">
                        <span className="text-xs font-bold text-brand-600 dark:text-brand-400 block mb-1">先生からの回答:</span>
                        <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{q.answer_body}</p>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <p className="text-xs">まだ質問はありません。</p>
                </div>
              )}
            </div>

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
