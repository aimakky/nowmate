'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Send, MessageCircle, Heart, Repeat2, X, ChevronDown } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import TrustBadge from '@/components/ui/TrustBadge'
import { getUserTrust, getTierById, awardPoints } from '@/lib/trust'
import PhoneVerifyModal from '@/components/features/PhoneVerifyModal'

// ─── タグ ────────────────────────────────────────────────────
const TAGS = [
  { id: 'all',   label: 'みんな',   emoji: '🌐' },
  { id: 'talk',  label: '雑談',     emoji: '💬' },
  { id: 'work',  label: '仕事終わり', emoji: '🌙' },
  { id: 'ask',   label: '相談',     emoji: '🤝' },
  { id: 'hobby', label: '趣味',     emoji: '🎨' },
  { id: 'now',   label: '今なにしてる', emoji: '✏️' },
]

const TAG_COLORS: Record<string, string> = {
  talk:  '#8b7355',
  work:  '#4f56c8',
  ask:   '#1a9ec8',
  hobby: '#d44060',
  now:   '#d99820',
}

type Tweet = {
  id: string
  user_id: string
  content: string
  likes_count: number
  reply_count: number
  village_id: string | null
  created_at: string
  tag?: string
  profiles: { display_name: string; avatar_url: string | null } | null
  user_trust: { tier: string } | null
  village?: { name: string; icon: string; type: string } | null
}

