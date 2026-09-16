'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { resolveEffectiveRules, type RuleMap, type OrgRuleMap } from '@/lib/rules'

export async function linkGoogleAccount(): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const headersList = await headers()
  const host = headersList.get('host')
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  const origin = `${protocol}://${host}`

  // 重要なバグ修正: signInWithOAuth()は「そのGoogleアカウントでサインインし直す」API
  // であり、既にログイン中のユーザーへGoogleの権限(カレンダー)を追加で紐付ける用途には
  // 適さない(Supabaseのアカウント自動リンク設定によっては、意図せず別セッション/別
  // アカウントに切り替わったり、識別子の衝突でエラーになったりする)。既存セッションに
  // プロバイダーを追加で連携するにはlinkIdentity()を使う。
  const { data, error } = await supabase.auth.linkIdentity({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback?next=/settings`,
      scopes: 'https://www.googleapis.com/auth/calendar',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error) {
    console.error('Failed to link Google account', error)
    return { ok: false, error: `Googleカレンダーとの連携に失敗しました: ${error.message}` }
  }

  if (data?.url) {
    redirect(data.url)
  }

  return { ok: false, error: '連携用のURLを取得できませんでした' }
}

async function getEffectiveRulesFor(supabase: Awaited<ReturnType<typeof createClient>>, organizationId: string | null, overrides: unknown) {
  let orgRules: OrgRuleMap = {};
  if (organizationId) {
    const { data: org } = await supabase.from('organizations').select('rules').eq('id', organizationId).single();
    orgRules = (org?.rules as OrgRuleMap) || {};
  }
  return resolveEffectiveRules(orgRules, overrides as RuleMap);
}

// プロフィール設定の保存。ニックネーム変更が(個別ロックまたは団体ルールで)禁止されている場合は
// name フィールドのみ更新せずスキップする(他の項目は通常通り保存する)。
export async function saveProfileSettings(input: { name: string; targetTitle: string; targetDate: string; gradeLevel: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('ログインしていません')

  const { data: profile } = await supabase.from('profiles').select('nickname_locked, organization_id, rule_overrides').eq('id', user.id).single()
  if (!profile) throw new Error('プロフィールが見つかりません')

  const effective = await getEffectiveRulesFor(supabase, profile.organization_id, profile.rule_overrides)
  const nicknameBlocked = !!profile.nickname_locked || effective.disable_nickname_change

  const update: Record<string, unknown> = {
    target_title: input.targetTitle,
    target_date: input.targetDate || null,
    grade_level: input.gradeLevel || null,
  }
  if (!nicknameBlocked) {
    update.name = input.name
  }

  const { error } = await supabase.from('profiles').update(update).eq('id', user.id)
  if (error) {
    console.error('Failed to save profile settings', error)
    throw new Error('プロフィールの保存に失敗しました')
  }

  return { nicknameBlocked }
}
