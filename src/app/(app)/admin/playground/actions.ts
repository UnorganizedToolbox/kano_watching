'use server'

import { createClient } from "@/utils/supabase/server";
import { renderTypstToSvg } from "@/lib/typst";

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('ログインしていません');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') throw new Error('権限がありません');
}

export async function renderPlaygroundSource(source: string): Promise<{ ok: true; svg: string } | { ok: false; error: string }> {
  await verifyAdmin();

  if (!source || !source.trim()) {
    return { ok: false, error: 'ソースが空です' };
  }

  return renderTypstToSvg(source);
}
