import { createBrowserClient } from '@supabase/ssr'
import { SUPABASE_COOKIE_OPTIONS } from '@/lib/supabase/cookie-options'

// 2026-05-08 (YVOICE4 PR4): iOS Safari ITP 対策として cookieOptions を明示。
// canonical 値は lib/supabase/cookie-options.ts で 1 ファイル集約。
// 既存挙動は無変更。auth.signInWithPassword / signOut / OAuth callback も不変。
//
// 2026-05-10 リリース前 Critical 修正: env 未設定で createBrowserClient が
// throw して画面真っ白になるのを防ぐため、空文字フォールバック + console.error。
// 呼び出し側は createClient() の返り値を nullable として扱わずに済む (= 既存
// 呼び出しを変更しない) が、API 呼び出し時に Supabase 側で URL invalid エラーが
// 出るので原因が追える。
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.error('[supabase/client] missing NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY')
  }
  return createBrowserClient(
    url ?? '',
    key ?? '',
    { cookieOptions: SUPABASE_COOKIE_OPTIONS }
  )
}
