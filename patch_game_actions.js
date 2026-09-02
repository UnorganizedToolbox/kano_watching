const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/game/actions.ts', 'utf8');

if (!content.includes('calc_Lv_from_EXP')) {
  content = content.replace(
    /import \{ ACHIEVEMENTS_DICT \} from "@\/lib\/gamification\/achievements";/,
    `import { ACHIEVEMENTS_DICT } from "@/lib/gamification/achievements";\nimport { calc_Lv_from_EXP } from "@/lib/gamification/level";`
  );
}

const replacement = `
  const { data: profile } = await supabase
    .from('profiles')
    .select('exp, free_stones')
    .eq('id', user.id)
    .single();

  if (profile) {
    const oldLevelData = calc_Lv_from_EXP(profile.exp || 0);
    const newTotalExp = (profile.exp || 0) + baseAchievement.expReward;
    const newLevelData = calc_Lv_from_EXP(newTotalExp);
    
    oldLevel = oldLevelData.level;
    newLevel = newLevelData.level;
    leveledUp = newLevel > oldLevel;

    let currentStones = profile.free_stones || 0;
    
    if (leveledUp) {
      rewardStones = (newLevel - oldLevel) * 50;
      currentStones += rewardStones;
    }

    const { error: expError } = await supabase
      .from('profiles')
      .update({ 
        exp: newTotalExp,
        free_stones: currentStones
      })
      .eq('id', user.id);
`;

content = content.replace(
  /  const \{ data: profile \} = await supabase[\s\S]*?\.eq\('id', user\.id\);/,
  replacement
);

fs.writeFileSync('src/app/(app)/game/actions.ts', content);
