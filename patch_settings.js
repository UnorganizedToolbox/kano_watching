const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/settings/SettingsClient.tsx', 'utf8');

content = content.replace(
  /select\('avatar_seed, saved_avatars'\)/,
  `select('avatar_seed, saved_avatars, name, target_date, target_title')`
);

// Add states for name, date, title
content = content.replace(
  /const \[unlockedTitles, setUnlockedTitles\] = useState<any\[\]>\(\[\]\);/,
  `const [unlockedTitles, setUnlockedTitles] = useState<any[]>([]);
  const [name, setName] = useState('Student');
  const [targetTitle, setTargetTitle] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const handleSaveProfile = async () => {
    if (!userId) return;
    setIsSaving(true);
    setSaveMessage('');
    const { error } = await supabase.from('profiles').update({
      name,
      target_title: targetTitle,
      target_date: targetDate || null
    }).eq('id', userId);
    setIsSaving(false);
    if (!error) {
      setSaveMessage('プロフィールを保存しました。');
      setTimeout(() => setSaveMessage(''), 3000);
      window.dispatchEvent(new Event('profileUpdated'));
    }
  };`
);

// Update load logic
content = content.replace(
  /if \(profile\.avatar_seed\)/,
  `if (profile.name) setName(profile.name);
          if (profile.target_title) setTargetTitle(profile.target_title);
          if (profile.target_date) setTargetDate(profile.target_date);
          if (profile.avatar_seed)`
);

// Now the UI for Profile
content = content.replace(
  /<label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-2">ニックネーム<\/label>\s*<input type="text" defaultValue="Student"/,
  `<label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-2">ニックネーム</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)}`
);

// Add the Target Date fields to the Profile section
content = content.replace(
  /<p className="text-\[10px\] text-slate-400 mt-2">他のユーザーに公開される名前です。<\/p>\s*<\/div>/,
  `<p className="text-[10px] text-slate-400 mt-2">他のユーザーに公開される名前です。</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">目標設定</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">目標イベント名</label>
                      <input
                        type="text"
                        placeholder="例: 共通テスト"
                        value={targetTitle}
                        onChange={e => setTargetTitle(e.target.value)}
                        className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-darkbg-secondary focus:ring-2 focus:ring-brand-500 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">目標日</label>
                      <input
                        type="date"
                        value={targetDate}
                        onChange={e => setTargetDate(e.target.value)}
                        className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-darkbg-secondary focus:ring-2 focus:ring-brand-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end items-center gap-4">
                  {saveMessage && <span className="text-brand-600 text-sm font-bold">{saveMessage}</span>}
                  <button onClick={handleSaveProfile} disabled={isSaving} className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl disabled:opacity-50">
                    {isSaving ? '保存中...' : '変更を保存'}
                  </button>
                </div>`
);

fs.writeFileSync('src/app/(app)/settings/SettingsClient.tsx', content);
