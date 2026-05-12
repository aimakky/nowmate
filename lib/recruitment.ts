// 募集カード機能 (Phase B PR-B2) の helper 群。
//
// 設計方針 (CLAUDE.md 「既存機能を壊さない」「DB 変更前でも安全に動く」):
//   - PR-B1 (SQL migration 007_recruitment_cards.sql) が未実行な環境でも
//     画面が爆発しないよう、新カラム/新テーブルへのアクセスは全て try/catch で
//     guard し、エラー時は graceful fallback (空配列 / disabled flag) を返す。
//   - SELECT に新カラムを混ぜるとカラム未存在で全体が失敗するため、
//     新カラム参照は recruitment 専用 fetch でだけ行う (既存 fetchPosts は無傷)。
//   - feature 有効/無効を module-level の cache で 1 セッション 1 回判定。
//     これにより 50 投稿描画でも探査クエリが 1 回で済む。
//
// 既存 LFG カラム (lfg_platform / lfg_time / lfg_game) との関係:
//   - 既存 LFG = "仲間募集" category の村投稿が持つ自由文 (string[])
//   - 新 recruitment = is_recruitment=true フラグ + 構造化属性 (人数/状態/voice 等)
//   - 共存可能。is_recruitment=true の投稿は新 UI、それ以外は従来 UI で表示する。

import type { SupabaseClient } from '@supabase/supabase-js'

export type RecruitmentType =
  | 'voice_play'        // ボイスで一緒に遊びたい
  | 'beginner_friendly' // 初心者歓迎
  | 'rank'              // ガチ / ランクマ
  | 'casual'            // のんびり / カジュアル
  | 'other'

export type RecruitmentStatus = 'open' | 'closed' | 'expired' | 'completed'

export type PlayStyle = 'casual' | 'rank' | 'fun' | 'serious'

export interface RecruitmentPost {
  id: string
  content: string
  category: string | null
  created_at: string
  village_id: string | null
  user_id: string

  // 募集カラム (PR-B1 で追加)
  is_recruitment: boolean
  recruitment_type: RecruitmentType | null
  max_participants: number | null
  current_participants_count: number
  recruitment_status: RecruitmentStatus
  voice_enabled: boolean
  beginner_friendly: boolean
  play_style: PlayStyle | null

  // 既存 LFG カラム (string[] / string)
  lfg_platform?: string[] | null
  lfg_time?: string | null
  lfg_game?: string | null

  // 派生表示用 (fetch 後 enrich)
  profiles?: { display_name: string | null; avatar_url: string | null } | null
  villages?: { id: string; name: string; icon: string | null } | null
  user_trust?: { tier: string | null } | null
  participant_count?: number  // village_post_participants から実集計
  joined_by_me?: boolean
}

export interface RecruitmentParticipant {
  id: string
  post_id: string
  user_id: string
  status: 'joined' | 'pending' | 'left' | 'kicked'
  created_at: string
  profile?: { display_name: string | null; avatar_url: string | null } | null
}

// ────────────────────────────────────────────────────────────
// Feature detection (SQL 実行有無を 1 回だけ probe)
// ────────────────────────────────────────────────────────────

let recruitmentFeatureCached: boolean | null = null

export async function isRecruitmentFeatureEnabled(supabase: SupabaseClient): Promise<boolean> {
  if (recruitmentFeatureCached !== null) return recruitmentFeatureCached
  try {
    const { error } = await supabase
      .from('village_posts')
      .select('is_recruitment')
      .limit(1)
    recruitmentFeatureCached = !error
  } catch {
    recruitmentFeatureCached = false
  }
  return recruitmentFeatureCached
}

// ────────────────────────────────────────────────────────────
// 一覧取得 (TL 用)
// ────────────────────────────────────────────────────────────

/**
 * 募集カードを取得する。
 * - SQL 未実行なら空配列を返す (画面破壊なし)。
 * - profiles / villages / user_trust / village_post_participants を別 query で join。
 */