// ─── Reply Modal ──────────────────────────────────────────────
function ReplyModal({
  tweet,
  userId,
  onClose,
  onPosted,
}: {
  tweet: Tweet
  userId: string
  onClose: () => void
  onPosted: () => void
}) {
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { textRef.current?.focus() }, [])

  async function submit() {
    if (!content.trim() || posting) return
    setPosting(true)
    await createClient().from('tweet_replies').insert({
      tweet_id: tweet.id,
      user_id: userId,
      content: content.trim(),
    })
    onPosted()
    onClose()
    setPosting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
          <p className="font-bold text-stone-800 text-sm">返信する</p>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 p-1">
            <X size={18} />
          </button>
        </div>

        {/* 引用 */}
        <div className="px-4 py-3 border-b border-stone-50 bg-stone-50/60">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded-full bg-stone-200 flex items-center justify-center text-[10px] font-bold text-stone-600">
              {tweet.profiles?.display_name?.[0] ?? '?'}
            </div>
            <span className="text-xs font-bold text-stone-600">{tweet.profiles?.display_name ?? '住民'}</span>
          </div>
          <p className="text-xs text-stone-500 line-clamp-2">{tweet.content}</p>
        </div>

        <div className="p-4">
          <textarea
            ref={textRef}
            value={content}
            onChange={e => setContent(e.target.value.slice(0, 140))}
            placeholder="返信を入力..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-2xl border border-stone-200 text-sm resize-none focus:outline-none focus:border-brand-400"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-stone-400">{content.length}/140</span>
            <button
              onClick={submit}
              disabled={!content.trim() || posting}
              className="px-5 py-2 rounded-2xl bg-brand-500 text-white text-xs font-bold disabled:opacity-40 active:scale-95 transition-all"
            >
              {posting ? '送信中…' : '返信する'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tweet Card ───────────────────────────────────────────────
function TweetCard({
  tweet,
  userId,
  liked,
  onLikeToggle,
  onReply,
  onUserClick,
}: {
  tweet: Tweet
  userId: string | null
  liked: boolean
  onLikeToggle: (id: string, liked: boolean) => void
  onReply: (tweet: Tweet) => void
  onUserClick: (uid: string) => void
}) {
  const tagColor = tweet.tag ? (TAG_COLORS[tweet.tag] ?? '#8b7355') : '#a8a29e'

  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-stone-100"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
    >
      {/* Tag accent bar */}
      {tweet.tag && tweet.tag !== 'all' && (
        <div className="h-0.5 w-full" style={{ background: tagColor }} />
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-2.5 mb-2.5">
          <button
            onClick={() => onUserClick(tweet.user_id)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold text-white flex-shrink-0 active:scale-90 transition-all"
            style={{ background: `linear-gradient(135deg, ${tagColor} 0%, ${tagColor}bb 100%)` }}
          >
            {tweet.profiles?.display_name?.[0] ?? '?'}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => onUserClick(tweet.user_id)}
                className="text-xs font-bold text-stone-900 hover:underline"
              >
                {tweet.profiles?.display_name ?? '住民'}
              </button>
              {tweet.user_trust?.tier && (
                <TrustBadge tierId={tweet.user_trust.tier} size="xs" />
              )}
              {tweet.village && (
                <span className="text-[9px] bg-stone-50 border border-stone-100 text-stone-500 px-1.5 py-0.5 rounded-full font-medium">
                  {tweet.village.icon} {tweet.village.name}
                </span>
              )}
            </div>
            <p className="text-[10px] text-stone-400 mt-0.5">{timeAgo(tweet.created_at)}</p>
          </div>
        </div>

        {/* Content */}
        <p className="text-sm text-stone-800 leading-relaxed mb-3 whitespace-pre-wrap">{tweet.content}</p>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-2 border-t border-stone-50">
          {/* Like */}
          <button
            onClick={() => onLikeToggle(tweet.id, liked)}
            className="flex items-center gap-1.5 transition-all active:scale-90 group"
          >
            <Heart
              size={16}
              className="transition-all"
              fill={liked ? '#f43f5e' : 'none'}
              stroke={liked ? '#f43f5e' : '#d6d3d1'}
            />
            <span className="text-xs font-semibold" style={{ color: liked ? '#f43f5e' : '#a8a29e' }}>
              {tweet.likes_count}
            </span>
          </button>

          {/* Reply */}
          <button
            onClick={() => onReply(tweet)}
            className="flex items-center gap-1.5 transition-all active:scale-90"
          >
            <MessageCircle size={16} stroke="#d6d3d1" />
            <span className="text-xs font-semibold text-stone-400">{tweet.reply_count}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────
export default function TimelinePage() {
  const router  = useRouter()
  const [tweets,     setTweets]     = useState<Tweet[]>([])
  const [loading,    setLoading]    = useState(true)
  const [userId,     setUserId]     = useState<string | null>(null)
  const [userTrust,  setUserTrust]  = useState<any>(null)
  const [likedIds,   setLikedIds]   = useState<Set<string>>(new Set())
  const [filter,     setFilter]     = useState('all')
  const [newContent, setNewContent] = useState('')
  const [newTag,     setNewTag]     = useState('talk')
  const [posting,    setPosting]    = useState(false)
  const [showCompose,setShowCompose]= useState(false)
  const [replyTo,    setReplyTo]    = useState<Tweet | null>(null)
  const [showVerify, setShowVerify] = useState(false)

  // ── Auth ──
  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const trust = await getUserTrust(user.id)
      setUserTrust(trust)
    })
  }, [])

  // ── Fetch tweets ──
  const fetchTweets = useCallback(async () => {
    setLoading(true)
    let q = createClient()
      .from('tweets')
      .select(`
        *,
        profiles(display_name, avatar_url),
        user_trust!tweets_user_id_fkey(tier),
        village:villages(name, icon, type)
      `)
      .order('created_at', { ascending: false })
      .limit(40)

    if (filter !== 'all') q = q.eq('tag', filter)

    const { data } = await q
    setTweets((data || []) as unknown as Tweet[])
    setLoading(false)
  }, [filter])

  const fetchLikes = useCallback(async () => {
    if (!userId) return
    const { data } = await createClient()
      .from('tweet_likes').select('tweet_id').eq('user_id', userId)
    setLikedIds(new Set((data || []).map((r: any) => r.tweet_id)))
  }, [userId])

  useEffect(() => { fetchTweets() }, [fetchTweets])
  useEffect(() => { fetchLikes() },  [fetchLikes])

  const tier = userTrust ? getTierById(userTrust.tier) : getTierById('visitor')

  // ── Post tweet ──
  async function postTweet() {
    if (!userId || !newContent.trim() || posting) return
    if (!tier.canPost) { setShowVerify(true); return }
    setPosting(true)
    await createClient().from('tweets').insert({
      user_id: userId,
      content: newContent.trim(),
      tag: newTag,
    })
    await awardPoints('post_liked', undefined) // 投稿ポイントは別途追加可
    setNewContent('')
    setShowCompose(false)
    await fetchTweets()
    setPosting(false)
  }

  // ── Like toggle ──
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

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9]">

      {/* ── Header ── */}
      <div className="bg-white border-b border-stone-100 px-4 pt-5 pb-3 sticky top-0 z-20">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-extrabold text-stone-900 text-lg">タイムライン</h1>
            <p className="text-[11px] text-stone-400">みんなのひとこと</p>
          </div>
          <button
            onClick={() => tier.canPost ? setShowCompose(v => !v) : setShowVerify(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold text-white active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', boxShadow: '0 4px 12px rgba(99,102,241,0.35)' }}
          >
            ✏️ 投稿する
          </button>
        </div>

        {/* Compose box (inline) */}
        {showCompose && (
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 mb-3 animate-in slide-in-from-top-2 duration-150">
            {/* Tag selector */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none mb-2.5 pb-0.5">
              {TAGS.slice(1).map(t => {
                const col = TAG_COLORS[t.id] ?? '#8b7355'
                const sel = newTag === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => setNewTag(t.id)}
                    className="flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all"
                    style={sel
                      ? { background: `${col}18`, color: col, borderColor: `${col}40` }
                      : { background: '#fff', borderColor: '#e7e5e4', color: '#a8a29e' }
                    }
                  >
                    {t.emoji} {t.label}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-2 items-end">
              <textarea
                value={newContent}
                onChange={e => setNewContent(e.target.value.slice(0, 140))}
                placeholder="いまどうしてる？"
                rows={2}
                autoFocus
                className="flex-1 px-3 py-2 rounded-xl border border-stone-200 bg-white text-sm resize-none focus:outline-none focus:border-indigo-300"
              />
              <div className="flex flex-col items-end gap-1.5">
                <span className="text-[10px] text-stone-400">{newContent.length}/140</span>
                <button
                  onClick={postTweet}
                  disabled={!newContent.trim() || posting}
                  className="w-10 h-10 rounded-2xl flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all"
                  style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
                >
                  {posting
                    ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Send size={15} className="text-white" />
                  }
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter chips */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {TAGS.map(t => {
            const col = TAG_COLORS[t.id] ?? '#8b7355'
            const active = filter === t.id
            return (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-all"
                style={active
                  ? { background: t.id === 'all' ? '#18181b' : col, color: '#fff', borderColor: t.id === 'all' ? '#18181b' : col }
                  : { background: '#fff', borderColor: '#e7e5e4', color: '#78716c' }
                }
              >
                {t.emoji} {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 見習いバナー ── */}
      {userTrust && userTrust.tier === 'visitor' && (
        <div
          onClick={() => setShowVerify(true)}
          className="mx-4 mt-3 bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer active:scale-[0.99] transition-all"
        >
          <span className="text-xl">📱</span>
          <div className="flex-1">
            <p className="text-xs font-bold text-indigo-700">電話認証して投稿・いいねできるようになろう</p>
            <p className="text-[10px] text-indigo-400">+30pt 獲得</p>
          </div>
          <span className="text-indigo-300">›</span>
        </div>
      )}

      {/* ── Timeline ── */}
      <div className="px-4 pt-3 pb-32 space-y-3">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-3xl p-4 border border-stone-100 animate-pulse">
              <div className="flex gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-full bg-stone-200 flex-shrink-0" />
                <div className="flex-1 space-y-1.5 pt-1">
                  <div className="h-3 bg-stone-100 rounded-full w-1/3" />
                  <div className="h-2.5 bg-stone-100 rounded-full w-1/4" />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="h-3 bg-stone-100 rounded-full w-full" />
                <div className="h-3 bg-stone-100 rounded-full w-3/4" />
              </div>
            </div>
          ))
        ) : tweets.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">✏️</p>
            <p className="font-extrabold text-stone-800 text-base mb-1.5">まだ投稿がありません</p>
            <p className="text-sm text-stone-400">最初の投稿をしてみましょう</p>
          </div>
        ) : (
          tweets.map(t => (
            <TweetCard
              key={t.id}
              tweet={t}
              userId={userId}
              liked={likedIds.has(t.id)}
              onLikeToggle={handleLike}
              onReply={setReplyTo}
              onUserClick={uid => router.push(`/profile/${uid}`)}
            />
          ))
        )}
      </div>

      {/* ── Modals ── */}
      {replyTo && userId && (
        <ReplyModal
          tweet={replyTo}
          userId={userId}
          onClose={() => setReplyTo(null)}
          onPosted={fetchTweets}
        />
      )}

      {showVerify && (
        <PhoneVerifyModal
          onClose={() => setShowVerify(false)}
          onVerified={async () => {
            const trust = await getUserTrust(userId!)
            setUserTrust(trust)
          }}
        />
      )}
    </div>
  )
}
