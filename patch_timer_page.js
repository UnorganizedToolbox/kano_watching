const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/timer/page.tsx', 'utf8');

content = content.replace(
  /import PomodoroTimer from "\.\/components\/PomodoroTimer";/,
  `import PomodoroTimer from "./components/PomodoroTimer";\nimport QAThreadList from "./components/QAThreadList";`
);

const oldListRegex = /<div className="flex-1 overflow-y-auto p-4 space-y-4">[\s\S]*?<\/form>\s*<\/div>/;

const newList = `<QAThreadList initialQuestions={questions || []} />
            
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
            </div>`;

content = content.replace(oldListRegex, newList);

fs.writeFileSync('src/app/(app)/timer/page.tsx', content);
