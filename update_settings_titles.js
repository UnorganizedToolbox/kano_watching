const fs = require('fs');

let content = fs.readFileSync('src/app/(app)/settings/SettingsClient.tsx', 'utf8');

// Add state for titles
content = content.replace(
  /const \[savedAvatars, setSavedAvatars\] = useState<string\[\]>\(\['LearnFlowUser123'\]\);\n  const \[userId, setUserId\] = useState<string \| null>\(null\);/,
  `const [savedAvatars, setSavedAvatars] = useState<string[]>(['LearnFlowUser123']);
  const [userId, setUserId] = useState<string | null>(null);
  const [unlockedTitles, setUnlockedTitles] = useState<any[]>([]);`
);

// Add import for ACHIEVEMENTS_DICT if it doesn't exist
if (!content.includes('ACHIEVEMENTS_DICT')) {
  content = content.replace(
    /import \{ Lock, Settings2/,
    `import { ACHIEVEMENTS_DICT } from "@/lib/gamification/achievements";\nimport { Lock, Settings2`
  );
}

// Update the loadProfile function
content = content.replace(
  /if \(profile\.saved_avatars && profile\.saved_avatars\.length > 0\) setSavedAvatars\(profile\.saved_avatars\);\n\s*}\n\s*}/,
  `if (profile.saved_avatars && profile.saved_avatars.length > 0) setSavedAvatars(profile.saved_avatars);
        }
        
        // Fetch achievements for titles
        const { data: achieves } = await supabase.from('student_achievements').select('achievement_id').eq('student_id', user.id);
        if (achieves) {
          const ids = achieves.map(a => a.achievement_id);
          const titles = Object.values(ACHIEVEMENTS_DICT).filter(a => ids.includes(a.id) && (a.category === 'GENERAL' || a.category === 'EVENT'));
          setUnlockedTitles(titles);
        }
      }`
);

// Update the select options
const newSelect = `<select className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-darkbg-secondary focus:ring-2 focus:ring-brand-500 outline-none font-bold text-brand-700 dark:text-brand-400">
                    <option value="">(称号なし)</option>
                    {unlockedTitles.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                    {unlockedTitles.length === 0 && <option value="empty" disabled>称号を獲得していません</option>}
                  </select>`;
                  
content = content.replace(
  /<select className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-darkbg-secondary focus:ring-2 focus:ring-brand-500 outline-none font-bold text-brand-700 dark:text-brand-400">[\s\S]*?<\/select>/,
  newSelect
);

fs.writeFileSync('src/app/(app)/settings/SettingsClient.tsx', content);
