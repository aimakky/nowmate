import { createClient } from './supabase/client'

// ─── 多次元ティア要件（Discourse TL設計を移植）────────────────
// Discourse: 投稿数×活動日数×もらったいいね×通話参加 の全条件を満たして初めて昇格
export const TIER_REQUIREMENTS: Record<string, {
  posts:             number
  days:              number
  reactionsReceived: number
  voiceSessions:     number
  score:             number
  hint:              string   // ユーザーに見せる一言説明
}> = {
  resident: { posts: 1,  days: 1,  reactionsReceived: 0,  voiceSessions: 0, score: 30,  hint: '電話認証 + 初投稿' },
  regular:  { posts: 5,  days: 3,  reactionsReceived: 3,  voiceSessions: 0, score: 100, hint: '5回投稿 · 3日活動 · いいね3' },
  trusted:  { posts: 20, days: 10, reactionsReceived: 10, voiceSessions: 2, score: 300, hint: '20回投稿 · 10日活動 · 通話2回' },
  pillar:   { posts: 80, days: 45, reactionsReceived: 30, voiceSessions: 5, score: 600, hint: '長期の継続的な貢献' },
}

// ─── ユーザーの活動統計型 ─────────────────────────────────────
export type TierProgress = {
  posts:             number
  days_active:       number
  reactions_received:number
  voice_sessions:    number
  score:             number
  tier:              string
}

// ─── DBからティア進捗取得 ─────────────────────────────────────
export async function fetchTierProgress(userId: string): Promise<TierProgress | null> {
  const { data, error } = await createClient()
    .rpc('get_user_tier_progress', { p_user_id: userId })
  if (error || !data) return null
  return data as TierProgress
}

// ─── Tier 定義 ────────────────────────────────────────────────
export const TRUST_TIERS = [
  {
    id: 'visitor',
    label: '見習い',
    icon: '🪴',
    min: 0,
    color: 'bg-stone-50 text-stone-600 border-stone-200',
    desc: '登録したばかり。まずは村を探してみましょう。',
    canPost: false, canSpeak: false, canCreateRoom: false, canCreateVillage: false, canConsult: false,
  },
  {
    id: 'resident',
    label: '住民',
    icon: '🏡',
    min: 100,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    desc: '電話認証済み。投稿・通話に参加できます。',
    canPost: true, canSpeak: true, canCreateRoom: false, canCreateVillage: false, canConsult: false,
  },
  {
    id: 'regular',
    label: '常連',
    icon: '🌿',
    min: 300,
    color: 'bg-green-50 text-green-700 border-green-200',
    desc: '継続的な参加者。通話部屋を作れます。',
    canPost: true, canSpeak: true, canCreateRoom: true, canCreateVillage: false, canConsult: true,
  },
  {
    id: 'trusted',
    label: '信頼の住民',
    icon: '🌳',
    min: 600,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    desc: '多くの人に感謝された。村を作れます。',
    canPost: true, canSpeak: true, canCreateRoom: true, canCreateVillage: true, canConsult: true,
  },
  {
    id: 'pillar',
    label: '村の柱',
    icon: '✨',
    min: 1000,
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    desc: '長期にわたる献身。全機能解放。',
    canPost: true, canSpeak: true, canCreateRoom: true, canCreateVillage: true, canConsult: true,
  },
] as const

export type TierId = typeof TRUST_TIERS[number]['id']

export function getTierById(tierId: string) {
  return TRUST_TIERS.find(t => t.id === tierId) ?? TRUST_TIERS[0]
}

export function getTierFromScore(score: number) {
  for (let i = TRUST_TIERS.length - 1; i >= 0; i--) {
    if (score >= TRUST_TIERS[i].min) return TRUST_TIERS[i]
  }
  return TRUST_TIERS[0]
}

export function getNextTier(tierId: string) {
  const idx = TRUST_TIERS.findIndex(t => t.id === tierId)
  return idx < TRUST_TIERS.length - 1 ? TRUST_TIERS[idx + 1] : null
}

// ─── スコアイベント定義 ───────────────────────────────────────
export const TRUST_EVENTS = {
  phone_verified:       { points: 30, label: '電話番号認証',           limit: 'once' },
  profile_completed:    { points: 20, label: 'プロフィール完成',        limit: 'once' },
  consultation_resolved:{ points: 25, label: '相談を解決した',          limit: 'weekly3' },
  post_liked:           { points: 2,  label: '投稿にいいねをもらった',   limit: 'per_post_max10' },
  voice_participated:   { points: 5,  label: '通話に30分参加した',       limit: 'daily1' },
  welcomed_new_member:  { points: 8,  label: '新人の挨拶に返信した',     limit: 'daily3' },
  streak_7days:         { points: 10, label: '7日連続アクティブ',        limit: 'weekly' },
  village_stayed_30d:   { points: 10, label: '村に30日以上滞在',         limit: 'per_village' },
  reported:             { points: -30, label: '通報された',              limit: 'none' },
  multi_blocked:        { points: -20, label: '複数人にブロックされた',   limit: 'none' },
} as const

// ─── ポイント付与（RPC呼び出し）──────────────────────────────
export async function awardPoints(
  eventType: keyof typeof TRUST_EVENTS,
  sourceId?: string
) {
  const supabase = createClient()
  const pts = TRUST_EVENTS[eventType].points
  const result = await supabase.rpc('award_trust_points', {
    p_event_type: eventType,
    p_points: pts,
    p_source_id: sourceId ?? null,
  })
  if (result.error) {
    // 信頼スコア付与失敗は UX を止めない（fire-and-forget 用途）が、原因追跡のため必ずログに残す
    console.warn('[trust] awardPoints failed', { eventType, sourceId, error: result.error.message })
  }
  return result
}

// ─── ユーザーの信頼情報を取得 ────────────────────────────────
export async function getUserTrust(userId: string) {
  const { data } = await createClient()
    .from('user_trust')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  return data
}

// ─── 次のtierまでの進捗（0〜100%）──────────────────────────
export function getProgressToNext(score: number): { pct: number; pointsNeeded: number } {
  const current = getTierFromScore(score)
  const next    = getNextTier(current.id)
  if (!next) return { pct: 100, pointsNeeded: 0 }
  const range = next.min - current.min
  const done  = score - current.min
  return {
    pct: Math.round((done / range) * 100),
    pointsNeeded: next.min - score,
  }
}

// ─── 表示用テキスト（ゲームっぽくしない）───────────────────
export function getTrustMessage(totalHelped: number): string {
  if (totalHelped === 0) return 'まずは村に投稿してみましょう'
  if (totalHelped < 5)  return `${totalHelped}人の悩みを解決しました`
  if (totalHelped < 20) return `${totalHelped}人の役に立てました`
  return `${totalHelped}人に感謝されています ✨`
}
