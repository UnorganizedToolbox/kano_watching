export const dynamic = "force-dynamic";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import GamePortalClient from "./GamePortalClient";
import { resolveEffectiveRules, type RuleMap, type OrgRuleMap } from "@/lib/rules";

export default async function GamePortalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  let orgRules: OrgRuleMap = {};
  if (profile?.organization_id) {
    const { data: org } = await supabase.from('organizations').select('rules').eq('id', profile.organization_id).single();
    orgRules = (org?.rules as OrgRuleMap) || {};
  }
  const effectiveRules = resolveEffectiveRules(orgRules, profile?.rule_overrides as RuleMap);
  if (effectiveRules.disable_gamification) {
    redirect('/');
  }

  const { data: achievements } = await supabase
    .from('student_achievements')
    .select('achievement_id')
    .eq('student_id', user.id);

  const unlockedIds = achievements?.map(a => a.achievement_id) || [];

  
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


  return <GamePortalClient profile={profile} unlockedIds={unlockedIds} activityStats={activityStats} />;
}
