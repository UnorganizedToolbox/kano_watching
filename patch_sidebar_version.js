const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/components/Sidebar.tsx', 'utf8');

content = content.replace(
  /<span className="text-\[10px\] text-slate-300 dark:text-slate-700 font-mono font-bold">v0.2.0<\/span>/,
  `<span className="text-[10px] text-slate-300 dark:text-slate-700 font-mono font-bold">v0.0.2.0</span>`
);

fs.writeFileSync('src/app/(app)/components/Sidebar.tsx', content);
