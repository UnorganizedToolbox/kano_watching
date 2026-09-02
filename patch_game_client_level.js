const fs = require('fs');

let content = fs.readFileSync('src/app/(app)/game/GamePortalClient.tsx', 'utf8');

// Add import
if (!content.includes('calc_Lv_from_EXP')) {
  content = content.replace(
    /import \{ Trophy, CalendarDays, Target, PartyPopper, Star \} from 'lucide-react';/,
    `import { Trophy, CalendarDays, Target, PartyPopper, Star } from 'lucide-react';\nimport { calc_Lv_from_EXP } from '@/lib/gamification/level';`
  );
}

// Replace level references
content = content.replace(/profile\?\.level \|\| 1/g, `calc_Lv_from_EXP(profile?.exp || 0).level`);
content = content.replace(/profile\?\.exp \|\| 0/g, `calc_Lv_from_EXP(profile?.exp || 0).currentExp`);

fs.writeFileSync('src/app/(app)/game/GamePortalClient.tsx', content);
