export const dynamic = "force-dynamic";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import GamePortalClient from "./GamePortalClient";

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

  const { data: achievements } = await supabase
    .from('student_achievements')
    .select('achievement_id')
    .eq('student_id', user.id);

  const unlockedIds = achievements?.map(a => a.achievement_id) || [];

  // デモ用の簡易統計（本来は日時でフィルタリングする）
  const { count: dailyPomoCount } = await supabase
    .from('student_activity_logs')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', user.id)
    .eq('activity_type', 'POMODORO_COMPLETED');

  const activityStats = {
    dailyPomoCount: dailyPomoCount || 0,
    weeklyPomoCount: dailyPomoCount || 0, // 今は同じ数を入れておく
  };

  return <GamePortalClient profile={profile} unlockedIds={unlockedIds} role={profile?.role} activityStats={activityStats} />;
}
