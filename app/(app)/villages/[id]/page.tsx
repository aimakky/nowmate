'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Mic, Users, Send, Flag, CheckCircle, Crown } from 'lucide-react'
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

function getLevelInfo(count: number) {
  if (count >= 500) return { icon: '✨', label: '伝説の村' }
  if (count >= 200) return { icon: '🏡', label: '栄えた村' }
  if (count >= 50)  return { icon: '🌳', label: '活発な村' }
  if (count >= 10)  return { icon: '🌿', label: '育ち中' }
  return                   { icon: '🌱', label: '芽吹いた村' }
}

// ─── 相談解決モーダル ─────────────────────────────────────────
function ResolveModal({
  post,
  members,
  userId,
  onClose,
  onResolved,
}: {
  post: any
  members: any[]
  userId: string
  onClose: () => void
  onResolved: () => void
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
      post_id:        post.id,
      resolved_by:    userId,
      helper_user_id: selectedHelper ?? null,
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
              selectedHelper === null
                ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                : 'border-stone-200 text-stone-600'
            }`}
          >
            🙋 自分で解決しました
          </button>
          {others.map(m => (
            <button
              key={m.user_id}
              onClick={() => setSelectedHelper(m.user_id)}
              className={`w-full text-left px-4 py-2.5 rounded-xl border flex items-center gap-2.5 transition-all ${
                selectedHelper === m.user_id
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-stone-200'
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

// ─── Main Page ────────────────────────────────────────────────
export default function VillageDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [village,    setVillage]    = useState<any>(null)
  const [posts,      setPosts]      = useState<any[]>([])
  const [voiceRooms, setVoiceRooms] = useState<any[]>([])
  const [members,    setMembers]    = useState<any[]>([])
  const [userTrust,  setUserTrust]  = useState<any>(null)

  const [tab,        setTab]        = useState<'posts' | 'voice' | 'members'>('posts')
  const [postCat,    setPostCat]    = useState('全部')
  const [isMember,   setIsMember]   = useState(false)
  const [userId,     setUserId]     = useState<string | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [newPost,    setNewPost]    = useState('')
  const [newPostCat, setNewPostCat] = useState('雑談')
  const [posting,    setPosting]    = useState(false)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [joining,    setJoining]    = useState(false)

  const [showPhoneVerify, setShowPhoneVerify] = useState(false)
  const [resolvePost,     setResolvePost]     = useState<any>(null)

  const weeklyEvent = getCurrentWeeklyEvent()

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const trust = await getUserTrust(user.id)
      setUserTrust(trust)
    })
  }, [])

  const fetchVillage = useCallback(async () => {
    const { data } = await createClient()
      .from('villages').select('*, profiles(display_name)').eq('id', id).single()
    setVillage(data)
    setLoading(false)
  }, [id])

  const checkMembership = useCallback(async () => {
    if (!userId) return
    const { data } = await createClient()
      .from('village_members').select('user_id')
      .eq('village_id', id).eq('user_id', userId).maybeSingle()
    setIsMember(!!data)
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

  useEffect(() => { fetchVillage() },    [fetchVillage])
  useEffect(() => { checkMembership() }, [checkMembership])
  useEffect(() => { fetchPosts() },      [fetchPosts])
  useEffect(() => { fetchVoiceRooms() }, [fetchVoiceRooms])
  useEffect(() => { fetchMembers() },    [fetchMembers])
  useEffect(() => { fetchLikes() },      [fetchLikes])

  const tier = userTrust ? getTierById(userTrust.tier) : getTierById('visitor')

  async function toggleMembership() {
    if (!userId) { router.push('/login'); return }
    setJoining(true)
    const supabase = createClient()
    if (isMember) {
      await supabase.from('village_members').delete().eq('village_id', id).eq('user_id', userId)
      setIsMember(false)
    } else {
      await supabase.from('village_members').insert({ village_id: id, user_id: userId })
      setIsMember(true)
    }
    setJoining(false)
  }

  async function submitPost() {
    if (!userId || !newPost.trim() || posting) return
    if (!tier.canPost) { setShowPhoneVerify(true); return }
    setPosting(true)
    await createClient().from('village_posts').insert({
      village_id: id, user_id: userId,
      content: newPost.trim(), category: newPostCat,
    })
    if (newPostCat === '初参加あいさつ') {
      await awardPoints('welcomed_new_member', id)
    }
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
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, reaction_count: Math.max(0, p.reaction_count - 1) } : p
      ))
    } else {
      await supabase.from('village_reactions').upsert({ post_id: postId, user_id: userId })
      setLikedPosts(prev => new Set([...prev, postId]))
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, reaction_count: p.reaction_count + 1 } : p
      ))
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9]">
      <span className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!village) return null

  const style      = VILLAGE_TYPE_STYLES[village.type] ?? VILLAGE_TYPE_STYLES['雑談']
  const level      = getLevelInfo(village.member_count)
  const busyScore    = Math.min(5, Math.floor(village.post_count_7d / 5))
  const safetyScore  = village.report_count_7d === 0 ? 5 : village.report_count_7d < 2 ? 3 : 1
  const welcomeScore = Math.min(5, Math.floor(village.welcome_reply_count_7d / 2) + 1)

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

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 w-9 h-9 flex items-center justify-center rounded-full active:scale-90 transition-all z-10"
          style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}
        >
          <ArrowLeft size={18} className="text-white" />
        </button>

        {/* Join button */}
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

        {/* Season title */}
        {village.season_title && (
          <div
            className="absolute top-14 right-4 text-white text-[9px] font-bold px-2.5 py-1 rounded-full max-w-[130px] truncate"
            style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
          >
            {village.season_title}
          </div>
        )}

        {/* Center: Icon + Name */}
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
        </div>

        {/* Stats bar — glassmorphism strip at bottom */}
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
          className="flex gap-1 rounded-2xl p-1"
          style={{ background: `${style.accent}12`, border: `1px solid ${style.accent}20` }}
        >
          {[
            { key: 'posts',   label: '📝 投稿' },
            { key: 'voice',   label: '🎙️ 通話' },
            { key: 'members', label: '👥 住民' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key as any)}
              className="flex-1 py-2 text-xs font-bold rounded-xl transition-all"
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
                {/* Category selector */}
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
                    style={{ focusBorderColor: style.accent } as any}
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

          {/* Post list */}
          {posts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">🌿</p>
              <p className="text-sm font-bold text-stone-600">まだ投稿がありません</p>
              <p className="text-xs text-stone-400 mt-1">最初の投稿をしてみましょう</p>
            </div>
          ) : (
            posts.map(post => {
              const catColor = CAT_COLORS[post.category] ?? style.accent
              return (
                <div
                  key={post.id}
                  className="bg-white rounded-3xl overflow-hidden shadow-sm"
                  style={{
                    border: post.is_resolved ? '1px solid #bbf7d0' : '1px solid #f5f5f4',
                    boxShadow: post.is_resolved
                      ? '0 2px 12px rgba(34,197,94,0.08)'
                      : '0 2px 12px rgba(0,0,0,0.05)',
                  }}
                >
                  {/* Category accent bar */}
                  <div className="h-1 w-full" style={{ background: catColor }} />

                  <div className="p-4">
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
                            {post.user_trust?.tier && (
                              <TrustBadge tierId={post.user_trust.tier} size="xs" />
                            )}
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
                        onClick={() => toggleLike(post.id)}
                        className="flex items-center gap-1.5 text-xs font-semibold transition-all active:scale-90"
                        style={{ color: likedPosts.has(post.id) ? '#f43f5e' : '#a8a29e' }}
                      >
                        <span className="text-base">{likedPosts.has(post.id) ? '❤️' : '🤍'}</span>
                        <span>{post.reaction_count}</span>
                      </button>

                      <div className="flex items-center gap-2">
                        {post.category === '相談' && post.user_id === userId && !post.is_resolved && (
                          <button
                            onClick={() => setResolvePost(post)}
                            className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full active:scale-95 transition-all"
                            style={{ background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' }}
                          >
                            <CheckCircle size={10} /> 解決済みにする
                          </button>
                        )}
                        <button className="text-stone-200 hover:text-stone-400 transition-colors">
                          <Flag size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ════════════════ VOICE TAB ════════════════ */}
      {tab === 'voice' && (
        <div className="px-4 pb-32 space-y-3 pt-1">
          {/* Intro card */}
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
              onClick={() => router.push(`/profile/${m.user_id}`)}
              className="bg-white border border-stone-100 rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer active:scale-[0.99] transition-all shadow-sm"
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
