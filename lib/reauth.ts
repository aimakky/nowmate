'use client'

// 再認証 (reauth) ヘルパー
//
// YVOICE では退会 / 年齢確認 / メール変更 / パスワード変更 / 決済 など
// 重要操作の直前に「直近に本人がログイン済みか」を再確認する。
// 本ファイルは、再認証の有効期限管理とパスワード再検証 / OAuth 再認証起動を
// 1 ファイルに集約した純関数ヘルパー。
//
// PR1 (本 PR) ではコア (helper / hook / modal) のみを実装し、
// settings 退会 (PR2) や verify-age (PR3) への組込みは別 PR で行う。
//
// 設計方針:
//   - TTL は 5 分 (REAUTH_TTL_MS)。直近 5 分以内に再認証していれば再要求しない
//   - 保管先は sessionStorage (タブを閉じれば自動失効、安全側に倒す)
//   - パスワードユーザーは signInWithPassword で再検証 (Supabase Auth API 標準)
//   - OAuth ユーザーは signInWithOAuth で再認証フロー起動 (redirect)
//
// Supabase Auth / @supabase/ssr / middleware の構造は触らない。
// reauth の判定は完全に client side で行い、サーバ側の権限チェックは
// 既存 RLS / API ハンドラに委ねる (= reauth はあくまで UX 層の本人保護)。

import { createClient } from '@/lib/supabase/client'

/** 再認証が "fresh" とみなされる有効期限 (ミリ秒)。デフォルト 5 分。 */
export const REAUTH_TTL_MS = 5 * 60 * 1000

/** sessionStorage に直近 reauth 時刻を記録するためのキー */
const REAUTH_KEY = 'yvoice:reauth_at'

/** 直近の reauth 成功時刻 (UNIX ms)。記録なしまたは SSR は null。 */
export function getLastReauthAt(): number | null {
  if (typeof window === 'undefined') return null
  const raw = window.sessionStorage.getItem(REAUTH_KEY)
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

/** 直近の reauth 成功時刻を「いま」に更新する。 */
export function markReauthFresh(): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(REAUTH_KEY, String(Date.now()))
}

/** 記録された reauth 時刻をクリアする (signOut 時などに呼ぶ)。 */
export function clearReauth(): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(REAUTH_KEY)
}

/** 直近 reauth が ttlMs 以内なら true。 */
export function isReauthFresh(ttlMs: number = REAUTH_TTL_MS): boolean {
  const at = getLastReauthAt()
  if (at === null) return false
  return Date.now() - at < ttlMs
}

/** verifyPassword の結果型 */
export interface VerifyPasswordResult {
  ok: boolean
  /** ok=false のときの人間向けエラーメッセージ */
  error?: string
}

/**
 * 現在のセッションユーザーのメールアドレスとパスワードで再認証する。
 *
 * Supabase Auth の signInWithPassword は同じユーザーで再呼出した場合、
 * 既存セッションを再生成 (token refresh) する挙動。失敗すれば error が返る。
 *
 * 成功時: markReauthFresh() を内部で呼んで「直近 reauth 済み」フラグを立てる。
 *
 * OAuth 専用ユーザー (パスワードを持たない) は signInWithPassword が必ず
 * 失敗するため、呼出側で事前に identity を判定するか、エラーを「OAuth で
 * 再認証してください」と読み替えること。
 */
export async function verifyPassword(password: string): Promise<VerifyPasswordResult> {
  if (!password || password.length === 0) {
    return { ok: false, error: 'パスワードを入力してください' }
  }

  const supabase = createClient()
  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) {
    return { ok: false, error: 'ログイン状態を確認できません。再ログインしてください。' }
  }
  if (!user.email) {
    return { ok: false, error: 'メールアドレスが見つかりません。Google などの外部認証をご利用の方は外部認証から再認証してください。' }
  }

  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  })
  if (signInErr) {
    // 文言は login 画面の表現に揃える
    return { ok: false, error: 'パスワードが正しくありません' }
  }

  markReauthFresh()
  return { ok: true }
}

/** OAuth ユーザーかどうかをセッションから判定する */
export async function isOAuthOnlyUser(): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  // identities が存在し、すべて非 email provider なら OAuth 専用ユーザー
  // (email + google など複数 provider 連携している場合はパスワード再認証も可)
  const identities = user.identities ?? []
  if (identities.length === 0) return false
  return identities.every(i => i.provider !== 'email')
}

/**
 * Google 等の OAuth プロバイダで再認証フローを起動する (redirect)。
 *
 * Supabase Auth の signInWithOAuth は browser を redirect させる挙動。
 * 戻り先 (redirectTo) は呼出側が指定可能。指定がなければ現在のページに戻る。
 *
 * 戻り先で auth callback が走った後、呼出側で再度 markReauthFresh() を
 * 呼ぶ必要がある。本関数自身は markReauthFresh しない (redirect 中に
 * fresh フラグを立てても意味がないため)。
 */
export async function startOAuthReauth(provider: 'google', returnTo?: string): Promise<void> {
  const supabase = createClient()
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const next = returnTo ?? (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/')
  await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  })
}