export async function fetchRecruitments(
  supabase: SupabaseClient,
  opts: {
    currentUserId: string | null
    villageIds?: string[]    // 指定があれば in('village_id', ids)
    onlyOpen?: boolean       // true なら recruitment_status='open' のみ
    limit?: number
  },
): Promise<RecruitmentPost[]> {
  const enabled = await isRecruitmentFeatureEnabled(supabase)
  if (!enabled) return []

  try {
    let q = supabase
      .from('village_posts')
      .select(`
        id, content, category, created_at, village_id, user_id,
        is_recruitment, recruitment_type, max_participants,
        current_participants_count, recruitment_status,
        voice_enabled, beginner_friendly, play_style,
        lfg_platform, lfg_time, lfg_game
      `)
      .eq('is_recruitment', true)
      .order('created_at', { ascending: false })
      .limit(opts.limit ?? 100)

    if (opts.onlyOpen) q = q.eq('recruitment_status', 'open')
    if (opts.villageIds && opts.villageIds.length > 0) {
      q = q.in('village_id', opts.villageIds)
    }

    const { data, error } = await q
    if (error) {
      console.warn('[recruitment.fetchRecruitments] fallback to empty:', error.message)
      return []
    }
    const rows = (data ?? []) as any[]
    if (rows.length === 0) return []

    const userIds = Array.from(new Set(rows.map(r => r.user_id))).filter(Boolean) as string[]
    const villageIds = Array.from(new Set(rows.map(r => r.village_id).filter(Boolean))) as string[]
    const postIds = rows.map(r => r.id) as string[]

    const [profilesRes, villagesRes, trustsRes, participantsRes] = await Promise.all([
      userIds.length > 0
        ? supabase.from('profiles').select('id, display_name, avatar_url').in('id', userIds)
        : Promise.resolve({ data: [], error: null } as any),
      villageIds.length > 0
        ? supabase.from('villages').select('id, name, icon').in('id', villageIds)
        : Promise.resolve({ data: [], error: null } as any),
      userIds.length > 0
        ? supabase.from('user_trust').select('user_id, tier').in('user_id', userIds)
        : Promise.resolve({ data: [], error: null } as any),
      // 参加者集計は new table 経由。失敗時は空。
      fetchParticipantCounts(supabase, postIds, opts.currentUserId),
    ])

    const profileMap = new Map<string, any>(
      ((profilesRes as any).data ?? []).map((p: any) => [p.id, p]),
    )
    const villageMap = new Map<string, any>(
      ((villagesRes as any).data ?? []).map((v: any) => [v.id, v]),
    )
    const trustMap = new Map<string, { tier: string | null }>()
    for (const t of (((trustsRes as any).data ?? []) as any[])) {
      trustMap.set(t.user_id, { tier: t.tier ?? null })
    }
    const { countByPost, joinedByMe } = participantsRes

    return rows.map(r => ({
      id: r.id,
      content: r.content,
      category: r.category ?? null,
      created_at: r.created_at,
      village_id: r.village_id ?? null,
      user_id: r.user_id,
      is_recruitment: Boolean(r.is_recruitment),
      recruitment_type: (r.recruitment_type ?? null) as RecruitmentType | null,
      max_participants: r.max_participants ?? null,
      current_participants_count: r.current_participants_count ?? 0,
      recruitment_status: (r.recruitment_status ?? 'open') as RecruitmentStatus,
      voice_enabled: Boolean(r.voice_enabled),
      beginner_friendly: Boolean(r.beginner_friendly),
      play_style: (r.play_style ?? null) as PlayStyle | null,
      lfg_platform: r.lfg_platform ?? null,
      lfg_time: r.lfg_time ?? null,
      lfg_game: r.lfg_game ?? null,
      profiles: profileMap.get(r.user_id) ?? null,
      villages: r.village_id ? (villageMap.get(r.village_id) ?? null) : null,
      user_trust: trustMap.get(r.user_id) ?? null,
      participant_count: countByPost.get(r.id) ?? 0,
      joined_by_me: joinedByMe.has(r.id),
    }))
  } catch (e) {
    console.warn('[recruitment.fetchRecruitments] caught:', e)
    return []
  }
}

// ────────────────────────────────────────────────────────────
// 参加者集計 (新テーブル village_post_participants)
// ────────────────────────────────────────────────────────────

let participantsTableCached: boolean | null = null

async function ensureParticipantsTable(supabase: SupabaseClient): Promise<boolean> {
  if (participantsTableCached !== null) return participantsTableCached
  try {
    const { error } = await supabase
      .from('village_post_participants')
      .select('id')
      .limit(1)
    participantsTableCached = !error
  } catch {
    participantsTableCached = false
  }
  return participantsTableCached
}

export async function fetchParticipantCounts(
  supabase: SupabaseClient,
  postIds: string[],
  currentUserId: string | null,
): Promise<{ countByPost: Map<string, number>; joinedByMe: Set<string> }> {
  const countByPost = new Map<string, number>()
  const joinedByMe = new Set<string>()
  if (postIds.length === 0) return { countByPost, joinedByMe }
  const ok = await ensureParticipantsTable(supabase)
  if (!ok) return { countByPost, joinedByMe }

  try {
    const { data, error } = await supabase
      .from('village_post_participants')
      .select('post_id, user_id, status')
      .in('post_id', postIds)
      .eq('status', 'joined')
    if (error) return { countByPost, joinedByMe }
    for (const row of ((data ?? []) as any[])) {
      if (!row.post_id) continue
      countByPost.set(row.post_id, (countByPost.get(row.post_id) ?? 0) + 1)
      if (currentUserId && row.user_id === currentUserId) {
        joinedByMe.add(row.post_id)
      }
    }
  } catch (e) {
    console.warn('[recruitment.fetchParticipantCounts] caught:', e)
  }
  return { countByPost, joinedByMe }
}

