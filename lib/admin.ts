import 'server-only'
import { createClient } from '@/lib/supabase/server'

// UUID v4-ish 形式の簡易チェック（フェイルセーフ用）
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * .env の ADMIN_USER_IDS をパースして UUID 配列を返す。
 *
 * フェイルセーフ:
 *  - env が未設定 / 空 / 空白のみ        → []
 *  - 'undefined' / 'null' / '*' 等の文字列 → 除外
 *  - UUID 形式でない文字列              → 除外
 *
 * 戻り値が [] の時、isAdminId() は常に false を返す（= 全拒否）。
 */
export function getAdminUserIds(): string[] {
  const raw = process.env.ADMIN_USER_IDS ?? ''
  return raw
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(s => s && s !== 'undefined' && s !== 'null' && s !== '*')
    .filter(s => UUID_RE.test(s))
}

/**
 * userId が admin allowlist に含まれているか。
 * userId が空 / 未定義 / allowlist 自体が空の場合は false（= フェイルクローズド）。
 */
export function isAdminId(userId: string | null | undefined): boolean {
  if (!userId) return false
  const allowed = getAdminUserIds()
  if (allowed.length === 0) return false
  return allowed.includes(userId.toLowerCase())
}

/**
 * Supabase Auth でログイン済みかつ admin allowlist に含まれる user を返す。
 * 該当しない場合は null。
 *
 * 必ず supabase.auth.getUser() を使う（getSession() は cookie の中身を
 * 信用するだけで Auth server に問い合わせないため使わない）。
 */
export async function getAdminUser() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) return null
  if (!isAdminId(data.user.id)) return null
  return data.user
}
