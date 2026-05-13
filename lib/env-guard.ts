//
// env-guard — 環境変数の安全アクセス helper
//
// 2026-05-10 リリース前 Critical 修正:
// process.env.XXX! の non-null assertion で「未設定だと undefined 注入 → crash」
// するパターンを防ぐため、共通の guard 関数を用意。
//
// 用途:
//   - middleware / Server Component / API route で Supabase URL/KEY を取得
//   - 未設定時に明示的にログ + 安全なフォールバック値 (空文字) を返す
//   - 呼び出し側で「設定済みかどうか」を boolean でチェック可能にする
//
// 設計方針:
//   - undefined を返さず常に string を返す (型を `string | undefined` にしない)
//   - 未設定なら「明らかに無効な値」を返して、API 呼び出し時に意図的に失敗させる
//   - エラーログは「どの env が欠けているか」だけ出して秘密情報は出さない
//

import { SITE_URL } from './site'

const REQUIRED_ENVS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const

type RequiredEnv = (typeof REQUIRED_ENVS)[number]

/**
 * Supabase の必須 env を取得。未設定時はログを出して空文字を返す。
 * 呼び出し側は `if (!hasSupabaseEnv())` で防御するか、空文字で実行されて
 * Supabase 側のエラーで停止することを前提に運用する。
 */
export function getEnv(name: RequiredEnv): string {
  const v = process.env[name]
  if (!v) {
    // サーバー側ログのみ。クライアントには env 名を漏らさない。
    if (typeof window === 'undefined') {
      console.error(`[env-guard] missing required env: ${name}`)
    }
    return ''
  }
  return v
}

/** Supabase の必須 env (URL + ANON_KEY) が両方設定されているか */
export function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}

/**
 * Site の base URL を取得 (Stripe redirect 等で使う)。
 * Stripe 専用の上書き NEXT_PUBLIC_BASE_URL が最優先、未設定時は lib/site の
 * SITE_URL に委譲する。SITE_URL は NEXT_PUBLIC_SITE_URL → 旧ドメインの順で
 * fallback 済みなので、ここでは旧ドメインを直書きしない（lib/site.ts に一元化）。
 */
export function getBaseUrl(): string {
  const override = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  if (override) return override.replace(/\/$/, '')
  return SITE_URL
}

/** UUID v1-v5 簡易検証 (auth user_id の form check 用) */
export function isUuid(s: unknown): s is string {
  return typeof s === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
}