export async function fetchParticipants(
  supabase: SupabaseClient,
  postId: string,
): Promise<RecruitmentParticipant[]> {
  const ok = await ensureParticipantsTable(supabase)
  if (!ok) return []
  try {
    const { data, error } = await supabase
      .from('village_post_participants')
      .select('id, post_id, user_id, status, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    if (error || !data) return []
    const rows = data as any[]
    if (rows.length === 0) return []
    const userIds = Array.from(new Set(rows.map(r => r.user_id).filter(Boolean))) as string[]
    const { data: profs } = userIds.length > 0
      ? await supabase.from('profiles').select('id, display_name, avatar_url').in('id', userIds)
      : { data: [] as any[] }
    const profMap = new Map<string, any>(((profs ?? []) as any[]).map(p => [p.id, p]))
    return rows.map(r => ({
      id: r.id,
      post_id: r.post_id,
      user_id: r.user_id,
      status: r.status,
      created_at: r.created_at,
      profile: profMap.get(r.user_id) ?? null,
    }))
  } catch (e) {
    console.warn('[recruitment.fetchParticipants] caught:', e)
    return []
  }
}

// ────────────────────────────────────────────────────────────
// 作成 / 参加 / 解除 (mutations)
// ────────────────────────────────────────────────────────────

export interface CreateRecruitmentInput {
  userId: string
  content: string
  villageId: string | null
  recruitmentType: RecruitmentType | null
  maxParticipants: number | null
  voiceEnabled: boolean
  beginnerFriendly: boolean
  playStyle: PlayStyle | null
  lfgPlatform?: string[] | null
  lfgGame?: string | null
  lfgTime?: string | null
}

/**
 * 募集カードを作成する。
 * 戻り値: { ok: true, postId } / { ok: false, message } のいずれか。
 * SQL 未実行のときは insert 自体が失敗するので分かりやすい toast を返す。
 */
export async function createRecruitment(
  supabase: SupabaseClient,
  input: CreateRecruitmentInput,
): Promise<{ ok: true; postId: string } | { ok: false; message: string }> {
  try {
    const payload: any = {
      user_id: input.userId,
      content: input.content,
      village_id: input.villageId,
      category: '仲間募集',
      is_recruitment: true,
      recruitment_type: input.recruitmentType,
      max_participants: input.maxParticipants,
      recruitment_status: 'open',
      voice_enabled: input.voiceEnabled,
      beginner_friendly: input.beginnerFriendly,
      play_style: input.playStyle,
    }
    if (input.lfgPlatform && input.lfgPlatform.length > 0) payload.lfg_platform = input.lfgPlatform
    if (input.lfgGame) payload.lfg_game = input.lfgGame
    if (input.lfgTime) payload.lfg_time = input.lfgTime

    const { data, error } = await supabase
      .from('village_posts')
      .insert(payload)
      .select('id')
      .single()

    if (error) {
      console.error('[recruitment.createRecruitment] insert error:', error)
      // SQL 未実行 (column does not exist) を分かりやすい文言で返す
      const msg = (error.message ?? '').toLowerCase()
      if (msg.includes('column') && msg.includes('does not exist')) {
        return { ok: false, message: '募集機能の準備が完了していません (管理者が SQL を実行する必要があります)' }
      }
      return { ok: false, message: `投稿に失敗しました (${error.code ?? 'unknown'})` }
    }
    return { ok: true, postId: data!.id }
  } catch (e: any) {
    console.error('[recruitment.createRecruitment] caught:', e)
    return { ok: false, message: '投稿に失敗しました' }
  }
}

/**
 * 募集に参加する (joined を INSERT)。
 * - 自分自身の参加レコードしか作れない (RLS で保証)。
 * - 既に存在すれば unique 制約で error。呼び側で「既に参加済み」と判定可能。
 */
export async function joinRecruitment(
  supabase: SupabaseClient,
  postId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const ok = await ensureParticipantsTable(supabase)
  if (!ok) return { ok: false, message: '募集機能の準備が完了していません' }
  try {
    const { error } = await supabase
      .from('village_post_participants')
      .insert({ post_id: postId, user_id: userId, status: 'joined' })
    if (error) {
      const msg = (error.message ?? '').toLowerCase()
      if (msg.includes('duplicate') || error.code === '23505') {
        return { ok: false, message: '既に参加しています' }
      }
      console.error('[recruitment.joinRecruitment] error:', error)
      return { ok: false, message: '参加できませんでした' }
    }
    return { ok: true }
  } catch (e: any) {
    console.error('[recruitment.joinRecruitment] caught:', e)
    return { ok: false, message: '参加できませんでした' }
  }
}

/**
 * 募集から離脱する (joined → left に UPDATE)。
 * UPDATE で status='left' に。RLS で 'joined' | 'left' しか書けない。
 */
export async function leaveRecruitment(
  supabase: SupabaseClient,
  postId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const ok = await ensureParticipantsTable(supabase)
  if (!ok) return { ok: false, message: '募集機能の準備が完了していません' }
  try {
    // 行ごと削除して空に近づける (DELETE は自分の行だけ許可されている)
    const { error } = await supabase
      .from('village_post_participants')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId)
    if (error) {
      console.error('[recruitment.leaveRecruitment] error:', error)
      return { ok: false, message: '解除できませんでした' }
    }
    return { ok: true }
  } catch (e: any) {
    console.error('[recruitment.leaveRecruitment] caught:', e)
    return { ok: false, message: '解除できませんでした' }
  }
}

