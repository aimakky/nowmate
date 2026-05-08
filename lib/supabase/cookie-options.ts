// Supabase Auth cookie の保管オプション (canonical 定義)
//
// iOS Safari ITP (Intelligent Tracking Prevention) は session cookie / 7 日
// 未満の cookie を頻繁に削除するため、refresh token cookie が短命だとログイン
// が iPhone で勝手に切れる事象が発生する。本ファイルは以下を canonical 値と
// して 1 ファイルに集約し、client.ts / server.ts / middleware.ts のすべてで
// 同じ保管設定を共有する。
//
// 仕様:
//   - maxAge:   1 年 (365 * 24 * 60 * 60)。ITP の早期削除を回避する最長クラス
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

import type { CookieOptions } from '@supabase/ssr'

export const SUPABASE_COOKIE_OPTIONS: CookieOptions = {
  maxAge: 365 * 24 * 60 * 60,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}
