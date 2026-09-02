const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/layout.tsx', 'utf8');

if (!content.includes('calc_Lv_from_EXP')) {
  content = content.replace(
    /import \{ redirect \} from "next\/navigation";/,
    `import { redirect } from "next/navigation";\nimport { calc_Lv_from_EXP } from '@/lib/gamification/level';`
  );
}

content = content.replace(/const level = profile\?\.level \|\| 1;/, `const level = calc_Lv_from_EXP(profile?.exp || 0).level;`);

fs.writeFileSync('src/app/(app)/layout.tsx', content);
