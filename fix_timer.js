const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/timer/components/PomodoroTimer.tsx', 'utf8');

// Add new state for showing time
content = content.replace(/const \[breakStartTime, setBreakStartTime\] = useState<number \| null>\(null\);/, 
  "const [breakStartTime, setBreakStartTime] = useState<number | null>(null);\n  const [showTime, setShowTime] = useState(false);");

// Remove the test button
content = content.replace(/\{\/\* For testing purposes, adding a quick complete button \*\/\}\n\s*<button[\s\S]*?<\/button>/, 
  `{isRunning && <button 
    onClick={() => { setIsRunning(false); setTimeLeft(mode === 'WORK' ? WORK_TIME : BREAK_TIME); }} 
    className="flex-none px-6 py-4 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold shadow-md transition-all active:scale-95"
  >
    <i className="fa-solid fa-stop mr-2"></i> 中止
  </button>}`);

// Replace the time display with ?? unless showTime is true
content = content.replace(/\{String\(minutes\)\.padStart\(2, '0'\)\}:\{String\(seconds\)\.padStart\(2, '0'\)\}/, 
  `{(!isWork || showTime) ? \`\${String(minutes).padStart(2, '0')}:\${String(seconds).padStart(2, '0')}\` : '??:??'}`);

// Add a button to check time below the timer ring
content = content.replace(/<span className=\{cn\([\s\S]*?\{isWork \? '集中モード' : 'リラックス'\}\n          <\/span>\n        <\/div>/,
`$&
        {isWork && !showTime && isRunning && (
          <button 
            onClick={() => { setShowTime(true); setTimeout(() => setShowTime(false), 3000); }}
            className="mb-8 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-4 py-2 rounded-full hover:bg-slate-200 transition-colors"
          >
            残り時間を確認する
          </button>
        )}
        {isWork && showTime && isRunning && (
           <div className="mb-8 h-8"></div>
        )}
`);

fs.writeFileSync('src/app/(app)/timer/components/PomodoroTimer.tsx', content);
