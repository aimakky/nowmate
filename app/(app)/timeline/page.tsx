'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getOccupationBadge, OCCUPATION_EMOJI } from '@/lib/occupation'
import { timeAgo } from '@/lib/utils'
import { Heart, RefreshCw, ChevronRight, Users, Globe, Briefcase, Sparkles, Send, Share2 } from 'lucide-react'
import Link from 'next/link'

// ── 型定義 ──────────────────────────────────────────────────────
type Tab = 'occupation' | 'following' | 'cross' | 'open'

interface TPost {
  id: string
  content: string
  category: string
  created_at: string
  village_id: string
  user_id: string
  reaction_count: number
  profiles: { display_name: string; avatar_url: string | null; occupation: string | null } | null
  villages:  { id: string; name: string; icon: string } | null
}

const PAGE_SIZE = 20

// ── 共通お題（曜日別7問）──────────────────────────────────────
const CROSS_PROMPTS = [
  { q: '今日一番しんどかったことは？',                  hint: '職業関係なく、今日の本音を話してみよう' },
  { q: '仕事で「この瞬間、やってよかった」と思った話',    hint: '小さなことでもOK' },
  { q: '誰にも言えていない、職場のリアル',              hint: '匿名じゃないけど、ここなら話せる' },
  { q: '今の仕事を続けている理由を一言で',              hint: '建前なしで答えてみよう' },
  { q: '他の職業の人に、正直聞いてみたいこと',          hint: 'どの職業に聞いてみたい？' },
  { q: '後輩に伝えたい、この仕事の「本当のこと」',       hint: '求人票には書いてないやつ' },
  { q: '5年後の自分に一言かけるとしたら？',             hint: '仕事でも人生でも' },
]

// ── タブ定義 ───────────────────────────────────────────────────
const TAB_CONFIG: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'occupation', label: '職業別',     icon: Briefcase  },
  { key: 'following',  label: 'フォロー中', icon: Users      },
  { key: 'cross',      label: '共通お題',   icon: Sparkles   },
  { key: 'open',       label: 'オープン',   icon: Globe      },
]

// ── カテゴリカラー ──────────────────────────────────────────────
const CAT_COLOR: Record<string, string> = {
  '雑談':           '#8b7355',
  '相談':           '#1a9ec8',
  '仕事':           '#4f56c8',
  '趣味':           '#d44060',
  '今日のひとこと': '#d99820',
  '初参加あいさつ': '#14a89a',
  '今日のお題':     '#7c3aed',
  '共通お題':       '#0ea5e9',
}

