const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/game/GamePortalClient.tsx', 'utf8');
content = content.replace(/calc_Lv_from_EXP\(calc_Lv_from_EXP\(profile\?\.exp \|\| 0\)\.currentExp\)\.level/g, "calc_Lv_from_EXP(profile?.exp || 0).level");
fs.writeFileSync('src/app/(app)/game/GamePortalClient.tsx', content);
