// 認証フローの本番調査用 gated debug ログ
//
// マッキーさん指示「修正ではなく本番反映と auth 復元の証明」のため、
// PR #28 が本番で実際に動いているか・getUser() が user を返しているか・
// redirect 判定が成功しているかを Vercel Logs で確認できるように、
// DEBUG_AUTH env var で gate された安全なロガーを提供する。
//
// 安全要件 (マッキーさん明示):
//   - DEBUG_AUTH=true の時だけログを出す
//   - 確認後 DEBUG_AUTH=false に戻すと完全に静かになる
//   - 本番に常設しない
//   - access_token / refresh_token / 完全な user.id / email / phone は絶対に出さない
//   - 出していいのは boolean / count / 文字列の有無 / commit hash 等の運用情報のみ
//
// 使い方:
//   import { debugAuthLog } from '@/lib/auth-debug'
//   debugAuthLog('root reached', { hasUser: true, profileExists: false })
//
// Vercel ダッシュボードでの有効化:
//   Settings → Environment Variables → Production に DEBUG_AUTH=true を追加
//   サーバ側ログを出すだけなら DEBUG_AUTH のみで OK。
//   client 側 (login / signup) でも出したい場合は NEXT_PUBLIC_DEBUG_AUTH=true も追加。
//   Save 後、新規 build をトリガーする必要あり (env の差替えだけでは古い build に
//   反映されないため)。

export function isAuthDebugEnabled(): boolean {
  // 1. 明示 env var (サーバ側): DEBUG_AUTH=true
  if (typeof process !== 'undefined' && process.env?.DEBUG_AUTH === 'true') return true
  // 2. 公開 env var (client / server 両対応): NEXT_PUBLIC_DEBUG_AUTH=true
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_DEBUG_AUTH === 'true') return true
  return false
}

/**
 * gated console.log。env が未設定なら何も出力しない。
 *
 * 出力可能なフィールドは boolean / count / 文字列の有無 / commit hash 等の
 * 運用情報のみ。token / userId 全体 / email / phone を入れないこと。
 */
export function debugAuthLog(label: string, data: Record<string, unknown>): void {
  if (!isAuthDebugEnabled()) return
  const enriched = {
    ...data,
    // Vercel が自動注入する deployment 情報 (本番反映確認の最重要シグナル)
    commitSha: typeof process !== 'undefined' ? (process.env?.VERCEL_GIT_COMMIT_SHA ?? null) : null,
    vercelEnv: typeof process !== 'undefined' ? (process.env?.VERCEL_ENV ?? null) : null,
  }
  // eslint-disable-next-line no-console
  console.log('[AUTH_DBG_2026-05-08]', label, enriched)
}
