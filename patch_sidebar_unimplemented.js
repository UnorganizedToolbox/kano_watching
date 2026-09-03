const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/components/Sidebar.tsx', 'utf8');

// Replace alerts and add badges
// Actually, let's just add the badge visually.
const badge = `<span className="ml-auto text-[8px] bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-bold">未実装</span>`;

// Replace Admin ones
content = content.replace(/<span>保護者・メンター連携<\/span>/, `<span>保護者・メンター連携</span>\n              ${badge}`);
content = content.replace(/<span>CBT問題作成・配信<\/span>/, `<span>CBT問題作成・配信</span>\n              ${badge}`);
content = content.replace(/<span>管理者デバッグパネル<\/span>/, `<span>管理者デバッグパネル</span>\n              ${badge}`);

// Also there might be Student ones that are not implemented?
// "目標設定" (Goal Setting)? Let's check what's there.
// Add version number
content = content.replace(
  /<\/div>\n    <\/div>/,
  `  <div className="px-4 py-2 text-right">\n          <span className="text-[10px] text-slate-300 dark:text-slate-700 font-mono font-bold">v0.2.0</span>\n        </div>\n      </div>\n    </div>`
);

fs.writeFileSync('src/app/(app)/components/Sidebar.tsx', content);
