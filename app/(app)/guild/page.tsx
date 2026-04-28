'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, MessageCircle, Eye } from 'lucide-react'
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
  const [posts,        setPosts]        = useState<Post[]>([])
  const [loading,      setLoading]      = useState(true)
  const [userId,       setUserId]       = useState<string | null>(null)
  const [myIndustry,   setMyIndustry]   = useState<string | null>(null)
  const [canPost,      setCanPost]      = useState(false)
  const [feedMode,     setFeedMode]     = useState<'all' | 'mine'>('all')
  const [topicFilter,  setTopicFilter]  = useState<string>('all')
  const [reacting,     setReacting]     = useState<string | null>(null)

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
      setMyIndustry(p?.industry ?? null)
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

    if (feedMode === 'mine' && myIndustry) q = q.eq('industry', myIndustry)
    if (topicFilter !== 'all') q = q.eq('topic_tag', topicFilter)

    const { data: postsData } = await q

    // 自分のリアクション取得
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
  }, [userId, feedMode, topicFilter, myIndustry])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  async function handleReaction(postId: string, reactionId: string) {
    if (!userId || reacting) return
    setReacting(postId)
    const supabase = createClient()
    const post = posts.find(p => p.id === postId)
    const current = post?.myReaction

    if (current === reactionId) {
      // 取り消し
      await supabase.from('guild_reactions').delete()
        .eq('post_id', postId).eq('user_id', userId)
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p
        const counts = { ...(p.reaction_counts ?? {}) }
        counts[reactionId] = Math.max(0, (counts[reactionId] ?? 1) - 1)
        return { ...p, myReaction: null, reaction_counts: counts }
      }))
    } else {
      // 新規 or 変更
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

  const ind = myIndustry ? getIndustry(myIndustry) : null

  return (
    <div className="max-w-md mx-auto min-h-screen" style={{ background: '#111827' }}>

      {/* ── ヘッダー ── */}
      <div className="sticky top-0 z-10 px-4 pt-12 pb-0"
        style={{ background: 'linear-gradient(160deg, #111827 0%, #1e1b4b 60%, #1e1b4b 100%)' }}>

        {/* 星背景 */}
        <div className="absolute inset-0 opacity-30 pointer-events-none"
          style={{ backgroundImage: `radial-gradient(1px 1px at 15% 25%, white, transparent), radial-gradient(1px 1px at 65% 12%, white, transparent), radial-gradient(1.5px 1.5px at 82% 58%, white, transparent), radial-gradient(1px 1px at 38% 72%, white, transparent), radial-gradient(1px 1px at 92% 30%, white, transparent)` }} />

        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-indigo-300/70 text-[10px] font-bold tracking-widest uppercase mb-0.5">Guild</p>
              <h1 className="font-extrabold text-white text-2xl leading-tight">⚔️ ギルド</h1>
              <p className="text-indigo-200/60 text-[11px] mt-0.5">同じ業界の本音が集まる場所</p>
            </div>
            <button
              onClick={() => canPost ? router.push('/guild/create') : router.push('/mypage')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-extrabold text-white flex-shrink-0 active:scale-95 transition-all"
              style={{
                background: canPost
                  ? (ind ? ind.gradient : 'linear-gradient(135deg,#6366f1,#4f46e5)')
                  : 'rgba(255,255,255,0.12)',
                border: canPost ? 'none' : '1px solid rgba(255,255,255,0.2)',
              }}
            >
              {canPost ? <><Plus size={13} /> 投稿する</> : '🔒 認証して投稿'}
            </button>
          </div>

          {/* フィードモード */}
          <div className="flex gap-2 mb-3">
            {([
              { id: 'all',  label: '全業界' },
              { id: 'mine', label: `${ind?.emoji ?? '🏷️'} 自分の業界`, disabled: !myIndustry },
            ] as { id: string; label: string; disabled?: boolean }[]).map(m => (
              <button key={m.id}
                onClick={() => !m.disabled && setFeedMode(m.id as 'all' | 'mine')}
                disabled={!!m.disabled}
                className="px-3 py-1.5 rounded-full text-xs font-bold transition-all disabled:opacity-30"
                style={feedMode === m.id
                  ? { background: '#fff', color: '#0f172a' }
                  : { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.15)' }
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
                : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)' }
              }
            >すべて</button>
            {TOPIC_TAGS.map(t => (
              <button key={t.id}
                onClick={() => setTopicFilter(t.id)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                style={topicFilter === t.id
                  ? { background: '#fff', color: '#0f172a' }
                  : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)' }
                }
              >{t.emoji} {t.id}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 業界未設定バナー ── */}
      {!myIndustry && (
        <div
          onClick={() => router.push('/settings')}
          className="mx-4 mt-4 flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer active:scale-[0.99] transition-all"
          style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}
        >
          <span className="text-xl">⚔️</span>
          <div className="flex-1">
            <p className="text-xs font-bold text-indigo-300">業界を設定するとギルドに参加できます</p>
            <p className="text-[10px] text-indigo-400/60 mt-0.5">設定 → 業界を選択してください</p>
          </div>
          <span className="text-indigo-400/60 text-xs">›</span>
        </div>
      )}

      {/* ── 未認証バナー（業界設定済みだが電話未認証） ── */}
      {myIndustry && !canPost && (
        <div
          onClick={() => router.push('/mypage')}
          className="mx-4 mt-3 flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer active:scale-[0.99] transition-all"
          style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)' }}
        >
          <span className="text-xl">📱</span>
          <div className="flex-1">
            <p className="text-xs font-bold text-amber-300">電話認証するとギルドに投稿できます</p>
            <p className="text-[10px] text-amber-400/60 mt-0.5">マイページ → 電話番号認証</p>
          </div>
          <span className="text-amber-400/60 text-xs">›</span>
        </div>
      )}

      {/* ── フィード ── */}
      <div className="px-4 pt-4 pb-32 space-y-3">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="rounded-3xl p-4 animate-pulse"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="h-3 rounded-full w-1/3 mb-3" style={{ background: 'rgba(255,255,255,0.1)' }} />
              <div className="h-4 rounded-full w-full mb-2" style={{ background: 'rgba(255,255,255,0.1)' }} />
              <div className="h-3 rounded-full w-2/3" style={{ background: 'rgba(255,255,255,0.1)' }} />
            </div>
          ))
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">⚔️</p>
            <p className="font-extrabold text-white text-base mb-1.5">まだ投稿がありません</p>
            <p className="text-sm text-indigo-300/60 mb-6">最初の投稿をしてみましょう</p>
            {canPost && (
              <button
                onClick={() => router.push('/guild/create')}
                className="px-6 py-3 rounded-2xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#6366f1 0%,#4f46e5 100%)' }}
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
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)', backdropFilter: 'blur(8px)' }}
              >
                {/* カラーバー */}
                <div className="h-[3px]" style={{ background: industry.gradient }} />

                <div className="p-4" onClick={() => router.push(`/guild/${post.id}`)}>
                  {/* バッジ行 */}
                  <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${industry.color}28`, color: industry.color, border: `1px solid ${industry.color}50` }}>
                      {industry.emoji} {post.industry}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.18)' }}>
                      {topic.emoji} #{post.topic_tag}
                    </span>
                  </div>

                  {/* 本文 */}
                  <p className="text-sm text-white/95 leading-relaxed line-clamp-4 mb-3 whitespace-pre-wrap">
                    {post.content}
                  </p>

                  {/* 画像 */}
                  {post.image_url && (
                    <img src={post.image_url} alt="" className="w-full rounded-2xl object-cover max-h-48 mb-3 border border-white/15" />
                  )}

                  {/* フッター */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/50">{timeAgo(post.created_at)}</span>
                    <div className="flex items-center gap-3 text-[10px] text-white/50">
                      {total > 0 && <span>💬 {total}</span>}
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
                <div className="flex items-center gap-1 px-4 pb-3 border-t border-white/8 pt-2">
                  {REACTIONS.map(r => {
                    const count   = post.reaction_counts?.[r.id] ?? 0
                    const isMe    = post.myReaction === r.id
                    const isMine  = post.user_id === userId
                    return (
                      <button key={r.id}
                        onClick={e => { e.stopPropagation(); if (!isMine) handleReaction(post.id, r.id) }}
                        disabled={!!reacting || isMine}
                        className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold transition-all active:scale-95 disabled:opacity-40"
                        style={isMe
                          ? { background: `${getIndustry(post.industry).color}28`, color: getIndustry(post.industry).color, border: `1px solid ${getIndustry(post.industry).color}50` }
                          : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.15)' }
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
            background: 'linear-gradient(135deg,#6366f1 0%,#4f46e5 100%)',
            boxShadow: '0 8px 24px rgba(99,102,241,0.45)',
          }}
        >
          <Plus size={22} className="text-white" />
        </button>
      )}
    </div>
  )
}
