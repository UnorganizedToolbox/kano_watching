const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/game/GamePortalClient.tsx', 'utf8');

if (!content.includes('import { calc_Lv_from_EXP }')) {
  content = content.replace(
    /import \{ Trophy, CalendarDays, Target, PartyPopper, Star \} from 'lucide-react';/,
    `import { Trophy, CalendarDays, Target, PartyPopper, Star } from 'lucide-react';\nimport { calc_Lv_from_EXP } from '@/lib/gamification/level';`
  );
}
fs.writeFileSync('src/app/(app)/game/GamePortalClient.tsx', content);
