const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/settings/SettingsClient.tsx', 'utf8');

const targetFields = `
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">目標設定</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="target_title" className="block text-xs font-semibold text-slate-500 dark:text-slate-400">目標イベント名</label>
              <input
                id="target_title"
                name="target_title"
                type="text"
                placeholder="例: 共通テスト、期末テスト"
                defaultValue={profile.target_title || ''}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="target_date" className="block text-xs font-semibold text-slate-500 dark:text-slate-400">目標日</label>
              <input
                id="target_date"
                name="target_date"
                type="date"
                defaultValue={profile.target_date ? profile.target_date.split('T')[0] : ''}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
              />
            </div>
          </div>
        </div>
`;

// Find where to insert it. Probably near "表示名 (Nickname)"
content = content.replace(
  /(<input[\s\S]*?name="name"[\s\S]*?<\/div>\s*<\/div>)/,
  `$1\n${targetFields}`
);

fs.writeFileSync('src/app/(app)/settings/SettingsClient.tsx', content);
