'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Users, Send, Heart, MessageSquare, MoreHorizontal, Info, FileText, Hash, Crown, Mic, Shield, Share2, X, Headphones, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { INDUSTRIES } from '@/lib/guild'
import { startDM } from '@/lib/dm'
import VerifiedBadge from '@/components/ui/VerifiedBadge'
import { getUserDisplayName } from '@/lib/user-display'

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
// 通話ルーム表示用（既存 voice_rooms スキーマ準拠。ここでは表示のみで参加処理は
// 既存の /voice/[roomId] へ委譲するため、参加者数とタイトル等を select する）
type VoiceRoom = {
  id: string
  title: string
  category: string | null
  is_open: boolean | null
  status: string
  voice_participants?: { user_id: string }[]
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
  // 旧: Math.floor(Math.random() * 8) で毎回ランダムなフェイク値。
  // ユーザーが見るたびに「いいね数」が勝手に変わるので 0 で固定する。
  // 実データ連動が必要になったら post.reaction_count or guild_reactions 集計に切替。
  const [likeCount, setLikeCount] = useState(0)
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
            {getUserDisplayName(post.profiles)}
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
  // 旧: 'post' | 'info' の 2 タブ ('# 投稿' と 'メンバー')。
  // 仕様変更で「メンバー」をタブから外し詳細モーダル側に移動したため、
  // タブは「タイムライン」のみ。state は将来の拡張余地を残して enum を維持する。
  const [tab,      setTab]      = useState<'timeline'>('timeline')
  const [userId,   setUserId]   = useState<string | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [joining,  setJoining]  = useState(false)
  const [text,     setText]     = useState('')
  const [posting,  setPosting]  = useState(false)
  const [loading,  setLoading]  = useState(true)
  // ギルド詳細モーダル (旧メンバータブの中身 + ギルド概要 + ホスト)
  // ギルドアイコン押下で開く
  const [showDetail, setShowDetail] = useState(false)
  // 通話ルーム一覧（voice_rooms から、status='active' & is_open=true で取得）
  const [voiceRooms, setVoiceRooms] = useState<VoiceRoom[]>([])
  // 招待 (Web Share API → clipboard フォールバック) のフィードバック
  const [inviteCopied, setInviteCopied] = useState(false)
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

      // 通話ルームを表示のみ取得 (この画面では参加導線のみで、参加処理自体は
      // /voice/[roomId] 側の既存実装に委譲する。voice_rooms は guild と
      // テーブル上は紐付いていないので、今は status='active' なルームを
      // 全件取得し、ジャンルが一致するものを優先表示する)
      const { data: vr, error: vrErr } = await supabase
        .from('voice_rooms')
        .select('id, title, category, is_open, status, voice_participants(user_id)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20)
      if (vrErr) console.error('[guild] voice_rooms fetch error:', vrErr)
      setVoiceRooms((vr ?? []) as VoiceRoom[])

      setLoading(false)
    }
    load()
  }, [id])

  // ── 招待 (URL 共有) ──────────────────────────────────────────
  // Web Share API が使える環境ではネイティブ共有シートを開き、
  // 不可なら URL を clipboard にコピーして簡易トースト表示。
  async function handleInvite() {
    if (!guild) return
    const url = `${window.location.origin}/guilds/${guild.id}`
    const shareData = {
      title: `${guild.name} | YVOICE`,
      text: `YVOICE のギルド「${guild.name}」に参加してね。`,
      url,
    }
    try {
      if (typeof navigator !== 'undefined' && 'share' in navigator && navigator.canShare?.(shareData)) {
        await navigator.share(shareData)
        return
      }
    } catch (e) {
      // ユーザーが share シートをキャンセルした場合などは無視
    }
    try {
      await navigator.clipboard.writeText(url)
      setInviteCopied(true)
      setTimeout(() => setInviteCopied(false), 2000)
    } catch (e) {
      console.error('[guild] invite copy failed:', e)
    }
  }

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
        <div className="flex items-center gap-2">
          {onlineCount > 0 && (
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-400">{onlineCount}</span>
            </div>
          )}
          {/* 招待ボタン (Web Share API → clipboard) */}
          <button
            onClick={handleInvite}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.85)',
            }}
            aria-label="ギルドを招待する"
          >
            <Share2 size={12} />
            <span>{inviteCopied ? 'コピー済' : '招待'}</span>
          </button>
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
        {/* アイコン + バッジ。タップでギルド詳細モーダルを開く（旧メンバータブの中身） */}
        <div className="absolute bottom-0 left-4 flex items-end gap-3 pb-2 translate-y-1/3">
          <button
            type="button"
            onClick={() => setShowDetail(true)}
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 active:scale-95 transition-transform"
            style={{
              background: 'rgba(15,15,26,0.9)',
              border: `3px solid #0f0f1a`,
              boxShadow: `0 0 0 1px ${genre?.color ?? '#7c3aed'}60, 0 4px 16px ${genre?.color ?? '#7c3aed'}30`,
            }}
            aria-label="ギルドの詳細を表示"
            title="ギルド詳細"
          >
            {guild.icon}
          </button>
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

      {/* ── タブバー（タイムライン一本化）──
          旧: # 投稿 / メンバー の 2 タブ。
          新: タイムライン のみ。メンバー一覧はギルドアイコン押下で開く詳細
          モーダル側へ移動した。 */}
      <div
        className="flex-shrink-0 flex border-b sticky z-10"
        style={{ top: 48, background: 'rgba(15,15,26,0.95)', borderColor: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)' }}
      >
        <button
          onClick={() => setTab('timeline')}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-colors relative"
          style={{ color: genre?.color ?? '#8b5cf6' }}
          aria-pressed={tab === 'timeline'}
        >
          <FileText size={13} />
          タイムライン
          <span
            className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full"
            style={{ background: genre?.color ?? '#8b5cf6' }}
          />
        </button>
      </div>

      {/* ══ タイムライン ══ */}
      {tab === 'timeline' && (
        <div className="flex-1 flex flex-col">

          {/* ── 通話ルームセクション ── */}
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Mic size={12} style={{ color: genre?.color ?? '#8b5cf6' }} />
                <span className="text-[11px] font-extrabold uppercase tracking-widest"
                  style={{ color: 'rgba(255,255,255,0.55)' }}>
                  通話ルーム
                </span>
              </div>
              <Link
                href="/voice"
                className="text-[10px] font-bold flex items-center gap-0.5 active:opacity-70"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                すべて見る
                <ChevronRight size={10} />
              </Link>
            </div>

            {voiceRooms.length === 0 ? (
              <div
                className="rounded-2xl px-4 py-5 text-center"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px dashed rgba(255,255,255,0.12)',
                }}
              >
                <p className="text-xs font-bold mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  まだ通話ルームがありません
                </p>
                <p className="text-[11px] mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  ルームを作成して、ギルドメンバーと話してみましょう
                </p>
                <Link
                  href="/voice"
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-[11px] font-extrabold active:scale-95 transition-all"
                  style={{
                    background: genre?.color ?? '#8b5cf6',
                    color: '#fff',
                    boxShadow: `0 4px 14px ${genre?.color ?? '#8b5cf6'}50`,
                  }}
                >
                  <Mic size={11} />
                  ルームを作成
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {voiceRooms.slice(0, 6).map(r => {
                  const participantCount = (r.voice_participants ?? []).length
                  return (
                    <Link
                      key={r.id}
                      href={`/voice/${r.id}`}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl active:scale-[0.99] transition-all"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: `${genre?.color ?? '#8b5cf6'}22`,
                          border: `1px solid ${genre?.color ?? '#8b5cf6'}40`,
                        }}
                      >
                        <Headphones size={16} style={{ color: genre?.color ?? '#8b5cf6' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-extrabold truncate" style={{ color: 'rgba(255,255,255,0.92)' }}>
                          {r.title || '通話ルーム'}
                        </p>
                        <p className="text-[11px] mt-0.5 flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                          <span className="flex items-center gap-0.5">
                            <Users size={10} />
                            {participantCount}人
                          </span>
                          <span style={{ color: 'rgba(255,255,255,0.25)' }}>・</span>
                          <span>ルームに入りましょう</span>
                        </p>
                      </div>
                      <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.3)' }} className="flex-shrink-0" />
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* チャンネルヘッダー（Discordの#チャンネル説明） */}
          <div className="px-4 py-4 mt-1 border-t border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: genre ? `${genre.color}20` : 'rgba(139,92,246,0.2)', border: `1px solid ${genre?.color ?? '#8b5cf6'}40` }}>
                <FileText size={14} style={{ color: genre?.color ?? '#8b5cf6' }} />
              </div>
              <span className="font-extrabold text-white text-sm">タイムライン</span>
            </div>
            <p className="text-xs leading-relaxed pl-10" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {guild.description || 'ギルドのタイムラインに投稿して、メンバーと交流しましょう。'}
            </p>
          </div>

          {/* 投稿リスト */}
          <div className="flex-1 pb-4">
            {posts.length === 0 ? (
              <div className="text-center py-16 px-8">
                <div className="text-4xl mb-3">{guild.icon}</div>
                <p className="font-bold text-white mb-1">まだ投稿がありません</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {isMember ? 'ギルドのタイムラインに投稿して、メンバーと交流しましょう' : '参加して投稿しよう'}
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

      {/* ══ ギルド詳細モーダル (旧メンバータブの内容 + 概要 + 説明文) ══
          ギルドアイコン押下で開く。背景タップ or × で閉じる。 */}
      {showDetail && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={() => setShowDetail(false)} />
          <div
            className="relative w-full max-w-md mx-auto rounded-t-3xl overflow-hidden flex flex-col"
            style={{
              background: '#0f0f1a',
              border: '1px solid rgba(255,255,255,0.08)',
              borderBottom: 'none',
              maxHeight: '88vh',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* ドラッグハンドル */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} />
            </div>
            {/* ヘッダー: 閉じる + タイトル */}
            <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0">
              <button
                onClick={() => setShowDetail(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center active:opacity-60"
                style={{ background: 'rgba(255,255,255,0.06)' }}
                aria-label="閉じる"
              >
                <X size={16} style={{ color: 'rgba(255,255,255,0.6)' }} />
              </button>
              <p className="text-sm font-extrabold flex-1" style={{ color: 'rgba(255,255,255,0.85)' }}>
                ギルド詳細
              </p>
            </div>

            {/* 中身（スクロール可能） */}
            <div className="flex-1 overflow-y-auto pb-6">
              {/* ギルドの顔 */}
              <div className="flex flex-col items-center px-6 pt-4 pb-5">
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center text-5xl mb-3"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: `2px solid ${genre?.color ?? '#7c3aed'}50`,
                    boxShadow: `0 6px 24px ${genre?.color ?? '#7c3aed'}40`,
                  }}
                >
                  {guild.icon}
                </div>
                <h2 className="font-extrabold text-white text-lg text-center leading-tight">{guild.name}</h2>
                {genre && (
                  <span
                    className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${genre.color}20`, color: genre.color, border: `1px solid ${genre.color}40` }}
                  >
                    <Shield size={9} /> {genre.emoji} {guild.category}
                  </span>
                )}
              </div>

              {/* 説明文 */}
              {guild.description && (
                <div className="mx-4 mb-4 rounded-2xl p-4"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest mb-1.5"
                    style={{ color: 'rgba(255,255,255,0.4)' }}>
                    説明
                  </p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap"
                    style={{ color: 'rgba(255,255,255,0.78)' }}>
                    {guild.description}
                  </p>
                </div>
              )}

              {/* ステータス概要 (旧メンバータブの 3 連カード) */}
              <div className="mx-4 mb-4 rounded-2xl p-4"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'メンバー', value: guild.member_count.toLocaleString(), emoji: '👥' },
                    { label: 'オンライン', value: String(onlineCount), emoji: '🟢' },
                    { label: '公開設定', value: visibilityLabel(guild.visibility), emoji: visibilityEmoji(guild.visibility) },
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

              {/* メンバー一覧 (旧メンバータブの中身そのまま) */}
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

              {/* 招待ボタン (モーダル下部にも配置) */}
              <div className="px-4 mt-5">
                <button
                  onClick={handleInvite}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-extrabold transition-all active:scale-[0.98]"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    color: '#fff',
                  }}
                >
                  <Share2 size={14} />
                  {inviteCopied ? 'リンクをコピーしました' : 'ギルドを招待する'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── ギルド公開設定の表示用ヘルパー ─────────────────────────────
function visibilityLabel(v: string | undefined | null): string {
  if (v === 'approval') return '承認制'
  if (v === 'invite')   return '招待制'
  return '公開'
}
function visibilityEmoji(v: string | undefined | null): string {
  if (v === 'approval') return '🛡️'
  if (v === 'invite')   return '✉️'
  return '🌐'
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
            {getUserDisplayName(m.profiles)}
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
