// 本人確認 / 年齢確認に関する共通型定義（Phase 1）
//
// 重要な前提:
//  - 本ファイルは型のみ。DB に対して何も触らない。
//  - 既存の profiles.age_verified / profiles.age_verification_status は壊さない。
//  - identity_verification_status は将来用の汎用型として定義のみ。
//    現状 DB には存在しないので、参照する側は必ず optional として扱うこと。
//  - provider 抽象化は Phase 2 で行う。ここでは候補を列挙するだけ。

// ─── 既存スキーマに対応する型 ──────────────────────────────────

/**
 * profiles.age_verification_status の値域
 * Stripe Identity 完了時に webhook が 'age_verified' を書き込む。
 */
export type AgeVerificationStatus =
  | 'unverified'
  | 'pending'
  | 'age_verified'
  | 'rejected'

// ─── Phase 2 で導入予定の型（現状は使用箇所限定） ────────────

/**
 * 将来的な本人確認ステータス（年齢確認とは独立）
 * 現状 DB には存在しないので、UI 側は optional 扱い。
 */
export type IdentityVerificationStatus =
  | 'unverified'
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'expired'

/** eKYC プロバイダ。Phase 2 で抽象化レイヤー追加時に使用。 */
export type VerificationProvider =
  | 'stripe_identity'   // 現使用
  | 'trustdock'         // 候補
  | 'liquid_ekyc'       // 候補
  | 'persona'           // 候補
  | 'sumsub'            // 候補
  | 'veriff'            // 候補
  | 'onfido'            // 候補

// ─── UI 用の補助型 ─────────────────────────────────────────────

export type VerificationBadgeSize = 'sm' | 'md' | 'lg'

/**
 * 「本人確認済み」かどうかを既存スキーマだけから判定するヘルパ。
 * Phase 1 では Stripe Identity が成功すると age_verified=true & age_verification_status='age_verified'
 * の両方が立つので、この片方を見れば十分。
 *
 * source は profiles row の subset を許容する（age_verified が optional でも壊れない）。
 */
export function isVerifiedByExistingSchema(
  source: { age_verified?: boolean | null; age_verification_status?: string | null } | null | undefined,
): boolean {
  if (!source) return false
  if (source.age_verified === true) return true
  if (source.age_verification_status === 'age_verified') return true
  return false
}
