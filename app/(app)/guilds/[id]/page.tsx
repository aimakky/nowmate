'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Users, Send, Heart, MessageSquare, MoreHorizontal, Info, FileText } from 'lucide-react'
import { INDUSTRIES } from '@/lib/guild'

// ─── 型 ─────────────────────────────────────────────────────────
type Guild = {
  id: string; name: string; description: string; icon: string
  category: string; member_count: number; host_id: string
  visibility: string; created_at: string
}
type Post = {
  id: string; content: string; created_at: string; user_id: string
  reply_to_post_id?: string | null
  profiles: { display_name: string; avatar_url: string | null; trust_tier: number }
}
type Member = {
  user_id: string; role: string
  profiles: { display_name: string; avatar_url: string | null; last_seen_at: string | null }
}

// ─── ヘルパー ────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)   return `${s}秒前`
  if (s < 3600) return `${Math.floor(s / 60)}分前`
  if (s < 86400) return `${Math.floor(s / 3600)}時間前`
  return `${Math.floor(s / 86400)}日前`
}
function isOnline(lastSeen: string | null) {
  if (!lastSeen) return false
  return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000
}
function tierColor(tier: number) {
  if (tier >= 5) return '#f59e0b'
  if (tier >= 4) return '#8b5cf6'
  if (tier >= 3) return '#3b82f6'
  return '#9ca3af'
}

