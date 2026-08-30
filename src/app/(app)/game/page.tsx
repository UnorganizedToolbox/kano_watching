import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import GamePortalClient from "./GamePortalClient";

export default async function GamePortalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // プロフィール取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // 取得済み実績IDリストを取得
  const { data: achievements } = await supabase
    .from('student_achievements')
    .select('achievement_id')
    .eq('student_id', user.id);

  const unlockedIds = achievements?.map(a => a.achievement_id) || [];

  return <GamePortalClient profile={profile} unlockedIds={unlockedIds} />;
}
