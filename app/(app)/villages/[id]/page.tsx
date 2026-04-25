'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Mic, Users, Send, Flag, CheckCircle, Crown,
  Pin, Trash2, Settings2, BookOpen, Save, X, PinOff,
} from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import { getCurrentWeeklyEvent, VILLAGE_TYPE_STYLES } from '@/components/ui/VillageCard'
import TrustBadge from '@/components/ui/TrustBadge'
import PhoneVerifyModal from '@/components/features/PhoneVerifyModal'
import { getUserTrust, getTierById, awardPoints } from '@/lib/trust'

// ─── Constants ────────────────────────────────────────────────
const POST_CATEGORIES = ['全部', '雑談', '相談', '仕事', '趣味', '今日のひとこと', '初参加あいさつ']

const CAT_ICONS: Record<string, string> = {
  '全部':           '📋',
  '雑談':           '💬',
  '相談':           '🤝',
  '仕事':           '💼',
  '趣味':           '🎨',
  '今日のひとこと':   '✏️',
  '初参加あいさつ':   '🌱',
}

const CAT_COLORS: Record<string, string> = {
  '雑談':           '#8b7355',
  '相談':           '#1a9ec8',
  '仕事':           '#4f56c8',
  '趣味':           '#d44060',
  '今日のひとこと':   '#d99820',
  '初参加あいさつ':   '#14a89a',
}

const VOICE_ROOM_NAMES: Record<string, string> = {
  '雑談':     '🌿 雑談広場',
  '相談':     '🤝 相談小屋',
  '仕事終わり': '🌙 仕事終わりの縁側',
  '焚き火':   '🔥 焚き火部屋',
  '初参加':   '🌱 はじめての広場',
  '趣味':     '🎨 趣味の広場',
  '職業':     '💼 職人の広場',
  '地域':     '📍 地域の広場',
}

const MILESTONES = [10, 50, 100, 300, 500]

function getLevelInfo(count: number) {
  if (count >= 500) return { icon: '✨', label: '伝説の村' }
  if (count >= 200) return { icon: '🏡', label: '栄えた村' }
  if (count >= 50)  return { icon: '🌳', label: '活発な村' }
  if (count >= 10)  return { icon: '🌿', label: '育ち中' }
  return                   { icon: '🌱', label: '芽吹いた村' }
}

function getWeekLabel(weekStart: string) {
  const d = new Date(weekStart)
  const m = d.getMonth() + 1
  const w = d.getDate()
  return `${m}月${w}日の週`
}

