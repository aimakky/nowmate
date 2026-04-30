'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/utils'
import { detectNgWords } from '@/lib/moderation'
import { Heart, RefreshCw, Users, Globe, Home, Share2, HelpCircle, Send, CheckCircle, X, Plus, Waves, Mic, MessageCircle } from 'lucide-react'
import TweetCard, { type TweetData } from '@/components/ui/TweetCard'
import { detectCrisisKeywords } from '@/lib/moderation'
import GuildHeroGamepad from '@/components/ui/icons/GuildHeroGamepad'

// ── 型定義 ──────────────────────────────────────────────────────
type Tab = 'myvillage' | 'all' | 'following'

interface TPost {
  id: string
  content: string
  category: string
  created_at: string
  village_id: string
  user_id: string
  reaction_count: number
  profiles:   { display_name: string; avatar_url: string | null } | null
  villages:   { id: string; name: string; icon: string } | null
  user_trust: { tier: string; is_shadow_banned: boolean } | null
}

interface Village {
  id: string
  name: string
  icon: string
}

interface QABottle {
  id:             string
  message:        string
  created_at:     string
  is_resolved:    boolean
  sender_user_id: string | null
  reply_count:    number
  village:        { id: string; name: string; icon: string } | null
}

interface VoiceRoom {
  id:          string
  name:        string
  icon:        string
  description: string
  category:    string
  created_at:  string
  member_count: number
  host: { id: string; display_name: string; avatar_url: string | null }
  members: { user_id: string; display_name: string; avatar_url: string | null }[]
}

type FeedItem =
  | { type: 'post';  data: TPost }
  | { type: 'qa';    data: QABottle }
  | { type: 'tweet'; data: TweetData }
  | { type: 'voice'; data: VoiceRoom }

const PAGE_SIZE = 20


const CAT_COLOR: Record<string, string> = {
  '雑談':           '#8b7355',
  '相談':           '#1a9ec8',
  '趣味':           '#d44060',
  '今日のひとこと': '#d99820',
  '初参加あいさつ': '#14a89a',
  '今日のお題':     '#7c3aed',
  '悩み':           '#e05a5a',
  '夜話':           '#5b5b8b',
  '笑い':           '#d97706',
}

const TAB_CONFIG: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'myvillage', label: 'ギルド',   icon: Home  },
  { key: 'all',       label: 'みんな',   icon: Globe },
  { key: 'following', label: 'フォロー', icon: Users },
]

