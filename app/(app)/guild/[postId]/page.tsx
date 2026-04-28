'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Send, Flag, Eye } from 'lucide-react'
import { REACTIONS, getIndustry, getTopicTag } from '@/lib/guild'
import { timeAgo } from '@/lib/utils'
import { getUserTrust } from '@/lib/trust'

export default function GuildPostPage() {
  const { postId } = useParams<{ postId: string }>()
  const router = useRouter()

  const [post,      setPost]      = useState<any>(null)
  const [comments,  setComments]  = useState<any[]>([])
  const [userId,    setUserId]    = useState<string | null>(null)
  const [canPost,   setCanPost]   = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [newComment,setNewComment]= useState('')
  const [posting,   setPosting]   = useState(false)
  const [myReaction,setMyReaction]= useState<string | null>(null)
  const [reacting,  setReacting]  = useState(false)

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const trust = await getUserTrust(user.id)
      setCanPost(trust?.tier !== 'visitor')
    })
  }, [])

  const fetchPost = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('guild_posts')
      .select('*')
      .eq('id', postId)
      .single()
    if (data) {
      setPost(data)
      // 閲覧数（SECURITY DEFINER関数でRLS回避）
      await supabase.rpc('increment_guild_view_count', { p_post_id: postId })
    }
    setLoading(false)
  }, [postId])

  const fetchComments = useCallback(async () => {
    const { data } = await createClient()
      .from('guild_comments')
      .select('*, profiles!guild_comments_user_id_fkey(industry)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    setComments((data || []).map((c: any) => ({
      ...c,
      profiles: Array.isArray(c.profiles) ? c.profiles[0] ?? null : c.profiles,
    })))
  }, [postId])

  const fetchMyReaction = useCallback(async (uid: string) => {
    const { data } = await createClient()
      .from('guild_reactions')
      .select('reaction_type')
      .eq('post_id', postId)
      .eq('user_id', uid)
      .maybeSingle()
    setMyReaction(data?.reaction_type ?? null)
  }, [postId])

  useEffect(() => { fetchPost() }, [fetchPost])
  useEffect(() => { fetchComments() }, [fetchComments])
  useEffect(() => { if (userId) fetchMyReaction(userId) }, [userId, fetchMyReaction])

  async function handleReaction(reactionId: string) {
    if (!userId || reacting || post?.user_id === userId) return
    setReacting(true)
    const supabase = createClient()
    if (myReaction === reactionId) {
      await supabase.from('guild_reactions').delete().eq('post_id', postId).eq('user_id', userId)
      setMyReaction(null)
      setPost((p: any) => {
        const counts = { ...(p.reaction_counts ?? {}) }
        counts[reactionId] = Math.max(0, (counts[reactionId] ?? 1) - 1)
        return { ...p, reaction_counts: counts }
      })
    } else {
      await supabase.from('guild_reactions').upsert(
        { post_id: postId, user_id: userId, reaction_type: reactionId },
        { onConflict: 'post_id,user_id' }
      )
      setMyReaction(reactionId)
      setPost((p: any) => {
        const counts = { ...(p.reaction_counts ?? {}) }
        if (myReaction) counts[myReaction] = Math.max(0, (counts[myReaction] ?? 1) - 1)
        counts[reactionId] = (counts[reactionId] ?? 0) + 1
        return { ...p, reaction_counts: counts }
      })
    }
    setReacting(false)
  }

  async function submitComment() {
    if (!userId || !newComment.trim() || posting) return
    setPosting(true)
    const supabase = createClient()
    await supabase.from('guild_comments').insert({ post_id: postId, user_id: userId, content: newComment.trim() })
    await supabase.rpc('update_guild_comment_count', { p_post_id: postId, p_delta: 1 })
    setNewComment('')
    await fetchComments()
    await fetchPost()
    setPosting(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f1a' }}>
      <span className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!post) return null

  const ind   = getIndustry(post.industry)
  const topic = getTopicTag(post.topic_tag)

  return (
    <div className="max-w-md mx-auto min-h-screen" style={{ background: '#111827' }}>

      {/* ヘッダー */}
      <div className="relative overflow-hidden" style={{ background: ind.gradient }}>
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
        <button onClick={() => router.back()}
          className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center z-10"
          style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)' }}>
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div className="px-5 pt-16 pb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white/80"
              style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.2)' }}>
              {ind.emoji} {post.industry}
            </span>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white/70"
              style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)' }}>
              {topic.emoji} #{post.topic_tag}
            </span>
          </div>
          <div className="flex items-center gap-2 text-white/70 text-[10px]">
            <span>{timeAgo(post.created_at)}</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Eye size={10} /> {post.view_count}</span>
          </div>
        </div>
      </div>

      {/* 投稿本文 */}
      <div className="mx-4 mt-3 p-5 rounded-3xl" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)' }}>
        <p className="text-sm text-white/95 leading-relaxed whitespace-pre-wrap mb-4">{post.content}</p>
        {post.image_url && (
          <img src={post.image_url} alt="" className="w-full rounded-2xl object-cover max-h-72 mb-4 border border-white/15" />
        )}

        {/* リアクション */}
        <div className="flex flex-wrap gap-1.5 pt-3 border-t border-white/10">
          {REACTIONS.map(r => {
            const count = post.reaction_counts?.[r.id] ?? 0
            const isMe  = myReaction === r.id
            const isMine = post.user_id === userId
            return (
              <button key={r.id}
                onClick={() => !isMine && handleReaction(r.id)}
                disabled={reacting || isMine}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95 disabled:opacity-50"
                style={isMe
                  ? { background: `${ind.color}28`, color: ind.color, border: `1px solid ${ind.color}55` }
                  : { background: 'rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.18)' }
                }
              >
                <span>{r.emoji}</span>
                <span>{r.label}</span>
                {count > 0 && <span className="font-extrabold">{count}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* コメント */}
      <div className="px-4 pt-4 pb-32 space-y-3">
        <p className="text-xs font-extrabold text-white/50 uppercase tracking-wider">
          {comments.length} 件のコメント
        </p>

        {comments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">💬</p>
            <p className="text-sm text-white/50">最初にコメントしてみましょう</p>
          </div>
        ) : (
          comments.map(c => {
            const cInd = c.profiles?.industry ? getIndustry(c.profiles.industry) : null
            return (
              <div key={c.id} className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="flex items-center gap-2 mb-2">
                  {cInd && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: `${cInd.color}28`, color: cInd.color, border: `1px solid ${cInd.color}50` }}>
                      {cInd.emoji} {c.profiles.industry}
                    </span>
                  )}
                  <span className="text-[10px] text-white/45">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-sm text-white/90 leading-relaxed">{c.content}</p>
              </div>
            )
          })
        )}

        {/* コメントフォーム */}
        {canPost ? (
          <div className="p-4 rounded-2xl mt-2" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.13)' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-4 rounded-full flex-shrink-0" style={{ background: ind.gradient }} />
              <p className="text-xs font-bold text-white/55">コメントを追加</p>
              <span className="text-[10px] text-white/35 ml-auto">業界バッジで表示</span>
            </div>
            <div className="flex gap-2 items-end">
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value.slice(0, 300))}
                placeholder="コメントを入力..."
                rows={3}
                className="flex-1 px-3 py-2.5 rounded-2xl text-sm resize-none focus:outline-none leading-relaxed"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.95)', caretColor: ind.color }}
              />
              <button onClick={submitComment} disabled={!newComment.trim() || posting}
                className="w-11 h-11 rounded-2xl flex items-center justify-center disabled:opacity-30 active:scale-90 transition-all flex-shrink-0"
                style={{ background: ind.gradient }}>
                {posting
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Send size={15} className="text-white" />
                }
              </button>
            </div>
            <p className="text-[10px] text-white/40 mt-1 text-right">{newComment.length}/300</p>
          </div>
        ) : (
          <div className="p-4 rounded-2xl text-center" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)' }}>
            <p className="text-xs font-bold text-indigo-300">電話認証するとコメントできます</p>
          </div>
        )}
      </div>
    </div>
  )
}
