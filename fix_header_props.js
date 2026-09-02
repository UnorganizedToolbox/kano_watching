const fs = require('fs');

// 1. Update layout.tsx
let layout = fs.readFileSync('src/app/(app)/layout.tsx', 'utf8');
layout = layout.replace(/const exp = profile\?\.exp \|\| 0;/,
  `const exp = profile?.exp || 0;\n  const avatarSeed = profile?.avatar_seed || 'LearnFlowUser123';`);
layout = layout.replace(/<HeaderDropdown name={name} role={role} \/>/,
  `<HeaderDropdown name={name} role={role} initialAvatarSeed={avatarSeed} />`);
fs.writeFileSync('src/app/(app)/layout.tsx', layout);

// 2. Update HeaderDropdown.tsx
let header = fs.readFileSync('src/app/(app)/components/HeaderDropdown.tsx', 'utf8');
header = header.replace(/export default function HeaderDropdown\(\{ name, role \}: \{ name: string, role: string \}\) \{/,
  `export default function HeaderDropdown({ name, role, initialAvatarSeed }: { name: string, role: string, initialAvatarSeed?: string }) {`);

// Update the useEffect in HeaderDropdown to use initialAvatarSeed
header = header.replace(/const loadSeed = \(\) => \{\n\s*const seed = localStorage.getItem\('avatarSeed'\);\n\s*if \(seed\) setAvatarSeed\(seed\);\n\s*\};/,
  `const loadSeed = () => {
      const seed = localStorage.getItem('avatarSeed');
      if (seed) setAvatarSeed(seed);
    };`);
header = header.replace(/const \[avatarSeed, setAvatarSeed\] = useState<string \| null>\(null\);/,
  `const [avatarSeed, setAvatarSeed] = useState<string | null>(initialAvatarSeed || null);`);

fs.writeFileSync('src/app/(app)/components/HeaderDropdown.tsx', header);
