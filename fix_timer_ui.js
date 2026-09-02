const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/timer/components/PomodoroTimer.tsx', 'utf8');

// Remove the manual Work/Break tabs
content = content.replace(/<div className="absolute top-6 left-6 flex gap-2 z-20">[\s\S]*?<\/div>\s*<div className="absolute top-6 right-6 z-20">/, 
  `<div className="absolute top-6 left-6 z-20 flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 shadow-sm">
            モード: {isWork ? '集中 (25分)' : '休憩 (5分)'}
          </span>
        </div>
        <div className="absolute top-6 right-6 z-20">`);

// Replace the time display logic (??:?? -> Lock icon when running)
content = content.replace(/\{!\(isWork \|\| showTime\) \? `\$\{String\(minutes\)\.padStart\(2, '0'\)\}:\$\{String\(seconds\)\.padStart\(2, '0'\)\}` : '\?\?:\?\?'\}/, 
  `...`);
