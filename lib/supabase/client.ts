import { createBrowserClient } from '@supabase/ssr'
import { SUPABASE_COOKIE_OPTIONS } from '@/lib/supabase/cookie-options'

// 2026-05-08 (YVOICE4 PR4): iOS Safari ITP 対策として cookieOptions を明示。
// canonical 値は lib/supabase/cookie-options.ts で 1 ファイル集約。
// 既存挙動は無変更。auth.signInWithPassword / signOut / OAuth callback も不変。
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions: SUPABASE_COOKIE_OPTIONS }
  )
}
