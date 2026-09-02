const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/components/HeaderDropdown.tsx', 'utf8');

content = content.replace(/import \{ useState, useRef, useEffect \} from "react";/, 
`import { useState, useRef, useEffect } from "react";
import ProceduralAvatar from "./ProceduralAvatar";`);

const avatarHook = `  const [avatarSeed, setAvatarSeed] = useState<string | null>(null);

  useEffect(() => {
    // Load initial
    const loadSeed = () => {
      const seed = localStorage.getItem('avatarSeed');
      if (seed) setAvatarSeed(seed);
    };
    loadSeed();

    // Listen for changes from Settings page
    window.addEventListener('avatarChanged', loadSeed);
    return () => window.removeEventListener('avatarChanged', loadSeed);
  }, []);`;

content = content.replace(/  const router = useRouter\(\);/, `  const router = useRouter();\n\n${avatarHook}`);

content = content.replace(/<CircleUserRound className="w-8 h-8 text-slate-400" \/>/, 
  `{avatarSeed ? (
          <div className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0">
            <ProceduralAvatar seed={avatarSeed} />
          </div>
        ) : (
          <CircleUserRound className="w-8 h-8 text-slate-400" />
        )}`);

fs.writeFileSync('src/app/(app)/components/HeaderDropdown.tsx', content);
