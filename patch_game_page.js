const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/game/page.tsx', 'utf8');

const newStats = `
  // Get Dates
  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const startOfWeekDate = new Date(now.setDate(diff));
  const startOfWeekStr = startOfWeekDate.toISOString().split('T')[0];

  // Daily Pomo Count
  const { count: dailyPomoCount } = await supabase
    .from('student_activity_logs')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', user.id)
    .eq('activity_type', 'POMODORO_COMPLETED')
    .eq('activity_date', todayStr);

  // Weekly Pomo Count
  const { count: weeklyPomoCount } = await supabase
    .from('student_activity_logs')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', user.id)
    .eq('activity_type', 'POMODORO_COMPLETED')
    .gte('activity_date', startOfWeekStr);

  // Get rewarded missions
  const { data: rewardedData } = await supabase
    .from('student_activity_logs')
    .select('metadata, activity_date')
    .eq('student_id', user.id)
    .eq('activity_type', 'MISSION_REWARDED')
    .gte('activity_date', startOfWeekStr);

  const rewardedToday = rewardedData?.filter(r => r.activity_date === todayStr).map(r => r.metadata?.mission_id) || [];
  const rewardedThisWeek = rewardedData?.map(r => r.metadata?.mission_id) || [];

  const activityStats = {
    dailyPomoCount: dailyPomoCount || 0,
    weeklyPomoCount: weeklyPomoCount || 0,
    rewardedToday,
    rewardedThisWeek
  };
`;

content = content.replace(/\/\/ デモ用の簡易統計（本来は日時でフィルタリングする）[\s\S]*?weeklyPomoCount: dailyPomoCount \|\| 0, \/\/ 今は同じ数を入れておく\n\s*\};/, newStats);
fs.writeFileSync('src/app/(app)/game/page.tsx', content);
