import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { SUPABASE_COOKIE_OPTIONS, applyCookieMaxAgeOverride } from '@/lib/supabase/cookie-options'

// 2026-05-08 (YVOICE4 PR4 + ログイン維持改善): iOS Safari ITP 対策と
// 90 日ログイン維持のため cookieOptions を明示。
// canonical 値は lib/supabase/cookie-options.ts で 1 ファイル集約。
//
// ⚠ @supabase/ssr 0.4.1 の library bug 回避:
// setAll に渡ってくる options.maxAge は library 内部で強制上書きされている。
// applyCookieMaxAgeOverride で 90 日に再上書きする hack を入れる。
// maxAge=0 (cookie 削除) はそのまま保持されるので signOut 動作不変。
// 2026-05-10 リリース前 Critical 修正: env 未設定で createServerClient が
// throw するのを防ぐ。空文字フォールバック + console.error で原因追跡可能に。
export function createClient() {
  const cookieStore = cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.error('[supabase/server] missing NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY')
  }
  return createServerClient(
    url ?? '',
    key ?? '',
    {
      cookieOptions: SUPABASE_COOKIE_OPTIONS,
      cookies: {
        getAll() { return cookieStore.getAll() },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, applyCookieMaxAgeOverride(options))
            )
          } catch {}
        },
      },
    }
  )
}
