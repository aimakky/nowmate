import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { SUPABASE_COOKIE_OPTIONS, applyCookieMaxAgeOverride } from '@/lib/supabase/cookie-options'
import { debugAuthLog } from '@/lib/auth-debug'

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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, applyCookieMaxAgeOverride(options))
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // gated debug: DEBUG_AUTH=true のときだけ Vercel Logs に出力
  // (token / cookie value は出さず、name 配列と boolean のみ)
  const cookieNames = request.cookies.getAll().map(c => c.name)
  const hasSupabaseAuthCookie = cookieNames.some(
    n => n.startsWith('sb-') && (n.includes('auth-token') || n.includes('-auth-'))
  )
  debugAuthLog('middleware reached', {
    path: request.nextUrl.pathname,
    method: request.method,
    cookieCount: cookieNames.length,
    hasSupabaseAuthCookie,
    cookieNames,
    hasUser: Boolean(user),
  })

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
