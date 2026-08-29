import { cn } from "@/lib/utils";

export default function DashboardPage() {
  return (
    <section className="flex-1 flex flex-col gap-6 max-w-[1400px] mx-auto w-full px-6 pt-2 pb-6">
      {/* Nickname sector */}
      <div className="flex justify-end items-center gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">ニックネーム:</span>
          <input type="text" defaultValue="タロウ" className="bg-white dark:bg-darkbg-secondary border border-slate-300 dark:border-slate-700 px-3 py-1 rounded-lg text-xs w-36 focus:outline-none" />
          <button className="px-3 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold font-title">更新</button>
        </div>
      </div>

      {/* Height responsive grid */}
      <div className="flex-1 grid grid-cols-12 gap-6 items-stretch h-[calc(100vh-12rem)] min-h-[620px] mb-4">
        
        {/* Left Column (8-cols wide) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 justify-between h-full">
          {/* Countdown */}
          <div className="bg-gradient-to-r from-indigo-600 to-brand-500 text-white rounded-2xl p-6 shadow-md flex justify-between items-center shrink-0">
            <div>
              <span className="text-[10px] font-bold bg-white/20 px-2.5 py-1 rounded-full tracking-wider">本番判定シミュレータ</span>
              <h3 className="text-lg font-bold mt-1 font-title">合格予測軌跡との乖離</h3>
              <p className="text-xs text-white/80">目標合格レベルまであと 4 コマ/週 の学習追加が必要です</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] block text-white/80 font-bold">共通テストまで</span>
              <span className="text-3xl font-black font-title">138 日</span>
            </div>
          </div>

          {/* Big Chart */}
          <div className="card-glass flex-1 bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-[52%] min-h-[300px]">
            <h4 className="font-bold font-title mb-1 text-contrast text-sm">合格着地推移シミュレーション</h4>
            <div className="flex-1 relative w-full h-full bg-slate-100 dark:bg-slate-800/50 rounded-lg flex items-center justify-center">
              <span className="text-slate-400">Chart Placeholder</span>
            </div>
          </div>

          {/* Stats Analytics cards row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 shrink-0">
            <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm hover:border-brand-500 cursor-pointer transition-all">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-medium">得点のブレ幅 (標準偏差 σ)</span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-contrast">σ = 8.4</span>
                <span className="text-xs text-emerald-500 font-bold"><i className="fa-solid fa-arrow-trend-down"></i> 安定化傾向</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">クリックで詳細分析を表示</p>
            </div>

            <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm hover:border-brand-500 cursor-pointer transition-all">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-medium">科目間遷移確率 (マルコフモデル)</span>
              </div>
              <div className="mt-1">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">数I ➔ 休憩: 55% | 英語: 30%</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">無意識の逃避パターンを検知</p>
            </div>
          </div>
        </div>

        {/* Right Column (4-cols wide) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 justify-between h-full">
          {/* Diagnostic Stats */}
          <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm shrink-0">
            <h4 className="font-bold font-title mb-4 text-contrast text-sm">最新の診断結果 (数IA)</h4>
            <div className="flex items-end gap-2 mb-4">
              <span className="text-4xl font-black text-brand-600 dark:text-brand-400">76</span>
              <span className="text-sm text-slate-500 dark:text-slate-400 mb-1">/ 100 pt</span>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">数と式</span>
                  <span className="text-emerald-500 font-bold">100%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">2次関数</span>
                  <span className="text-brand-500 font-bold">75%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                  <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: '75%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">図形と計量</span>
                  <span className="text-rose-500 font-bold">40%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                  <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: '40%' }}></div>
                </div>
              </div>
            </div>
            <button className="w-full mt-5 py-2 bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400 rounded-xl text-xs font-bold hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors">
              詳細レポートを見る
            </button>
          </div>

          {/* AI Advice - Flex 1 to take remaining height */}
          <div className="card-glass flex-1 bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col min-h-[250px]">
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <i className="fa-solid fa-robot text-brand-500"></i>
              <h4 className="font-bold font-title text-contrast text-sm">AI 学習ナビゲーター</h4>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex-1 overflow-y-auto">
              <p className="mb-2">タロウさん、お疲れ様です。</p>
              <p className="mb-2">直近のデータでは、「図形と計量」の正答率が停滞しています。特に正弦定理・余弦定理の複合問題での失点が目立ちます。</p>
              <p>今日のポモドーロセッションでは、まず基礎レベルの図形問題から着手し、成功体験を積むことを推奨します。</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
