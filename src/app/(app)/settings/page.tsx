export default function SettingsPage() {
  return (
    <section className="flex-1 flex flex-col gap-6 max-w-[1400px] mx-auto w-full px-6 pt-4 pb-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm space-y-8 flex-1 overflow-y-auto h-[calc(100vh-10rem)] min-h-[500px] mb-4">
        
        <div>
          <h4 className="font-bold font-title border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2 text-indigo-500">アプリケーションテーマ設定</h4>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Design Skin Theme Selector */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1.5">デザインスキンテーマ</label>
              <select defaultValue="glass" className="w-full bg-white dark:bg-darkbg-secondary border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs focus:outline-none font-bold text-slate-700 dark:text-slate-200">
                <option value="glass">Glassmorphism (透過ガラス・アチーブ連動壁紙)</option>
                <option value="brutalist">Neo-Brutalism (ネオ・ブルータリズム)</option>
                <option value="clay">Claymorphism (クレイモーフィズム)</option>
                <option value="lofi">Cozy Lo-Fi (コージー・ローファイ / 勉強部屋)</option>
                <option value="aurora">Aurora Night (オーロラ・ナイト / 北欧夜空)</option>
                <option value="cafe">Café Macchiato (カフェ・マキアート / 珈琲トーン)</option>
                <option value="matcha">Matcha Zen (和風アース抹茶色)</option>
              </select>
            </div>

            {/* Light/Dark Mode Selector */}
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-2">テーマ (カラーモード)</label>
              <div className="flex gap-2 text-sm">
                <button className="flex-1 py-2 border rounded-lg bg-white dark:bg-darkbg-secondary font-bold text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <i className="fa-solid fa-desktop mr-1"></i> 自動 (OS)
                </button>
                <button className="flex-1 py-2 border border-brand-500 bg-brand-50 text-brand-700 font-bold text-center rounded-lg">
                  <i className="fa-solid fa-sun mr-1"></i> ライト
                </button>
                <button className="flex-1 py-2 border rounded-lg bg-slate-800 text-slate-200 font-bold text-center hover:bg-slate-700 transition-colors">
                  <i className="fa-solid fa-moon mr-1"></i> ダーク
                </button>
              </div>
            </div>

          </div>
        </div>

        <div>
          <h4 className="font-bold font-title border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2 text-brand-500">アンロック済み: 学習背景設定</h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 mb-4">実績バッジを獲得すると、選択できる背景が増えます。集中力を高める環境をカスタマイズしましょう。</p>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <button className="p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-darkbg-secondary hover:bg-slate-100 dark:hover:bg-slate-800 text-center font-bold">
                設定なし
              </button>
              <button className="p-2 border border-brand-500 rounded bg-brand-50 text-brand-700 text-center font-bold">
                静寂な星空 (Lv.2)
              </button>
              <button className="p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-darkbg-secondary hover:bg-slate-100 dark:hover:bg-slate-800 text-center font-bold">
                黄昏の教室 (Lv.3)
              </button>
            </div>
            
            <div className="p-4 bg-brand-50 dark:bg-brand-900/10 rounded-xl border border-brand-100 dark:border-brand-800/50 mt-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-bold text-brand-700 dark:text-brand-300"><i className="fa-solid fa-crown mr-1"></i> カスタム背景 (マスター到達特典)</span>
                <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded font-bold">未解放 (Lv.4で解放)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">実績を10個解除すると、自分の好きな画像をアップロードして背景に設定できるようになります。</p>
              <div className="flex gap-2">
                <input type="text" disabled placeholder="画像のURLを入力..." className="flex-1 px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-100 dark:bg-slate-900 cursor-not-allowed opacity-50" />
                <button disabled className="px-3 py-1.5 bg-slate-300 dark:bg-slate-700 text-white rounded-lg text-xs font-bold cursor-not-allowed opacity-50">適用</button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold font-title text-slate-800 dark:text-slate-200">アチーブメント (実績バッジ)</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">実績解除に応じて、設定画面でアンロックされる背景画像が増えていきます。</p>
          
          <div className="bg-brand-500 text-white px-6 py-4 rounded-2xl shadow-lg shadow-brand-500/20 text-center w-full sm:w-auto mt-4">
            <span className="text-xs block text-white/75">現在のレベル</span>
            <span className="text-3xl font-black font-title">Lv. 1</span>
            <span className="text-[9px] block text-white/90 mt-1">次のLv.2に必要な実績: あと 2個 (通算3個)</span>
          </div>
        </div>

      </div>
    </section>
  );
}
