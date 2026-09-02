const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/components/HeaderDropdown.tsx', 'utf8');

const badBlock = `<button 
            onClick={() => { setIsOpen(false); router.push('/achievements'); }} 
            className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
          >
            <Users className="w-4 h-4 text-slate-400" /> フレンド管理
          </button>`;

const goodBlock = `<button 
            onClick={() => { setIsOpen(false); alert('未実装です'); }} 
            className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
          >
            <Users className="w-4 h-4 text-slate-400" /> フレンド管理
          </button>`;

content = content.replace(badBlock, goodBlock);
fs.writeFileSync('src/app/(app)/components/HeaderDropdown.tsx', content);
