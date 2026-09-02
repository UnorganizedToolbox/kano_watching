export const dynamic = "force-dynamic";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import AchievementsClient from "./AchievementsClient";

export default async function AchievementsPage() {
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

  return <AchievementsClient profile={profile} unlockedIds={unlockedIds} />;
}
