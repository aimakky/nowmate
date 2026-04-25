'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  MessageCircle, Heart, Repeat2, Bookmark, Share2,
  PenLine, X, RefreshCw, Sparkles, Clock,
} from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import TrustBadge from '@/components/ui/TrustBadge'
import { getUserTrust, getTierById } from '@/lib/trust'
import PhoneVerifyModal from '@/components/features/PhoneVerifyModal'

// ─── タグ定義 ─────────────────────────────────────────────────
const TAGS = [
  { id: 'talk',  label: '雑談',      emoji: '💬', color: '#8b7355' },
  { id: 'work',  label: '仕事終わり', emoji: '🌙', color: '#4f56c8' },
  { id: 'ask',   label: '相談',      emoji: '🤝', color: '#1a9ec8' },
  { id: 'hobby', label: '趣味',      emoji: '🎨', color: '#d44060' },
  { id: 'now',   label: '今なにしてる', emoji: '✏️', color: '#d99820' },
]

const ALL_FILTERS = [
  { id: 'all', label: 'すべて', emoji: '🌐', color: '#18181b' },
  ...TAGS,
]

const X_BLUE = '#1d9bf0'

type Tweet = {
  id: string
  user_id: string
  content: string
  likes_count: number
  reply_count: number
  reposts_count: number
  bookmarks_count: number
  village_id: string | null
  created_at: string
  tag?: string
  profiles: { display_name: string; avatar_url: string | null } | null
  user_trust: { tier: string } | null
  village?: { name: string; icon: string; type: string } | null
}

// ─── 文字数リングカウンター ───────────────────────────────────
function CharRing({ current, max }: { current: number; max: number }) {
  if (current === 0) return null
  const pct = current / max
  const r = 10, circ = 2 * Math.PI * r
  const color = pct > 0.9 ? '#ef4444' : pct > 0.75 ? '#f59e0b' : X_BLUE
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" className="flex-shrink-0">
      <circle cx="13" cy="13" r={r} fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
      <circle cx="13" cy="13" r={r} fill="none" stroke={color} strokeWidth="2.5"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - Math.min(pct, 1))}
        strokeLinecap="round"
        transform="rotate(-90 13 13)"
        style={{ transition: 'stroke-dashoffset 0.1s ease, stroke 0.2s ease' }}
      />
      {pct > 0.8 && (
        <text x="13" y="17" textAnchor="middle" fontSize="7.5" fill={color} fontWeight="bold">
          {max - current}
        </text>
      )}
    </svg>
  )
}

