const fs = require('fs');

let content = fs.readFileSync('src/app/(app)/settings/SettingsClient.tsx', 'utf8');

// The block to replace:
// from {!pendingAvatar ? ( to ) : (
// Let's replace the amber styling with sleek brand/slate styling

content = content.replace(
  /<div className="p-4 bg-amber-50 dark:bg-amber-900\/10 border border-amber-200 dark:border-amber-800\/50 rounded-xl flex items-center justify-between gap-4 flex-wrap">/,
  `<div className="p-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-4 flex-wrap shadow-sm">`
);

content = content.replace(
  /<p className="text-sm font-bold text-amber-700 dark:text-amber-500 mb-1">🎲 アバター生成ガチャ<\/p>/,
  `<p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-2"><Sparkles className="w-4 h-4 text-brand-500" /> デザインジェネレーター</p>`
);

content = content.replace(
  /<p className="text-\[10px\] text-amber-600\/80 dark:text-amber-400\/80">新しいデザインを生成してコレクションに追加します。<\/p>/,
  `<p className="text-[10px] text-slate-500 dark:text-slate-400">数学的アルゴリズムを用いて、世界に一つだけのアートワークを生成します。</p>`
);

content = content.replace(
  /<button\s+onClick=\{[\s\S]*?\}\s+className="px-6 py-3 bg-white dark:bg-slate-800 border-2 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900\/50 text-amber-700 dark:text-amber-400 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-2 active:scale-95"\>\s*<i className="fa-solid fa-gem text-amber-400"><\/i> 無償石 50個 で引く\s*<\/button>/,
  `<button 
                          onClick={() => {
                            const newSeed = Math.random().toString(36).substring(7);
                            setPendingAvatar(newSeed);
                          }} 
                          className="px-6 py-3 bg-slate-800 hover:bg-slate-900 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-bold transition-all shadow-md flex items-center gap-2 active:scale-95"
                        >
                          <i className="fa-solid fa-gem text-brand-400 dark:text-brand-600"></i> 無償石 50個で生成
                        </button>`
);

fs.writeFileSync('src/app/(app)/settings/SettingsClient.tsx', content);
