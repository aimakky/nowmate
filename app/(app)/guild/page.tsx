'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, MessageCircle, Eye, Gamepad2 } from 'lucide-react'
import { INDUSTRIES, TOPIC_TAGS, REACTIONS, getIndustry, getTopicTag, getTotalReactions } from '@/lib/guild'
import { timeAgo } from '@/lib/utils'
import { getUserTrust } from '@/lib/trust'

type Post = {
  id: string
  user_id: string
  industry: string
  topic_tag: string
  content: string
  image_url: string | null
  view_count: number
  comment_count: number
  reaction_counts: Record<string, number> | null
  created_at: string
  myReaction?: string | null
}

export default function GuildPage() {
  const router = useRouter()
  const [posts,       setPosts]       = useState<Post[]>([])
  const [loading,     setLoading]     = useState(true)
  const [userId,      setUserId]      = useState<string | null>(null)
  const [myGenre,     setMyGenre]     = useState<string | null>(null)
  const [canPost,     setCanPost]     = useState(false)
  const [feedMode,    setFeedMode]    = useState<'all' | 'mine'>('all')
  const [topicFilter, setTopicFilter] = useState<string>('all')
  const [reacting,    setReacting]    = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const [{ data: p }, trust] = await Promise.all([
        supabase.from('profiles').select('industry').eq('id', user.id).single(),
        getUserTrust(user.id),
      ])
      setMyGenre(p?.industry ?? null)
      setCanPost(trust?.tier !== 'visitor')
    }
    init()
  }, [router])

  const fetchPosts = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const supabase = createClient()

    let q = supabase
      .from('guild_posts')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(40)

    if (feedMode === 'mine' && myGenre) q = q.eq('industry', myGenre)
    if (topicFilter !== 'all') q = q.eq('topic_tag', topicFilter)

    const { data: postsData } = await q

    if (postsData && postsData.length > 0) {
      const ids = postsData.map((p: any) => p.id)
      const { data: myReactions } = await supabase
        .from('guild_reactions')
        .select('post_id, reaction_type')
        .eq('user_id', userId)
        .in('post_id', ids)
      const myMap: Record<string, string> = {}
      for (const r of myReactions ?? []) myMap[r.post_id] = r.reaction_type

      setPosts((postsData || []).map((p: any) => ({
        ...p,
        myReaction: myMap[p.id] ?? null,
      })))
    } else {
      setPosts([])
    }
    setLoading(false)
  }, [userId, feedMode, topicFilter, myGenre])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  async function handleReaction(postId: string, reactionId: string) {
    if (!userId || reacting) return
    setReacting(postId)
    const supabase = createClient()
    const post = posts.find(p => p.id === postId)
    const current = post?.myReaction

    if (current === reactionId) {
      await supabase.from('guild_reactions').delete()
        .eq('post_id', postId).eq('user_id', userId)
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p
        const counts = { ...(p.reaction_counts ?? {}) }
        counts[reactionId] = Math.max(0, (counts[reactionId] ?? 1) - 1)
        return { ...p, myReaction: null, reaction_counts: counts }
      }))
    } else {
      await supabase.from('guild_reactions').upsert(
        { post_id: postId, user_id: userId, reaction_type: reactionId },
        { onConflict: 'post_id,user_id' }
      )
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p
        const counts = { ...(p.reaction_counts ?? {}) }
        if (current) counts[current] = Math.max(0, (counts[current] ?? 1) - 1)
        counts[reactionId] = (counts[reactionId] ?? 0) + 1
        return { ...p, myReaction: reactionId, reaction_counts: counts }
      }))
    }
    setReacting(null)
  }

  const genreInfo = myGenre ? getIndustry(myGenre) : null

  return (
    <div className="max-w-md mx-auto min-h-screen" style={{ background: '#0f0f1a' }}>

      {/* ── ヘッダー ── */}
      <div className="sticky top-0 z-10 px-4 pt-12 pb-0"
        style={{ background: 'linear-gradient(160deg, #0f0f1a 0%, #1a1035 60%, #1a1035 100%)' }}>

        {/* 星背景 */}
        <div className="absolute inset-0 opacity-40 pointer-events-none"
          style={{ backgroundImage: `radial-gradient(1px 1px at 10% 20%, #a78bfa, transparent), radial-gradient(1.5px 1.5px at 70% 15%, #818cf8, transparent), radial-gradient(1px 1px at 85% 60%, #c4b5fd, transparent), radial-gradient(1px 1px at 35% 75%, #a78bfa, transparent), radial-gradient(1.5px 1.5px at 50% 40%, white, transparent), radial-gradient(1px 1px at 92% 35%, white, transparent)` }} />

        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-purple-400/60 text-[10px] font-bold tracking-widest uppercase mb-0.5">GAME GUILD</p>
              <h1 className="font-extrabold text-white text-2xl leading-tight flex items-center gap-2">
                <span className="text-2xl">🎮</span>
                ゲームギルド
              </h1>
              <p className="text-purple-300/50 text-[11px] mt-0.5">ゲーマーが集まる匿名の広場</p>
            </div>
            <button
              onClick={() => canPost ? router.push('/guild/create') : router.push('/mypage')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-extrabold text-white flex-shrink-0 active:scale-95 transition-all"
              style={{
                background: canPost
                  ? (genreInfo ? genreInfo.gradient : 'linear-gradient(135deg,#8b5cf6,#6d28d9)')
                  : 'rgba(255,255,255,0.10)',
                border: canPost ? 'none' : '1px solid rgba(255,255,255,0.15)',
              }}
            >
              {canPost ? <><Plus size={13} /> 投稿する</> : '🔒 認証して投稿'}
            </button>
          </div>

          {/* フィードモード */}
          <div className="flex gap-2 mb-3">
            {([
              { id: 'all',  label: '全ジャンル' },
              { id: 'mine', label: `${genreInfo?.emoji ?? '🎮'} マイジャンル`, disabled: !myGenre },
            ] as { id: string; label: string; disabled?: boolean }[]).map(m => (
              <button key={m.id}
                onClick={() => !m.disabled && setFeedMode(m.id as 'all' | 'mine')}
                disabled={!!m.disabled}
                className="px-3 py-1.5 rounded-full text-xs font-bold transition-all disabled:opacity-30"
                style={feedMode === m.id
                  ? { background: '#fff', color: '#0f172a' }
                  : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.50)', border: '1px solid rgba(255,255,255,0.12)' }
                }
              >{m.label}</button>
            ))}
          </div>

          {/* トピックフィルター */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-3">
            <button
              onClick={() => setTopicFilter('all')}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
              style={topicFilter === 'all'
                ? { background: '#fff', color: '#0f172a' }
                : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.10)' }
              }
            >すべて</button>
            {TOPIC_TAGS.map(t => (
              <button key={t.id}
                onClick={() => setTopicFilter(t.id)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                style={topicFilter === t.id
                  ? { background: '#fff', color: '#0f172a' }
                  : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.10)' }
                }
              >{t.emoji} {t.id}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── ジャンル未設定バナー ── */}
      {!myGenre && (
        <div
          onClick={() => router.push('/settings')}
          className="mx-4 mt-4 flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer active:scale-[0.99] transition-all"
          style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.35)' }}
        >
          <span className="text-xl flex-shrink-0">🎮</span>
          <div className="flex-1">
            <p className="text-xs font-bold text-purple-300">ゲームジャンルを設定してギルドに参加しよう</p>
            <p className="text-[10px] text-purple-400/70 mt-0.5">設定 → ジャンルを選択してください</p>
          </div>
          <span className="text-purple-400/70 text-xs">›</span>
        </div>
      )}

      {/* ── 未認証バナー ── */}
      {myGenre && !canPost && (
        <div
          onClick={() => router.push('/mypage')}
          className="mx-4 mt-3 flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer active:scale-[0.99] transition-all"
          style={{ background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.30)' }}
        >
          <span className="text-xl">📱</span>
          <div className="flex-1">
            <p className="text-xs font-bold text-amber-400">電話認証するとギルドに投稿できます</p>
            <p className="text-[10px] text-amber-500/70 mt-0.5">マイページ → 電話番号認証</p>
          </div>
          <span className="text-amber-400/60 text-xs">›</span>
        </div>
      )}

      {/* ── フィード ── */}
      <div className="px-4 pt-4 pb-32 space-y-3">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="rounded-3xl p-4 animate-pulse"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="h-3 rounded-full w-1/3 mb-3" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <div className="h-4 rounded-full w-full mb-2" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <div className="h-3 rounded-full w-2/3" style={{ background: 'rgba(255,255,255,0.08)' }} />
            </div>
          ))
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center text-4xl"
              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}>
              🎮
            </div>
            <p className="font-extrabold text-white text-base mb-1.5">まだ投稿がありません</p>
            <p className="text-sm text-purple-400/70 mb-6">最初のプレイヤーになろう</p>
            {canPost && (
              <button
                onClick={() => router.push('/guild/create')}
                className="px-6 py-3 rounded-2xl text-sm font-bold text-white active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg,#8b5cf6 0%,#6d28d9 100%)', boxShadow: '0 8px 24px rgba(139,92,246,0.4)' }}
              >✏️ 投稿する</button>
            )}
          </div>
        ) : (
          posts.map(post => {
            const industry = getIndustry(post.industry)
            const topic    = getTopicTag(post.topic_tag)
            const total    = getTotalReactions(post.reaction_counts)
            return (
              <div key={post.id}
                className="rounded-3xl overflow-hidden cursor-pointer active:scale-[0.99] transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 1px 8px rgba(0,0,0,0.3)' }}
              >
                {/* カラーバー */}
                <div className="h-[3px]" style={{ background: industry.gradient }} />

                <div className="p-4" onClick={() => router.push(`/guild/${post.id}`)}>
                  {/* バッジ行 */}
                  <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${industry.color}25`, color: industry.color, border: `1px solid ${industry.color}45` }}>
                      {industry.emoji} {post.industry}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.25)' }}>
                      {topic.emoji} #{post.topic_tag}
                    </span>
                  </div>

                  {/* 本文 */}
                  <p className="text-sm text-stone-200 leading-relaxed line-clamp-4 mb-3 whitespace-pre-wrap">
                    {post.content}
                  </p>

                  {/* 画像 */}
                  {post.image_url && (
                    <img src={post.image_url} alt="" className="w-full rounded-2xl object-cover max-h-48 mb-3 border border-white/10" />
                  )}

                  {/* フッター */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-stone-500">{timeAgo(post.created_at)}</span>
                    <div className="flex items-center gap-3 text-[10px] text-stone-500">
                      {total > 0 && <span>🎮 {total}</span>}
                      {post.comment_count > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageCircle size={11} /> {post.comment_count}
                        </span>
                      )}
                      <span className="flex items-center gap-1"><Eye size={11} /> {post.view_count}</span>
                    </div>
                  </div>
                </div>

                {/* リアクションバー */}
                <div className="flex items-center gap-1 px-4 pb-3 pt-2"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  {REACTIONS.map(r => {
                    const count  = post.reaction_counts?.[r.id] ?? 0
                    const isMe   = post.myReaction === r.id
                    const isMine = post.user_id === userId
                    return (
                      <button key={r.id}
                        onClick={e => { e.stopPropagation(); if (!isMine) handleReaction(post.id, r.id) }}
                        disabled={!!reacting || isMine}
                        className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold transition-all active:scale-95 disabled:opacity-40"
                        style={isMe
                          ? { background: `${industry.color}25`, color: industry.color, border: `1px solid ${industry.color}45` }
                          : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.10)' }
                        }
                      >
                        <span>{r.emoji}</span>
                        {count > 0 && <span>{count}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* FAB */}
      {canPost && (
        <button
          onClick={() => router.push('/guild/create')}
          className="fixed right-5 w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl active:scale-90 transition-all z-50"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
            background: 'linear-gradient(135deg,#8b5cf6 0%,#6d28d9 100%)',
            boxShadow: '0 8px 24px rgba(139,92,246,0.5)',
          }}
        >
          <Plus size={22} className="text-white" />
        </button>
      )}
    </div>
  )
}
