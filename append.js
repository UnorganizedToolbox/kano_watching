const fs = require('fs');
const content = fs.readFileSync('src/app/(app)/timer/components/PomodoroTimer.tsx', 'utf8');

const modalCode = `
      {levelUpData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-darkbg-primary rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center relative overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-brand-500/20 to-transparent"></div>
            <div className="w-20 h-20 bg-gradient-to-tr from-brand-400 to-brand-600 rounded-full flex items-center justify-center shadow-lg shadow-brand-500/30 mb-6 relative z-10 border-4 border-white dark:border-darkbg-primary">
              <PartyPopper className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-3xl font-black font-title text-slate-800 dark:text-white mb-2 z-10">LEVEL UP!</h3>
            <div className="flex items-center gap-4 text-xl font-bold font-mono text-slate-500 mb-6 z-10">
              <span className="opacity-50 line-through">Lv.{levelUpData.oldLevel}</span>
              <i className="fa-solid fa-arrow-right text-brand-500"></i>
              <span className="text-3xl text-brand-500">Lv.{levelUpData.newLevel}</span>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 w-full mb-6 z-10">
              <p className="text-xs font-bold text-amber-600 dark:text-amber-500 mb-2">レベルアップ報酬</p>
              <div className="flex items-center justify-center gap-2 text-2xl font-black text-amber-500">
                <i className="fa-solid fa-gem"></i>
                +{levelUpData.rewardStones} <span className="text-sm">個</span>
              </div>
            </div>
            <button onClick={() => setLevelUpData(null)} className="w-full py-4 bg-slate-800 hover:bg-slate-900 dark:bg-slate-200 dark:hover:bg-white text-white dark:text-slate-900 rounded-2xl font-bold transition-all active:scale-95 z-10 shadow-lg">閉じる</button>
          </div>
        </div>
      )}
    </>
  );
}
`;

const updatedContent = content.replace(/  \);\n}$/, modalCode);
fs.writeFileSync('src/app/(app)/timer/components/PomodoroTimer.tsx', updatedContent);
