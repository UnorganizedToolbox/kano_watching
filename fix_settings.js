const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/settings/SettingsClient.tsx', 'utf8');

// 1. Unselected tab color: text-slate-600 dark:text-slate-400 -> text-slate-400 dark:text-slate-500
// Wait, "選択されていないメニューの灰色を少し濃くして" (Make the gray of unselected menus slightly darker/stronger).
// In Tailwind, slate-600 is darker than slate-400. To make it "darker" (more contrast/visible) in light mode, it could be slate-700.
// Let's use text-slate-500 dark:text-slate-400 which is a solid gray.
content = content.replace(/text-slate-600 dark:text-slate-400/g, "text-slate-500 dark:text-slate-400");
content = content.replace(/hover:bg-slate-100 dark:hover:bg-slate-800\/50/g, "hover:bg-slate-200 dark:hover:bg-slate-700/50 hover:text-slate-700 dark:hover:text-slate-200");

// 2. Add localStorage logic to SettingsClient
const stateReplace = `const [avatarSeed, setAvatarSeed] = useState('LearnFlowUser123');
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const [savedAvatars, setSavedAvatars] = useState<string[]>(['LearnFlowUser123']);

  // Load from localStorage on mount
  useEffect(() => {
    const savedSeed = localStorage.getItem('avatarSeed');
    const savedCollection = localStorage.getItem('savedAvatars');
    if (savedSeed) setAvatarSeed(savedSeed);
    if (savedCollection) {
      try {
        setSavedAvatars(JSON.parse(savedCollection));
      } catch (e) {}
    }
  }, []);

  // Save to localStorage when changed
  useEffect(() => {
    localStorage.setItem('avatarSeed', avatarSeed);
    window.dispatchEvent(new Event('avatarChanged')); // Notify header
  }, [avatarSeed]);

  useEffect(() => {
    localStorage.setItem('savedAvatars', JSON.stringify(savedAvatars));
  }, [savedAvatars]);`;

content = content.replace(/const \[avatarSeed, setAvatarSeed\] = useState\('LearnFlowUser123'\);\n  const \[pendingAvatar, setPendingAvatar\] = useState<string \| null>\(null\);\n  const \[savedAvatars, setSavedAvatars\] = useState<string\[\]>\(\['LearnFlowUser123'\]\);/, stateReplace);

fs.writeFileSync('src/app/(app)/settings/SettingsClient.tsx', content);
