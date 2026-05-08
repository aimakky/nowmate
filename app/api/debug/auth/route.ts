// 一時 DEBUG endpoint (90 日ログイン維持の本番調査用、確認後に除去予定)
//
// 目的: マッキーさんの iPhone Safari で本番にアクセスしたときに、サーバ側
// から見て (1) cookie が届いているか、(2) Supabase auth.getUser() が user を
// 返しているか、(3) 環境変数が正しく production になっているか、を安全に
// 確認するための endpoint。
//
// アクセス方法: ブラウザで `https://www.nowmatejapan.com/api/debug/auth` を
// 開いて JSON を見る。
//
// 個人情報・トークン本体は絶対に返さない:
//   - cookie の name のみ (値は出さない)
//   - hasUser (boolean) のみ。user.id / email / phone は出さない
//   - authError?.code のみ (message は出さない)
//   - process.env.NODE_ENV / VERCEL_ENV (boolean / 文字列のみ)
//
// CLAUDE.md「一時 console.log の最短ライフサイクル」準拠で、原因特定後
// (マッキーさんが結果を共有してくれた後) の次 commit で除去する。

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { REAUTH_COOKIE_MAX_AGE_SECONDS } from '@/lib/supabase/cookie-options'

// no-cache: ブラウザ / CDN で結果がキャッシュされないようにする
export const dynamic = 'force-dynamic'

export async function GET() {
  const cookieStore = cookies()
  const allCookies = cookieStore.getAll()
  const cookieNames = allCookies.map(c => c.name)
  const hasSupabaseAuthCookie = cookieNames.some(
    n => n.startsWith('sb-') && (n.includes('auth-token') || n.includes('-auth-'))
  )

  let hasUser = false
  let authErrorCode: string | null = null
  let userIdHashPrefix: string | null = null
  try {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = (await supabase.auth.getUser()) as any
    hasUser = Boolean(data?.user)
    authErrorCode = error?.code ?? null
    if (data?.user?.id) {
      // user.id 全体は出さない。先頭 8 文字だけ (個人特定不可、識別目的のみ)。
      userIdHashPrefix = String(data.user.id).slice(0, 8)
    }
  } catch (e) {
    authErrorCode = e instanceof Error ? e.name : 'unknown'
  }

  return NextResponse.json(
    {
      label: 'YVOICE auth debug (temporary, will be removed after diagnosis)',
      timestamp: new Date().toISOString(),
      env: {
        nodeEnv: process.env.NODE_ENV ?? null,
        vercelEnv: process.env.VERCEL_ENV ?? null,
        hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        hasSupabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      },
      cookies: {
        count: allCookies.length,
        names: cookieNames,
        hasSupabaseAuthCookie,
      },
      auth: {
        hasUser,
        authErrorCode,
        userIdHashPrefix,
      },
      expected: {
        cookieMaxAgeSeconds: REAUTH_COOKIE_MAX_AGE_SECONDS,
        cookieMaxAgeDays: REAUTH_COOKIE_MAX_AGE_SECONDS / 86400,
      },
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
      },
    }
  )
}
