'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getTierById } from '@/lib/trust'
import { timeAgo } from '@/lib/utils'
import { detectNgWords } from '@/lib/moderation'
import { Heart, RefreshCw, ChevronRight, Users, Globe, Home, Share2, Sparkles, HelpCircle, Send, CheckCircle, X, Plus, Waves } from 'lucide-react'
import TweetCard, { type TweetData } from '@/components/ui/TweetCard'
import { detectCrisisKeywords } from '@/lib/moderation'
import Link from 'next/link'

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

type FeedItem =
  | { type: 'post';  data: TPost }
  | { type: 'qa';    data: QABottle }
  | { type: 'tweet'; data: TweetData }

const PAGE_SIZE = 20

const DAILY_PROMPTS = [
  { q: '最近、心があたたかくなった瞬間は？',        hint: '小さなことでも話してみて' },
  { q: '今週、誰かに感謝したいことは？',             hint: '言えてなかった感謝を' },
  { q: '最近、自分を褒めてあげたいことは？',         hint: '頑張ったこと、教えてみて' },
  { q: '今日、誰かに話しかけたかったこと',           hint: 'うまく言えなかったやつ' },
  { q: 'ずっと気になっていること、一つ挙げるなら',   hint: '答えは出なくてもいい' },
  { q: '今の自分に必要なものは？',                   hint: '時間？人？休息？' },
  { q: '最近、変わってきたと思うことは？',            hint: '自分でも気づいてる変化' },
]

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
  { key: 'myvillage', label: 'マイ村',   icon: Home  },
  { key: 'all',       label: 'みんな',   icon: Globe },
  { key: 'following', label: 'フォロー', icon: Users },
]

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
    <div className="rounded-2xl overflow-hidden shadow-sm"
      style={{
        background: 'linear-gradient(135deg,#0c1445 0%,#0a2540 100%)',
        border: bottle.is_resolved ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(100,140,255,0.25)',
      }}>

      {/* ヘッダー */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <HelpCircle size={13} className={bottle.is_resolved ? 'text-emerald-400' : 'text-amber-400'} />
          <span className="text-[10px] font-extrabold"
            style={{ color: bottle.is_resolved ? '#86efac' : '#fbbf24' }}>
            {bottle.is_resolved ? '✅ 解決済み' : '❓ 匿名質問'}
          </span>
          {bottle.village && (
            <>
              <span className="text-white/20 text-[10px]">·</span>
              <span className="text-[10px] text-blue-400/60 truncate">
                {bottle.village.icon} {bottle.village.name}
              </span>
            </>
          )}
        </div>
        <span className="text-[10px] text-blue-400/40 flex-shrink-0">{timeAgo(bottle.created_at)}</span>
      </div>

      {/* 質問本文 */}
      <div className="px-4 pb-3">
        <p className="text-sm text-white/90 leading-relaxed font-medium">{bottle.message}</p>
      </div>

      {/* フッター */}
      <div className="px-4 py-2.5 border-t border-white/5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-blue-300/50">
            💬 {bottle.reply_count > 0 ? `${bottle.reply_count}件の回答` : 'まだ回答なし'}
          </span>
        </div>

        {done ? (
          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
            <CheckCircle size={11} /> 回答しました
          </span>
        ) : isMyBottle ? (
          <span className="text-[10px] text-blue-400/30">自分の質問</span>
        ) : bottle.is_resolved ? (
          <span className="text-[10px] text-emerald-400/50">解決済み</span>
        ) : canReply ? (
          <button onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold active:scale-95 transition-all"
            style={{ background: 'rgba(100,140,255,0.2)', border: '1px solid rgba(100,140,255,0.3)', color: '#93c5fd' }}>
            {open ? '閉じる' : '回答する →'}
          </button>
        ) : (
          <span className="text-[10px] text-blue-400/30">常連以上が回答可</span>
        )}
      </div>

      {/* インライン回答フォーム */}
      {open && !done && (
        <div className="px-4 pb-4 pt-1 border-t border-white/5 space-y-2">
          <textarea
            value={text}
            onChange={e => { setText(e.target.value); setErrMsg('') }}
            placeholder="回答を書く（名前が表示されます）"
            rows={2} maxLength={300} autoFocus
            className="w-full px-3 py-2 rounded-xl text-xs resize-none focus:outline-none text-white placeholder-blue-400/30"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(100,140,255,0.2)' }}
          />
          {errMsg && <p className="text-[10px] text-red-400">⚠️ {errMsg}</p>}
          <div className="flex gap-2">
            <button onClick={() => setOpen(false)}
              className="flex-1 py-2 rounded-xl text-xs font-bold border"
              style={{ borderColor: 'rgba(100,140,255,0.2)', color: '#60a5fa', background: 'transparent' }}>
              キャンセル
            </button>
            <button onClick={submit} disabled={!text.trim() || sending}
              className="flex-1 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40 active:scale-95 transition-all flex items-center justify-center gap-1"
              style={{ background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' }}>
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
  post, userId, likedIds, onToggleLike, showVillage = true,
}: {
  post: TPost
  userId: string | null
  likedIds: Set<string>
  onToggleLike: (id: string) => void
  showVillage?: boolean
}) {
  const liked    = likedIds.has(post.id)
  const catColor = CAT_COLOR[post.category] ?? '#8b7355'
  const tier     = getTierById(post.user_trust?.tier ?? 'visitor')

  function shareToX() {
    const village = post.villages ? `${post.villages.icon}${post.villages.name}` : '休憩村'
    const text = `${post.content}\n\n— ${village}より\n#休憩村\nnowmatejapan.com`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="bg-white border border-stone-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 pt-3.5 pb-2 flex items-start gap-2.5">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
          {post.profiles?.avatar_url
            ? <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
            : post.profiles?.display_name?.[0] ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-bold text-stone-900">{post.profiles?.display_name ?? '名無し'}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border whitespace-nowrap ${tier.color}`}>
              {tier.icon} {tier.label}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: `${catColor}18`, color: catColor }}>
              {post.category}
            </span>
            <span className="text-[10px] text-stone-400">{timeAgo(post.created_at)}</span>
          </div>
        </div>
      </div>

      <div className="px-4 pb-3">
        <p className="text-sm text-stone-800 leading-relaxed">{post.content}</p>
      </div>

      <div className="flex items-center justify-between px-4 py-2.5 border-t border-stone-50">
        {showVillage && post.villages ? (
          <Link href={`/villages/${post.village_id}`} onClick={e => e.stopPropagation()}
            className="flex items-center gap-1.5 active:opacity-70 transition-opacity">
            <span className="text-sm">{post.villages.icon}</span>
            <span className="text-[11px] font-bold text-stone-500 truncate max-w-[120px]">{post.villages.name}</span>
            <ChevronRight size={11} className="text-stone-300 flex-shrink-0" />
          </Link>
        ) : <span />}
        <div className="flex items-center gap-1.5">
          <button onClick={shareToX}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl transition-all active:scale-90"
            style={{ background: '#f5f5f4', color: '#a8a29e' }}>
            <Share2 size={12} />
          </button>
          <button onClick={() => onToggleLike(post.id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl transition-all active:scale-90"
            style={liked ? { background: '#fff1f2', color: '#f43f5e' } : { background: '#f5f5f4', color: '#a8a29e' }}>
            <Heart size={13} fill={liked ? '#f43f5e' : 'none'} strokeWidth={liked ? 0 : 1.8} />
            {post.reaction_count > 0 && <span className="text-[11px] font-bold">{post.reaction_count}</span>}
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
        <div key={i} className="bg-white rounded-2xl border border-stone-100 p-4 animate-pulse">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 bg-stone-200 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-stone-200 rounded w-1/3" />
              <div className="h-2.5 bg-stone-100 rounded w-1/4" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="h-3.5 bg-stone-100 rounded w-full" />
            <div className="h-3.5 bg-stone-100 rounded w-4/5" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── フィード合成（投稿4件ごとにQ&Aを1件挿入）─────────────────
function buildFeed(posts: TPost[], qaBottles: QABottle[]): FeedItem[] {
  const feed: FeedItem[] = []
  let qaIdx = 0
  posts.forEach((post, i) => {
    feed.push({ type: 'post', data: post })
    // 4件ごとにQ&Aを挟む
    if ((i + 1) % 4 === 0 && qaIdx < qaBottles.length) {
      feed.push({ type: 'qa', data: qaBottles[qaIdx++] })
    }
  })
  // 残りのQ&Aを末尾に追加
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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* 危機検出モーダル */}
      {showCrisis && (
        <div className="absolute inset-0 z-10 flex items-center justify-center px-6">
          <div className="w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl"
            style={{ background: 'linear-gradient(180deg,#0c1445 0%,#0a2540 100%)', border: '1px solid rgba(100,140,255,0.3)' }}>
            <p className="text-2xl mb-3">💙</p>
            <p className="text-white font-bold text-sm leading-relaxed mb-2">つらい気持ちを感じているようです</p>
            <p className="text-blue-300/70 text-xs leading-relaxed mb-4">よりそいホットライン: 0120-279-338（24時間）</p>
            <div className="flex gap-2">
              <button onClick={() => { setShowCrisis(false); onClose() }}
                className="flex-1 py-2.5 rounded-2xl text-xs font-bold border border-blue-500/30 text-blue-300">
                閉じる
              </button>
              <button onClick={() => { setShowCrisis(false); doSendBottle() }}
                className="flex-1 py-2.5 rounded-2xl text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' }}>
                それでも流す
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className={`relative rounded-t-3xl w-full max-w-md mx-auto overflow-hidden transition-colors ${isBottle ? '' : 'bg-white'}`}
        style={isBottle ? { background: 'linear-gradient(180deg,#0c1445 0%,#0d1f4a 100%)' } : {}}
        onClick={e => e.stopPropagation()}
      >
        {/* ドラッグハンドル */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: isBottle ? 'rgba(255,255,255,0.2)' : '#e5e7eb' }} />
        </div>

        {/* モード切替タブ */}
        <div className="flex mx-5 mt-1 mb-3 rounded-2xl overflow-hidden"
          style={{ background: isBottle ? 'rgba(255,255,255,0.08)' : '#f5f5f4' }}>
          <button onClick={() => switchMode('post')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold transition-all rounded-2xl"
            style={!isBottle
              ? { background: '#1c1917', color: '#fff' }
              : { color: 'rgba(255,255,255,0.4)' }
            }>
            <span>✍️</span> 投稿
          </button>
          <button onClick={() => switchMode('bottle')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold transition-all rounded-2xl"
            style={isBottle
              ? { background: 'rgba(100,140,255,0.3)', color: '#93c5fd', border: '1px solid rgba(100,140,255,0.4)' }
              : { color: '#78716c' }
            }>
            <Waves size={12} /> 漂流瓶
          </button>
        </div>

        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-2">
          <button onClick={onClose}
            className="text-sm font-bold transition-colors"
            style={{ color: isBottle ? 'rgba(147,197,253,0.7)' : '#a8a29e' }}>
            キャンセル
          </button>
          <button
            onClick={isBottle ? handleBottle : handlePost}
            disabled={!canSubmit}
            className="px-5 py-1.5 rounded-full text-sm font-extrabold text-white disabled:opacity-40 active:scale-95 transition-all flex items-center gap-1.5"
            style={{ background: isBottle
              ? 'linear-gradient(135deg,#3b82f6,#1d4ed8)'
              : 'linear-gradient(135deg,#1c1917,#3c3836)' }}
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
                  style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
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
                    className="w-full text-[17px] leading-relaxed resize-none focus:outline-none text-stone-900 placeholder-stone-300 bg-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap pb-3 border-b border-stone-100">
                {POST_CATEGORIES.map(c => (
                  <button key={c.id} onClick={() => setCategory(c.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all active:scale-95"
                    style={category === c.id
                      ? { background: '#1c1917', color: '#fff', borderColor: '#1c1917' }
                      : { background: '#fafaf9', color: '#78716c', borderColor: '#e7e5e4' }
                    }>
                    {c.emoji} {c.id}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between pt-3">
                {errMsg
                  ? <p className="text-xs text-red-500 font-bold">⚠️ {errMsg}</p>
                  : <p className="text-[11px] text-stone-400">休憩村全体に公開されます</p>
                }
                <div className="flex items-center gap-2">
                  <svg width="22" height="22" viewBox="0 0 22 22" className="-rotate-90">
                    <circle cx="11" cy="11" r="9" fill="none" stroke="#e7e5e4" strokeWidth="2.5" />
                    <circle cx="11" cy="11" r="9" fill="none"
                      stroke={text.length > MAX * 0.9 ? '#f97316' : '#1c1917'}
                      strokeWidth="2.5" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 9}`}
                      strokeDashoffset={`${2 * Math.PI * 9 * (1 - text.length / MAX)}`}
                      style={{ transition: 'stroke-dashoffset 0.1s' }}
                    />
                  </svg>
                  <span className={`text-[11px] font-bold ${text.length > MAX * 0.9 ? 'text-orange-500' : 'text-stone-300'}`}>
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
                  <p className="text-blue-300/60 text-xs">村に参加するとここから漂流瓶を流せます</p>
                </div>
              ) : (
                <div className="mb-3">
                  <p className="text-[10px] font-bold text-blue-300/50 uppercase tracking-wider mb-2">どの村に流す？</p>
                  <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                    {villages.map(v => (
                      <button key={v.id} onClick={() => setTargetVil(v)}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95"
                        style={targetVil?.id === v.id
                          ? { background: 'rgba(100,140,255,0.35)', color: '#93c5fd', border: '1px solid rgba(100,140,255,0.5)' }
                          : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }
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
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(100,140,255,0.25)',
                    color: 'rgba(255,255,255,0.9)',
                    caretColor: '#60a5fa',
                  }}
                />
              </div>

              {/* フッター */}
              <div className="flex items-center justify-between">
                {errMsg
                  ? <p className="text-xs text-red-400 font-bold">⚠️ {errMsg}</p>
                  : <p className="text-[11px] text-blue-400/40">🔒 完全匿名 · {targetVil?.icon}{targetVil?.name ?? '村未選択'}へ届きます</p>
                }
                <div className="flex items-center gap-2">
                  <svg width="22" height="22" viewBox="0 0 22 22" className="-rotate-90">
                    <circle cx="11" cy="11" r="9" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
                    <circle cx="11" cy="11" r="9" fill="none"
                      stroke={text.length > MAX_BOTTLE * 0.9 ? '#f97316' : '#3b82f6'}
                      strokeWidth="2.5" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 9}`}
                      strokeDashoffset={`${2 * Math.PI * 9 * (1 - text.length / MAX_BOTTLE)}`}
                      style={{ transition: 'stroke-dashoffset 0.1s' }}
                    />
                  </svg>
                  <span className={`text-[11px] font-bold ${text.length > MAX_BOTTLE * 0.9 ? 'text-orange-400' : 'text-blue-400/40'}`}>
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

  const offsetRef   = useRef(0)
  const todayPrompt = DAILY_PROMPTS[new Date().getDay()]

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
      if (tab === 'myvillage') fetchQA(userId, myVillageIds)
      if (tab === 'all') fetchTweets()
    }
  }, [userId, tab, fetchPosts, fetchQA, fetchTweets, myVillageIds])

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

  // フィード合成
  const feed: FeedItem[] = (() => {
    if (tab === 'myvillage' && qaBottles.length > 0) {
      return buildFeed(posts, qaBottles)
    }
    if (tab === 'all' && tweetFeed.length > 0) {
      const combined: FeedItem[] = [
        ...posts.map(p => ({ type: 'post' as const, data: p })),
        ...tweetFeed.map(t => ({ type: 'tweet' as const, data: t })),
      ]
      return combined.sort((a, b) =>
        new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime()
      )
    }
    return posts.map(p => ({ type: 'post' as const, data: p }))
  })()

  // ── レンダリング ─────────────────────────────────────────────
  return (
    <div className="max-w-md mx-auto min-h-screen bg-birch">

      {/* ヘッダー */}
      <div className="px-4 pt-12 pb-0"
        style={{ background: 'linear-gradient(160deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%)' }}>
        <div className="flex items-end justify-between mb-3">
          <div>
            <h1 className="font-extrabold text-white text-2xl leading-tight">タイムライン</h1>
            <p className="text-xs text-white/50 mt-0.5">みんなの声が流れる場所</p>
          </div>
          <button onClick={() => { fetchPosts(true); if (userId) fetchQA(userId, myVillageIds); if (tab === 'all') fetchTweets() }}
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <RefreshCw size={15} className="text-white/70" />
          </button>
        </div>

        {/* タブ */}
        <div className="flex border-b border-white/10">
          {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className="flex-1 flex flex-col items-center gap-0.5 pt-2 pb-3 transition-all relative">
              <Icon size={16}
                className={tab === key ? 'text-white' : 'text-white/40'}
                strokeWidth={tab === key ? 2.5 : 1.8} />
              <span className={`text-[10px] font-bold whitespace-nowrap ${tab === key ? 'text-white' : 'text-white/40'}`}>
                {label}
              </span>
              {/* マイ村タブにQ&Aバッジ */}
              {key === 'myvillage' && qaBottles.length > 0 && (
                <span className="absolute top-1.5 right-2 min-w-[14px] h-[14px] bg-amber-400 rounded-full flex items-center justify-center px-0.5">
                  <span className="text-[8px] font-black text-stone-900">{qaBottles.length}</span>
                </span>
              )}
              {tab === key && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-white rounded-full" />
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
            style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)' }}>
            <HelpCircle size={14} className="text-amber-400 flex-shrink-0" />
            <p className="text-xs font-bold text-amber-300">
              あなたの村に{qaBottles.length}件の質問が届いています
            </p>
          </div>
        )}

        {/* 今日のお題カード */}
        {tab === 'all' && (
          <div className="rounded-2xl overflow-hidden shadow-sm"
            style={{ background: 'linear-gradient(135deg,#1f3526 0%,#2d4d37 100%)', border: '1px solid rgba(74,124,89,0.3)' }}>
            <div className="px-4 py-2.5 flex items-center gap-2"
              style={{ background: 'rgba(74,124,89,0.25)' }}>
              <Sparkles size={14} className="text-brand-300" />
              <p className="text-[10px] font-extrabold text-brand-300 uppercase tracking-widest">今日のお題</p>
            </div>
            <div className="px-4 py-3.5">
              <p className="text-sm font-bold text-white leading-relaxed">「{todayPrompt.q}」</p>
              <p className="text-[10px] text-brand-300/70 mt-1">{todayPrompt.hint}</p>
            </div>
          </div>
        )}

        {/* 村に参加していない */}
        {tab === 'myvillage' && myVillageIds.length === 0 && !loading && (
          <div className="bg-white border border-stone-100 rounded-2xl p-5 text-center shadow-sm">
            <p className="text-2xl mb-2">🏕️</p>
            <p className="text-sm font-extrabold text-stone-800 mb-1">まだ村に参加していません</p>
            <p className="text-xs text-stone-500 leading-relaxed mb-4">村に参加すると、投稿とQ&Aがここに流れます。</p>
            <button onClick={() => router.push('/villages')}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand-500 text-white rounded-2xl text-sm font-bold active:scale-95 transition-all">
              村を探す →
            </button>
          </div>
        )}

        {/* フォロー0人 */}
        {tab === 'following' && followingIds.length === 0 && !loading && (
          <div className="bg-white border border-stone-100 rounded-2xl p-5 text-center shadow-sm">
            <p className="text-2xl mb-2">👥</p>
            <p className="text-sm font-extrabold text-stone-800 mb-1">まだ誰もフォローしていません</p>
            <p className="text-xs text-stone-500 leading-relaxed mb-4">村の住民をフォローすると、ここに投稿が流れます。</p>
            <button onClick={() => router.push('/villages')}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand-500 text-white rounded-2xl text-sm font-bold active:scale-95 transition-all">
              村を探す →
            </button>
          </div>
        )}

        {/* ローディング */}
        {loading && <Skeleton />}

        {/* フィード（投稿 + Q&Aカード + ツイート混在） */}
        {!loading && feed.map((item) =>
          item.type === 'qa' ? (
            <QACard
              key={`qa-${item.data.id}`}
              bottle={item.data}
              userId={userId}
              canReply={canReply}
              onAnswered={handleAnswered}
            />
          ) : item.type === 'tweet' ? (
            <div key={`tweet-${item.data.id}`} className="bg-white rounded-2xl overflow-hidden shadow-sm">
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
            <p className="text-3xl mb-3">🌿</p>
            <p className="text-sm font-bold text-stone-600">まだ投稿がありません</p>
          </div>
        )}

        {/* もっと読む */}
        {!loading && hasMore && posts.length > 0 && (
          <button onClick={() => fetchPosts(false)} disabled={loadingMore}
            className="w-full py-3.5 bg-white border border-stone-200 rounded-2xl text-sm font-bold text-stone-600 flex items-center justify-center gap-2 active:bg-stone-50 transition-all shadow-sm disabled:opacity-50">
            {loadingMore
              ? <span className="w-4 h-4 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
              : '続きを読む'}
          </button>
        )}
      </div>

      {/* ── FAB ── */}
      <button
        onClick={() => setShowCompose(true)}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-all z-30"
        style={{ background: 'linear-gradient(135deg,#6366f1 0%,#4f46e5 100%)', boxShadow: '0 8px 24px rgba(99,102,241,0.45)' }}
      >
        <Plus size={24} className="text-white" strokeWidth={2.5} />
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
