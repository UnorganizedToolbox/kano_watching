// タブ遷移直後に即座に表示する簡易スケルトン。Next.jsのloading.tsx規約に
// 従い、各ルートのページ本体(サーバーでの認証・データ取得)が終わるまでの
// 間、白紙状態を防ぐために使う。ページごとの厳密なレイアウトには合わせず、
// 「読み込み中であること」が一目でわかる程度の汎用的な見た目にしている。
export default function PageLoadingSkeleton() {
  return (
    <section className="flex-1 flex flex-col gap-6 max-w-[1400px] mx-auto w-full px-6 pt-4 pb-6 animate-pulse">
      <div className="h-7 w-40 bg-slate-200 dark:bg-slate-800 rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-48 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800" />
        <div className="h-48 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800" />
      </div>
      <div className="h-64 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800" />
    </section>
  );
}
