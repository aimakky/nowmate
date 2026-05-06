// ユーザー表示名・アバター表示の共通ユーティリティ。
//
// 過去発生した「ミヤさんがフォロー一覧で『名無し』と表示される」バグの
// 再発防止策として、表示名フォールバックロジックを 1 箇所に集約する。
// 各ファイルでバラバラに実装されていた fallback ('名無し' / '住民' /
// '?' / '誰か' / '匿名' / '不明' / 'このユーザー' 等) を統一し、
// プロフィール取得失敗時の挙動を予測可能にする。
//
// 使い方:
//   import { getUserDisplayName, getAvatarInitial } from '@/lib/user-display'
//
//   const name = getUserDisplayName(profile)        // → 'ミヤ' or '名無し'
//   const initial = getAvatarInitial(profile)       // → 'M' or '?'

// プロフィール候補型 (各画面で型が微妙に違うため広めに受ける)
type ProfileLike = {
  display_name?: string | null
  username?: string | null
  name?: string | null
  nickname?: string | null
  handle?: string | null
  user_code?: string | null
  nowjp_id?: string | null
  avatar_url?: string | null
  emoji?: string | null
} | null | undefined

/**
 * ユーザーの表示名を返す。
 * 優先順: display_name → username → name → nickname → handle → user_code → nowjp_id → fallback
 *
 * @param profile プロフィール情報 (null/undefined OK)
 * @param fallback 全部空のときに返す文字列 (default: '名無し')
 */
export function getUserDisplayName(
  profile: ProfileLike,
  fallback: string = '名無し'
): string {
  if (!profile) return fallback
  const candidates = [
    profile.display_name,
    profile.username,
    profile.name,
    profile.nickname,
    profile.handle,
    profile.user_code,
    profile.nowjp_id,
  ]
  for (const v of candidates) {
    if (typeof v === 'string' && v.trim().length > 0) return v
  }
  return fallback
}

/**
 * アバターのフォールバック頭文字を返す。
 * avatar_url がある場合は呼び出し側で <img> を出すので、
 * この関数は「画像がない時の頭文字 1 文字」を生成する。
 *
 * @param profile プロフィール情報
 * @param fallback 何もないときの 1 文字 (default: '?')
 */
export function getAvatarInitial(
  profile: ProfileLike,
  fallback: string = '?'
): string {
  const name = getUserDisplayName(profile, '')
  if (!name) return fallback
  // 絵文字 1 文字なら絵文字を返す
  const first = Array.from(name)[0]
  if (!first) return fallback
  // ASCII 英字なら大文字化、それ以外 (日本語/絵文字) はそのまま
  return /^[a-z]$/i.test(first) ? first.toUpperCase() : first
}

/**
 * 表示名が「未設定/未取得」かどうかの判定。
 * UI で「名前が出ないことが想定外なら警告表示」したい時に使う。
 */
export function isAnonymousProfile(profile: ProfileLike): boolean {
  return getUserDisplayName(profile, '') === ''
}
