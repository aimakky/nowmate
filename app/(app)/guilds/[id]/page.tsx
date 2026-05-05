'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Users, Send, Heart, MessageSquare, MoreHorizontal, Info, FileText, Hash, Crown, Mic, Shield } from 'lucide-react'
import { INDUSTRIES } from '@/lib/guild'
import { startDM } from '@/lib/dm'
import VerifiedBadge from '@/components/ui/VerifiedBadge'

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
  profiles: {
    display_name: string
    avatar_url: string | null
    last_seen_at: string | null
    age_verified?: boolean | null
    age_verification_status?: string | null
  }
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
function tierLabel(tier: number): { label: string; color: string; bg: string } {
  if (tier >= 5) return { label: 'レジェンド', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' }
  if (tier >= 4) return { label: 'エース',     color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' }
  if (tier >= 3) return { label: '常連',       color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' }
  if (tier >= 2) return { label: 'メンバー',   color: '#4ade80', bg: 'rgba(74,222,128,0.12)' }
  return           { label: '新入り',          color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' }
}

// ─── PostCard (Discordスタイル) ────────────────────────────────
function PostCard({
  post, currentUserId, genre,
}: { post: Post; currentUserId: string | null; genre: typeof INDUSTRIES[0] | null }) {
  const [liked,     setLiked]     = useState(false)
  const [likeCount, setLikeCount] = useState(Math.floor(Math.random() * 8))
  const tier  = post.profiles?.trust_tier ?? 1
  const tInfo = tierLabel(tier)
  const isOwn = post.user_id === currentUserId

  return (
    <div className="flex gap-3 px-4 py-3 group transition-colors hover:bg-white/[0.02]">
      {/* アバター */}
      <div className="flex-shrink-0 relative mt-0.5">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold text-white overflow-hidden"
          style={{ background: genre?.gradient ?? 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
        >
          {post.profiles?.avatar_url
            ? <img src={post.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
            : (post.profiles?.display_name?.[0] ?? '?')}
        </div>
      </div>

      {/* 本文エリア */}
      <div className="flex-1 min-w-0">
        {/* ネームライン */}
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-sm font-extrabold" style={{ color: 'rgba(255,255,255,0.9)' }}>
            {post.profiles?.display_name ?? '名無し'}
          </span>
          {/* Discordロール風ティアバッジ */}
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none"
            style={{ color: tInfo.color, background: tInfo.bg, border: `1px solid ${tInfo.color}40` }}
          >
            {tInfo.label}
          </span>
          {isOwn && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none"
              style={{ color: '#818cf8', background: 'rgba(129,140,248,0.12)', border: '1px solid rgba(129,140,248,0.25)' }}>
              あなた
            </span>
          )}
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {timeAgo(post.created_at)}
          </span>
        </div>

        {/* 本文 */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.8)' }}>
          {post.content}
        </p>

        {/* リアクションバー */}
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={() => { setLiked(v => !v); setLikeCount(c => liked ? c - 1 : c + 1) }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg transition-all active:scale-90"
            style={liked
              ? { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }
              : { background: 'rgba(255,255,255,0.05)', border: '1px solid transparent' }}
          >
            <Heart
              size={12}
              fill={liked ? '#ef4444' : 'none'}
              color={liked ? '#ef4444' : 'rgba(255,255,255,0.35)'}
              strokeWidth={2}
            />
            {likeCount > 0 && (
              <span className="text-[10px] font-bold" style={{ color: liked ? '#f87171' : 'rgba(255,255,255,0.35)' }}>
                {likeCount}
              </span>
            )}
          </button>
          <button className="flex items-center gap-1 px-2 py-1 rounded-lg transition-all active:scale-90"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid transparent' }}>
            <MessageSquare size={12} color="rgba(255,255,255,0.35)" strokeWidth={2} />
            <span className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.35)' }}>返信</span>
          </button>
        </div>
      </div>

      <button className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity self-start mt-0.5"
        style={{ color: 'rgba(255,255,255,0.3)' }}>
        <MoreHorizontal size={14} />
      </button>
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const genre = guild ? (INDUSTRIES.find(g => g.id === guild.category) ?? null) : null

  // ── 初期ロード ─────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)

      const { data: g } = await supabase.from('villages').select('*').eq('id', id).single()
      if (!g) { router.push('/guilds'); return }
      setGuild(g)

      if (user) {
        const { data: m } = await supabase
          .from('village_members').select('user_id').eq('village_id', id).eq('user_id', user.id).maybeSingle()
        setIsMember(!!m)
      }

      const { data: p } = await supabase
        .from('village_posts')
        .select('*, profiles(display_name, avatar_url, trust_tier)')
        .eq('village_id', id)
        .order('created_at', { ascending: false })
        .limit(50)
      setPosts((p ?? []) as Post[])

      const { data: mb } = await supabase
        .from('village_members')
        .select('user_id, role, profiles(display_name, avatar_url, last_seen_at, age_verified, age_verification_status)')
        .eq('village_id', id)
        .order('role', { ascending: true })
        .limit(30)
      setMembers((mb ?? []) as unknown as Member[])

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
    <div className="max-w-md mx-auto min-h-screen flex items-center justify-center" style={{ background: '#0f0f1a' }}>
      <div className="w-8 h-8 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
    </div>
  )
  if (!guild) return null

  const onlineMembers  = members.filter(m => isOnline(m.profiles?.last_seen_at ?? null))
  const offlineMembers = members.filter(m => !isOnline(m.profiles?.last_seen_at ?? null))
  const onlineCount    = onlineMembers.length

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col" style={{ background: '#0f0f1a' }}>

      {/* ── スティッキーヘッダー ── */}
      <div
        className="sticky top-0 z-20 flex items-center gap-3 px-4 h-12 flex-shrink-0"
        style={{
          background: 'rgba(15,15,26,0.95)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <button onClick={() => router.back()} className="p-1 -ml-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <ArrowLeft size={20} />
        </button>
        {/* Discordサーバー名 + チャンネル名 */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xl flex-shrink-0">{guild.icon}</span>
          <div className="min-w-0">
            <p className="font-extrabold text-white text-sm truncate leading-tight">{guild.name}</p>
            <p className="text-[10px] flex items-center gap-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              <Hash size={9} />
              <span>雑談</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {onlineCount > 0 && (
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-400">{onlineCount}</span>
            </div>
          )}
          <div className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
            <Users size={13} />
            <span className="text-[11px] font-bold">{guild.member_count}</span>
          </div>
        </div>
      </div>

      {/* ── バナー ── */}
      <div
        className="relative flex-shrink-0"
        style={{ height: 120, background: genre?.gradient ?? 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
      >
        <div className="absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}
        />
        {/* 下グラデーション */}
        <div className="absolute inset-x-0 bottom-0 h-12"
          style={{ background: 'linear-gradient(to bottom, transparent, #0f0f1a)' }} />
        {/* アイコン + バッジ */}
        <div className="absolute bottom-0 left-4 flex items-end gap-3 pb-2 translate-y-1/3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
            style={{
              background: 'rgba(15,15,26,0.9)',
              border: `3px solid #0f0f1a`,
              boxShadow: `0 0 0 1px ${genre?.color ?? '#7c3aed'}60`,
            }}
          >
            {guild.icon}
          </div>
        </div>
        {/* 参加ボタン */}
        <div className="absolute bottom-3 right-4">
          <button
            onClick={handleJoin}
            disabled={joining}
            className="px-4 py-1.5 rounded-full text-xs font-extrabold transition-all active:scale-95 disabled:opacity-50"
            style={isMember
              ? { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', border: '1.5px solid rgba(255,255,255,0.12)' }
              : { background: genre?.color ?? '#7c3aed', color: '#fff', boxShadow: `0 4px 14px ${genre?.color ?? '#7c3aed'}60` }
            }
          >
            {joining ? '...' : isMember ? '参加中' : '参加する'}
          </button>
        </div>
      </div>

      {/* アイコン分のスペース */}
      <div className="h-8 flex-shrink-0" />

      {/* ── ギルド名 + ジャンル ── */}
      <div className="px-4 pb-3 flex-shrink-0">
        <h1 className="font-extrabold text-white text-lg leading-tight mb-1">{guild.name}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {genre && (
            <span
              className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${genre.color}20`, color: genre.color, border: `1px solid ${genre.color}40` }}
            >
              <Shield size={9} /> {genre.emoji} {guild.category}
            </span>
          )}
          {onlineCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: '#4ade80' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {onlineCount}人オンライン
            </span>
          )}
        </div>
      </div>

      {/* ── タブバー（Discordチャンネル風） ── */}
      <div
        className="flex-shrink-0 flex border-b sticky z-10"
        style={{ top: 48, background: 'rgba(15,15,26,0.95)', borderColor: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)' }}
      >
        {[
          { id: 'post', label: '# 投稿', icon: Hash },
          { id: 'info', label: 'メンバー', icon: Users },
        ].map(({ id: tid, label, icon: Icon }) => (
          <button
            key={tid}
            onClick={() => setTab(tid as 'post' | 'info')}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-colors relative"
            style={{ color: tab === tid ? (genre?.color ?? '#8b5cf6') : 'rgba(255,255,255,0.35)' }}
          >
            <Icon size={13} />
            {label}
            {tab === tid && (
              <span
                className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full"
                style={{ background: genre?.color ?? '#8b5cf6' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* ══ 投稿タブ ══ */}
      {tab === 'post' && (
        <div className="flex-1 flex flex-col">

          {/* チャンネルヘッダー（Discordの#チャンネル説明） */}
          <div className="px-4 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: genre ? `${genre.color}20` : 'rgba(139,92,246,0.2)', border: `1px solid ${genre?.color ?? '#8b5cf6'}40` }}>
                <Hash size={14} style={{ color: genre?.color ?? '#8b5cf6' }} />
              </div>
              <span className="font-extrabold text-white text-sm">雑談チャンネルへようこそ！</span>
            </div>
            <p className="text-xs leading-relaxed pl-10" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {guild.description || 'みんな自由に話しかけてね。'}
            </p>
          </div>

          {/* 投稿リスト */}
          <div className="flex-1 pb-4">
            {posts.length === 0 ? (
              <div className="text-center py-16 px-8">
                <div className="text-4xl mb-3">{guild.icon}</div>
                <p className="font-bold text-white mb-1">まだ投稿がありません</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {isMember ? '最初のメッセージを送ろう！' : '参加して投稿しよう'}
                </p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.03)' }}>
                {[...posts].reverse().map(p => (
                  <PostCard key={p.id} post={p} currentUserId={userId} genre={genre} />
                ))}
              </div>
            )}
          </div>

          {/* Discordスタイルのメッセージ入力ボックス */}
          {isMember ? (
            <div className="flex-shrink-0 px-4 pb-4 pt-2 sticky bottom-0"
              style={{ background: 'rgba(15,15,26,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div
                className="flex items-end gap-2 px-3 py-2 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePost() }
                  }}
                  placeholder={`#雑談 にメッセージを送信`}
                  rows={1}
                  maxLength={400}
                  className="flex-1 bg-transparent text-sm resize-none focus:outline-none leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.9)', caretColor: genre?.color ?? '#8b5cf6' }}
                />
                <button
                  onClick={handlePost}
                  disabled={!text.trim() || posting}
                  className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
                  style={{ background: text.trim() ? (genre?.color ?? '#8b5cf6') : 'rgba(255,255,255,0.1)' }}
                >
                  {posting
                    ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Send size={13} className="text-white" />
                  }
                </button>
              </div>
              <p className="text-[9px] mt-1 text-center" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Enter で送信 · Shift+Enter で改行
              </p>
            </div>
          ) : (
            <div className="flex-shrink-0 px-4 py-3 border-t text-center"
              style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(15,15,26,0.95)' }}>
              <button
                onClick={handleJoin}
                disabled={joining}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
                style={{ background: genre?.color ?? '#8b5cf6', boxShadow: `0 4px 14px ${genre?.color ?? '#8b5cf6'}50` }}
              >
                参加してメッセージを送る
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══ メンバータブ（Discord風オンライン/オフライン分け） ══ */}
      {tab === 'info' && (
        <div className="flex-1 pb-32">

          {/* サーバー概要 */}
          <div className="mx-4 mt-4 mb-2 rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'メンバー', value: guild.member_count.toLocaleString(), emoji: '👥' },
                { label: 'オンライン', value: onlineCount, emoji: '🟢' },
                { label: 'ジャンル', value: (guild.category ?? '').split('・')[0], emoji: genre?.emoji ?? '🎮' },
              ].map(s => (
                <div key={s.label} className="flex flex-col items-center gap-1 p-2 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <span className="text-lg">{s.emoji}</span>
                  <span className="text-xs font-extrabold text-white">{s.value}</span>
                  <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── オンラインメンバー ── */}
          {onlineMembers.length > 0 && (
            <div className="mt-4">
              <div className="px-4 pb-1.5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <p className="text-[10px] font-extrabold uppercase tracking-widest"
                  style={{ color: 'rgba(74,222,128,0.7)' }}>
                  オンライン — {onlineMembers.length}
                </p>
              </div>
              {onlineMembers.map(m => (
                <MemberRow key={m.user_id} m={m} online genre={genre} userId={userId} router={router} />
              ))}
            </div>
          )}

          {/* ── オフラインメンバー ── */}
          {offlineMembers.length > 0 && (
            <div className="mt-4">
              <div className="px-4 pb-1.5">
                <p className="text-[10px] font-extrabold uppercase tracking-widest"
                  style={{ color: 'rgba(255,255,255,0.2)' }}>
                  オフライン — {offlineMembers.length}
                </p>
              </div>
              {offlineMembers.map(m => (
                <MemberRow key={m.user_id} m={m} online={false} genre={genre} userId={userId} router={router} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── MemberRow ────────────────────────────────────────────────────
function MemberRow({
  m, online, genre, userId, router,
}: {
  m: Member
  online: boolean
  genre: typeof INDUSTRIES[0] | null
  userId: string | null
  router: ReturnType<typeof useRouter>
}) {
  const isHost  = m.role === 'host'
  const isOwn   = m.user_id === userId
  const opacity = online ? 1 : 0.4

  return (
    <div
      className="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-white/[0.03] cursor-default"
      style={{ opacity }}
    >
      <div className="relative flex-shrink-0">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold text-white overflow-hidden"
          style={{ background: genre?.gradient ?? 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
        >
          {m.profiles?.avatar_url
            ? <img src={m.profiles.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
            : (m.profiles?.display_name?.[0] ?? '?')}
        </div>
        {/* オンライン状態ドット */}
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
          style={{
            background: online ? '#22c55e' : '#44475a',
            border: '2px solid #0f0f1a',
          }}
        >
          {online && <span className="w-1.5 h-1.5 rounded-full bg-emerald-200 animate-pulse" />}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isHost && (
            <Crown size={10} style={{ color: genre?.color ?? '#8b5cf6', flexShrink: 0 }} />
          )}
          <p className="text-sm font-bold truncate" style={{ color: online ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)' }}>
            {m.profiles?.display_name ?? '名無し'}
          </p>
          <VerifiedBadge verified={m.profiles?.age_verified} size="sm" />
          {isOwn && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none flex-shrink-0"
              style={{ color: '#818cf8', background: 'rgba(129,140,248,0.12)', border: '1px solid rgba(129,140,248,0.2)' }}>
              あなた
            </span>
          )}
          {isHost && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none flex-shrink-0"
              style={{ color: genre?.color ?? '#8b5cf6', background: `${genre?.color ?? '#8b5cf6'}20`, border: `1px solid ${genre?.color ?? '#8b5cf6'}40` }}>
              GM
            </span>
          )}
        </div>
        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
          {online ? 'オンライン' : 'オフライン'}
        </p>
      </div>

      {m.user_id !== userId && userId && (
        <button
          onClick={async () => {
            const result = await startDM(userId, m.user_id)
            if (result.status === 'age_required') { alert('DMを送るには年齢確認が必要です。設定から確認してください。'); return }
            if (result.status !== 'blocked' && 'matchId' in result) router.push(`/chat/${result.matchId}`)
          }}
          className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          title="DMを送る"
        >
          <MessageSquare size={11} style={{ color: 'rgba(255,255,255,0.4)' }} />
        </button>
      )}
    </div>
  )
}