/**
 * 募集を終了する (host のみ)。
 * recruitment_status を 'closed' に。UPDATE は host_id = auth.uid() で書けるはず
 * (既存 village_posts の UPDATE ポリシーに依存)。
 */
export async function closeRecruitment(
  supabase: SupabaseClient,
  postId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const { error } = await supabase
      .from('village_posts')
      .update({ recruitment_status: 'closed' })
      .eq('id', postId)
      .eq('user_id', userId)
    if (error) {
      console.error('[recruitment.closeRecruitment] error:', error)
      return { ok: false, message: '終了できませんでした' }
    }
    return { ok: true }
  } catch (e: any) {
    console.error('[recruitment.closeRecruitment] caught:', e)
    return { ok: false, message: '終了できませんでした' }
  }
}

// ────────────────────────────────────────────────────────────
// 参加通知 (notifications insert)
// ────────────────────────────────────────────────────────────

/**
 * 募集に参加した時、募集主に通知を送る。
 * 既存 notifications テーブルに新 type 'recruitment_joined' で INSERT。
 * notifications.type は text なので新値を追加するだけで動く。
 * 失敗しても join 自体は成立しているので silent fail。
 */
export async function notifyRecruitmentJoin(
  supabase: SupabaseClient,
  opts: {
    recruitmentOwnerId: string  // 募集主 (= 通知受信者)
    joinerId: string            // 参加者 (= actor)
    postId: string              // village_posts.id
  },
): Promise<void> {
  if (opts.recruitmentOwnerId === opts.joinerId) return  // 自己参加 (host が自分の募集に) は通知しない
  try {
    await supabase.from('notifications').insert({
      user_id: opts.recruitmentOwnerId,
      actor_id: opts.joinerId,
      type: 'recruitment_joined',
      target_id: opts.postId,
      target_type: 'village_post',
      priority: 'high',
    })
  } catch (e) {
    console.warn('[recruitment.notifyRecruitmentJoin] silent fail:', e)
  }
}

// ────────────────────────────────────────────────────────────
// 表示用 helper
// ────────────────────────────────────────────────────────────

export const RECRUITMENT_TYPE_LABEL: Record<RecruitmentType, { emoji: string; label: string }> = {
  voice_play:        { emoji: '🎙️', label: 'ボイスで遊ぶ' },
  beginner_friendly: { emoji: '🌱', label: '初心者歓迎' },
  rank:              { emoji: '🏆', label: 'ガチ / ランクマ' },
  casual:            { emoji: '🍵', label: 'のんびり' },
  other:             { emoji: '🎮', label: 'その他' },
}

export const PLAY_STYLE_LABEL: Record<PlayStyle, { emoji: string; label: string }> = {
  casual:  { emoji: '🍵', label: 'カジュアル' },
  rank:    { emoji: '🏆', label: 'ランクマ' },
  fun:     { emoji: '🎉', label: 'エンジョイ' },
  serious: { emoji: '🔥', label: 'ガチ' },
}

export const RECRUITMENT_STATUS_LABEL: Record<RecruitmentStatus, { color: string; label: string }> = {
  open:      { color: '#39FF88', label: '募集中' },
  closed:    { color: '#9CA3AF', label: '募集終了' },
  expired:   { color: '#9CA3AF', label: '期限切れ' },
  completed: { color: '#9CA3AF', label: '完了' },
}
