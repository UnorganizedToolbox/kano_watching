export default function GamePortalPage() {
  return (
    <section className="flex-1 flex flex-col gap-6 max-w-[1400px] mx-auto w-full px-6 pt-4 pb-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-end justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-3xl font-black font-title tracking-tight text-slate-800 dark:text-white">
            Game Portal <span className="text-brand-500">ゲームウィンドウ</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            獲得した石やEXPを使って、報酬と交換しましょう。
          </p>
        </div>
      </div>

      <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <i className="fa-solid fa-gamepad text-6xl text-brand-500/50 mb-4 block"></i>
          <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">ただいま準備中...</h3>
          <p className="text-sm text-slate-500">
            ここにガチャや実績一覧、特別なエンドコンテンツなどを配置する予定です。<br />
            まずは勉強してEXPを貯めておきましょう！
          </p>
        </div>
      </div>
    </section>
  );
}