// ── 投稿カード ─────────────────────────────────────────────────
function PostCard({
  post, userId, likedIds, onToggleLike, showVillage = true,
}: {
  post: TPost
  userId: string | null
  likedIds: Set<string>
  onToggleLike: (id: string) => void
  showVillage?: boolean
}) {
  const occBadge = getOccupationBadge(post.profiles?.occupation)
  const liked     = likedIds.has(post.id)
  const catColor  = CAT_COLOR[post.category] ?? '#8b7355'

  function shareToX() {
    const badge = occBadge ? `${occBadge.emoji} ${occBadge.label}` : '仕事コミュニティ'
    const village = post.villages ? `${post.villages.icon}${post.villages.name}` : 'samee'
    const text = `${post.content}\n\n— ${badge}が${village}で\n#samee #仕事コミュニティ\nnowmatejapan.com`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="bg-white border border-stone-100 rounded-2xl shadow-sm overflow-hidden">
      {/* 投稿者 */}
      <div className="px-4 pt-3.5 pb-2 flex items-start gap-2.5">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
          {post.profiles?.display_name?.[0] ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-bold text-stone-900">
              {post.profiles?.display_name ?? '名無し'}
            </span>
            {occBadge && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 whitespace-nowrap">
                {occBadge.emoji} {occBadge.label}
              </span>
            )}
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

      {/* 本文 */}
      <div className="px-4 pb-3">
        <p className="text-sm text-stone-800 leading-relaxed">{post.content}</p>
      </div>

      {/* フッター */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-stone-50">
        {showVillage && post.villages ? (
          <Link href={`/villages/${post.village_id}`}
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1.5 active:opacity-70 transition-opacity">
            <span className="text-sm">{post.villages.icon}</span>
            <span className="text-[11px] font-bold text-stone-500 truncate max-w-[120px]">
              {post.villages.name}
            </span>
            <ChevronRight size={11} className="text-stone-300 flex-shrink-0" />
          </Link>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1.5">
          <button
            onClick={shareToX}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl transition-all active:scale-90"
            style={{ background: '#f5f5f4', color: '#a8a29e' }}
            title="Xでシェア">
            <Share2 size={12} />
          </button>
          <button
            onClick={() => onToggleLike(post.id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl transition-all active:scale-90"
            style={liked
              ? { background: '#fff1f2', color: '#f43f5e' }
              : { background: '#f5f5f4', color: '#a8a29e' }
            }>
            <Heart size={13} fill={liked ? '#f43f5e' : 'none'} strokeWidth={liked ? 0 : 1.8} />
            {post.reaction_count > 0 && (
              <span className="text-[11px] font-bold">{post.reaction_count}</span>
            )}
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

// ── メインページ ───────────────────────────────────────────────
export default function TimelinePage() {
  const router = useRouter()

  // ── State ──────────────────────────────────────────────────
  const [tab,          setTab]          = useState<Tab>('occupation')
  const [posts,        setPosts]        = useState<TPost[]>([])
  const [loading,      setLoading]      = useState(true)
  const [loadingMore,  setLoadingMore]  = useState(false)
  const [hasMore,      setHasMore]      = useState(true)
  const [userId,       setUserId]       = useState<string | null>(null)
  const [occupation,   setOccupation]   = useState<string | null>(null)
  const [occVillageId, setOccVillageId] = useState<string | null>(null)
  const [likedIds,     setLikedIds]     = useState<Set<string>>(new Set())
  const [todayCount,   setTodayCount]   = useState(0)
  const [followingIds, setFollowingIds] = useState<string[]>([])

  // 共通お題
  const [crossAnswer,  setCrossAnswer]  = useState('')
  const [posting,      setPosting]      = useState(false)
  const [posted,       setPosted]       = useState(false)

  // オープンフィルター
  const [openFilter,   setOpenFilter]   = useState<string | null>(null)
  const [activeOccs,   setActiveOccs]   = useState<string[]>([])

  const offsetRef = useRef(0)

  const todayPrompt = CROSS_PROMPTS[new Date().getDay()]

  // ── 初期化 ──────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        setUserId(user.id)

        const [{ data: prof }, { data: follows }, { data: reactions }] = await Promise.all([
          supabase.from('profiles').select('occupation').eq('id', user.id).single(),
          supabase.from('user_follows').select('following_id').eq('follower_id', user.id),
          supabase.from('village_reactions').select('post_id').eq('user_id', user.id),
        ])

        const occ = prof?.occupation ?? null
        setOccupation(occ)
        setFollowingIds((follows || []).map((f: any) => f.following_id))
        setLikedIds(new Set((reactions || []).map((r: any) => r.post_id)))

        // 職業村を探す
        if (occ) {
          const { data: memb } = await supabase
            .from('village_members')
            .select('village_id, villages!inner(job_locked, job_type)')
            .eq('user_id', user.id)
          const jobV = (memb || []).find((m: any) => m.villages?.job_locked && m.villages?.job_type === occ)
          setOccVillageId(jobV?.village_id ?? null)
        }

        // オープンタブ用: 直近7日間に投稿のある職業一覧
        const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const { data: recentPosts } = await supabase
          .from('village_posts')
          .select('profiles(occupation)')
          .gte('created_at', since7d)
          .limit(200)
        const occSet = new Set<string>()
        ;(recentPosts || []).forEach((p: any) => {
          const o = Array.isArray(p.profiles) ? p.profiles[0]?.occupation : p.profiles?.occupation
          if (o && o !== 'その他') occSet.add(o)
        })
        setActiveOccs(Array.from(occSet).slice(0, 12))
      } catch (e) {
        console.error('timeline init error:', e)
      }
    }
    init()
  }, [router])

  // ── 投稿フェッチ ─────────────────────────────────────────────
  const fetchPosts = useCallback(async (reset = false) => {
    if (!userId) return
    const supabase = createClient()
    const from = reset ? 0 : offsetRef.current
    if (reset) { setLoading(true); offsetRef.current = 0 }
    else setLoadingMore(true)

    try {
      let userIds: string[] | null = null

      if (tab === 'occupation') {
        if (!occupation) { setPosts([]); setLoading(false); return }
        const { data: sameOcc } = await supabase
          .from('profiles').select('id').eq('occupation', occupation).neq('id', userId)
        userIds = (sameOcc || []).map((p: any) => p.id)
        if (userIds.length === 0) { setPosts([]); setLoading(false); setHasMore(false); return }
      }

      if (tab === 'following') {
        if (followingIds.length === 0) { setPosts([]); setLoading(false); setHasMore(false); return }
        userIds = followingIds
      }

      let q = supabase
        .from('village_posts')
        .select('id, content, category, created_at, village_id, user_id, reaction_count, profiles(display_name, avatar_url, occupation), villages(id, name, icon), user_trust!village_posts_user_id_fkey(is_shadow_banned)')
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1)

      if (tab === 'cross') {
        q = q.eq('category', '共通お題')
      } else if (userIds !== null) {
        q = q.in('user_id', userIds)
      } else if (tab === 'open' && openFilter) {
        // オープン + 職業フィルター: フィルター対象のユーザーIDを取得
        const { data: filteredProfs } = await supabase
          .from('profiles').select('id').eq('occupation', openFilter)
        const fIds = (filteredProfs || []).map((p: any) => p.id)
        if (fIds.length === 0) { setPosts([]); setLoading(false); setHasMore(false); return }
        q = q.in('user_id', fIds)
      }

      const { data } = await q
      const filtered = (data || [])
        .filter((p: any) => p.user_trust?.is_shadow_banned !== true)
        .map((p: any) => ({
          ...p,
          profiles: Array.isArray(p.profiles) ? p.profiles[0] ?? null : p.profiles,
          villages: Array.isArray(p.villages) ? p.villages[0] ?? null : p.villages,
        })) as TPost[]

      if (reset) {
        setPosts(filtered)
        if (tab === 'occupation' && userIds) {
          const today = new Date(); today.setHours(0, 0, 0, 0)
          const { count } = await supabase
            .from('village_posts').select('*', { count: 'exact', head: true })
            .in('user_id', userIds).gte('created_at', today.toISOString())
          setTodayCount(count ?? 0)
        } else setTodayCount(0)
      } else {
        setPosts(prev => [...prev, ...filtered])
      }

      offsetRef.current = from + PAGE_SIZE
      setHasMore(filtered.length === PAGE_SIZE)
    } catch (e) {
      console.error('fetchPosts error:', e)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [userId, tab, occupation, followingIds, openFilter])

  useEffect(() => {
    if (userId) fetchPosts(true)
  }, [userId, tab, fetchPosts])

  // openFilterが変わったときも再取得
  useEffect(() => {
    if (userId && tab === 'open') fetchPosts(true)
  }, [openFilter])  // eslint-disable-line

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

  // ── 共通お題に投稿 ───────────────────────────────────────────
  async function postCrossAnswer() {
    if (!crossAnswer.trim() || posting || !userId || !occVillageId) return
    setPosting(true)
    try {
      const supabase = createClient()
      const { data: newPost } = await supabase.from('village_posts').insert({
        village_id: occVillageId,
        user_id: userId,
        content: crossAnswer.trim(),
        category: '共通お題',
      }).select('id, content, category, created_at, village_id, user_id, reaction_count, profiles(display_name, avatar_url, occupation), villages(id, name, icon)').single()
      setCrossAnswer('')
      setPosted(true)
      setTimeout(() => setPosted(false), 3000)
      if (newPost) {
        const p: TPost = {
          ...newPost,
          profiles: Array.isArray(newPost.profiles) ? newPost.profiles[0] ?? null : newPost.profiles,
          villages: Array.isArray(newPost.villages) ? newPost.villages[0] ?? null : newPost.villages,
        }
        setPosts(prev => [p, ...prev])
      }
    } catch (e) {
      console.error('cross post error:', e)
    } finally {
      setPosting(false)
    }
  }

  const occBadge = occupation ? getOccupationBadge(occupation) : null

  // ── レンダリング ─────────────────────────────────────────────
  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9]">

      {/* ── ヘッダー ── */}
      <div className="px-4 pt-12 pb-0"
        style={{ background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)' }}>
        <div className="flex items-end justify-between mb-3">
          <div>
            <h1 className="font-extrabold text-white text-2xl leading-tight">タイムライン</h1>
            {occBadge && tab === 'occupation' && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-flex items-center gap-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full px-2.5 py-0.5">
                  <span className="text-sm">{occBadge.emoji}</span>
                  <span className="text-[11px] font-bold text-indigo-200">{occBadge.label}</span>
                </span>
                {todayCount > 0 && (
                  <span className="text-[11px] text-white/50 font-medium">今日{todayCount}件</span>
                )}
              </div>
            )}
            {tab === 'cross' && (
              <p className="text-xs text-white/50 mt-0.5">全職業で同じ問いに答えよう</p>
            )}
            {tab === 'open' && openFilter && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-flex items-center gap-1 bg-sky-500/20 border border-sky-400/30 rounded-full px-2.5 py-0.5">
                  <span className="text-sm">{OCCUPATION_EMOJI[openFilter] ?? '💼'}</span>
                  <span className="text-[11px] font-bold text-sky-200">{openFilter}</span>
                </span>
                <button onClick={() => setOpenFilter(null)} className="text-[10px] text-white/40 font-bold">× 解除</button>
              </div>
            )}
          </div>
          <button onClick={() => fetchPosts(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <RefreshCw size={15} className="text-white/70" />
          </button>
        </div>

        {/* ── タブ ── */}
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
              {tab === key && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-white rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── コンテンツ ── */}
      <div className="px-4 pt-4 pb-28 space-y-3">

        {/* ══ 共通お題タブ ══ */}
        {tab === 'cross' && (
          <div className="rounded-2xl overflow-hidden shadow-sm"
            style={{ background: 'linear-gradient(135deg, #0c4a6e 0%, #075985 100%)', border: '1px solid rgba(14,165,233,0.3)' }}>
            <div className="px-4 py-2.5 flex items-center gap-2"
              style={{ background: 'rgba(14,165,233,0.2)' }}>
              <Sparkles size={14} className="text-sky-300" />
              <p className="text-[10px] font-extrabold text-sky-300 uppercase tracking-widest">今日の共通お題</p>
            </div>
            <div className="px-4 py-3.5">
              <p className="text-sm font-bold text-white leading-relaxed mb-1">
                「{todayPrompt.q}」
              </p>
              <p className="text-[10px] text-sky-300/70">{todayPrompt.hint}</p>
            </div>
            {occVillageId ? (
              <div className="px-4 pb-4">
                <div className="flex gap-2">
                  <textarea
                    value={crossAnswer}
                    onChange={e => setCrossAnswer(e.target.value.slice(0, 200))}
                    placeholder="あなたの本音を書く…"
                    rows={2}
                    className="flex-1 px-3 py-2.5 rounded-xl text-xs resize-none focus:outline-none leading-relaxed"
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
                  />
                  <button onClick={postCrossAnswer} disabled={!crossAnswer.trim() || posting}
                    className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all flex-shrink-0 self-end"
                    style={{ background: '#0ea5e9' }}>
                    {posting
                      ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Send size={14} className="text-white" />}
                  </button>
                </div>
                {posted && <p className="text-[11px] text-sky-300 font-bold mt-1.5">✓ 投稿しました！みんなの回答を読んでみよう</p>}
              </div>
            ) : (
              <div className="px-4 pb-4">
                <Link href="/settings"
                  className="block text-center py-2 rounded-xl text-xs font-bold text-sky-300"
                  style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.3)' }}>
                  💼 職業を設定すると答えられます →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ══ オープンタブの職業フィルターチップ ══ */}
        {tab === 'open' && activeOccs.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1">
            <button
              onClick={() => setOpenFilter(null)}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all"
              style={!openFilter
                ? { background: '#1c1917', color: '#fff', borderColor: '#1c1917' }
                : { background: '#fafaf9', color: '#78716c', borderColor: '#e7e5e4' }
              }>
              🌐 すべて
            </button>
            {activeOccs.map(occ => (
              <button key={occ}
                onClick={() => setOpenFilter(prev => prev === occ ? null : occ)}
                className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all whitespace-nowrap"
                style={openFilter === occ
                  ? { background: '#6366f1', color: '#fff', borderColor: '#6366f1' }
                  : { background: '#fafaf9', color: '#78716c', borderColor: '#e7e5e4' }
                }>
                {OCCUPATION_EMOJI[occ] ?? '💼'} {occ}
              </button>
            ))}
          </div>
        )}

        {/* ══ 職業未設定（職業別タブ）══ */}
        {tab === 'occupation' && !occupation && !loading && (
          <div className="bg-white border border-stone-100 rounded-2xl p-5 text-center shadow-sm">
            <p className="text-2xl mb-2">💼</p>
            <p className="text-sm font-extrabold text-stone-800 mb-1">職業を設定してください</p>
            <p className="text-xs text-stone-500 leading-relaxed mb-4">
              職業を設定すると、同じ仕事をしている人の投稿だけが流れます。
            </p>
            <Link href="/settings"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand-500 text-white rounded-2xl text-sm font-bold active:scale-95 transition-all">
              設定する →
            </Link>
          </div>
        )}

        {/* ══ フォロー0人（フォロー中タブ）══ */}
        {tab === 'following' && followingIds.length === 0 && !loading && (
          <div className="bg-white border border-stone-100 rounded-2xl p-5 text-center shadow-sm">
            <p className="text-2xl mb-2">👥</p>
            <p className="text-sm font-extrabold text-stone-800 mb-1">まだ誰もフォローしていません</p>
            <p className="text-xs text-stone-500 leading-relaxed mb-4">
              村の住民ページからフォローすると、ここに投稿が流れます。
            </p>
            <button onClick={() => router.push('/villages')}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand-500 text-white rounded-2xl text-sm font-bold active:scale-95 transition-all">
              村を探す →
            </button>
          </div>
        )}

        {/* ══ ローディング ══ */}
        {loading && <Skeleton />}

        {/* ══ 投稿リスト ══ */}
        {!loading && posts.map(post => (
          <PostCard key={post.id} post={post} userId={userId}
            likedIds={likedIds} onToggleLike={toggleLike}
            showVillage={tab !== 'occupation'} />
        ))}

        {/* ══ 空状態 ══ */}
        {!loading && posts.length === 0 && (tab === 'cross' || (tab !== 'following' && occupation)) && (
          <div className="text-center py-12">
            <p className="text-3xl mb-3">{tab === 'cross' ? '✍️' : '🌿'}</p>
            <p className="text-sm font-bold text-stone-600">
              {tab === 'cross' ? 'まだ回答がありません — 最初に答えてみよう' : 'まだ投稿がありません'}
            </p>
          </div>
        )}

        {/* ══ もっと読む ══ */}
        {!loading && hasMore && posts.length > 0 && (
          <button onClick={() => fetchPosts(false)} disabled={loadingMore}
            className="w-full py-3.5 bg-white border border-stone-200 rounded-2xl text-sm font-bold text-stone-600 flex items-center justify-center gap-2 active:bg-stone-50 transition-all shadow-sm disabled:opacity-50">
            {loadingMore
              ? <span className="w-4 h-4 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
              : '続きを読む'}
          </button>
        )}
      </div>
    </div>
  )
}
