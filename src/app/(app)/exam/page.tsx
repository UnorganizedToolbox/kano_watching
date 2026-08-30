import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { submitExam } from "./actions";

export default async function ExamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <section className="flex-1 flex flex-col gap-6 max-w-[800px] mx-auto w-full px-6 pt-8 pb-16 animate-in fade-in slide-in-from-bottom-4">
      <div className="text-center mb-8">
        <span className="px-3 py-1 bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 rounded-full text-xs font-bold inline-block mb-4">実力診断テスト</span>
        <h2 className="text-3xl font-black font-title text-slate-800 dark:text-white mb-2">共通テスト形式 数学シミュレーション</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">現在の実力を測定し、AIが最適な学習方針を提案します。</p>
      </div>

      <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
        <form action={submitExam} className="flex flex-col gap-8">
          
          <div className="space-y-4">
            <h3 className="font-bold text-lg border-b border-slate-100 dark:border-slate-800 pb-2">第1問 (数と式・集合と命題) [30点]</h3>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700">
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 font-serif">
                x = (√5 + 1) / 2 のとき、x^2 - x - 1 の値を求めよ。
              </p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors">
                  <input required type="radio" name="q1" value="wrong" className="w-4 h-4 text-brand-600 focus:ring-brand-500 border-slate-300" />
                  <span>1</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors">
                  <input required type="radio" name="q1" value="correct" className="w-4 h-4 text-brand-600 focus:ring-brand-500 border-slate-300" />
                  <span>0</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors">
                  <input required type="radio" name="q1" value="wrong" className="w-4 h-4 text-brand-600 focus:ring-brand-500 border-slate-300" />
                  <span>-1</span>
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-lg border-b border-slate-100 dark:border-slate-800 pb-2">第2問 (2次関数) [30点]</h3>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700">
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 font-serif">
                関数 y = x^2 - 4x + 3 の頂点の座標を求めよ。
              </p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors">
                  <input required type="radio" name="q2" value="wrong" className="w-4 h-4 text-brand-600 focus:ring-brand-500 border-slate-300" />
                  <span>(2, 1)</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors">
                  <input required type="radio" name="q2" value="wrong" className="w-4 h-4 text-brand-600 focus:ring-brand-500 border-slate-300" />
                  <span>(-2, 15)</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors">
                  <input required type="radio" name="q2" value="correct" className="w-4 h-4 text-brand-600 focus:ring-brand-500 border-slate-300" />
                  <span>(2, -1)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-lg border-b border-slate-100 dark:border-slate-800 pb-2">第3問 (場合の数と確率) [40点]</h3>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700">
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 font-serif">
                サイコロを2回振るとき、出た目の和が7になる確率を求めよ。
              </p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors">
                  <input required type="radio" name="q3" value="wrong" className="w-4 h-4 text-brand-600 focus:ring-brand-500 border-slate-300" />
                  <span>1/12</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors">
                  <input required type="radio" name="q3" value="correct" className="w-4 h-4 text-brand-600 focus:ring-brand-500 border-slate-300" />
                  <span>1/6</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors">
                  <input required type="radio" name="q3" value="wrong" className="w-4 h-4 text-brand-600 focus:ring-brand-500 border-slate-300" />
                  <span>1/36</span>
                </label>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
            <button type="submit" className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-bold font-title text-lg shadow-md shadow-brand-500/20 transition-all active:scale-95 flex items-center justify-center gap-2">
              <i className="fa-solid fa-file-signature"></i>
              回答を提出してAI診断を受ける
            </button>
            <p className="text-center text-xs text-slate-400 mt-4">※提出すると結果がダッシュボードに反映され、AIによる学習提案が生成されます。</p>
          </div>
        </form>
      </div>
    </section>
  );
}
