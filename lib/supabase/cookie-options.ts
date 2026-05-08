// Supabase Auth cookie の保管オプション (canonical 定義)
//
// マッキーさん指示: 「一度ログインしたら 90 日間は再ログイン不要にしたい」
// (2026-05-08 ユーザー体験改善)
//
// iOS Safari ITP (Intelligent Tracking Prevention) は session cookie / 7 日
// 未満の cookie を頻繁に削除するため、refresh token cookie が短命だとログイン
// が iPhone で勝手に切れる事象が発生する。本ファイルは canonical 値を 1 ファイル
// に集約し、client.ts / server.ts / middleware.ts のすべてで同じ保管設定を
// 共有する。
//
// 仕様:
//   - maxAge:   90 日 (90 * 24 * 60 * 60 秒) = 7,776,000 秒
//               マッキーさん指示の "通常利用 90 日ログイン維持" を満たす最低値
//   - sameSite: 'lax'。OAuth callback など同一サイトナビゲーションでは送る、
//               cross-site の image / iframe では送らない (CSRF 緩和)。
//               'strict' にすると Google OAuth callback が壊れる。
//   - secure:   production のみ true。開発の http://localhost を壊さない。
//               iOS Safari は sameSite=lax を効かせるため secure=true を要求する
//               ので production では必須。
//   - path:     '/' (全パスで送信)
//
// Supabase Auth / @supabase/ssr / middleware の構造は触らず、cookieOptions
// オプションだけを追加することで token cookie の保管設定だけを強化する。
// middleware の自動 refresh / signOut / signInWithPassword の挙動は不変。
//
// ⚠ @supabase/ssr 0.4.1 の library bug:
//   node_modules/@supabase/ssr/dist/module/cookies.js 行 161-165 / 317-321 で、
//   setCookieOptions の最終行で `maxAge: DEFAULT_COOKIE_OPTIONS.maxAge` と
//   強制上書きされており、ユーザー指定の cookieOptions.maxAge が無視される。
//   そのため middleware.ts / server.ts の setAll で options.maxAge を再上書き
//   する hack を入れて、確実に 90 日になるようにしている (見た applyCookieMaxAgeOverride)。

import type { CookieOptions } from '@supabase/ssr'

/** 90 日 = 7,776,000 秒。マッキーさん指示「一度ログインしたら 90 日維持」の値。 */
export const REAUTH_COOKIE_MAX_AGE_SECONDS = 90 * 24 * 60 * 60

export const SUPABASE_COOKIE_OPTIONS: CookieOptions = {
  maxAge: REAUTH_COOKIE_MAX_AGE_SECONDS,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

/**
 * @supabase/ssr 0.4.1 の library bug 回避: setAll に渡される options の
 * maxAge を強制的に SUPABASE_COOKIE_OPTIONS.maxAge (90 日) に上書きする。
 *
 * ただし maxAge=0 (cookie 削除) と maxAge<0 (即時削除) は保持する必要がある
 * (signOut / token rotation 時の旧 cookie 削除に使われる)。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyCookieMaxAgeOverride(options: any): any {
  if (!options) return options
  // maxAge=0 / 負値は cookie 削除を意味するので保持
  if (typeof options.maxAge === 'number' && options.maxAge <= 0) return options
  return { ...options, maxAge: REAUTH_COOKIE_MAX_AGE_SECONDS }
}
