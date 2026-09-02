const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/game/GamePortalClient.tsx', 'utf8');

// The getProgress function needs to use weeklyPomoCount
content = content.replace(
  /case 'WEEKLY_7_POMO':\n\s*return activityStats\?.dailyPomoCount \|\| 0;/,
  `case 'WEEKLY_7_POMO':\n        return activityStats?.weeklyPomoCount || 0;`
);

// We need to change the isCompleted check.
// `let isCompleted = currentProgress >= targetProgress;` 
// should just use the rewarded array, or if currentProgress >= targetProgress, we consider it completed?
// Actually if they hit the target, it's completed. But `isRewardClaimed` should be checked against `rewardedToday` / `rewardedThisWeek`.
content = content.replace(
  /const isUnlockedInDb = unlockedIds\.includes\(achieve\.id\);/,
  `const isUnlockedInDb = achieve.category === 'DAILY' ? activityStats?.rewardedToday?.includes(achieve.id) : activityStats?.rewardedThisWeek?.includes(achieve.id);`
);

// wait, there are two instances of `isUnlockedInDb = unlockedIds.includes`
// I will just replace `unlockedIds.includes(achieve.id)` directly.
content = content.replace(
  /unlockedIds\.includes\(achieve\.id\)/g,
  `(achieve.category === 'DAILY' ? activityStats?.rewardedToday?.includes(achieve.id) : activityStats?.rewardedThisWeek?.includes(achieve.id))`
);

fs.writeFileSync('src/app/(app)/game/GamePortalClient.tsx', content);
