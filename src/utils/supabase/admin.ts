import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// service_role キーを使うクライアント。RLSを完全にバイパスするため、
// auth.users の削除など通常のクライアントキーでは行えない管理者操作にのみ使う。
// サーバーアクション以外(クライアントコンポーネント等)から絶対に呼び出さないこと。
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
