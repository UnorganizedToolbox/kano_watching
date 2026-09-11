'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { resolveEffectiveRules, resolveEffectivePinnedTheme, type RuleMap, type OrgRuleMap } from '@/lib/rules'

export async function setTheme(theme: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase.from('profiles').select('organization_id, rule_overrides').eq('id', user.id).single()
    if (profile) {
      let orgRules: OrgRuleMap = {}
      if (profile.organization_id) {
        const { data: org } = await supabase.from('organizations').select('rules').eq('id', profile.organization_id).single()
        orgRules = (org?.rules as OrgRuleMap) || {}
      }
      const effective = resolveEffectiveRules(orgRules, profile.rule_overrides as RuleMap)
      if (effective.disable_theme_change) {
        throw new Error('管理者/教師によってテーマ変更が禁止されています')
      }
    }
  }

  const cookieStore = await cookies()
  cookieStore.set('theme', theme, { path: '/' })
}

// 固定テーマが設定されているユーザーに対し、次回リロード時も正しいテーマが
// (root layout のcookie読み込み時点で)表示されるようクッキーを同期する。
// クライアントから渡された値は信用せず、サーバー側で再計算した値のみを書き込む。
export async function syncPinnedTheme(_requestedTheme: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase.from('profiles').select('organization_id, rule_overrides').eq('id', user.id).single()
  if (!profile) return

  let orgRules: OrgRuleMap = {}
  if (profile.organization_id) {
    const { data: org } = await supabase.from('organizations').select('rules').eq('id', profile.organization_id).single()
    orgRules = (org?.rules as OrgRuleMap) || {}
  }
  const pinnedTheme = resolveEffectivePinnedTheme(orgRules, profile.rule_overrides as RuleMap)
  if (!pinnedTheme) return

  const cookieStore = await cookies()
  cookieStore.set('theme', pinnedTheme, { path: '/' })
}
