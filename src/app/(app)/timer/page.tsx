import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { askQuestion } from "./actions";

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
          {/* Timer Card */}
          <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center shadow-lg relative overflow-hidden flex-1 min-h-[400px]">
            <div className="absolute top-6 left-6 flex gap-2">
              <span className="px-3 py-1 bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 rounded-lg text-xs font-bold">ポモドーロ</span>
            </div>
            
            <div className="w-64 h-64 rounded-full border-8 border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center relative mb-8">
              <span className="text-6xl font-black font-title tracking-tighter text-contrast z-10">25:00</span>
              <span className="text-sm font-bold text-slate-400 mt-2 z-10">集中モード</span>
            </div>

            <div className="flex gap-4 w-full max-w-sm">
              <button className="flex-1 py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-bold font-title text-lg shadow-md shadow-brand-500/20 transition-all active:scale-95">
                <i className="fa-solid fa-play mr-2"></i> 開始
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-4 text-center">※現在タイマー機能はモックUIです。<br/>まずは隣の質問箱機能をお試しください。</p>
          </div>
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