// ── 通話ルームカード（Discordスタイル） ────────────────────────
function VoiceRoomCard({ room, currentUserId }: { room: VoiceRoom; currentUserId: string | null }) {
  const router = useRouter()
  const isHost = room.host.id === currentUserId

  const tagMatches = room.description.match(/【([^】]+)】/g)?.map(t => t.slice(1, -1)) ?? []
  const slotsMatch = room.description.match(/【[^】]+】【[^】]+】(.+)/)
  const slots = slotsMatch?.[1]?.trim() ?? ''

  const GAME_COLORS: Record<string, string> = {
    'FPS': '#FF4D90', 'MOBA': '#f97316', 'RPG': '#39FF88',
    'スポーツ': '#39FF88', 'カードゲーム': '#39FF88', 'パズル': '#FF4D90',
    'サバイバル': '#7CFF82', 'その他': '#39FF88',
  }
  const color = GAME_COLORS[room.category] ?? '#39FF88'

  // 全参加者（ホスト + メンバー）
  const allParticipants = [
    { user_id: room.host.id, display_name: room.host.display_name, avatar_url: room.host.avatar_url, isHost: true },
    ...room.members.map(m => ({ ...m, isHost: false })),
  ]

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${color}40`,
        boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px ${color}15`,
      }}
    >
      {/* ── チャンネルヘッダー ── */}
      <div
        className="flex items-center gap-3 px-4 py-2.5"
        style={{ background: `${color}12`, borderBottom: `1px solid ${color}25` }}
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}25` }}>
            <Waves size={11} style={{ color }} />
          </div>
          <span className="text-xs font-extrabold truncate" style={{ color: '#F0EEFF' }}>{room.name}</span>
          {tagMatches.map((tag, i) => (
            <span key={i} className="text-[8px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ background: `${color}20`, color, border: `1px solid ${color}35` }}>
              {tag}
            </span>
          ))}
        </div>
        {/* LIVE badge */}
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#39FF88,#FF4D90)', boxShadow: '0 2px 8px rgba(57,255,136,0.25)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-[9px] font-extrabold text-white">LIVE</span>
        </div>
      </div>

      {/* ── 参加者グリッド ── */}
      <div className="p-3">
        <div className="grid grid-cols-4 gap-2">
          {allParticipants.slice(0, 8).map((p, i) => (
            <div key={p.user_id} className="flex flex-col items-center gap-1">
              <div className="relative">
                {/* speaking animation ring */}
                {i % 3 === 0 && (
                  <div
                    className="absolute inset-0 rounded-full animate-ping opacity-50"
                    style={{ background: `${color}50`, transform: 'scale(1.4)' }}
                  />
                )}
                <div
                  className="relative w-11 h-11 rounded-full flex items-center justify-center text-base font-extrabold text-white overflow-hidden"
                  style={{
                    background: p.avatar_url ? undefined : `linear-gradient(135deg,${color},${color}80)`,
                    border: i % 3 === 0 ? `2px solid ${color}` : '2px solid rgba(57,255,136,0.12)',
                    boxShadow: i % 3 === 0 ? `0 0 14px ${color}70` : 'none',
                  }}
                >
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                    : p.display_name[0]}
                </div>
                {/* ホストクラウン */}
                {p.isHost && (
                  <span
                    className="absolute -top-1.5 -right-1.5 text-[10px] w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: '#fbbf24', boxShadow: '0 0 8px rgba(251,191,36,0.7)' }}
                  >
                    👑
                  </span>
                )}
              </div>
              <p className="text-[9px] font-bold text-center truncate w-full"
                style={{ color: 'rgba(240,238,255,0.55)' }}>
                {p.display_name.split(/[_\s]/)[0]}
              </p>
            </div>
          ))}
          {allParticipants.length > 8 && (
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-xs font-extrabold"
                style={{ background: 'rgba(57,255,136,0.07)', color: 'rgba(240,238,255,0.4)', border: '2px solid rgba(57,255,136,0.12)' }}
              >
                +{allParticipants.length - 8}
              </div>
              <p className="text-[9px]" style={{ color: 'rgba(240,238,255,0.3)' }}>他</p>
            </div>
          )}
        </div>

        {/* スロット情報 */}
        {slots && (
          <p className="text-[10px] mt-2 text-center" style={{ color: 'rgba(240,238,255,0.3)' }}>{slots}</p>
        )}
      </div>

      {/* ── フッター：参加ボタン ── */}
      <div className="px-3 pb-3">
        <button
          onClick={() => router.push(`/villages/${room.id}`)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-extrabold text-white active:scale-95 transition-all"
          style={{
            background: 'linear-gradient(135deg,#39FF88 0%,#059669 100%)',
            boxShadow: '0 4px 20px rgba(57,255,136,0.25)',
          }}
        >
          <Mic size={14} />
          {isHost ? 'ルームに戻る' : `通話に参加 · ${allParticipants.length}人通話中`}
        </button>
      </div>
    </div>
  )
}

// ── Q&Aカード ──────────────────────────────────────────────────
function QACard({
  bottle, userId, canReply, onAnswered,
}: {
  bottle:     QABottle
  userId:     string | null
  canReply:   boolean
  onAnswered: (bottleId: string) => void
}) {
  const [open,      setOpen]      = useState(false)
  const [text,      setText]      = useState('')
  const [sending,   setSending]   = useState(false)
  const [done,      setDone]      = useState(false)
  const [errMsg,    setErrMsg]    = useState('')

  const isMyBottle = bottle.sender_user_id === userId

  async function submit() {
    if (!text.trim() || sending || !userId) return
    const ng = detectNgWords(text)
    if (ng) { setErrMsg(`「${ng}」は使えません`); return }
    setSending(true)
    const supabase = createClient()
    await supabase.from('drift_bottle_replies').insert({
      bottle_id:  bottle.id,
      village_id: bottle.village?.id ?? null,
      user_id:    userId,
      message:    text.trim(),
    })
    setSending(false)
    setDone(true)
    setText('')
    onAnswered(bottle.id)
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: bottle.is_resolved ? '1px solid rgba(124,255,130,0.25)' : '1px solid rgba(57,255,136,0.2)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}>

      {/* ヘッダー */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <HelpCircle size={13} style={{ color: bottle.is_resolved ? '#7CFF82' : '#39FF88' }} />
          <span className="text-[10px] font-extrabold"
            style={{ color: bottle.is_resolved ? '#7CFF82' : '#39FF88' }}>
            {bottle.is_resolved ? '✅ 解決済み' : '❓ 匿名質問'}
          </span>
          {bottle.village && (
            <>
              <span className="text-[10px]" style={{ color: 'rgba(240,238,255,0.2)' }}>·</span>
              <span className="text-[10px] truncate" style={{ color: 'rgba(57,255,136,0.5)' }}>
                {bottle.village.icon} {bottle.village.name}
              </span>
            </>
          )}
        </div>
        <span className="text-[10px] flex-shrink-0" style={{ color: 'rgba(240,238,255,0.3)' }}>{timeAgo(bottle.created_at)}</span>
      </div>

      {/* 質問本文 */}
      <div className="px-4 pb-3">
        <p className="text-sm leading-relaxed font-medium" style={{ color: 'rgba(240,238,255,0.9)' }}>{bottle.message}</p>
      </div>

      {/* フッター */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-2"
        style={{ borderTop: '1px solid rgba(57,255,136,0.07)' }}>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px]" style={{ color: 'rgba(57,255,136,0.4)' }}>
            💬 {bottle.reply_count > 0 ? `${bottle.reply_count}件の回答` : 'まだ回答なし'}
          </span>
        </div>

        {done ? (
          <span className="flex items-center gap-1 text-[11px] font-bold" style={{ color: '#7CFF82' }}>
            <CheckCircle size={11} /> 回答しました
          </span>
        ) : isMyBottle ? (
          <span className="text-[10px]" style={{ color: 'rgba(57,255,136,0.3)' }}>自分の質問</span>
        ) : bottle.is_resolved ? (
          <span className="text-[10px]" style={{ color: 'rgba(124,255,130,0.4)' }}>解決済み</span>
        ) : canReply ? (
          <button onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold active:scale-95 transition-all"
            style={{ background: 'rgba(57,255,136,0.12)', border: '1px solid rgba(57,255,136,0.25)', color: '#39FF88' }}>
            {open ? '閉じる' : '回答する →'}
          </button>
        ) : (
          <span className="text-[10px]" style={{ color: 'rgba(57,255,136,0.3)' }}>常連以上が回答可</span>
        )}
      </div>

      {/* インライン回答フォーム */}
      {open && !done && (
        <div className="px-4 pb-4 pt-1 space-y-2" style={{ borderTop: '1px solid rgba(57,255,136,0.07)' }}>
          <textarea
            value={text}
            onChange={e => { setText(e.target.value); setErrMsg('') }}
            placeholder="回答を書く（名前が表示されます）"
            rows={2} maxLength={300} autoFocus
            className="w-full px-3 py-2 rounded-xl text-xs resize-none focus:outline-none"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(57,255,136,0.12)',
              color: '#F0EEFF',
              caretColor: '#39FF88',
            }}
          />
          {errMsg && <p className="text-[10px] text-red-400">⚠️ {errMsg}</p>}
          <div className="flex gap-2">
            <button onClick={() => setOpen(false)}
              className="flex-1 py-2 rounded-xl text-xs font-bold border"
              style={{ borderColor: 'rgba(57,255,136,0.12)', color: 'rgba(240,238,255,0.55)', background: 'transparent' }}>
              キャンセル
            </button>
            <button onClick={submit} disabled={!text.trim() || sending}
              className="flex-1 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40 active:scale-95 transition-all flex items-center justify-center gap-1"
              style={{ background: 'linear-gradient(135deg,#39FF88 0%,#059669 100%)', boxShadow: '0 4px 20px rgba(57,255,136,0.25)' }}>
              {sending
                ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Send size={10} /> 送信</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 通常投稿カード ─────────────────────────────────────────────
function PostCard({
  post, userId, likedIds, onToggleLike,
}: {
  post: TPost
  userId: string | null
  likedIds: Set<string>
  onToggleLike: (id: string) => void
  showVillage?: boolean
}) {
  const liked = likedIds.has(post.id)
  const roleLabel = {
    visitor:  'メンバー',
    regular:  'ギルドメンバー',
    trusted:  '常連メンバー',
    pillar:   'ギルドマスター',
  }[post.user_trust?.tier ?? 'visitor'] ?? 'メンバー'

  function shareToX() {
    const village = post.villages ? `${post.villages.icon}${post.villages.name}` : 'samee'
    const text = `${post.content}\n\n— ${village}より\n#samee #ゲームコミュニティ\nnowmatejapan.com`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(57,255,136,0.15)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
      }}
    >
      <div className="px-4 pt-3.5 pb-3">
        {/* ヘッダー */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* アバター */}
            <div
              className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-sm font-bold text-white"
              style={{
                background: 'linear-gradient(135deg,#059669,#047857)',
                boxShadow: '0 0 0 2px rgba(57,255,136,0.3)',
              }}
            >
              {post.profiles?.avatar_url
                ? <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                : post.profiles?.display_name?.[0] ?? '?'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-bold leading-tight" style={{ color: '#F0EEFF' }}>
                  {post.profiles?.display_name ?? '名無し'}
                </span>
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    background: 'rgba(57,255,136,0.12)',
                    color: '#39FF88',
                    border: '1px solid rgba(57,255,136,0.3)',
                  }}
                >
                  {roleLabel}
                </span>
              </div>
              <span className="text-[10px]" style={{ color: 'rgba(240,238,255,0.3)' }}>
                {timeAgo(post.created_at)}
              </span>
            </div>
          </div>
          {/* ... ボタン */}
          <button className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full active:bg-white/5 transition-all"
            style={{ color: 'rgba(240,238,255,0.25)' }}>
            <span className="text-xs tracking-widest leading-none">•••</span>
          </button>
        </div>

        {/* 本文 */}
        <p className="text-sm leading-relaxed mt-3" style={{ color: 'rgba(240,238,255,0.85)' }}>
          {post.content}
        </p>

        {/* アクション */}
        <div
          className="flex items-center gap-4 mt-3 pt-2.5"
          style={{ borderTop: '1px solid rgba(57,255,136,0.1)' }}
        >
          <button
            onClick={() => onToggleLike(post.id)}
            className="flex items-center gap-1.5 active:scale-90 transition-all"
            style={{ color: liked ? '#FF4D90' : 'rgba(240,238,255,0.35)' }}
          >
            <Heart size={15} fill={liked ? '#FF4D90' : 'none'} strokeWidth={liked ? 0 : 1.8} />
            {post.reaction_count > 0 && (
              <span className="text-xs font-semibold">{post.reaction_count}</span>
            )}
          </button>
          <button
            className="flex items-center gap-1.5 active:scale-90 transition-all"
            style={{ color: 'rgba(240,238,255,0.35)' }}
          >
            <MessageCircle size={15} strokeWidth={1.8} />
          </button>
          <button
            onClick={shareToX}
            className="flex items-center gap-1.5 active:scale-90 transition-all ml-auto"
            style={{ color: 'rgba(240,238,255,0.35)' }}
          >
            <Share2 size={14} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── スケルトン ─────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="rounded-2xl p-4 animate-pulse"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(57,255,136,0.1)' }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-full flex-shrink-0" style={{ background: 'rgba(57,255,136,0.12)' }} />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 rounded w-1/3" style={{ background: 'rgba(57,255,136,0.1)' }} />
              <div className="h-2.5 rounded w-1/4" style={{ background: 'rgba(57,255,136,0.07)' }} />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="h-3.5 rounded w-full" style={{ background: 'rgba(57,255,136,0.07)' }} />
            <div className="h-3.5 rounded w-4/5" style={{ background: 'rgba(57,255,136,0.07)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── フィード合成（投稿3件ごとにQ&A or 通話ルームを挿入）─────
function buildFeed(posts: TPost[], qaBottles: QABottle[], voiceRooms: VoiceRoom[] = []): FeedItem[] {
  const feed: FeedItem[] = []
  let qaIdx    = 0
  let voiceIdx = 0

  posts.forEach((post, i) => {
    feed.push({ type: 'post', data: post })
    // 3件ごと: 通話ルームを優先、なければQ&Aを挿入
    if ((i + 1) % 3 === 0) {
      if (voiceIdx < voiceRooms.length) {
        feed.push({ type: 'voice', data: voiceRooms[voiceIdx++] })
      } else if (qaIdx < qaBottles.length) {
        feed.push({ type: 'qa', data: qaBottles[qaIdx++] })
      }
    }
  })
  // 残りを末尾に
  while (voiceIdx < voiceRooms.length) {
    feed.push({ type: 'voice', data: voiceRooms[voiceIdx++] })
  }
  while (qaIdx < qaBottles.length) {
    feed.push({ type: 'qa', data: qaBottles[qaIdx++] })
  }
  return feed
}

// ── 投稿カテゴリ ───────────────────────────────────────────────
const POST_CATEGORIES = [
  { id: '今日のひとこと', emoji: '✨' },
  { id: '雑談',           emoji: '💬' },
  { id: '悩み',           emoji: '😔' },
  { id: '相談',           emoji: '🤝' },
  { id: '夜話',           emoji: '🌙' },
  { id: '笑い',           emoji: '😂' },
  { id: '趣味',           emoji: '🎨' },
]

// ── 投稿モーダル（X風・漂流瓶モード対応）────────────────────
function ComposeModal({
  userId, userProfile, villages, onClose, onPosted,
}: {
  userId: string
  userProfile: { display_name: string; avatar_url: string | null } | null
  villages: Village[]
  onClose: () => void
  onPosted: () => void
}) {
  const [mode,        setMode]        = useState<'post' | 'bottle'>('post')
  const [text,        setText]        = useState('')
  const [category,    setCategory]    = useState('今日のひとこと')
  const [sending,     setSending]     = useState(false)
  const [sent,        setSent]        = useState(false)
  const [errMsg,      setErrMsg]      = useState('')
  const [targetVil,   setTargetVil]   = useState<Village | null>(villages[0] ?? null)
  const [showCrisis,  setShowCrisis]  = useState(false)
  const MAX_POST   = 300
  const MAX_BOTTLE = 140

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // モード切替でテキストリセット
  function switchMode(m: 'post' | 'bottle') {
    setMode(m); setText(''); setErrMsg('')
  }

  async function handlePost() {
    if (!text.trim() || sending) return
    const ng = detectNgWords(text)
    if (ng) { setErrMsg(`「${ng}」は使えません`); return }
    setSending(true)
    const { error } = await createClient().from('village_posts').insert({
      village_id: null,
      user_id:    userId,
      content:    text.trim(),
      category,
    })
    setSending(false)
    if (!error) { setSent(true); setTimeout(onPosted, 1000) }
  }

  async function handleBottle() {
    if (!text.trim() || sending || !targetVil) return
    const ng = detectNgWords(text)
    if (ng) { setErrMsg(`「${ng}」は使えません`); return }
    if (detectCrisisKeywords(text)) { setShowCrisis(true); return }
    await doSendBottle()
  }

  async function doSendBottle() {
    if (!targetVil) return
    setSending(true)
    const { error } = await createClient().rpc('send_drift_bottle', {
      p_village_id:  targetVil.id,
      p_user_id:     userId,
      p_message:     text.trim(),
      p_is_question: false,
    })
    setSending(false)
    if (!error) { setSent(true); setTimeout(onPosted, 1800) }
    else setErrMsg('送信に失敗しました')
  }

  const avatarLetter = userProfile?.display_name?.[0] ?? '?'
  const isBottle = mode === 'bottle'
  const MAX = isBottle ? MAX_BOTTLE : MAX_POST
  const canSubmit = text.trim().length > 0 && !sending && !sent && (isBottle ? !!targetVil : true)

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* 危機検出モーダル */}
      {showCrisis && (
        <div className="absolute inset-0 z-10 flex items-center justify-center px-6">
          <div className="w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(57,255,136,0.3)',
              backdropFilter: 'blur(20px)',
            }}>
            <p className="text-2xl mb-3">💙</p>
            <p className="font-bold text-sm leading-relaxed mb-2" style={{ color: '#F0EEFF' }}>つらい気持ちを感じているようです</p>
            <p className="text-xs leading-relaxed mb-4" style={{ color: 'rgba(57,255,136,0.6)' }}>よりそいホットライン: 0120-279-338（24時間）</p>
            <div className="flex gap-2">
              <button onClick={() => { setShowCrisis(false); onClose() }}
                className="flex-1 py-2.5 rounded-2xl text-xs font-bold"
                style={{ border: '1px solid rgba(57,255,136,0.3)', color: '#39FF88', background: 'transparent' }}>
                閉じる
              </button>
              <button onClick={() => { setShowCrisis(false); doSendBottle() }}
                className="flex-1 py-2.5 rounded-2xl text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#39FF88 0%,#059669 100%)', boxShadow: '0 4px 20px rgba(57,255,136,0.25)' }}>
                それでも流す
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className="relative rounded-t-3xl w-full max-w-md mx-auto overflow-hidden"
        style={{ background: '#080812', border: '1px solid rgba(57,255,136,0.12)', borderBottom: 'none' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ドラッグハンドル */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(57,255,136,0.18)' }} />
        </div>

        {/* モード切替タブ */}
        <div className="flex mx-5 mt-1 mb-3 rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(57,255,136,0.1)' }}>
          <button onClick={() => switchMode('post')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold transition-all rounded-2xl"
            style={!isBottle
              ? { background: 'linear-gradient(135deg,#39FF88 0%,#059669 100%)', color: '#fff', boxShadow: '0 4px 20px rgba(57,255,136,0.25)' }
              : { color: 'rgba(240,238,255,0.4)' }
            }>
            <span>✍️</span> 投稿
          </button>
          <button onClick={() => switchMode('bottle')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold transition-all rounded-2xl"
            style={isBottle
              ? { background: 'rgba(57,255,136,0.15)', color: '#39FF88', border: '1px solid rgba(57,255,136,0.3)' }
              : { color: 'rgba(240,238,255,0.4)' }
            }>
            <Waves size={12} /> 漂流瓶
          </button>
        </div>

        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-2">
          <button onClick={onClose}
            className="text-sm font-bold transition-colors"
            style={{ color: 'rgba(240,238,255,0.4)' }}>
            キャンセル
          </button>
          <button
            onClick={isBottle ? handleBottle : handlePost}
            disabled={!canSubmit}
            className="px-5 py-1.5 rounded-full text-sm font-extrabold text-white disabled:opacity-40 active:scale-95 transition-all flex items-center gap-1.5"
            style={{
              background: 'linear-gradient(135deg,#39FF88 0%,#059669 100%)',
              boxShadow: '0 4px 20px rgba(57,255,136,0.25)',
            }}
          >
            {sending
              ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : sent
                ? (isBottle ? '🌊 流しました' : '✓ 投稿済み')
                : (isBottle ? '🌊 流す' : '投稿する')}
          </button>
        </div>

        <div className="px-5 pb-5">

          {/* ── 投稿モード ── */}
          {!isBottle && (
            <>
              <div className="flex gap-3 pt-2 pb-3">
                <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#39FF88,#059669)', boxShadow: '0 0 0 2px rgba(57,255,136,0.25)' }}>
                  {userProfile?.avatar_url
                    ? <img src={userProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                    : avatarLetter}
                </div>
                <div className="flex-1 min-w-0">
                  <textarea
                    value={text}
                    onChange={e => { setText(e.target.value.slice(0, MAX)); setErrMsg('') }}
                    placeholder="いまどうしてる？"
                    rows={4} autoFocus
                    className="w-full text-[17px] leading-relaxed resize-none focus:outline-none bg-transparent"
                    style={{ color: '#F0EEFF', caretColor: '#39FF88' }}
                  />
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap pb-3" style={{ borderBottom: '1px solid rgba(57,255,136,0.1)' }}>
                {POST_CATEGORIES.map(c => (
                  <button key={c.id} onClick={() => setCategory(c.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all active:scale-95"
                    style={category === c.id
                      ? { background: 'linear-gradient(135deg,#39FF88 0%,#059669 100%)', color: '#fff', borderColor: '#39FF88', boxShadow: '0 4px 20px rgba(57,255,136,0.25)' }
                      : { background: 'rgba(255,255,255,0.06)', color: 'rgba(240,238,255,0.55)', borderColor: 'rgba(57,255,136,0.12)' }
                    }>
                    {c.emoji} {c.id}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between pt-3">
                {errMsg
                  ? <p className="text-xs text-red-400 font-bold">⚠️ {errMsg}</p>
                  : <p className="text-[11px]" style={{ color: 'rgba(240,238,255,0.3)' }}>タイムラインに公開されます</p>
                }
                <div className="flex items-center gap-2">
                  <svg width="22" height="22" viewBox="0 0 22 22" className="-rotate-90">
                    <circle cx="11" cy="11" r="9" fill="none" stroke="rgba(57,255,136,0.12)" strokeWidth="2.5" />
                    <circle cx="11" cy="11" r="9" fill="none"
                      stroke={text.length > MAX * 0.9 ? '#FF4D90' : '#39FF88'}
                      strokeWidth="2.5" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 9}`}
                      strokeDashoffset={`${2 * Math.PI * 9 * (1 - text.length / MAX)}`}
                      style={{ transition: 'stroke-dashoffset 0.1s' }}
                    />
                  </svg>
                  <span className="text-[11px] font-bold"
                    style={{ color: text.length > MAX * 0.9 ? '#FF4D90' : 'rgba(240,238,255,0.3)' }}>
                    {MAX - text.length}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* ── 漂流瓶モード ── */}
          {isBottle && (
            <>
              {/* 村セレクター */}
              {villages.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-xs" style={{ color: 'rgba(57,255,136,0.5)' }}>村に参加するとここから漂流瓶を流せます</p>
                </div>
              ) : (
                <div className="mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(57,255,136,0.4)' }}>どの村に流す？</p>
                  <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                    {villages.map(v => (
                      <button key={v.id} onClick={() => setTargetVil(v)}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95"
                        style={targetVil?.id === v.id
                          ? { background: 'rgba(57,255,136,0.15)', color: '#39FF88', border: '1px solid rgba(57,255,136,0.35)' }
                          : { background: 'rgba(255,255,255,0.06)', color: 'rgba(240,238,255,0.4)', border: '1px solid rgba(57,255,136,0.1)' }
                        }>
                        <span>{v.icon}</span>
                        <span className="truncate max-w-[70px]">{v.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* メッセージ入力 */}
              <div className="relative mb-3">
                <textarea
                  value={text}
                  onChange={e => { setText(e.target.value.slice(0, MAX_BOTTLE)); setErrMsg('') }}
                  placeholder="気持ちを流してみよう…&#10;答えは求めなくていい。"
                  rows={5} autoFocus={mode === 'bottle'}
                  className="w-full px-4 py-3.5 rounded-2xl text-sm resize-none focus:outline-none leading-relaxed"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(57,255,136,0.2)',
                    color: 'rgba(240,238,255,0.9)',
                    caretColor: '#39FF88',
                  }}
                />
              </div>

              {/* フッター */}
              <div className="flex items-center justify-between">
                {errMsg
                  ? <p className="text-xs text-red-400 font-bold">⚠️ {errMsg}</p>
                  : <p className="text-[11px]" style={{ color: 'rgba(57,255,136,0.35)' }}>🔒 完全匿名 · {targetVil?.icon}{targetVil?.name ?? '村未選択'}へ届きます</p>
                }
                <div className="flex items-center gap-2">
                  <svg width="22" height="22" viewBox="0 0 22 22" className="-rotate-90">
                    <circle cx="11" cy="11" r="9" fill="none" stroke="rgba(57,255,136,0.1)" strokeWidth="2.5" />
                    <circle cx="11" cy="11" r="9" fill="none"
                      stroke={text.length > MAX_BOTTLE * 0.9 ? '#FF4D90' : '#39FF88'}
                      strokeWidth="2.5" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 9}`}
                      strokeDashoffset={`${2 * Math.PI * 9 * (1 - text.length / MAX_BOTTLE)}`}
                      style={{ transition: 'stroke-dashoffset 0.1s' }}
                    />
                  </svg>
                  <span className="text-[11px] font-bold"
                    style={{ color: text.length > MAX_BOTTLE * 0.9 ? '#FF4D90' : 'rgba(57,255,136,0.35)' }}>
                    {MAX_BOTTLE - text.length}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── メインページ ───────────────────────────────────────────────
export default function TimelinePage() {
  const router = useRouter()

  const [tab,          setTab]          = useState<Tab>('myvillage')
  const [posts,        setPosts]        = useState<TPost[]>([])
  const [qaBottles,    setQaBottles]    = useState<QABottle[]>([])
  const [loading,      setLoading]      = useState(true)
  const [loadingMore,  setLoadingMore]  = useState(false)
  const [hasMore,      setHasMore]      = useState(true)
  const [userId,       setUserId]       = useState<string | null>(null)
  const [userTier,     setUserTier]     = useState<string>('visitor')
  const [myVillageIds, setMyVillageIds] = useState<string[]>([])
  const [followingIds, setFollowingIds] = useState<string[]>([])
  const [likedIds,     setLikedIds]     = useState<Set<string>>(new Set())
  const [showCompose,    setShowCompose]    = useState(false)
  const [userProfile,    setUserProfile]    = useState<{ display_name: string; avatar_url: string | null } | null>(null)
  const [myVillages,     setMyVillages]     = useState<Village[]>([])
  const [tweetFeed,      setTweetFeed]      = useState<TweetData[]>([])
  const [tweetLoading,   setTweetLoading]   = useState(false)
  const [voiceRooms,     setVoiceRooms]     = useState<VoiceRoom[]>([])

  const offsetRef   = useRef(0)
const canReply = ['regular', 'trusted', 'pillar'].includes(userTier)

  // ── 初期化 ──────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        setUserId(user.id)

        const [{ data: memberships }, { data: follows }, { data: reactions }, { data: trust }, { data: profile }] = await Promise.all([
          supabase.from('village_members').select('village_id, villages(id, name, icon)').eq('user_id', user.id),
          supabase.from('user_follows').select('following_id').eq('follower_id', user.id),
          supabase.from('village_reactions').select('post_id').eq('user_id', user.id),
          supabase.from('user_trust').select('tier').eq('user_id', user.id).single(),
          supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).single(),
        ])

        const vIds = (memberships || []).map((m: any) => m.village_id)
        setMyVillageIds(vIds)
        const vDetails = (memberships || [])
          .map((m: any) => Array.isArray(m.villages) ? m.villages[0] : m.villages)
          .filter(Boolean) as Village[]
        setMyVillages(vDetails)
        setFollowingIds((follows || []).map((f: any) => f.following_id))
        setLikedIds(new Set((reactions || []).map((r: any) => r.post_id)))
        if (trust?.tier) setUserTier(trust.tier)
        if (profile) setUserProfile({ display_name: profile.display_name, avatar_url: profile.avatar_url ?? null })
      } catch (e) {
        console.error('timeline init error:', e)
      }
    }
    init()
  }, [router])

  // ── Q&A瓶フェッチ ────────────────────────────────────────────
  const fetchQA = useCallback(async (uid: string, villageIds: string[]) => {
    if (villageIds.length === 0) return
    const supabase = createClient()

    // 自分の参加村宛の未解決Q&A（自分が送ったもの以外）
    const { data: bottles } = await supabase
      .from('drift_bottles')
      .select('id, message, created_at, is_resolved, sender_user_id, recipient_village:recipient_village_id(id, name, icon)')
      .eq('is_question', true)
      .in('recipient_village_id', villageIds)
      .in('status', ['delivered', 'replied'])
      .order('created_at', { ascending: false })
      .limit(10)

    if (!bottles) return

    // 各瓶の回答数を取得
    const ids = bottles.map(b => b.id)
    const { data: replyCounts } = ids.length
      ? await supabase
          .from('drift_bottle_replies')
          .select('bottle_id')
          .in('bottle_id', ids)
      : { data: [] }

    const countMap: Record<string, number> = {}
    for (const r of replyCounts ?? []) {
      countMap[r.bottle_id] = (countMap[r.bottle_id] ?? 0) + 1
    }

    // 自分が既に回答済みの瓶IDを取得
    const { data: myReplies } = ids.length
      ? await supabase
          .from('drift_bottle_replies')
          .select('bottle_id')
          .eq('user_id', uid)
          .in('bottle_id', ids)
      : { data: [] }
    const myRepliedIds = new Set((myReplies ?? []).map((r: any) => r.bottle_id))

    setQaBottles(
      bottles
        .filter(b => !myRepliedIds.has(b.id)) // 回答済みは非表示
        .map(b => ({
          id:             b.id,
          message:        b.message,
          created_at:     b.created_at,
          is_resolved:    b.is_resolved ?? false,
          sender_user_id: b.sender_user_id,
          reply_count:    countMap[b.id] ?? 0,
          village:        Array.isArray(b.recipient_village)
            ? (b.recipient_village[0] ?? null)
            : (b.recipient_village as any ?? null),
        }))
    )
  }, [])

  // ── 投稿フェッチ ─────────────────────────────────────────────
  const fetchPosts = useCallback(async (reset = false) => {
    if (!userId) return
    const supabase = createClient()
    const from = reset ? 0 : offsetRef.current
    if (reset) { setLoading(true); offsetRef.current = 0 }
    else setLoadingMore(true)

    try {
      if (tab === 'myvillage' && myVillageIds.length === 0) {
        setPosts([]); setLoading(false); setHasMore(false); return
      }
      if (tab === 'following' && followingIds.length === 0) {
        setPosts([]); setLoading(false); setHasMore(false); return
      }

      let q = supabase
        .from('village_posts')
        .select('id, content, category, created_at, village_id, user_id, reaction_count, profiles(display_name, avatar_url), villages(id, name, icon), user_trust!village_posts_user_id_fkey(tier, is_shadow_banned)')
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1)

      if (tab === 'myvillage') q = q.in('village_id', myVillageIds)
      else if (tab === 'following') q = q.in('user_id', followingIds)

      const { data } = await q
      const filtered = (data || [])
        .filter((p: any) => {
          const trust = Array.isArray(p.user_trust) ? p.user_trust[0] : p.user_trust
          return trust?.is_shadow_banned !== true
        })
        .map((p: any) => ({
          ...p,
          profiles:   Array.isArray(p.profiles)   ? p.profiles[0]   ?? null : p.profiles,
          villages:   Array.isArray(p.villages)   ? p.villages[0]   ?? null : p.villages,
          user_trust: Array.isArray(p.user_trust) ? p.user_trust[0] ?? null : p.user_trust,
        })) as TPost[]

      if (reset) setPosts(filtered)
      else setPosts(prev => [...prev, ...filtered])

      offsetRef.current = from + PAGE_SIZE
      setHasMore(filtered.length === PAGE_SIZE)
    } catch (e) {
      console.error('fetchPosts error:', e)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [userId, tab, myVillageIds, followingIds])

  // ── 通話ルームフェッチ（直近3時間のLIVEルーム）────────────────
  const fetchVoiceRooms = useCallback(async () => {
    const supabase = createClient()
    const cutoff = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()

    const { data: rooms } = await supabase
      .from('villages')
      .select('id, name, icon, description, category, created_at, member_count, host_id')
      .eq('comm_style', 'voice')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(5)

    if (!rooms || rooms.length === 0) return

    const hostIds    = [...new Set(rooms.map((r: any) => r.host_id))]
    const roomIds    = rooms.map((r: any) => r.id)

    const [{ data: hostProfiles }, { data: membersData }] = await Promise.all([
      supabase.from('profiles').select('id, display_name, avatar_url').in('id', hostIds),
      supabase
        .from('village_members')
        .select('village_id, user_id, profiles(display_name, avatar_url)')
        .in('village_id', roomIds),
    ])

    const hostMap = new Map((hostProfiles || []).map((p: any) => [p.id, p]))

    const membersByRoom: Record<string, VoiceRoom['members']> = {}
    for (const m of membersData || []) {
      const prof = Array.isArray((m as any).profiles) ? (m as any).profiles[0] : (m as any).profiles
      if (!prof) continue
      if (!membersByRoom[m.village_id]) membersByRoom[m.village_id] = []
      membersByRoom[m.village_id].push({
        user_id:      m.user_id,
        display_name: prof.display_name,
        avatar_url:   prof.avatar_url,
      })
    }

    const result: VoiceRoom[] = rooms
      .map((r: any) => {
        const host = hostMap.get(r.host_id)
        if (!host) return null
        return {
          id:           r.id,
          name:         r.name,
          icon:         r.icon,
          description:  r.description ?? '',
          category:     r.category ?? 'その他',
          created_at:   r.created_at,
          member_count: r.member_count ?? 0,
          host:         { id: r.host_id, display_name: host.display_name, avatar_url: host.avatar_url },
          members:      membersByRoom[r.id] ?? [],
        }
      })
      .filter(Boolean) as VoiceRoom[]

    setVoiceRooms(result)
  }, [])

  // ── ツイートフェッチ（みんなタブ用・全ユーザー） ────────────────
  const fetchTweets = useCallback(async () => {
    setTweetLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('tweets')
      .select('*, profiles!tweets_user_id_fkey(display_name, nationality, avatar_url), tweet_reactions!tweet_reactions_tweet_id_fkey(user_id, reaction), tweet_replies!tweet_replies_tweet_id_fkey(id)')
      .is('reply_to_id', null)
      .order('created_at', { ascending: false })
      .limit(40)
    if (error) console.error('fetchTweets error:', error)
    setTweetFeed((data ?? []) as TweetData[])
    setTweetLoading(false)
  }, [])

  useEffect(() => {
    if (userId) {
      fetchPosts(true)
      fetchVoiceRooms()
      if (tab === 'myvillage') fetchQA(userId, myVillageIds)
      if (tab === 'all') fetchTweets()
    }
  }, [userId, tab, fetchPosts, fetchQA, fetchTweets, fetchVoiceRooms, myVillageIds])

  // ── いいね ──────────────────────────────────────────────────
  function toggleLike(postId: string) {
    if (!userId) return
    const supabase = createClient()
    if (likedIds.has(postId)) {
      supabase.from('village_reactions').delete().eq('post_id', postId).eq('user_id', userId)
      setLikedIds(prev => { const n = new Set(prev); n.delete(postId); return n })
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, reaction_count: Math.max(0, p.reaction_count - 1) } : p))
    } else {
      supabase.from('village_reactions').upsert({ post_id: postId, user_id: userId })
      setLikedIds(prev => new Set([...prev, postId]))
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, reaction_count: p.reaction_count + 1 } : p))
    }
  }

  // 回答後: その瓶をフィードから消す
  function handleAnswered(bottleId: string) {
    setQaBottles(prev => prev.filter(b => b.id !== bottleId))
  }

  // フィード合成（通話ルームは全タブで混在）
  const feed: FeedItem[] = (() => {
    if (tab === 'all' && tweetFeed.length > 0) {
      const combined: FeedItem[] = [
        ...posts.map(p => ({ type: 'post' as const, data: p })),
        ...tweetFeed.map(t => ({ type: 'tweet' as const, data: t })),
      ]
      combined.sort((a, b) =>
        new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime()
      )
      // 通話ルームを先頭から3件ごとに挿入
      const withVoice: FeedItem[] = []
      let vi = 0
      combined.forEach((item, i) => {
        withVoice.push(item)
        if ((i + 1) % 3 === 0 && vi < voiceRooms.length) {
          withVoice.push({ type: 'voice', data: voiceRooms[vi++] })
        }
      })
      while (vi < voiceRooms.length) withVoice.push({ type: 'voice', data: voiceRooms[vi++] })
      return withVoice
    }
    return buildFeed(posts, qaBottles, voiceRooms)
  })()

  // ── レンダリング ─────────────────────────────────────────────
  return (
    <div className="max-w-md mx-auto min-h-screen" style={{ background: '#080812' }}>

      {/* ヘッダー */}
      <div className="px-4 pt-12 pb-0"
        style={{
          background: 'linear-gradient(160deg,rgba(8,8,18,0.98) 0%,rgba(8,18,12,0.98) 60%,rgba(9,20,14,0.95) 100%)',
          borderBottom: '1px solid rgba(57,255,136,0.15)',
        }}>
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase mb-0.5" style={{ color: 'rgba(57,255,136,0.65)' }}>TIMELINE</p>
            <h1 className="font-extrabold text-2xl leading-tight" style={{ color: '#F0EEFF' }}>タイムライン</h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(240,238,255,0.3)' }}>みんなの声が流れる場所</p>
          </div>
          <button onClick={() => { fetchPosts(true); fetchVoiceRooms(); if (userId) fetchQA(userId, myVillageIds); if (tab === 'all') fetchTweets() }}
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all"
            style={{ background: 'rgba(57,255,136,0.1)', border: '1px solid rgba(57,255,136,0.25)' }}>
            <RefreshCw size={15} style={{ color: 'rgba(57,255,136,0.7)' }} />
          </button>
        </div>

        {/* タブ */}
        <div className="flex" style={{ borderBottom: '1px solid rgba(57,255,136,0.15)' }}>
          {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className="flex-1 flex flex-col items-center gap-0.5 pt-2 pb-3 transition-all relative">
              <Icon size={16}
                style={{ color: tab === key ? '#39FF88' : 'rgba(240,238,255,0.3)' }}
                strokeWidth={tab === key ? 2.5 : 1.8} />
              <span className="text-[10px] font-bold whitespace-nowrap"
                style={{ color: tab === key ? '#F0EEFF' : 'rgba(240,238,255,0.3)' }}>
                {label}
              </span>
              {/* マイ村タブにQ&Aバッジ */}
              {key === 'myvillage' && qaBottles.length > 0 && (
                <span className="absolute top-1.5 right-2 min-w-[14px] h-[14px] rounded-full flex items-center justify-center px-0.5"
                  style={{ background: 'linear-gradient(135deg,#39FF88,#059669)' }}>
                  <span className="text-[8px] font-black text-white">{qaBottles.length}</span>
                </span>
              )}
              {tab === key && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ background: 'linear-gradient(90deg,#39FF88,#059669)' }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* コンテンツ */}
      <div className="px-4 pt-4 pb-28 space-y-3">

        {/* 回答待ちバナー（マイ村タブ・Q&Aあり） */}
        {tab === 'myvillage' && qaBottles.length > 0 && !loading && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl"
            style={{ background: 'rgba(57,255,136,0.08)', border: '1px solid rgba(57,255,136,0.25)' }}>
            <HelpCircle size={14} style={{ color: '#39FF88' }} className="flex-shrink-0" />
            <p className="text-xs font-bold" style={{ color: 'rgba(57,255,136,0.9)' }}>
              あなたの村に{qaBottles.length}件の質問が届いています
            </p>
          </div>
        )}

        {/* 村に参加していない */}
        {tab === 'myvillage' && myVillageIds.length === 0 && !loading && (
          <div className="rounded-2xl p-6 text-center"
            style={{ background: 'rgba(57,255,136,0.06)', border: '1px solid rgba(57,255,136,0.2)' }}>
            <p className="text-3xl mb-3">🛡️</p>
            <p className="text-sm font-extrabold mb-1" style={{ color: '#F0EEFF' }}>まだギルドに参加していません</p>
            <p className="text-xs leading-relaxed mb-4" style={{ color: 'rgba(240,238,255,0.35)' }}>ギルドに参加すると、仲間の投稿がここに流れます。</p>
            <button onClick={() => router.push('/guilds')}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl text-sm font-bold active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg,#39FF88 0%,#059669 100%)', boxShadow: '0 4px 20px rgba(57,255,136,0.4)', color: '#051a0e' }}>
              ギルドを探す →
            </button>
          </div>
        )}

        {/* フォロー0人 */}
        {tab === 'following' && followingIds.length === 0 && !loading && (
          <div className="rounded-2xl p-6 text-center"
            style={{ background: 'rgba(57,255,136,0.04)', border: '1px solid rgba(57,255,136,0.2)' }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(57,255,136,0.1)', border: '1px solid rgba(57,255,136,0.25)' }}>
              <Users size={26} style={{ color: '#39FF88' }} />
            </div>
            <p className="text-sm font-extrabold mb-1" style={{ color: '#F0EEFF' }}>まだ誰もフォローしていません</p>
            <p className="text-xs leading-relaxed mb-4" style={{ color: 'rgba(240,238,255,0.35)' }}>ゲーム仲間をフォローすると、ここに投稿が流れます。</p>
            <button onClick={() => router.push('/guilds')}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl text-sm font-bold active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg,#39FF88 0%,#059669 100%)', boxShadow: '0 4px 20px rgba(57,255,136,0.4)', color: '#051a0e' }}>
              ギルドを探す →
            </button>
          </div>
        )}

        {/* ローディング */}
        {loading && <Skeleton />}

        {/* フィード（投稿 + Q&A + ツイート + 通話ルーム混在） */}
        {!loading && feed.map((item) =>
          item.type === 'voice' ? (
            <VoiceRoomCard
              key={`voice-${item.data.id}`}
              room={item.data}
              currentUserId={userId}
            />
          ) : item.type === 'qa' ? (
            <QACard
              key={`qa-${item.data.id}`}
              bottle={item.data}
              userId={userId}
              canReply={canReply}
              onAnswered={handleAnswered}
            />
          ) : item.type === 'tweet' ? (
            <div key={`tweet-${item.data.id}`} className="rounded-2xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(57,255,136,0.2)', boxShadow: '0 4px 24px rgba(0,0,0,0.35)' }}>
              <TweetCard
                tweet={item.data}
                myId={userId}
                onUpdate={fetchTweets}
                showBorder={false}
                canInteract={true}
              />
            </div>
          ) : (
            <PostCard
              key={`post-${item.data.id}`}
              post={item.data}
              userId={userId}
              likedIds={likedIds}
              onToggleLike={toggleLike}
              showVillage={tab !== 'myvillage'}
            />
          )
        )}

        {/* 空状態 */}
        {!loading && feed.length === 0 && (
          (tab === 'all') ||
          (tab === 'myvillage' && myVillageIds.length > 0) ||
          (tab === 'following' && followingIds.length > 0)
        ) && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)' }}>
              <GuildHeroGamepad size={40} />
            </div>
            <p className="text-sm font-bold" style={{ color: 'rgba(240,238,255,0.4)' }}>まだ投稿がありません</p>
          </div>
        )}

        {/* もっと読む */}
        {!loading && hasMore && posts.length > 0 && (
          <button onClick={() => fetchPosts(false)} disabled={loadingMore}
            className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
            style={{ background: 'rgba(57,255,136,0.08)', border: '1px solid rgba(57,255,136,0.2)', color: 'rgba(57,255,136,0.8)' }}>
            {loadingMore
              ? <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgba(57,255,136,0.6)', borderTopColor: 'transparent' }} />
              : '続きを読む'}
          </button>
        )}
      </div>

      {/* ── FAB ── */}
      <button
        onClick={() => setShowCompose(true)}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-all z-30"
        style={{ background: 'linear-gradient(135deg,#39FF88 0%,#059669 100%)', boxShadow: '0 8px 28px rgba(57,255,136,0.5)' }}
      >
        <Plus size={24} strokeWidth={2.5} style={{ color: '#051a0e' }} />
      </button>

      {/* ── 村投稿モーダル ── */}
      {showCompose && userId && (
        <ComposeModal
          userId={userId}
          userProfile={userProfile}
          villages={myVillages}
          onClose={() => setShowCompose(false)}
          onPosted={() => {
            setShowCompose(false)
            fetchPosts(true)
            if (tab === 'myvillage') fetchQA(userId, myVillageIds)
          }}
        />
      )}
    </div>
  )
}