// ─── PostCard ────────────────────────────────────────────────────
function PostCard({ post, currentUserId, genre }: { post: Post; currentUserId: string | null; genre: typeof INDUSTRIES[0] | null }) {
  const [liked,     setLiked]     = useState(false)
  const [likeCount, setLikeCount] = useState(Math.floor(Math.random() * 8))

  return (
    <div className="bg-white border-b border-stone-100 px-4 py-3.5">
      <div className="flex gap-3">
        {/* アバター */}
        <div className="flex-shrink-0 relative">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold text-white"
            style={{ background: genre?.gradient ?? 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
          >
            {post.profiles?.avatar_url
              ? <img src={post.profiles.avatar_url} className="w-full h-full rounded-full object-cover" />
              : (post.profiles?.display_name?.[0] ?? '?')}
          </div>
          <div
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
            style={{ background: tierColor(post.profiles?.trust_tier ?? 1) }}
          />
        </div>

        {/* 本文 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-xs font-extrabold text-stone-800 truncate">
              {post.profiles?.display_name ?? '名無し'}
            </span>
            <span className="text-[10px] text-stone-400 flex-shrink-0">{timeAgo(post.created_at)}</span>
          </div>
          <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>

          {/* アクション */}
          <div className="flex items-center gap-4 mt-2.5">
            <button
              onClick={() => { setLiked(v => !v); setLikeCount(c => liked ? c - 1 : c + 1) }}
              className="flex items-center gap-1 transition-all active:scale-90"
            >
              <Heart
                size={14}
                className="transition-colors"
                fill={liked ? '#ef4444' : 'none'}
                color={liked ? '#ef4444' : '#d6d3d1'}
                strokeWidth={2}
              />
              {likeCount > 0 && (
                <span className={`text-[10px] font-bold ${liked ? 'text-red-400' : 'text-stone-400'}`}>{likeCount}</span>
              )}
            </button>
            <button className="flex items-center gap-1 active:scale-90">
              <MessageSquare size={14} color="#d6d3d1" strokeWidth={2} />
              <span className="text-[10px] text-stone-400 font-bold">返信</span>
            </button>
          </div>
        </div>

        <button className="flex-shrink-0 text-stone-300 self-start mt-0.5">
          <MoreHorizontal size={16} />
        </button>
      </div>
    </div>
  )
}

// ─── メインページ ────────────────────────────────────────────────
export default function GuildDetailPage() {
  const router = useRouter()
  const { id } = useParams() as { id: string }

  const [guild,    setGuild]    = useState<Guild | null>(null)
  const [posts,    setPosts]    = useState<Post[]>([])
  const [members,  setMembers]  = useState<Member[]>([])
  const [tab,      setTab]      = useState<'post' | 'info'>('post')
  const [userId,   setUserId]   = useState<string | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [joining,  setJoining]  = useState(false)
  const [text,     setText]     = useState('')
  const [posting,  setPosting]  = useState(false)
  const [loading,  setLoading]  = useState(true)

  const genre = guild ? (INDUSTRIES.find(g => g.id === guild.category) ?? null) : null

  // ── 初期ロード ─────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)

      // ギルド情報
      const { data: g } = await supabase.from('villages').select('*').eq('id', id).single()
      if (!g) { router.push('/guilds'); return }
      setGuild(g)

      // メンバーシップ確認
      if (user) {
        const { data: m } = await supabase
          .from('village_members').select('user_id').eq('village_id', id).eq('user_id', user.id).maybeSingle()
        setIsMember(!!m)
      }

      // 投稿
      const { data: p } = await supabase
        .from('village_posts')
        .select('*, profiles(display_name, avatar_url, trust_tier)')
        .eq('village_id', id)
        .order('created_at', { ascending: false })
        .limit(50)
      setPosts((p ?? []) as Post[])

      // メンバー一覧
      const { data: mb } = await supabase
        .from('village_members')
        .select('user_id, role, profiles(display_name, avatar_url, last_seen_at)')
        .eq('village_id', id)
        .order('role', { ascending: true })
        .limit(30)
      setMembers((mb ?? []) as Member[])

      setLoading(false)
    }
    load()
  }, [id])

  // ── 参加 / 退会 ───────────────────────────────────────────────
  async function handleJoin() {
    if (!userId) { router.push('/login'); return }
    setJoining(true)
    const supabase = createClient()
    if (isMember) {
      await supabase.from('village_members').delete().eq('village_id', id).eq('user_id', userId)
      setIsMember(false)
      setGuild(g => g ? { ...g, member_count: g.member_count - 1 } : g)
    } else {
      await supabase.from('village_members').insert({ village_id: id, user_id: userId })
      setIsMember(true)
      setGuild(g => g ? { ...g, member_count: g.member_count + 1 } : g)
    }
    setJoining(false)
  }

  // ── 投稿 ───────────────────────────────────────────────────────
  async function handlePost() {
    if (!text.trim() || !userId || posting) return
    setPosting(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('village_posts')
      .insert({ village_id: id, user_id: userId, content: text.trim() })
      .select('*, profiles(display_name, avatar_url, trust_tier)')
      .single()
    if (data) {
      setPosts(prev => [data as Post, ...prev])
      setText('')
    }
    setPosting(false)
  }

  if (loading) return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
    </div>
  )
  if (!guild) return null

  const onlineCount = members.filter(m => isOnline(m.profiles?.last_seen_at ?? null)).length

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9]">

      {/* ── スティッキーヘッダー ── */}
      <div
        className="sticky top-0 z-20 flex items-center gap-3 px-4 h-12"
        style={{ background: genre?.color ?? '#7c3aed', boxShadow: '0 1px 8px rgba(0,0,0,0.15)' }}
      >
        <button onClick={() => router.back()} className="p-1 -ml-1 text-white/80">
          <ArrowLeft size={20} />
        </button>
        <p className="font-extrabold text-white text-sm truncate flex-1">{guild.name}</p>
        <div className="flex items-center gap-1 text-white/70 text-[11px] font-bold">
          <Users size={12} />
          {guild.member_count}
        </div>
      </div>

      {/* ── バナー ── */}
      <div
        className="relative flex items-end justify-start px-4 pb-4"
        style={{ height: 180, background: genre?.gradient ?? 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
      >
        {/* ノイズテクスチャ */}
        <div className="absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}
        />
        {/* 大きいアイコン（中央） */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span style={{ fontSize: '5rem', filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.3))' }}>
            {guild.icon}
          </span>
        </div>
        {/* 右下：メンバー数バッジ */}
        <div className="absolute bottom-3 right-4 flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-1">
          <Users size={11} className="text-white/80" />
          <span className="text-[11px] font-bold text-white">{guild.member_count.toLocaleString()}メンバー</span>
        </div>
      </div>

      {/* ── ギルド情報バー ── */}
      <div className="bg-white px-4 py-3 border-b border-stone-100 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="font-extrabold text-stone-900 text-lg leading-tight">{guild.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
              style={{ background: genre?.color ?? '#7c3aed' }}
            >
              {genre?.emoji} {guild.category}
            </span>
            {onlineCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {onlineCount}人オンライン
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleJoin}
          disabled={joining}
          className="flex-shrink-0 px-4 py-2 rounded-full text-xs font-extrabold transition-all active:scale-95 disabled:opacity-50"
          style={isMember
            ? { background: '#f3f4f6', color: '#6b7280', border: '1.5px solid #e5e7eb' }
            : { background: genre?.color ?? '#7c3aed', color: '#fff', boxShadow: `0 4px 12px ${genre?.color ?? '#7c3aed'}55` }
          }
        >
          {joining ? '...' : isMember ? '参加中' : '参加する'}
        </button>
      </div>

      {/* ── タブバー ── */}
      <div className="bg-white border-b border-stone-100 flex sticky z-10" style={{ top: 48 }}>
        {[
          { id: 'post', label: '投稿', icon: FileText },
          { id: 'info', label: '情報', icon: Info },
        ].map(({ id: tid, label, icon: Icon }) => (
          <button
            key={tid}
            onClick={() => setTab(tid as 'post' | 'info')}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-colors relative"
            style={{ color: tab === tid ? (genre?.color ?? '#7c3aed') : '#a8a29e' }}
          >
            <Icon size={14} />
            {label}
            {tab === tid && (
              <span
                className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full"
                style={{ background: genre?.color ?? '#7c3aed' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* ══ 投稿タブ ══ */}
      {tab === 'post' && (
        <div className="pb-32">

          {/* 投稿ボックス */}
          {isMember && (
            <div className="bg-white border-b border-stone-100 px-4 py-3">
              <div className="flex gap-3 items-end">
                <div
                  className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-extrabold text-white"
                  style={{ background: genre?.gradient ?? 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
                >
                  ✦
                </div>
                <div className="flex-1 relative">
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="みんなに伝えたいことを書こう..."
                    rows={2}
                    maxLength={400}
                    className="w-full px-3 py-2 rounded-2xl text-sm resize-none focus:outline-none text-stone-800 placeholder-stone-300 bg-stone-50 border border-stone-200 focus:border-stone-300 transition-colors"
                  />
                </div>
                <button
                  onClick={handlePost}
                  disabled={!text.trim() || posting}
                  className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
                  style={{ background: genre?.color ?? '#7c3aed' }}
                >
                  {posting
                    ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Send size={15} className="text-white" />
                  }
                </button>
              </div>
            </div>
          )}

          {/* 投稿リスト */}
          {posts.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-4xl mb-3">{guild.icon}</div>
              <p className="font-bold text-stone-700 mb-1">まだ投稿がありません</p>
              <p className="text-sm text-stone-400">
                {isMember ? '最初の投稿をしてみよう！' : '集いに参加して投稿しよう'}
              </p>
            </div>
          ) : (
            posts.map(p => (
              <PostCard key={p.id} post={p} currentUserId={userId} genre={genre} />
            ))
          )}
        </div>
      )}

      {/* ══ 情報タブ ══ */}
      {tab === 'info' && (
        <div className="pb-32 space-y-3 pt-3 px-4">

          {/* 説明 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
            <p className="text-[11px] font-extrabold text-stone-400 uppercase tracking-wider mb-2">この集いについて</p>
            <p className="text-sm text-stone-700 leading-relaxed">
              {guild.description || 'まだ説明がありません。'}
            </p>
          </div>

          {/* ステータス */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
            <p className="text-[11px] font-extrabold text-stone-400 uppercase tracking-wider mb-3">ステータス</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'メンバー', value: guild.member_count.toLocaleString(), emoji: '👥' },
                { label: 'オンライン', value: onlineCount, emoji: '🟢' },
                { label: 'ジャンル', value: guild.category.split('・')[0], emoji: genre?.emoji ?? '🎮' },
              ].map(s => (
                <div key={s.label} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-stone-50">
                  <span className="text-lg">{s.emoji}</span>
                  <span className="text-xs font-extrabold text-stone-800">{s.value}</span>
                  <span className="text-[9px] text-stone-400">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* メンバー一覧 */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
            <p className="text-[11px] font-extrabold text-stone-400 uppercase tracking-wider px-4 pt-4 pb-2">メンバー</p>
            {members.map(m => {
              const online = isOnline(m.profiles?.last_seen_at ?? null)
              const isHost = m.role === 'host'
              return (
                <div key={m.user_id} className="flex items-center gap-3 px-4 py-2.5 border-t border-stone-50">
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold text-white"
                      style={{ background: genre?.gradient ?? 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
                    >
                      {m.profiles?.avatar_url
                        ? <img src={m.profiles.avatar_url} className="w-full h-full rounded-full object-cover" />
                        : (m.profiles?.display_name?.[0] ?? '?')}
                    </div>
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                      style={{ background: online ? '#22c55e' : '#d1d5db' }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-stone-800 truncate">
                      {m.profiles?.display_name ?? '名無し'}
                    </p>
                    <p className="text-[10px] text-stone-400">
                      {online ? 'オンライン' : 'オフライン'}
                    </p>
                  </div>
                  {isHost && (
                    <span
                      className="text-[9px] font-extrabold px-2 py-0.5 rounded-full text-white flex-shrink-0"
                      style={{ background: genre?.color ?? '#7c3aed' }}
                    >
                      GM
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
