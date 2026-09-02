const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/game/GamePortalClient.tsx', 'utf8');

// Remove import
content = content.replace(/import { unlockAchievement } from "\.\/actions";\n/, '');

// Remove handleClaim function
content = content.replace(/  const handleClaim = \(achieve: any\) => {[\s\S]*?  };\n\n/, '');

// Remove the button and replace with just "受取済み" for completed achievements
// since they are automatically claimed
content = content.replace(/\{achieve\.isCompleted \? \([\s\S]*?\) : null\}/, `{achieve.isCompleted ? (
                          <span className="text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/50">
                            達成済み
                          </span>
                        ) : null}`);

fs.writeFileSync('src/app/(app)/game/GamePortalClient.tsx', content);
