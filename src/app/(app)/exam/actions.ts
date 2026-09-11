'use server'

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { resolveEffectiveRules, type RuleMap, type OrgRuleMap } from "@/lib/rules";

export async function submitExam(formData: FormData) {
  const q1 = formData.get('q1') as string;
  const q2 = formData.get('q2') as string;
  const q3 = formData.get('q3') as string;

  if (!q1 || !q2 || !q3) throw new Error('すべての問題に回答してください');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('ログインしていません');

  const { data: profile } = await supabase.from('profiles').select('organization_id, rule_overrides').eq('id', user.id).single();
  let orgRules: OrgRuleMap = {};
  if (profile?.organization_id) {
    const { data: org } = await supabase.from('organizations').select('rules').eq('id', profile.organization_id).single();
    orgRules = (org?.rules as OrgRuleMap) || {};
  }
  const effectiveRules = resolveEffectiveRules(orgRules, profile?.rule_overrides as RuleMap);
  if (effectiveRules.disable_exam_registration) {
    throw new Error('教師/管理者によって実力診断テストの受験が禁止されています。');
  }

  // Calculate score
  let score = 0;
  const weaknesses = [];
  if (q1 === 'correct') score += 30; else weaknesses.push('数と式');
  if (q2 === 'correct') score += 30; else weaknesses.push('2次関数');
  if (q3 === 'correct') score += 40; else weaknesses.push('確率');

  let recommendation = '';
  if (score === 100) recommendation = '素晴らしい成績です！基礎は完璧に身についています。この調子で応用問題や過去問演習に進みましょう。';
  else if (score >= 60) recommendation = `全体的に理解できていますが、${weaknesses.join('、')}の分野に課題があります。まずは該当分野の基本例題を復習しましょう。`;
  else recommendation = `基礎力の定着が必要です。特に${weaknesses.join('、')}の分野を中心に、教科書レベルの基本事項から丁寧にやり直すことをお勧めします。`;

  const { error } = await supabase.from('diagnostic_results').insert({
    student_uuid: user.id,
    total_score: score,
    weaknesses: weaknesses.length > 0 ? weaknesses.join(', ') : 'なし',
    recommendation
  });

  if (error) {
    console.error('Failed to save exam result', error);
    throw new Error('結果の保存に失敗しました');
  }

  redirect('/');
}