// ─── Compose Bottom Sheet ─────────────────────────────────────
function ComposeSheet({
  userId, onClose, onPosted,
}: { userId: string; onClose: () => void; onPosted: () => void }) {
  const [content, setContent] = useState('')
  const [tag,     setTag]     = useState('talk')
  const [posting, setPosting] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)
  const MAX = 280

  useEffect(() => { setTimeout(() => ref.current?.focus(), 80) }, [])

  async function submit() {
    if (!content.trim() || posting) return
    setPosting(true)
    await createClient().from('tweets').insert({ user_id: userId, content: content.trim(), tag })
    onPosted()
    onClose()
    setPosting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-stone-100">
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 transition-all active:scale-90">
            <X size={18} className="text-stone-500" />
          </button>
          <button onClick={submit} disabled={!content.trim() || posting}
            className="px-5 py-2 rounded-full text-sm font-bold text-white disabled:opacity-40 active:scale-95 transition-all"
            style={{ background: X_BLUE }}>
            {posting
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
              : '投稿する'}
          </button>
        </div>

        {/* 本文 */}
        <div className="flex gap-3 px-4 pt-4 pb-2 flex-1 overflow-y-auto">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold text-white flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${TAGS.find(t => t.id === tag)?.color ?? X_BLUE} 0%, ${TAGS.find(t => t.id === tag)?.color ?? X_BLUE}bb 100%)` }}>
            ✏️
          </div>
          <div className="flex-1">
            {/* タグチップ */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none mb-3 pb-0.5">
              {TAGS.map(t => (
                <button key={t.id} onClick={() => setTag(t.id)}
                  className="flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all active:scale-90"
                  style={tag === t.id
                    ? { background: `${t.color}18`, color: t.color, borderColor: `${t.color}50` }
                    : { background: '#fafaf9', borderColor: '#e7e5e4', color: '#a8a29e' }}>
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
            <textarea
              ref={ref}
              value={content}
              onChange={e => setContent(e.target.value.slice(0, MAX))}
              placeholder="いまどうしてる？"
              rows={5}
              className="w-full text-[17px] text-stone-900 resize-none focus:outline-none leading-relaxed placeholder:text-stone-300 bg-transparent"
            />
          </div>
        </div>

        {/* フッター */}
        <div className="flex items-center justify-end gap-3 px-4 pb-8 pt-3 border-t border-stone-100">
          <CharRing current={content.length} max={MAX} />
          <div className="w-px h-5 bg-stone-200" />
          <span className="text-xs font-medium" style={{ color: content.length > MAX * 0.9 ? '#ef4444' : '#a8a29e' }}>
            {MAX - content.length}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── TweetRow（Xライクレイアウト） ───────────────────────────
function TweetRow({
  tweet, userId, liked, bookmarked, reposted,
  onLike, onRepost, onBookmark, onExpand, isExpanded,
  replies, loadingReplies,
  replyText, setReplyText, onSubmitReply, submittingReply,
}: {
  tweet: Tweet; userId: string | null; liked: boolean; bookmarked: boolean; reposted: boolean
  onLike: (id: string, liked: boolean) => void
  onRepost: (id: string) => void
  onBookmark: (id: string) => void
  onExpand: (id: string) => void
  isExpanded: boolean
  replies: any[]
  loadingReplies: boolean
  replyText: string
  setReplyText: (v: string) => void
  onSubmitReply: (tweetId: string) => void
  submittingReply: boolean
}) {
  const tagInfo  = TAGS.find(t => t.id === tweet.tag)
  const tagColor = tagInfo?.color ?? '#a8a29e'

  return (
    <article className="border-b border-stone-100">
      {/* ── メイン行 ── */}
      <div
        className="flex gap-3 px-4 pt-3.5 pb-1 cursor-pointer active:bg-stone-50/80 transition-colors"
        onClick={() => onExpand(tweet.id)}
      >
        {/* 左：アバター + スレッドライン */}
        <div className="flex flex-col items-center flex-shrink-0" style={{ width: 40 }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold text-white overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${tagColor} 0%, ${tagColor}cc 100%)` }}>
            {tweet.profiles?.avatar_url
              ? <img src={tweet.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
              : (tweet.profiles?.display_name?.[0] ?? '?')}
          </div>
          {isExpanded && (
            <div className="w-0.5 flex-1 mt-1.5 rounded-full" style={{ background: '#e7e5e4', minHeight: 20 }} />
          )}
        </div>

        {/* 右：コンテンツ */}
        <div className="flex-1 min-w-0 pb-3">
          {/* 名前行 */}
          <div className="flex items-center gap-1 flex-wrap mb-0.5">
            <span className="font-bold text-stone-900 text-[15px] leading-snug">
              {tweet.profiles?.display_name ?? '住民'}
            </span>
            {tweet.user_trust?.tier && <TrustBadge tierId={tweet.user_trust.tier} size="xs" />}
            <span className="text-stone-400 text-xs mx-0.5">·</span>
            <span className="text-stone-400 text-xs">{timeAgo(tweet.created_at)}</span>
            {tagInfo && (
              <span className="ml-auto flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: `${tagColor}15`, color: tagColor }}>
                {tagInfo.emoji} {tagInfo.label}
              </span>
            )}
          </div>

          {/* 本文 */}
          <p className="text-[15px] text-stone-900 leading-relaxed whitespace-pre-wrap mb-2.5">
            {tweet.content}
          </p>

          {/* 村バッジ */}
          {tweet.village && (
            <div className="inline-flex items-center gap-1.5 bg-stone-50 border border-stone-100 px-2.5 py-1 rounded-full mb-2.5">
              <span className="text-base leading-none">{tweet.village.icon}</span>
              <span className="text-[11px] text-stone-600 font-medium">{tweet.village.name}</span>
            </div>
          )}

          {/* アクション行 */}
          <div className="flex items-center gap-0 -mx-2 mt-0.5" onClick={e => e.stopPropagation()}>
            {/* 返信 */}
            <button
              onClick={() => onExpand(tweet.id)}
              className="flex items-center gap-1.5 px-2 py-2 rounded-full hover:bg-sky-50 transition-all active:scale-90 group text-stone-400 hover:text-sky-500">
              <MessageCircle size={17} className="group-hover:stroke-sky-500 transition-colors" />
              {tweet.reply_count > 0 && (
                <span className="text-[12px] font-medium group-hover:text-sky-500 transition-colors">{tweet.reply_count}</span>
              )}
            </button>

            {/* リポスト */}
            <button
              onClick={() => onRepost(tweet.id)}
              className="flex items-center gap-1.5 px-2 py-2 rounded-full hover:bg-emerald-50 transition-all active:scale-90 group"
              style={{ color: reposted ? '#22c55e' : '#a8a29e' }}>
              <Repeat2 size={17} className="transition-colors group-hover:text-emerald-500" style={{ stroke: reposted ? '#22c55e' : undefined }} />
              {tweet.reposts_count > 0 && (
                <span className="text-[12px] font-medium" style={{ color: reposted ? '#22c55e' : undefined }}>
                  {tweet.reposts_count}
                </span>
              )}
            </button>

            {/* いいね */}
            <button
              onClick={() => onLike(tweet.id, liked)}
              className="flex items-center gap-1.5 px-2 py-2 rounded-full hover:bg-rose-50 transition-all active:scale-90 group"
              style={{ color: liked ? '#f43f5e' : '#a8a29e' }}>
              <Heart size={17}
                fill={liked ? '#f43f5e' : 'none'}
                stroke={liked ? '#f43f5e' : '#a8a29e'}
                className="transition-all group-hover:stroke-rose-500" />
              {tweet.likes_count > 0 && (
                <span className="text-[12px] font-medium" style={{ color: liked ? '#f43f5e' : undefined }}>{tweet.likes_count}</span>
              )}
            </button>

            {/* ブックマーク */}
            <button
              onClick={() => onBookmark(tweet.id)}
              className="ml-auto flex items-center px-2 py-2 rounded-full hover:bg-indigo-50 transition-all active:scale-90"
              style={{ color: bookmarked ? '#6366f1' : '#a8a29e' }}>
              <Bookmark size={17}
                fill={bookmarked ? '#6366f1' : 'none'}
                stroke={bookmarked ? '#6366f1' : '#a8a29e'}
              />
            </button>

            {/* シェア */}
            <button
              onClick={() => { try { navigator.share({ text: tweet.content }) } catch {} }}
              className="flex items-center px-2 py-2 rounded-full hover:bg-stone-100 transition-all active:scale-90 text-stone-400">
              <Share2 size={17} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 返信スレッド（展開時）── */}
      {isExpanded && (
        <div className="pl-[52px] pr-4 pb-2 border-t border-stone-50">
          {/* 返信入力 */}
          {userId && (
            <div className="flex gap-2.5 py-3 border-b border-stone-100">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold text-white flex-shrink-0 mt-0.5"
                style={{ background: X_BLUE }}>
                ✏️
              </div>
              <div className="flex-1 flex items-center gap-2">
                <input
                  value={replyText}
                  onChange={e => setReplyText(e.target.value.slice(0, 140))}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmitReply(tweet.id) } }}
                  placeholder="返信する…"
                  className="flex-1 text-sm text-stone-900 focus:outline-none placeholder:text-stone-300 bg-transparent py-1"
                />
                <button
                  onClick={() => onSubmitReply(tweet.id)}
                  disabled={!replyText.trim() || submittingReply}
                  className="px-3.5 py-1.5 rounded-full text-xs font-bold text-white disabled:opacity-40 active:scale-95 transition-all flex-shrink-0"
                  style={{ background: X_BLUE }}>
                  {submittingReply ? '…' : '返信'}
                </button>
              </div>
            </div>
          )}

          {/* 返信一覧 */}
          {loadingReplies ? (
            <div className="flex justify-center py-4">
              <span className="w-5 h-5 border-2 border-stone-200 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : replies.length === 0 ? (
            <p className="text-[11px] text-stone-400 py-3 text-center">まだ返信がありません</p>
          ) : (
            <div>
              {replies.map((r: any) => (
                <div key={r.id} className="flex gap-2.5 py-3 border-b border-stone-50 last:border-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#94a3b8 0%,#64748b 100%)' }}>
                    {r.profiles?.display_name?.[0] ?? '?'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[13px] font-bold text-stone-900">{r.profiles?.display_name ?? '住民'}</span>
                      <span className="text-stone-400 text-[11px]">·</span>
                      <span className="text-[11px] text-stone-400">{timeAgo(r.created_at)}</span>
                    </div>
                    <p className="text-[13px] text-stone-800 leading-relaxed">{r.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  )
}

// ─── Main ─────────────────────────────────────────────────────
export default function TimelinePage() {
  const router = useRouter()
  const [tweets,          setTweets]          = useState<Tweet[]>([])
  const [loading,         setLoading]         = useState(true)
  const [refreshing,      setRefreshing]      = useState(false)
  const [userId,          setUserId]          = useState<string | null>(null)
  const [userTrust,       setUserTrust]       = useState<any>(null)
  const [likedIds,        setLikedIds]        = useState<Set<string>>(new Set())
  const [repostedIds,     setRepostedIds]     = useState<Set<string>>(new Set())
  const [bookmarkedIds,   setBookmarkedIds]   = useState<Set<string>>(new Set())
  const [filter,          setFilter]          = useState('all')
  const [feedType,        setFeedType]        = useState<'recommend' | 'latest'>('recommend')
  const [showCompose,     setShowCompose]     = useState(false)
  const [showVerify,      setShowVerify]      = useState(false)

  // 返信展開
  const [expandedId,      setExpandedId]      = useState<string | null>(null)
  const [replies,         setReplies]         = useState<any[]>([])
  const [loadingReplies,  setLoadingReplies]  = useState(false)
  const [replyText,       setReplyText]       = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)

  // ── Auth ──
  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const trust = await getUserTrust(user.id)
      setUserTrust(trust)
    })
  }, [])

  const tier = userTrust ? getTierById(userTrust.tier) : getTierById('visitor')

  // ── Fetch ──
  const fetchTweets = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)

    let q = createClient()
      .from('tweets')
      .select('*, profiles(display_name, avatar_url), user_trust!tweets_user_id_fkey(tier), village:villages(name,icon,type)')
      .limit(50)

    if (filter !== 'all') q = q.eq('tag', filter)

    if (feedType === 'recommend') {
      // おすすめ：いいね数 + 返信数でホットスコア順（過去48hに絞る）
      q = q.gte('created_at', new Date(Date.now() - 48 * 3600 * 1000).toISOString())
           .order('likes_count', { ascending: false })
    } else {
      q = q.order('created_at', { ascending: false })
    }

    const { data } = await q
    setTweets((data || []) as unknown as Tweet[])
    setLoading(false)
    setRefreshing(false)
  }, [filter, feedType])

  const fetchReactions = useCallback(async () => {
    if (!userId) return
    const supabase = createClient()
    const [{ data: likes }, { data: reposts }, { data: bookmarks }] = await Promise.all([
      supabase.from('tweet_likes').select('tweet_id').eq('user_id', userId),
      supabase.from('tweet_reposts').select('tweet_id').eq('user_id', userId),
      supabase.from('tweet_bookmarks').select('tweet_id').eq('user_id', userId),
    ])
    setLikedIds(new Set((likes || []).map((r: any) => r.tweet_id)))
    setRepostedIds(new Set((reposts || []).map((r: any) => r.tweet_id)))
    setBookmarkedIds(new Set((bookmarks || []).map((r: any) => r.tweet_id)))
  }, [userId])

  useEffect(() => { fetchTweets() },     [fetchTweets])
  useEffect(() => { fetchReactions() },  [fetchReactions])

  // ── 展開・返信フェッチ ──
  async function toggleExpand(tweetId: string) {
    if (expandedId === tweetId) {
      setExpandedId(null)
      setReplies([])
      return
    }
    setExpandedId(tweetId)
    setReplies([])
    setLoadingReplies(true)
    const { data } = await createClient()
      .from('tweet_replies')
      .select('*, profiles(display_name, avatar_url)')
      .eq('tweet_id', tweetId)
      .order('created_at', { ascending: true })
      .limit(30)
    setReplies(data || [])
    setLoadingReplies(false)
  }

  // ── 返信送信 ──
  async function submitReply(tweetId: string) {
    if (!userId || !replyText.trim() || submittingReply) return
    if (!tier.canPost) { setShowVerify(true); return }
    setSubmittingReply(true)
    await createClient().from('tweet_replies').insert({ tweet_id: tweetId, user_id: userId, content: replyText.trim() })
    setTweets(prev => prev.map(t => t.id === tweetId ? { ...t, reply_count: t.reply_count + 1 } : t))
    setReplyText('')
    // 返信を再フェッチ
    const { data } = await createClient()
      .from('tweet_replies')
      .select('*, profiles(display_name)')
      .eq('tweet_id', tweetId)
      .order('created_at', { ascending: true })
      .limit(30)
    setReplies(data || [])
    setSubmittingReply(false)
  }

  // ── いいね ──
  async function handleLike(tweetId: string, liked: boolean) {
    if (!userId) return
    if (!tier.canPost) { setShowVerify(true); return }
    const supabase = createClient()
    if (liked) {
      await supabase.from('tweet_likes').delete().eq('tweet_id', tweetId).eq('user_id', userId)
      setLikedIds(prev => { const n = new Set(prev); n.delete(tweetId); return n })
      setTweets(prev => prev.map(t => t.id === tweetId ? { ...t, likes_count: Math.max(0, t.likes_count - 1) } : t))
    } else {
      await supabase.from('tweet_likes').upsert({ tweet_id: tweetId, user_id: userId })
      setLikedIds(prev => new Set([...prev, tweetId]))
      setTweets(prev => prev.map(t => t.id === tweetId ? { ...t, likes_count: t.likes_count + 1 } : t))
    }
  }

  // ── リポスト ──
  async function handleRepost(tweetId: string) {
    if (!userId) return
    if (!tier.canPost) { setShowVerify(true); return }
    const supabase = createClient()
    const reposted = repostedIds.has(tweetId)
    if (reposted) {
      await supabase.from('tweet_reposts').delete().eq('tweet_id', tweetId).eq('user_id', userId)
      setRepostedIds(prev => { const n = new Set(prev); n.delete(tweetId); return n })
      setTweets(prev => prev.map(t => t.id === tweetId ? { ...t, reposts_count: Math.max(0, t.reposts_count - 1) } : t))
    } else {
      await supabase.from('tweet_reposts').upsert({ tweet_id: tweetId, user_id: userId })
      setRepostedIds(prev => new Set([...prev, tweetId]))
      setTweets(prev => prev.map(t => t.id === tweetId ? { ...t, reposts_count: t.reposts_count + 1 } : t))
    }
  }

  // ── ブックマーク ──
  async function handleBookmark(tweetId: string) {
    if (!userId) return
    const supabase = createClient()
    const bm = bookmarkedIds.has(tweetId)
    if (bm) {
      await supabase.from('tweet_bookmarks').delete().eq('tweet_id', tweetId).eq('user_id', userId)
      setBookmarkedIds(prev => { const n = new Set(prev); n.delete(tweetId); return n })
    } else {
      await supabase.from('tweet_bookmarks').upsert({ tweet_id: tweetId, user_id: userId })
      setBookmarkedIds(prev => new Set([...prev, tweetId]))
    }
  }

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-md mx-auto min-h-screen bg-white">

      {/* ══ ヘッダー ════════════════════════════════════════════ */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-stone-100">

        {/* タイトル行 */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h1 className="font-extrabold text-stone-900 text-[18px]">つぶやき</h1>
          <button
            onClick={() => fetchTweets(true)}
            disabled={refreshing}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-stone-100 transition-all active:scale-90">
            <RefreshCw size={17} className={`text-stone-500 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* おすすめ / 最新 タブ（Xそのもの） */}
        <div className="flex">
          {[
            { id: 'recommend', label: 'おすすめ', icon: <Sparkles size={13} /> },
            { id: 'latest',    label: '最新',     icon: <Clock size={13} /> },
          ].map(f => (
            <button key={f.id} onClick={() => setFeedType(f.id as any)}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-bold transition-colors relative"
              style={{ color: feedType === f.id ? '#0f172a' : '#a8a29e' }}>
              {f.icon}
              {f.label}
              {feedType === f.id && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-[3px] rounded-full" style={{ background: X_BLUE }} />
              )}
            </button>
          ))}
        </div>

        {/* タグフィルター */}
        <div className="flex gap-1.5 px-4 py-2 overflow-x-auto scrollbar-none">
          {ALL_FILTERS.map(f => {
            const active = filter === f.id
            return (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-all active:scale-90"
                style={active
                  ? { background: f.color, color: '#fff', borderColor: f.color }
                  : { background: '#fff', borderColor: '#e7e5e4', color: '#78716c' }}>
                {f.emoji} {f.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ══ 認証バナー ══════════════════════════════════════════ */}
      {userTrust && userTrust.tier === 'visitor' && (
        <div onClick={() => setShowVerify(true)}
          className="mx-4 mt-3 mb-1 rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer active:scale-[0.99] transition-all border"
          style={{ background: `${X_BLUE}08`, borderColor: `${X_BLUE}25` }}>
          <span className="text-xl">📱</span>
          <div className="flex-1">
            <p className="text-xs font-bold" style={{ color: X_BLUE }}>電話認証して投稿・いいねができます</p>
            <p className="text-[10px] text-stone-400 mt-0.5">+30pt 獲得</p>
          </div>
          <span className="text-sm" style={{ color: X_BLUE }}>›</span>
        </div>
      )}

      {/* ══ タイムライン ════════════════════════════════════════ */}
      <div className="pb-28">
        {loading ? (
          /* スケルトン */
          [...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-3 px-4 py-3.5 border-b border-stone-100 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-stone-200 flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="flex gap-2">
                  <div className="h-3.5 bg-stone-100 rounded-full w-24" />
                  <div className="h-3.5 bg-stone-100 rounded-full w-12" />
                </div>
                <div className="h-3.5 bg-stone-100 rounded-full w-full" />
                <div className="h-3.5 bg-stone-100 rounded-full w-3/4" />
                <div className="flex gap-6 pt-1">
                  {[...Array(4)].map((_, j) => <div key={j} className="h-4 w-8 bg-stone-100 rounded-full" />)}
                </div>
              </div>
            </div>
          ))
        ) : tweets.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-5xl mb-4">✏️</p>
            <p className="font-extrabold text-stone-800 text-base mb-2">まだ投稿がありません</p>
            <p className="text-sm text-stone-400">最初のつぶやきをしてみよう</p>
          </div>
        ) : (
          tweets.map(t => (
            <TweetRow
              key={t.id}
              tweet={t}
              userId={userId}
              liked={likedIds.has(t.id)}
              bookmarked={bookmarkedIds.has(t.id)}
              reposted={repostedIds.has(t.id)}
              onLike={handleLike}
              onRepost={handleRepost}
              onBookmark={handleBookmark}
              onExpand={toggleExpand}
              isExpanded={expandedId === t.id}
              replies={expandedId === t.id ? replies : []}
              loadingReplies={expandedId === t.id && loadingReplies}
              replyText={expandedId === t.id ? replyText : ''}
              setReplyText={setReplyText}
              onSubmitReply={submitReply}
              submittingReply={submittingReply}
            />
          ))
        )}
      </div>

      {/* ══ 投稿 FAB ════════════════════════════════════════════ */}
      <button
        onClick={() => tier.canPost ? setShowCompose(true) : setShowVerify(true)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-xl z-30 active:scale-90 transition-all"
        style={{ background: X_BLUE, boxShadow: `0 4px 20px ${X_BLUE}60` }}>
        <PenLine size={22} className="text-white" />
      </button>

      {/* ══ Modals ══════════════════════════════════════════════ */}
      {showCompose && userId && (
        <ComposeSheet
          userId={userId}
          onClose={() => setShowCompose(false)}
          onPosted={() => fetchTweets(true)}
        />
      )}

      {showVerify && (
        <PhoneVerifyModal
          onClose={() => setShowVerify(false)}
          onVerified={async () => {
            if (userId) { const t = await getUserTrust(userId); setUserTrust(t) }
          }}
        />
      )}
    </div>
  )
}
