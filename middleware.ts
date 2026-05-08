import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { SUPABASE_COOKIE_OPTIONS, applyCookieMaxAgeOverride } from '@/lib/supabase/cookie-options'

// 全レスポンスに強制的に no-store ヘッダーを注入するヘルパー。
// Vercel Edge が古い HTML を 37 分以上 HIT で配信し続ける問題への
// 最終手段。next.config.js の headers() は build-time に固定値として
// 焼かれてキャッシュされた応答に組み込まれるため、既存キャッシュ entry
// を「次のリクエスト時」に上書きできない。
// middleware で response に動的に header を inject すると、リクエスト
// ごとに評価されてキャッシュ可否を CDN に伝えるため、Edge cache を
// 確実にバストできる。
function applyNoStoreHeaders(res: NextResponse): NextResponse {
  res.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0')
  res.headers.set('CDN-Cache-Control', 'no-store')
  res.headers.set('Vercel-CDN-Cache-Control', 'no-store')
  res.headers.set('Pragma', 'no-cache')
  res.headers.set('Expires', '0')
  return res
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  let setAllInvocations = 0
  let setAllAppliedMaxAges: Array<number | undefined> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // 2026-05-08 (YVOICE4 PR4 + ログイン維持改善): iOS Safari ITP 対策と
      // 90 日ログイン維持のため cookieOptions を明示。
      //
      // ⚠ @supabase/ssr 0.4.1 の library bug 回避:
      // setAll に渡ってくる options.maxAge は library 内部で
      // DEFAULT_COOKIE_OPTIONS.maxAge (60*60*24*365*1000 ≒ 1000年 in 秒)
      // に強制上書きされている。ブラウザは 400 日 (Chrome) / 7 日 (Safari ITP
      // document.cookie 経由) でキャップするため挙動が不安定。
      // → applyCookieMaxAgeOverride で 90 日に再上書きする hack を入れる。
      // maxAge=0 (cookie 削除) はそのまま保持されるので signOut 動作不変。
      cookieOptions: SUPABASE_COOKIE_OPTIONS,
      cookies: {
        getAll() { return request.cookies.getAll() },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          setAllInvocations += 1
          setAllAppliedMaxAges = cookiesToSet.map(c => {
            const o = applyCookieMaxAgeOverride(c.options)
            return typeof o?.maxAge === 'number' ? o.maxAge : undefined
          })
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, applyCookieMaxAgeOverride(options))
          )
        },
      },
    }
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: { user }, error: authError } = (await supabase.auth.getUser()) as any

  // ─────────────────────────────────────────────────────────────
  // 一時 DEBUG (90 日ログイン維持の本番調査用、確認後に除去予定)
  // CLAUDE.md「一時 console.log の最短ライフサイクル」準拠で、原因特定後
  // (= マッキーさんが Vercel Logs を確認して結果を共有してくれた後) の
  // 次 commit で除去する。
  //
  // 個人情報・トークン本体は出さない。出すのは:
  //   - cookie の name のみ (値は出さない)
  //   - hasUser (boolean)
  //   - authError?.code (エラーコード文字列のみ、message は出さない)
  //   - setAll が何回呼ばれたか + 適用された maxAge の値
  //   - production / Vercel 環境変数の boolean だけ
  //
  // Vercel Functions Logs (Vercel ダッシュボード → Logs) でこのログを
  // 検索できる。フィルタは [AUTH_DBG_2026-05-08]。
  try {
    const allCookies = request.cookies.getAll()
    const cookieNames = allCookies.map(c => c.name)
    const hasSupabaseAuthCookie = cookieNames.some(
      n => n.startsWith('sb-') && (n.includes('auth-token') || n.includes('-auth-'))
    )
    // eslint-disable-next-line no-console
    console.log('[AUTH_DBG_2026-05-08]', {
      path: request.nextUrl.pathname,
      method: request.method,
      cookieCount: allCookies.length,
      hasSupabaseAuthCookie,
      cookieNames,
      hasUser: Boolean(user),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      authErrorCode: (authError as any)?.code ?? null,
      setAllInvocations,
      setAllAppliedMaxAges,
      isProduction: process.env.NODE_ENV === 'production',
      vercelEnv: process.env.VERCEL_ENV ?? null,
    })
  } catch {
    /* noop — debug 用。失敗しても middleware の動作は壊さない */
  }
  // ─────────────────────────────────────────────────────────────

  const protectedPaths = [
    '/home', '/matches', '/chat', '/mypage', '/settings', '/onboarding', '/profile',
    '/timeline', '/guilds', '/guild', '/notifications', '/voice', '/villages',
    '/tweet', '/explore', '/create', '/post', '/search', '/qa', '/bottle',
    '/community', '/activity', '/now', '/likes-me', '/verify-age', '/upgrade',
    '/users',
  ]
  const isProtected = protectedPaths.some(p => request.nextUrl.pathname.startsWith(p))

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return applyNoStoreHeaders(NextResponse.redirect(url))
  }

  return applyNoStoreHeaders(supabaseResponse)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