// ─── 相談解決モーダル ─────────────────────────────────────────
function ResolveModal({
  post, members, userId, onClose, onResolved,
}: {
  post: any; members: any[]; userId: string; onClose: () => void; onResolved: () => void
}) {
  const [selectedHelper, setSelectedHelper] = useState<string | null>(null)
  const [resolving, setResolving] = useState(false)
  const others = members.filter(m => m.user_id !== userId)

  async function handleResolve() {
    setResolving(true)
    const supabase = createClient()
    await supabase.from('village_posts')
      .update({ is_resolved: true, resolved_by_user_id: userId })
      .eq('id', post.id)
    await supabase.from('consultation_resolutions').upsert({
      post_id: post.id, resolved_by: userId, helper_user_id: selectedHelper ?? null,
    })
    if (selectedHelper) {
      const { data: helperTrust } = await supabase
        .from('user_trust').select('tier').eq('user_id', selectedHelper).single()
      const helperTier = getTierById(helperTrust?.tier ?? 'visitor')
      if (helperTier.canConsult) {
        await supabase.from('villages')
          .update({ welcome_reply_count_7d: post.village_id })
          .eq('id', post.village_id)
      }
    }
    onResolved()
    onClose()
    setResolving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl">
        <div className="text-center mb-4">
          <div className="text-3xl mb-2">✅</div>
          <h3 className="font-extrabold text-stone-900 text-base">解決済みにする</h3>
          <p className="text-xs text-stone-500 mt-1 leading-relaxed">
            誰かのおかげで解決しましたか？<br />
            選ぶとその住民の信頼ポイントが上がります。
          </p>
        </div>
        <div className="space-y-2 mb-5 max-h-48 overflow-y-auto">
          <button
            onClick={() => setSelectedHelper(null)}
            className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
              selectedHelper === null ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-stone-200 text-stone-600'
            }`}
          >
            🙋 自分で解決しました
          </button>
          {others.map(m => (
            <button
              key={m.user_id}
              onClick={() => setSelectedHelper(m.user_id)}
              className={`w-full text-left px-4 py-2.5 rounded-xl border flex items-center gap-2.5 transition-all ${
                selectedHelper === m.user_id ? 'border-emerald-400 bg-emerald-50' : 'border-stone-200'
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-600 flex-shrink-0">
                {m.profiles?.display_name?.[0] ?? '?'}
              </div>
              <span className={`text-sm font-medium flex-1 ${selectedHelper === m.user_id ? 'text-emerald-700' : 'text-stone-700'}`}>
                {m.profiles?.display_name ?? '住民'}
              </span>
              {selectedHelper === m.user_id && (
                <span className="text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                  +25pt
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-stone-200 text-sm font-bold text-stone-500">
            キャンセル
          </button>
          <button
            onClick={handleResolve}
            disabled={resolving}
            className="flex-1 py-3 rounded-2xl text-white text-sm font-bold disabled:opacity-40 active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}
          >
            {resolving
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
              : '解決済みにする'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── PostCard (shared between Posts tab and Admin tab) ────────
function PostCard({
  post,
  style,
  likedPosts,
  onToggleLike,
  onResolve,
  onPin,
  onDelete,
  isPinned,
  userId,
  isHost,
}: {
  post: any; style: any; likedPosts: Set<string>
  onToggleLike: (id: string) => void
  onResolve?: (post: any) => void
  onPin?: (postId: string | null) => void
  onDelete?: (postId: string) => void
  isPinned?: boolean
  userId: string | null
  isHost: boolean
}) {
  const catColor = CAT_COLORS[post.category] ?? style.accent

  return (
    <div
      className="bg-white rounded-3xl overflow-hidden shadow-sm"
      style={{
        border: isPinned
          ? `1px solid ${style.accent}60`
          : post.is_resolved
            ? '1px solid #bbf7d0'
            : '1px solid #f5f5f4',
        boxShadow: isPinned
          ? `0 2px 16px ${style.accent}18`
          : post.is_resolved
            ? '0 2px 12px rgba(34,197,94,0.08)'
            : '0 2px 12px rgba(0,0,0,0.05)',
      }}
    >
      {/* Category accent bar */}
      <div className="h-1 w-full" style={{ background: isPinned ? style.accent : catColor }} />

      <div className="p-4">
        {/* Pinned banner */}
        {isPinned && (
          <div
            className="flex items-center gap-1.5 text-[10px] font-bold mb-2 px-2 py-1 rounded-full w-fit"
            style={{ background: `${style.accent}15`, color: style.accent }}
          >
            <Pin size={10} /> ピン留め中
          </div>
        )}

        {/* Post header */}
        <div className="flex items-start justify-between mb-2.5">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold text-white flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${catColor} 0%, ${catColor}99 100%)` }}
            >
              {post.profiles?.display_name?.[0] ?? '?'}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-stone-800">
                  {post.profiles?.display_name ?? '住民'}
                </p>
                {post.user_trust?.tier && <TrustBadge tierId={post.user_trust.tier} size="xs" />}
              </div>
              <p className="text-[10px] text-stone-400">{timeAgo(post.created_at)}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {post.is_resolved && (
              <span className="flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                <CheckCircle size={10} /> 解決済み
              </span>
            )}
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: `${catColor}15`, color: catColor, border: `1px solid ${catColor}30` }}
            >
              {CAT_ICONS[post.category]} {post.category}
            </span>
          </div>
        </div>

        <p className="text-sm text-stone-800 leading-relaxed mb-3">{post.content}</p>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-50">
          <button
            onClick={() => onToggleLike(post.id)}
            className="flex items-center gap-1.5 text-xs font-semibold transition-all active:scale-90"
            style={{ color: likedPosts.has(post.id) ? '#f43f5e' : '#a8a29e' }}
          >
            <span className="text-base">{likedPosts.has(post.id) ? '❤️' : '🤍'}</span>
            <span>{post.reaction_count}</span>
          </button>

          <div className="flex items-center gap-1.5">
            {post.category === '相談' && post.user_id === userId && !post.is_resolved && onResolve && (
              <button
                onClick={() => onResolve(post)}
                className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full active:scale-95 transition-all"
                style={{ background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' }}
              >
                <CheckCircle size={10} /> 解決済みにする
              </button>
            )}

            {/* Host-only: pin/unpin */}
            {isHost && onPin && (
              <button
                onClick={() => onPin(isPinned ? null : post.id)}
                className="p-1.5 rounded-full transition-all active:scale-90"
                style={{ background: isPinned ? `${style.accent}20` : '#f5f5f4', color: isPinned ? style.accent : '#a8a29e' }}
                title={isPinned ? 'ピン解除' : 'ピン留め'}
              >
                {isPinned ? <PinOff size={12} /> : <Pin size={12} />}
              </button>
            )}

            {/* Host-only: delete */}
            {isHost && onDelete && post.user_id !== userId && (
              <button
                onClick={() => onDelete(post.id)}
                className="p-1.5 rounded-full transition-all active:scale-90 text-stone-300 hover:text-red-400 hover:bg-red-50"
                title="投稿を削除"
              >
                <Trash2 size={12} />
              </button>
            )}

            {!isHost && (
              <button className="text-stone-200 hover:text-stone-400 transition-colors">
                <Flag size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────
export default function VillageDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [village,     setVillage]     = useState<any>(null)
  const [posts,       setPosts]       = useState<any[]>([])
  const [voiceRooms,  setVoiceRooms]  = useState<any[]>([])
  const [members,     setMembers]     = useState<any[]>([])
  const [userTrust,   setUserTrust]   = useState<any>(null)
  const [diary,       setDiary]       = useState<any[]>([])
  const [pinnedPost,  setPinnedPost]  = useState<any>(null)

  const [tab,         setTab]         = useState<'posts' | 'voice' | 'members' | 'diary' | 'admin'>('posts')
  const [postCat,     setPostCat]     = useState('全部')
  const [isMember,    setIsMember]    = useState(false)
  const [isHost,      setIsHost]      = useState(false)
  const [userId,      setUserId]      = useState<string | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [newPost,     setNewPost]     = useState('')
  const [newPostCat,  setNewPostCat]  = useState('雑談')
  const [posting,     setPosting]     = useState(false)
  const [likedPosts,  setLikedPosts]  = useState<Set<string>>(new Set())
  const [joining,     setJoining]     = useState(false)

  // Admin state
  const [rules,       setRules]       = useState<string[]>(['', '', ''])
  const [savingRules, setSavingRules] = useState(false)
  const [savedRules,  setSavedRules]  = useState(false)
  const [generatingDiary, setGeneratingDiary] = useState(false)
  const [kickingUser, setKickingUser] = useState<string | null>(null)

  const [showPhoneVerify, setShowPhoneVerify] = useState(false)
  const [resolvePost,     setResolvePost]     = useState<any>(null)

  const weeklyEvent = getCurrentWeeklyEvent()

  // ── Auth ──────────────────────────────────────────────────
  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const trust = await getUserTrust(user.id)
      setUserTrust(trust)
    })
  }, [])

  // ── Fetchers ──────────────────────────────────────────────
  const fetchVillage = useCallback(async () => {
    const { data } = await createClient()
      .from('villages').select('*, profiles(display_name)').eq('id', id).single()
    if (data) {
      setVillage(data)
      setRules(data.rules ?? ['', '', ''])
    }
    setLoading(false)
  }, [id])

  const checkMembership = useCallback(async () => {
    if (!userId) return
    const { data } = await createClient()
      .from('village_members').select('user_id, role')
      .eq('village_id', id).eq('user_id', userId).maybeSingle()
    setIsMember(!!data)
    setIsHost(data?.role === 'host')
  }, [id, userId])

  const fetchPosts = useCallback(async () => {
    let q = createClient()
      .from('village_posts')
      .select('*, profiles(display_name, avatar_url), user_trust!village_posts_user_id_fkey(tier, is_shadow_banned)')
      .eq('village_id', id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (postCat !== '全部') q = q.eq('category', postCat)
    const { data } = await q
    const filtered = (data || []).filter((p: any) => !p.user_trust?.is_shadow_banned)
    setPosts(filtered)
  }, [id, postCat])

  const fetchPinnedPost = useCallback(async () => {
    if (!village?.pinned_post_id) { setPinnedPost(null); return }
    const { data } = await createClient()
      .from('village_posts')
      .select('*, profiles(display_name, avatar_url), user_trust!village_posts_user_id_fkey(tier)')
      .eq('id', village.pinned_post_id).single()
    setPinnedPost(data ?? null)
  }, [village?.pinned_post_id])

  const fetchVoiceRooms = useCallback(async () => {
    const { data } = await createClient()
      .from('voice_rooms')
      .select('*, profiles(display_name), voice_participants(user_id, is_listener)')
      .eq('village_id', id).eq('status', 'active')
      .order('created_at', { ascending: false })
    setVoiceRooms(data || [])
  }, [id])

  const fetchMembers = useCallback(async () => {
    const { data } = await createClient()
      .from('village_members')
      .select('user_id, role, joined_at, profiles(display_name, avatar_url), user_trust(tier)')
      .eq('village_id', id)
      .order('joined_at', { ascending: true })
      .limit(50)
    setMembers(data || [])
  }, [id])

  const fetchLikes = useCallback(async () => {
    if (!userId) return
    const { data } = await createClient()
      .from('village_reactions').select('post_id').eq('user_id', userId)
    setLikedPosts(new Set((data || []).map((r: any) => r.post_id)))
  }, [userId])

  const fetchDiary = useCallback(async () => {
    const { data } = await createClient()
      .from('village_diary')
      .select('*, top_post:top_post_id(content, profiles(display_name))')
      .eq('village_id', id)
      .order('week_start', { ascending: false })
      .limit(8)
    setDiary(data || [])
  }, [id])

  useEffect(() => { fetchVillage() },    [fetchVillage])
  useEffect(() => { checkMembership() }, [checkMembership])
  useEffect(() => { fetchPosts() },      [fetchPosts])
  useEffect(() => { fetchVoiceRooms() }, [fetchVoiceRooms])
  useEffect(() => { fetchMembers() },    [fetchMembers])
  useEffect(() => { fetchLikes() },      [fetchLikes])
  useEffect(() => { fetchDiary() },      [fetchDiary])
  useEffect(() => { fetchPinnedPost() }, [fetchPinnedPost])

  const tier = userTrust ? getTierById(userTrust.tier) : getTierById('visitor')

  // ── Actions ───────────────────────────────────────────────
  async function toggleMembership() {
    if (!userId) { router.push('/login'); return }
    setJoining(true)
    const supabase = createClient()
    if (isMember) {
      await supabase.from('village_members').delete().eq('village_id', id).eq('user_id', userId)
      setIsMember(false)
      setIsHost(false)
    } else {
      await supabase.from('village_members').insert({ village_id: id, user_id: userId })
      setIsMember(true)

      // Milestone check
      const { data: updatedVillage } = await supabase
        .from('villages').select('member_count, milestone_reached').eq('id', id).single()
      if (updatedVillage) {
        const count    = updatedVillage.member_count ?? 0
        const reached  = (updatedVillage.milestone_reached as number[]) ?? []
        const nextMile = MILESTONES.find(m => m <= count && !reached.includes(m))
        if (nextMile) {
          await supabase.rpc('notify_village_milestone', { p_village_id: id, p_milestone: nextMile })
          await supabase.from('villages').update({
            milestone_reached: [...reached, nextMile],
          }).eq('id', id)
        }
      }
    }
    setJoining(false)
    fetchVillage()
  }

  async function submitPost() {
    if (!userId || !newPost.trim() || posting) return
    if (!tier.canPost) { setShowPhoneVerify(true); return }
    setPosting(true)
    await createClient().from('village_posts').insert({
      village_id: id, user_id: userId,
      content: newPost.trim(), category: newPostCat,
    })
    if (newPostCat === '初参加あいさつ') await awardPoints('welcomed_new_member', id)
    setNewPost('')
    await fetchPosts()
    setPosting(false)
  }

  async function toggleLike(postId: string) {
    if (!userId) return
    if (!tier.canPost) { setShowPhoneVerify(true); return }
    const supabase = createClient()
    if (likedPosts.has(postId)) {
      await supabase.from('village_reactions').delete().eq('post_id', postId).eq('user_id', userId)
      setLikedPosts(prev => { const n = new Set(prev); n.delete(postId); return n })
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, reaction_count: Math.max(0, p.reaction_count - 1) } : p))
    } else {
      await supabase.from('village_reactions').upsert({ post_id: postId, user_id: userId })
      setLikedPosts(prev => new Set([...prev, postId]))
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, reaction_count: p.reaction_count + 1 } : p))
    }
  }

  async function createVoiceRoom() {
    if (!userId || !village) return
    if (!tier.canCreateRoom) { setShowPhoneVerify(true); return }
    const supabase = createClient()
    const roomName = VOICE_ROOM_NAMES[village.type] ?? '🌿 村の広場'
    const { data } = await supabase.from('voice_rooms').insert({
      host_id: userId, title: roomName,
      category: '雑談', is_open: true, village_id: id,
    }).select().single()
    if (data) {
      await supabase.from('voice_participants').insert({ room_id: data.id, user_id: userId })
      await awardPoints('voice_participated', data.id)
      router.push(`/voice/${data.id}`)
    }
  }

  // ── Admin actions ─────────────────────────────────────────
  async function saveRules() {
    setSavingRules(true)
    const cleaned = rules.map(r => r.trim()).filter(Boolean)
    await createClient().from('villages').update({ rules: cleaned }).eq('id', id)
    setSavingRules(false)
    setSavedRules(true)
    setTimeout(() => setSavedRules(false), 2000)
    fetchVillage()
  }

  async function setPinnedPostId(postId: string | null) {
    await createClient().from('villages').update({ pinned_post_id: postId }).eq('id', id)
    await fetchVillage()
  }

  async function deletePost(postId: string) {
    await createClient().from('village_posts').delete().eq('id', postId)
    setPosts(prev => prev.filter(p => p.id !== postId))
    if (village?.pinned_post_id === postId) {
      await createClient().from('villages').update({ pinned_post_id: null }).eq('id', id)
      setPinnedPost(null)
    }
  }

  async function kickMember(memberId: string) {
    setKickingUser(memberId)
    await createClient().from('village_members').delete()
      .eq('village_id', id).eq('user_id', memberId)
    setMembers(prev => prev.filter(m => m.user_id !== memberId))
    setKickingUser(null)
  }

  async function generateDiary() {
    setGeneratingDiary(true)
    await createClient().rpc('generate_village_diary', { p_village_id: id })
    await fetchDiary()
    setGeneratingDiary(false)
  }

  // ─────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9]">
      <span className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!village) return null

  const style        = VILLAGE_TYPE_STYLES[village.type] ?? VILLAGE_TYPE_STYLES['雑談']
  const level        = getLevelInfo(village.member_count)
  const busyScore    = Math.min(5, Math.floor(village.post_count_7d / 5))
  const safetyScore  = village.report_count_7d === 0 ? 5 : village.report_count_7d < 2 ? 3 : 1
  const welcomeScore = Math.min(5, Math.floor(village.welcome_reply_count_7d / 2) + 1)

  const allTabs = [
    { key: 'posts',   label: '📝 投稿' },
    { key: 'voice',   label: '🎙️ 通話' },
    { key: 'members', label: '👥 住民' },
    { key: 'diary',   label: '📰 だより' },
    ...(isHost ? [{ key: 'admin', label: '⚙️ 管理' }] : []),
  ]

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9]">

      {/* ══ HERO HEADER ═══════════════════════════════════════ */}
      <div
        className="relative overflow-hidden"
        style={{ background: style.gradient, minHeight: 200 }}
      >
        {/* Noise texture */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Back */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 w-9 h-9 flex items-center justify-center rounded-full active:scale-90 transition-all z-10"
          style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}
        >
          <ArrowLeft size={18} className="text-white" />
        </button>

        {/* Join / Joined */}
        <button
          onClick={toggleMembership}
          disabled={joining}
          className="absolute top-4 right-4 px-4 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 z-10"
          style={
            isMember
              ? { background: 'rgba(0,0,0,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(8px)' }
              : { background: '#fff', color: style.accent, fontWeight: 800 }
          }
        >
          {joining ? '…' : isMember ? '住民 ✓' : '参加する →'}
        </button>

        {/* Level badge */}
        <div
          className="absolute top-14 left-4 flex items-center gap-1 text-white text-[9px] font-bold px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
        >
          {level.icon} {level.label}
        </div>

        {village.season_title && (
          <div
            className="absolute top-14 right-4 text-white text-[9px] font-bold px-2.5 py-1 rounded-full max-w-[130px] truncate"
            style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
          >
            {village.season_title}
          </div>
        )}

        <div className="flex flex-col items-center justify-center pt-16 pb-6 px-6">
          <span style={{ fontSize: '3.5rem', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}>
            {village.icon}
          </span>
          <h1 className="font-extrabold text-white text-xl mt-2 text-center leading-tight drop-shadow-md">
            {village.name}
          </h1>
          <p className="text-white/70 text-xs mt-1 text-center line-clamp-2 max-w-[280px]">
            {village.description}
          </p>
          {isHost && (
            <div
              className="mt-2 flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(255,215,0,0.25)', color: '#fde047', border: '1px solid rgba(255,215,0,0.3)' }}
            >
              <Crown size={10} /> 村長
            </div>
          )}
        </div>

        {/* Stats bar */}
        <div
          className="mx-4 mb-4 rounded-2xl px-4 py-3 grid grid-cols-3 gap-3"
          style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          {[
            { label: 'にぎわい',   value: busyScore },
            { label: '安心度',     value: safetyScore },
            { label: '入りやすさ', value: welcomeScore },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-[9px] text-white/50 font-semibold mb-1">{label}</p>
              <div className="flex gap-0.5 justify-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-2.5 h-1.5 rounded-full"
                    style={{ background: i < value ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)' }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 見習いバナー ── */}
      {userTrust && userTrust.tier === 'visitor' && (
        <div
          onClick={() => setShowPhoneVerify(true)}
          className="mx-4 mt-3 rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer active:scale-[0.99] transition-all"
          style={{ background: `${style.accent}15`, border: `1px solid ${style.accent}30` }}
        >
          <span className="text-2xl">📱</span>
          <div className="flex-1">
            <p className="text-xs font-bold" style={{ color: style.accent }}>電話番号を認証して「住民」になろう</p>
            <p className="text-[10px] text-stone-400">投稿・通話ができるようになります · +30pt</p>
          </div>
          <span className="text-stone-400 text-sm">›</span>
        </div>
      )}

      {/* ── Rules banner (if set) ── */}
      {village.rules && village.rules.length > 0 && (
        <div
          className="mx-4 mt-3 rounded-2xl px-4 py-3"
          style={{ background: `${style.accent}08`, border: `1px solid ${style.accent}20` }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: style.accent }}>
            📜 村のルール
          </p>
          <div className="space-y-1">
            {(village.rules as string[]).map((r, i) => r && (
              <p key={i} className="text-xs text-stone-600 leading-relaxed">・{r}</p>
            ))}
          </div>
        </div>
      )}

      {/* ── Weekly event ── */}
      <div
        className="mx-4 mt-3 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl"
        style={{ background: `${style.accent}12`, border: `1px solid ${style.accent}25` }}
      >
        <span className="text-base">{weeklyEvent.icon}</span>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: style.accent }}>今週のイベント</p>
          <p className="text-xs font-bold text-stone-800">{weeklyEvent.label}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-stone-400 text-xs">
          <Users size={11} />
          <span className="font-semibold">{village.member_count} 住民</span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="px-4 pt-3 pb-2 sticky top-0 z-10 bg-[#FAFAF9]">
        <div
          className="flex gap-1 rounded-2xl p-1 overflow-x-auto scrollbar-none"
          style={{ background: `${style.accent}12`, border: `1px solid ${style.accent}20` }}
        >
          {allTabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key as any)}
              className="flex-shrink-0 flex-1 py-2 text-[11px] font-bold rounded-xl transition-all whitespace-nowrap px-1"
              style={
                tab === key
                  ? { background: style.accent, color: '#fff', boxShadow: `0 2px 8px ${style.accent}40` }
                  : { color: style.accent }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ════════════════ POSTS TAB ════════════════ */}
      {tab === 'posts' && (
        <div className="px-4 pb-32 space-y-3">

          {/* Category filter */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            {POST_CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setPostCat(c)}
                className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-bold border transition-all"
                style={
                  postCat === c
                    ? { background: style.accent, color: '#fff', border: `1px solid ${style.accent}` }
                    : { background: '#fff', borderColor: '#e7e5e4', color: '#78716c' }
                }
              >
                {CAT_ICONS[c]} {c}
              </button>
            ))}
          </div>

          {/* Compose */}
          {isMember && (
            tier.canPost ? (
              <div className="bg-white border border-stone-100 rounded-3xl p-4 shadow-md"
                style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
              >
                <div className="flex gap-1.5 overflow-x-auto scrollbar-none mb-3 pb-0.5">
                  {POST_CATEGORIES.slice(1).map(c => (
                    <button
                      key={c}
                      onClick={() => setNewPostCat(c)}
                      className="flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all"
                      style={
                        newPostCat === c
                          ? { background: `${CAT_COLORS[c] ?? style.accent}18`, color: CAT_COLORS[c] ?? style.accent, borderColor: `${CAT_COLORS[c] ?? style.accent}40` }
                          : { background: '#fafaf9', borderColor: '#e7e5e4', color: '#a8a29e' }
                      }
                    >
                      {CAT_ICONS[c]} {c}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 items-end">
                  <textarea
                    value={newPost}
                    onChange={e => setNewPost(e.target.value)}
                    placeholder="村に投稿する…"
                    rows={2}
                    maxLength={300}
                    className="flex-1 px-3 py-2.5 rounded-2xl border border-stone-200 text-sm resize-none focus:outline-none"
                  />
                  <button
                    onClick={submitPost}
                    disabled={!newPost.trim() || posting}
                    className="w-11 h-11 rounded-2xl flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all flex-shrink-0"
                    style={{ background: style.accent, boxShadow: `0 4px 12px ${style.accent}50` }}
                  >
                    {posting
                      ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Send size={15} className="text-white" />}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowPhoneVerify(true)}
                className="w-full rounded-2xl px-4 py-3.5 text-center border-dashed border-2 transition-all active:scale-[0.99]"
                style={{ borderColor: `${style.accent}40`, background: `${style.accent}08` }}
              >
                <p className="text-xs font-bold" style={{ color: style.accent }}>📱 電話認証すると投稿できます</p>
                <p className="text-[10px] text-stone-400 mt-0.5">タップして認証 (+30pt)</p>
              </button>
            )
          )}

          {/* Pinned post */}
          {pinnedPost && postCat === '全部' && (
            <PostCard
              post={pinnedPost}
              style={style}
              likedPosts={likedPosts}
              onToggleLike={toggleLike}
              onResolve={setResolvePost}
              onPin={isHost ? setPinnedPostId : undefined}
              onDelete={isHost ? deletePost : undefined}
              isPinned={true}
              userId={userId}
              isHost={isHost}
            />
          )}

          {/* Post list */}
          {posts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">🌿</p>
              <p className="text-sm font-bold text-stone-600">まだ投稿がありません</p>
              <p className="text-xs text-stone-400 mt-1">最初の投稿をしてみましょう</p>
            </div>
          ) : (
            posts
              .filter(p => p.id !== village?.pinned_post_id || postCat !== '全部')
              .map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  style={style}
                  likedPosts={likedPosts}
                  onToggleLike={toggleLike}
                  onResolve={setResolvePost}
                  onPin={isHost ? setPinnedPostId : undefined}
                  onDelete={isHost ? deletePost : undefined}
                  isPinned={false}
                  userId={userId}
                  isHost={isHost}
                />
              ))
          )}
        </div>
      )}

      {/* ════════════════ VOICE TAB ════════════════ */}
      {tab === 'voice' && (
        <div className="px-4 pb-32 space-y-3 pt-1">
          <div
            className="rounded-2xl px-4 py-3.5 flex items-start gap-3"
            style={{ background: `${style.accent}10`, border: `1px solid ${style.accent}20` }}
          >
            <span className="text-2xl mt-0.5">🎙️</span>
            <div>
              <p className="text-sm font-bold" style={{ color: style.accent }}>村の通話広場</p>
              <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
                住民と声で話せます。聴くだけでも参加OKです。
              </p>
            </div>
          </div>

          {isMember && (
            <button
              onClick={createVoiceRoom}
              className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
              style={
                tier.canCreateRoom
                  ? { background: style.gradient, color: '#fff', boxShadow: `0 6px 20px ${style.accent}40` }
                  : { background: '#f5f5f4', color: '#a8a29e' }
              }
            >
              <Mic size={16} />
              {tier.canCreateRoom ? '広場を開く' : '「常連」になると広場を開けます'}
            </button>
          )}

          {voiceRooms.length === 0 ? (
            <div className="text-center py-14">
              <p className="text-4xl mb-3">🔥</p>
              <p className="text-sm font-bold text-stone-600">今は誰もいません</p>
              <p className="text-xs text-stone-400 mt-1">最初に広場を開いてみましょう</p>
            </div>
          ) : (
            voiceRooms.map(room => {
              const total = room.voice_participants?.length ?? 0
              return (
                <div
                  key={room.id}
                  onClick={() => router.push(`/voice/${room.id}`)}
                  className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm cursor-pointer active:scale-[0.99] hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-stone-900 text-sm">{room.title}</p>
                      <p className="text-xs text-stone-400 mt-0.5">{room.profiles?.display_name} が開催中</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-red-50 border border-red-100 px-2 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-xs font-bold text-red-600">LIVE</span>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-semibold text-stone-600">
                        <Users size={12} /> {total}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ════════════════ MEMBERS TAB ════════════════ */}
      {tab === 'members' && (
        <div className="px-4 pb-32 space-y-2 pt-1">
          <p className="text-xs text-stone-400 font-semibold mb-3">
            {village.member_count} 人が住んでいます
          </p>
          {members.map((m: any) => (
            <div
              key={m.user_id}
              className="bg-white border border-stone-100 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold text-white flex-shrink-0"
                style={{ background: style.gradient }}
              >
                {m.profiles?.display_name?.[0] ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-stone-800 truncate">{m.profiles?.display_name ?? '住民'}</p>
                  {m.user_trust?.tier && <TrustBadge tierId={m.user_trust.tier} size="xs" />}
                </div>
                <p className="text-[10px] text-stone-400">
                  {m.role === 'host' ? '👑 村長' : '住民'} · {timeAgo(m.joined_at)}に参加
                </p>
              </div>
              {m.role === 'host' && (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: `${style.accent}20` }}
                >
                  <Crown size={13} style={{ color: style.accent }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ════════════════ DIARY TAB ════════════════ */}
      {tab === 'diary' && (
        <div className="px-4 pb-32 space-y-3 pt-1">
          {/* Header */}
          <div
            className="rounded-2xl px-4 py-3.5 flex items-start gap-3"
            style={{ background: `${style.accent}10`, border: `1px solid ${style.accent}20` }}
          >
            <span className="text-2xl mt-0.5">📰</span>
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: style.accent }}>村のだより</p>
              <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
                毎週の村の活動まとめが届きます
              </p>
            </div>
            {isHost && (
              <button
                onClick={generateDiary}
                disabled={generatingDiary}
                className="px-3 py-1.5 rounded-full text-[10px] font-bold text-white flex items-center gap-1 disabled:opacity-50 active:scale-95 transition-all"
                style={{ background: style.accent }}
              >
                {generatingDiary
                  ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                  : <BookOpen size={11} />}
                {generatingDiary ? '生成中…' : '今週分を作成'}
              </button>
            )}
          </div>

          {diary.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-sm font-bold text-stone-600">まだ村のだよりがありません</p>
              {isHost && (
                <p className="text-xs text-stone-400 mt-1">「今週分を作成」ボタンで生成できます</p>
              )}
            </div>
          ) : (
            diary.map((entry: any) => (
              <div
                key={entry.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-100"
              >
                {/* Header bar */}
                <div
                  className="px-4 py-2.5 flex items-center justify-between"
                  style={{ background: `${style.accent}15`, borderBottom: `1px solid ${style.accent}20` }}
                >
                  <p className="text-xs font-extrabold" style={{ color: style.accent }}>
                    {getWeekLabel(entry.week_start)}
                  </p>
                  <p className="text-[10px] text-stone-400">村のだより</p>
                </div>

                <div className="p-4 space-y-3">
                  {/* Summary text */}
                  <p className="text-sm text-stone-700 leading-relaxed">{entry.summary_text}</p>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: entry.new_members, label: '新しい住民', icon: '🌱' },
                      { value: entry.total_posts,  label: '投稿数',     icon: '📝' },
                      { value: entry.resolved_count, label: '解決した相談', icon: '✅' },
                    ].map(s => (
                      <div
                        key={s.label}
                        className="text-center rounded-xl py-2"
                        style={{ background: `${style.accent}08`, border: `1px solid ${style.accent}18` }}
                      >
                        <p className="text-base mb-0.5">{s.icon}</p>
                        <p className="font-extrabold text-stone-900 text-base leading-none">{s.value}</p>
                        <p className="text-[9px] text-stone-400 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Top post */}
                  {entry.top_post && (
                    <div
                      className="rounded-xl p-3"
                      style={{ background: `${style.accent}08`, border: `1px solid ${style.accent}20` }}
                    >
                      <p className="text-[10px] font-bold mb-1" style={{ color: style.accent }}>
                        🏆 今週の注目投稿
                      </p>
                      <p className="text-xs text-stone-700 line-clamp-2 leading-relaxed">
                        {entry.top_post?.content}
                      </p>
                      {entry.top_post?.profiles?.display_name && (
                        <p className="text-[10px] text-stone-400 mt-1">
                          by {entry.top_post.profiles.display_name}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ════════════════ ADMIN TAB (Host only) ════════════════ */}
      {tab === 'admin' && isHost && (
        <div className="px-4 pb-32 space-y-4 pt-1">

          {/* Admin header */}
          <div
            className="rounded-2xl px-4 py-3.5 flex items-center gap-3"
            style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)' }}
          >
            <Crown size={20} className="text-yellow-300 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-white">村長ダッシュボード</p>
              <p className="text-xs text-white/60">村の設定・管理ができます</p>
            </div>
          </div>

          {/* Rules editor */}
          <div className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                <Settings2 size={12} /> 村のルール
              </p>
              <p className="text-[10px] text-stone-400">3つまで設定できます</p>
            </div>
            <div className="space-y-2 mb-3">
              {[0, 1, 2].map(i => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-stone-400 font-bold flex-shrink-0 w-4">{i + 1}.</span>
                  <input
                    value={rules[i] ?? ''}
                    onChange={e => setRules(prev => {
                      const next = [...prev]
                      next[i] = e.target.value
                      return next
                    })}
                    maxLength={60}
                    placeholder={`ルール ${i + 1}（任意）`}
                    className="flex-1 px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-indigo-300"
                  />
                  {rules[i] && (
                    <button
                      onClick={() => setRules(prev => { const n = [...prev]; n[i] = ''; return n })}
                      className="text-stone-300 hover:text-stone-500 flex-shrink-0"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={saveRules}
              disabled={savingRules}
              className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
              style={{
                background: savedRules
                  ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                  : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              }}
            >
              {savingRules
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : savedRules
                  ? <><CheckCircle size={14} /> 保存しました</>
                  : <><Save size={14} /> ルールを保存</>
              }
            </button>
          </div>

          {/* Pinned post */}
          <div className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Pin size={12} /> ピン留め投稿
            </p>
            {pinnedPost ? (
              <div className="space-y-3">
                <div
                  className="rounded-xl p-3"
                  style={{ background: `${style.accent}08`, border: `1px solid ${style.accent}25` }}
                >
                  <p className="text-xs font-bold mb-1" style={{ color: style.accent }}>
                    現在ピン留め中
                  </p>
                  <p className="text-sm text-stone-700 line-clamp-2">{pinnedPost.content}</p>
                  <p className="text-[10px] text-stone-400 mt-1">
                    by {pinnedPost.profiles?.display_name}
                  </p>
                </div>
                <button
                  onClick={() => setPinnedPostId(null)}
                  className="w-full py-2.5 rounded-xl border border-stone-200 text-sm font-bold text-stone-500 flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all"
                >
                  <PinOff size={13} /> ピン解除
                </button>
              </div>
            ) : (
              <p className="text-xs text-stone-400 text-center py-3">
                「投稿」タブの各投稿からピン留めできます
              </p>
            )}
          </div>

          {/* Diary generation */}
          <div className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <BookOpen size={12} /> 村のだより
            </p>
            <p className="text-xs text-stone-500 mb-3 leading-relaxed">
              今週の活動（新規住民・投稿数・解決した相談）をまとめた「村のだより」を生成します。
            </p>
            <button
              onClick={async () => { await generateDiary(); setTab('diary') }}
              disabled={generatingDiary}
              className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 active:scale-[0.99] transition-all disabled:opacity-50"
              style={{ background: style.accent }}
            >
              {generatingDiary
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <BookOpen size={14} />}
              今週のだよりを生成
            </button>
          </div>

          {/* Member management */}
          <div className="bg-white border border-stone-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-stone-50 flex items-center justify-between">
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                <Users size={12} /> 住民管理
              </p>
              <p className="text-[10px] text-stone-400">{members.length} 人</p>
            </div>
            <div className="divide-y divide-stone-50 max-h-72 overflow-y-auto">
              {members.filter(m => m.role !== 'host').map((m: any) => (
                <div key={m.user_id} className="flex items-center gap-3 px-4 py-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold text-white flex-shrink-0"
                    style={{ background: style.gradient }}
                  >
                    {m.profiles?.display_name?.[0] ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-stone-800 truncate">{m.profiles?.display_name ?? '住民'}</p>
                    <p className="text-[10px] text-stone-400">{timeAgo(m.joined_at)}に参加</p>
                  </div>
                  <button
                    onClick={() => kickMember(m.user_id)}
                    disabled={kickingUser === m.user_id}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-red-400 border border-red-100 hover:bg-red-50 transition-all active:scale-95 disabled:opacity-40"
                  >
                    {kickingUser === m.user_id ? '…' : '退村'}
                  </button>
                </div>
              ))}
              {members.filter(m => m.role !== 'host').length === 0 && (
                <p className="text-xs text-stone-400 text-center py-6">まだ住民がいません</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {showPhoneVerify && (
        <PhoneVerifyModal
          onClose={() => setShowPhoneVerify(false)}
          onVerified={async () => {
            const trust = await getUserTrust(userId!)
            setUserTrust(trust)
          }}
        />
      )}
      {resolvePost && (
        <ResolveModal
          post={resolvePost}
          members={members}
          userId={userId!}
          onClose={() => setResolvePost(null)}
          onResolved={() => fetchPosts()}
        />
      )}
    </div>
  )
}
