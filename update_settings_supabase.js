const fs = require('fs');

let content = fs.readFileSync('src/app/(app)/settings/SettingsClient.tsx', 'utf8');

// Add Supabase import
content = content.replace(/import ProceduralAvatar from "\.\.\/components\/ProceduralAvatar";\nimport { Lock/,
  `import ProceduralAvatar from "../components/ProceduralAvatar";\nimport { createClient } from "@/utils/supabase/client";\nimport { Lock`);

// Replace the localStorage logic with Supabase logic
const supabaseLogic = `  const supabase = createClient();
  const [avatarSeed, setAvatarSeed] = useState('LearnFlowUser123');
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const [savedAvatars, setSavedAvatars] = useState<string[]>(['LearnFlowUser123']);
  const [userId, setUserId] = useState<string | null>(null);

  // Load from Supabase on mount
  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase.from('profiles').select('avatar_seed, saved_avatars').eq('id', user.id).single();
        if (profile) {
          if (profile.avatar_seed) setAvatarSeed(profile.avatar_seed);
          if (profile.saved_avatars && profile.saved_avatars.length > 0) setSavedAvatars(profile.saved_avatars);
        }
      }
    }
    loadProfile();
  }, [supabase]);

  // Save changes to Supabase
  const updateAvatarInDB = async (seed: string, collection: string[]) => {
    if (!userId) return;
    await supabase.from('profiles').update({
      avatar_seed: seed,
      saved_avatars: collection
    }).eq('id', userId);
    
    // Fallback local storage for instantaneous cross-tab updates without realtime
    localStorage.setItem('avatarSeed', seed);
    window.dispatchEvent(new Event('avatarChanged'));
  };

  const handleSetAvatar = (seed: string) => {
    setAvatarSeed(seed);
    updateAvatarInDB(seed, savedAvatars);
  };

  const handleSaveCollection = (seed: string, newCollection: string[]) => {
    setSavedAvatars(newCollection);
    setAvatarSeed(seed);
    updateAvatarInDB(seed, newCollection);
  };
`;

const regex = /const \[avatarSeed, setAvatarSeed\] = useState\([\s\S]*?\}, \[savedAvatars\]\);/g;
content = content.replace(regex, supabaseLogic);

// Replace onClick handlers to use the new handlers
// 1. New pending avatar addition
content = content.replace(/setSavedAvatars\(\[\.\.\.savedAvatars, pendingAvatar\]\);\n\s*setAvatarSeed\(pendingAvatar\);/g,
  `handleSaveCollection(pendingAvatar, [...savedAvatars, pendingAvatar]);`);

// 2. Replacing an avatar
content = content.replace(/const newArr = \[\.\.\.savedAvatars\];\n\s*newArr\[i\] = pendingAvatar;\n\s*setSavedAvatars\(newArr\);\n\s*setAvatarSeed\(pendingAvatar\);/g,
  `const newArr = [...savedAvatars];\n                                newArr[i] = pendingAvatar;\n                                handleSaveCollection(pendingAvatar, newArr);`);

// 3. Selecting an avatar from collection
content = content.replace(/} else {\n\s*setAvatarSeed\(seed\);\n\s*}/g,
  `} else {\n                                handleSetAvatar(seed);\n                              }`);

fs.writeFileSync('src/app/(app)/settings/SettingsClient.tsx', content);
