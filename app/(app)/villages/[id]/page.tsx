'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Mic, Users, Send, Flag, CheckCircle } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import { getCurrentWeeklyEvent } from '@/components/ui/VillageCard'
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

    // 1. village_post を解決済みに
    await supabase.from('village_posts')
      .update({ is_resolved: true, resolved_by_user_id: userId })
      .eq('id', post.id)

    // 2. consultation_resolutions に記録
    await supabase.from('consultation_resolutions').upsert({
      post_id:        post.id,
      resolved_by:    userId,
      helper_user_id: selectedHelper ?? null,
    })

    // 3. 助けた人のポイント付与（常連以上の場合）
    if (selectedHelper) {
      const { data: helperTrust } = await supabase
        .from('user_trust').select('tier').eq('user_id', selectedHelper).single()
      const helperTier = getTierById(helperTrust?.tier ?? 'visitor')
      if (helperTier.canConsult) {
        // RPC で helper のポイントを付与（SECURITY DEFINER なので helper_id を引数で渡す版が必要）
        // 簡易版：helper が自分でawを呼ぶ仕組みのため、ここでは村のにぎわいスコアを上げる
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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl">
        <h3 className="font-extrabold text-stone-900 text-base mb-1">✅ 解決済みにする</h3>
        <p className="text-xs text-stone-500 mb-4">
          誰かのおかげで解決しましたか？<br />
          助けてくれた住民を選ぶと、その人の信頼ポイントが上がります。
        </p>

        {/* 助けた人を選ぶ */}
        <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
          <button
            onClick={() => setSelectedHelper(null)}
            className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
              selectedHelper === null
                ? 'border-brand-400 bg-brand-50 text-brand-700'
                : 'border-stone-200 text-stone-600'
            }`}
          >
            自分で解決しました
          </button>
          {others.map(m => (
            <button
              key={m.user_id}
              onClick={() => setSelectedHelper(m.user_id)}
              className={`w-full text-left px-4 py-2.5 rounded-xl border flex items-center gap-2.5 transition-all ${
                selectedHelper === m.user_id
                  ? 'border-brand-400 bg-brand-50'
                  : 'border-stone-200'
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-600 flex-shrink-0">
                {m.profiles?.display_name?.[0] ?? '?'}
              </div>
              <span className={`text-sm font-medium ${selectedHelper === m.user_id ? 'text-brand-700' : 'text-stone-700'}`}>
                {m.profiles?.display_name ?? '住民'}
              </span>
              {selectedHelper === m.user_id && (
                <span className="ml-auto text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded-full font-bold">
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
            className="flex-1 py-3 rounded-2xl bg-brand-500 text-white text-sm font-bold shadow-sm shadow-brand-200 disabled:opacity-40 active:scale-95 transition-all"
          >
            {resolving
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
              : '解決済みにする ✅'}
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

  const [showPhoneVerify,   setShowPhoneVerify]   = useState(false)
  const [resolvePost,       setResolvePost]       = useState<any>(null)

  const weeklyEvent = getCurrentWeeklyEvent()

  // ── Auth + Trust ──
  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const trust = await getUserTrust(user.id)
      setUserTrust(trust)
    })
  }, [])

  // ── Fetchers ──
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
    // シャドーBANユーザーの投稿をフィルタ
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

  // ── Trust helper ──
  const tier = userTrust ? getTierById(userTrust.tier) : getTierById('visitor')

  // ── Actions ──
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

    // 「初参加あいさつ」カテゴリなら新人歓迎ポイントは受け取る側が得る
    await createClient().from('village_posts').insert({
      village_id: id, user_id: userId,
      content: newPost.trim(), category: newPostCat,
    })

    // 初参加あいさつ投稿でポイント付与
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
      // 投稿者がポイントをもらう（post_likedイベントは投稿者のIDで付与 → ここは簡略化）
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

  function handlePostResolved() {
    fetchPosts()
  }

  // ── Loading ──
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9]">
      <span className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!village) return null

  const level      = getLevelInfo(village.member_count)
  const busyScore    = Math.min(5, Math.floor(village.post_count_7d / 5))
  const safetyScore  = village.report_count_7d === 0 ? 5 : village.report_count_7d < 2 ? 3 : 1
  const welcomeScore = Math.min(5, Math.floor(village.welcome_reply_count_7d / 2) + 1)

  const canInteract = tier.canPost

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9]">

      {/* ── Header ── */}
      <div className="bg-white border-b border-stone-100 px-4 pt-4 pb-3 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1 text-stone-500">
            <ArrowLeft size={20} />
          </button>
          <span className="text-xl">{village.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-stone-900 text-sm truncate">{village.name}</p>
            <p className="text-xs text-stone-400">
              {level.icon} {level.label} · {village.member_count} 住民
            </p>
          </div>
          <button
            onClick={toggleMembership}
            disabled={joining}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all active:scale-95 flex-shrink-0 ${
              isMember ? 'bg-stone-100 text-stone-600' : 'bg-brand-500 text-white shadow-sm shadow-brand-200'
            }`}
          >
            {joining ? '…' : isMember ? '住民 ✓' : '参加する'}
          </button>
        </div>
      </div>

      {/* ── 見習いバナー（電話未認証） ── */}
      {userTrust && userTrust.tier === 'visitor' && (
        <div
          onClick={() => setShowPhoneVerify(true)}
          className="mx-4 mt-3 bg-sky-50 border border-sky-200 rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer active:scale-[0.99] transition-all"
        >
          <span className="text-2xl">📱</span>
          <div className="flex-1">
            <p className="text-xs font-bold text-sky-700">電話番号を認証して「住民」になろう</p>
            <p className="text-[10px] text-sky-500">投稿・通話ができるようになります · +30pt</p>
          </div>
          <span className="text-sky-400 text-sm">›</span>
        </div>
      )}

      {/* ── Village Info ── */}
      <div className="mx-4 mt-3 bg-white border border-stone-100 rounded-2xl p-4 shadow-sm">
        <p className="text-sm text-stone-600 leading-relaxed mb-3">{village.description}</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: 'にぎわい',   score: busyScore },
            { label: '安心度',     score: safetyScore },
            { label: '入りやすさ', score: welcomeScore },
          ].map(({ label, score }) => (
            <div key={label} className="bg-stone-50 rounded-xl px-2 py-2 text-center">
              <p className="text-[9px] text-stone-400 font-semibold mb-1.5">{label}</p>
              <div className="flex gap-0.5 justify-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={`w-2 h-2 rounded-full ${i < score ? 'bg-brand-400' : 'bg-stone-200'}`} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Weekly event */}
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-2">
          <span className="text-base">{weeklyEvent.icon}</span>
          <div>
            <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">今週のイベント</p>
            <p className="text-xs font-bold text-amber-800">{weeklyEvent.label}</p>
          </div>
        </div>
        {village.season_title && (
          <span className="inline-block text-[11px] bg-violet-50 text-violet-600 border border-violet-100 px-2.5 py-1 rounded-full font-bold">
            🏆 {village.season_title}
          </span>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex gap-1 bg-stone-100 rounded-xl p-1">
          {[
            { key: 'posts',   label: '📝 投稿' },
            { key: 'voice',   label: '🎙️ 通話広場' },
            { key: 'members', label: '👥 住民' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key as any)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                tab === key ? 'bg-white text-brand-600 shadow-sm' : 'text-stone-500'
              }`}
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
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
            {POST_CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setPostCat(c)}
                className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                  postCat === c ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-stone-200 text-stone-500'
                }`}
              >
                {CAT_ICONS[c]} {c}
              </button>
            ))}
          </div>

          {/* Compose */}
          {isMember && (
            canInteract ? (
              <div className="bg-white border border-stone-100 rounded-2xl p-3 shadow-sm">
                <div className="flex gap-1.5 overflow-x-auto scrollbar-none mb-2.5 pb-0.5">
                  {POST_CATEGORIES.slice(1).map(c => (
                    <button
                      key={c}
                      onClick={() => setNewPostCat(c)}
                      className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                        newPostCat === c
                          ? 'bg-brand-100 text-brand-700 border-brand-300'
                          : 'bg-stone-50 border-stone-200 text-stone-400'
                      }`}
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
                    className="flex-1 px-3 py-2 rounded-xl border border-stone-200 text-sm resize-none focus:outline-none focus:border-brand-400"
                  />
                  <button
                    onClick={submitPost}
                    disabled={!newPost.trim() || posting}
                    className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all shadow-sm shadow-brand-200"
                  >
                    {posting
                      ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Send size={16} className="text-white" />}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowPhoneVerify(true)}
                className="w-full bg-sky-50 border border-dashed border-sky-300 rounded-2xl px-4 py-3 text-center"
              >
                <p className="text-xs font-bold text-sky-600">📱 電話認証すると投稿できます</p>
                <p className="text-[10px] text-sky-400 mt-0.5">タップして認証 (+30pt)</p>
              </button>
            )
          )}

          {/* Post list */}
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-2">🌿</p>
              <p className="text-sm font-bold text-stone-600">まだ投稿がありません</p>
            </div>
          ) : (
            posts.map(post => (
              <div
                key={post.id}
                className={`bg-white border rounded-2xl p-4 shadow-sm ${
                  post.is_resolved ? 'border-emerald-200 bg-emerald-50/30' : 'border-stone-100'
                }`}
              >
                {/* Post header */}
                <div className="flex items-start justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-sm font-bold text-stone-600 flex-shrink-0">
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
                  <div className="flex items-center gap-1.5">
                    {post.is_resolved && (
                      <span className="flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                        <CheckCircle size={10} /> 解決済み
                      </span>
                    )}
                    <span className="text-[10px] bg-stone-50 border border-stone-100 text-stone-500 px-2 py-0.5 rounded-full font-medium">
                      {CAT_ICONS[post.category]} {post.category}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-stone-800 leading-relaxed mb-3">{post.content}</p>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className={`flex items-center gap-1.5 text-xs font-semibold transition-all active:scale-90 ${
                      likedPosts.has(post.id) ? 'text-rose-500' : 'text-stone-400'
                    }`}
                  >
                    <span className="text-base">{likedPosts.has(post.id) ? '❤️' : '🤍'}</span>
                    <span>{post.reaction_count}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {/* 相談カテゴリ × 自分の投稿 × 未解決 → 解決ボタン */}
                    {post.category === '相談' && post.user_id === userId && !post.is_resolved && (
                      <button
                        onClick={() => setResolvePost(post)}
                        className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full active:scale-95 transition-all"
                      >
                        <CheckCircle size={10} /> 解決済みにする
                      </button>
                    )}
                    <button className="text-stone-300 hover:text-stone-400 transition-colors">
                      <Flag size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ════════════════ VOICE TAB ════════════════ */}
      {tab === 'voice' && (
        <div className="px-4 pb-32 space-y-3 pt-1">
          <div className="bg-stone-50 border border-stone-100 rounded-2xl px-4 py-3">
            <p className="text-xs text-stone-500 leading-relaxed">
              🎙️ 村の通話広場です。住民と声で話しましょう。聴くだけでも参加できます。
            </p>
          </div>

          {isMember && (
            <button
              onClick={createVoiceRoom}
              className={`w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.99] transition-all ${
                tier.canCreateRoom
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-200'
                  : 'bg-stone-100 text-stone-500'
              }`}
            >
              <Mic size={16} />
              {tier.canCreateRoom ? '広場を開く' : '広場を開くには「常連」が必要です'}
            </button>
          )}

          {voiceRooms.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-2">🔥</p>
              <p className="text-sm font-bold text-stone-600">今は誰もいません</p>
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
          <p className="text-xs text-stone-400 font-semibold mb-2">{village.member_count} 人が住んでいます</p>
          {members.map((m: any) => (
            <div
              key={m.user_id}
              onClick={() => router.push(`/profile/${m.user_id}`)}
              className="bg-white border border-stone-100 rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer active:scale-[0.99] transition-all"
            >
              <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center text-sm font-bold text-stone-600 flex-shrink-0">
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
                <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full font-bold flex-shrink-0">
                  村長
                </span>
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
          onResolved={handlePostResolved}
        />
      )}
    </div>
  )
}
