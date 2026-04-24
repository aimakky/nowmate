'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Mic, Users, Send, Flag } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import { getCurrentWeeklyEvent } from '@/components/ui/VillageCard'

// ─── Constants ────────────────────────────────────────────────
const POST_CATEGORIES = ['全部', '雑談', '相談', '仕事', '趣味', '今日のひとこと', '初参加あいさつ']

const CAT_ICONS: Record<string, string> = {
  '全部':         '📋',
  '雑談':         '💬',
  '相談':         '🤝',
  '仕事':         '💼',
  '趣味':         '🎨',
  '今日のひとこと': '✏️',
  '初参加あいさつ': '🌱',
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
  if (count >= 500) return { icon: '✨', label: '伝説の村',  bar: 5 }
  if (count >= 200) return { icon: '🏡', label: '栄えた村',  bar: 4 }
  if (count >= 50)  return { icon: '🌳', label: '活発な村',  bar: 3 }
  if (count >= 10)  return { icon: '🌿', label: '育ち中',    bar: 2 }
  return                   { icon: '🌱', label: '芽吹いた村', bar: 1 }
}

// ─── Page ─────────────────────────────────────────────────────
export default function VillageDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()

  const [village,    setVillage]    = useState<any>(null)
  const [posts,      setPosts]      = useState<any[]>([])
  const [voiceRooms, setVoiceRooms] = useState<any[]>([])
  const [members,    setMembers]    = useState<any[]>([])

  const [tab,         setTab]         = useState<'posts' | 'voice' | 'members'>('posts')
  const [postCat,     setPostCat]     = useState('全部')
  const [isMember,    setIsMember]    = useState(false)
  const [userId,      setUserId]      = useState<string | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [newPost,     setNewPost]     = useState('')
  const [newPostCat,  setNewPostCat]  = useState('雑談')
  const [posting,     setPosting]     = useState(false)
  const [likedPosts,  setLikedPosts]  = useState<Set<string>>(new Set())
  const [joining,     setJoining]     = useState(false)

  const weeklyEvent = getCurrentWeeklyEvent()

  // ── Auth ──
  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
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
      .select('*, profiles(display_name, avatar_url)')
      .eq('village_id', id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (postCat !== '全部') q = q.eq('category', postCat)
    const { data } = await q
    setPosts(data || [])
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
      .select('user_id, role, joined_at, profiles(display_name, avatar_url)')
      .eq('village_id', id)
      .order('joined_at', { ascending: true })
      .limit(30)
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

  // ── Actions ──
  async function toggleMembership() {
    if (!userId) { router.push('/login'); return }
    setJoining(true)
    const supabase = createClient()
    if (isMember) {
      await supabase.from('village_members').delete()
        .eq('village_id', id).eq('user_id', userId)
      setIsMember(false)
    } else {
      await supabase.from('village_members').insert({ village_id: id, user_id: userId })
      setIsMember(true)
    }
    setJoining(false)
  }

  async function submitPost() {
    if (!userId || !newPost.trim() || posting) return
    setPosting(true)
    const supabase = createClient()
    await supabase.from('village_posts').insert({
      village_id: id,
      user_id: userId,
      content: newPost.trim(),
      category: newPostCat,
    })
    setNewPost('')
    await fetchPosts()
    setPosting(false)
  }

  async function toggleLike(postId: string) {
    if (!userId) return
    const supabase = createClient()
    if (likedPosts.has(postId)) {
      await supabase.from('village_reactions').delete()
        .eq('post_id', postId).eq('user_id', userId)
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
    const supabase = createClient()
    const roomName = VOICE_ROOM_NAMES[village.type] ?? '🌿 村の広場'
    const { data } = await supabase.from('voice_rooms').insert({
      host_id:   userId,
      title:     roomName,
      category:  '雑談',
      is_open:   true,
      village_id: id,
    }).select().single()
    if (data) {
      await supabase.from('voice_participants').insert({ room_id: data.id, user_id: userId })
      router.push(`/voice/${data.id}`)
    }
  }

  // ── Loading ──
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9]">
      <span className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!village) return null

  const level = getLevelInfo(village.member_count)
  const busyScore    = Math.min(5, Math.floor(village.post_count_7d / 5))
  const safetyScore  = village.report_count_7d === 0 ? 5 : village.report_count_7d < 2 ? 3 : 1
  const welcomeScore = Math.min(5, Math.floor(village.welcome_reply_count_7d / 2) + 1)

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9]">

      {/* ── Sticky Header ── */}
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
              isMember
                ? 'bg-stone-100 text-stone-600'
                : 'bg-brand-500 text-white shadow-sm shadow-brand-200'
            }`}
          >
            {joining ? '…' : isMember ? '住民 ✓' : '参加する'}
          </button>
        </div>
      </div>

      {/* ── Village Info Banner ── */}
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

        {/* Season title */}
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

      {/* ═══════════════════════════════════════════════════════
          POSTS TAB
      ════════════════════════════════════════════════════════ */}
      {tab === 'posts' && (
        <div className="px-4 pb-32 space-y-3">

          {/* Category filter */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
            {POST_CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setPostCat(c)}
                className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                  postCat === c
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'bg-white border-stone-200 text-stone-500'
                }`}
              >
                {CAT_ICONS[c]} {c}
              </button>
            ))}
          </div>

          {/* Compose (members only) */}
          {isMember ? (
            <div className="bg-white border border-stone-100 rounded-2xl p-3 shadow-sm">
              {/* Category picker */}
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
            <div className="bg-stone-50 border border-dashed border-stone-200 rounded-2xl px-4 py-3 text-center">
              <p className="text-xs text-stone-500">投稿するには村に参加しましょう 🌱</p>
            </div>
          )}

          {/* Post list */}
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-2">🌿</p>
              <p className="text-sm font-bold text-stone-600">まだ投稿がありません</p>
              <p className="text-xs text-stone-400 mt-1">最初の投稿をしてみましょう</p>
            </div>
          ) : (
            posts.map(post => (
              <div key={post.id} className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-sm font-bold text-stone-600 flex-shrink-0">
                      {post.profiles?.display_name?.[0] ?? '?'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-stone-800">
                        {post.profiles?.display_name ?? '住民'}
                      </p>
                      <p className="text-[10px] text-stone-400">{timeAgo(post.created_at)}</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-stone-50 border border-stone-100 text-stone-500 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                    {CAT_ICONS[post.category]} {post.category}
                  </span>
                </div>

                <p className="text-sm text-stone-800 leading-relaxed mb-3">{post.content}</p>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className={`flex items-center gap-1.5 text-xs font-semibold transition-all active:scale-90 ${
                      likedPosts.has(post.id) ? 'text-rose-500' : 'text-stone-400'
                    }`}
                  >
                    <span className="text-base">
                      {likedPosts.has(post.id) ? '❤️' : '🤍'}
                    </span>
                    <span>{post.reaction_count}</span>
                  </button>
                  <button className="text-stone-300 hover:text-stone-400 transition-colors">
                    <Flag size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          VOICE TAB
      ════════════════════════════════════════════════════════ */}
      {tab === 'voice' && (
        <div className="px-4 pb-32 space-y-3 pt-1">

          {/* Context banner */}
          <div className="bg-stone-50 border border-stone-100 rounded-2xl px-4 py-3">
            <p className="text-xs text-stone-500 leading-relaxed">
              🎙️ 村の通話広場です。住民と声で話しましょう。<br />
              聴くだけでも参加できます。
            </p>
          </div>

          {/* Create room (members only) */}
          {isMember && (
            <button
              onClick={createVoiceRoom}
              className="w-full py-3.5 bg-brand-500 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-brand-200 active:scale-[0.99] transition-all"
            >
              <Mic size={16} /> 広場を開く
            </button>
          )}

          {voiceRooms.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-2">🔥</p>
              <p className="text-sm font-bold text-stone-600">今は誰もいません</p>
              <p className="text-xs text-stone-400 mt-1">最初に広場を開いてみましょう</p>
            </div>
          ) : (
            voiceRooms.map(room => {
              const total = room.voice_participants?.length ?? 0
              const speakers = (room.voice_participants ?? []).filter((p: any) => !p.is_listener).length
              return (
                <div
                  key={room.id}
                  onClick={() => router.push(`/voice/${room.id}`)}
                  className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm cursor-pointer active:scale-[0.99] hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-stone-900 text-sm">{room.title}</p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {room.profiles?.display_name} が開催中
                      </p>
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

      {/* ═══════════════════════════════════════════════════════
          MEMBERS TAB
      ════════════════════════════════════════════════════════ */}
      {tab === 'members' && (
        <div className="px-4 pb-32 space-y-2 pt-1">
          <p className="text-xs text-stone-400 font-semibold mb-2">
            {village.member_count} 人が住んでいます
          </p>
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
                <p className="text-sm font-bold text-stone-800 truncate">
                  {m.profiles?.display_name ?? '住民'}
                </p>
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
    </div>
  )
}
