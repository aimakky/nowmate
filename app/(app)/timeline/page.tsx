'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getTierById } from '@/lib/trust'
import { timeAgo } from '@/lib/utils'
import { Heart, RefreshCw, ChevronRight, Users, Globe, Home, Share2, Sparkles } from 'lucide-react'
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

const PAGE_SIZE = 20

// ── 今日のお題（曜日別・職業なし）────────────────────────────
const DAILY_PROMPTS = [
  { q: '最近、心があたたかくなった瞬間は？',        hint: '小さなことでも話してみて' },
  { q: '今週、誰かに感謝したいことは？',             hint: '言えてなかった感謝を' },
  { q: '最近、自分を褒めてあげたいことは？',         hint: '頑張ったこと、教えてみて' },
  { q: '今日、誰かに話しかけたかったこと',           hint: 'うまく言えなかったやつ' },
  { q: 'ずっと気になっていること、一つ挙げるなら',   hint: '答えは出なくてもいい' },
  { q: '今の自分に必要なものは？',                   hint: '時間？人？休息？' },
  { q: '最近、変わってきたと思うことは？',            hint: '自分でも気づいてる変化' },
]

// ── カテゴリカラー ──────────────────────────────────────────────
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

// ── タブ定義 ───────────────────────────────────────────────────
const TAB_CONFIG: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'myvillage', label: 'マイ村',    icon: Home  },
  { key: 'all',       label: 'みんな',   icon: Globe },
  { key: 'following', label: 'フォロー', icon: Users },
]

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
  const liked    = likedIds.has(post.id)
  const catColor = CAT_COLOR[post.category] ?? '#8b7355'
  const tier     = getTierById(post.user_trust?.tier ?? 'visitor')

  function shareToX() {
    const village = post.villages ? `${post.villages.icon}${post.villages.name}` : 'VILLIA'
    const text = `${post.content}\n\n— ${village}より\n#VILLIA\nnowmatejapan.com`
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
            style={{ background: '#f5f5f4', color: '#a8a29e' }}>
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

  const [tab,          setTab]          = useState<Tab>('myvillage')
  const [posts,        setPosts]        = useState<TPost[]>([])
  const [loading,      setLoading]      = useState(true)
  const [loadingMore,  setLoadingMore]  = useState(false)
  const [hasMore,      setHasMore]      = useState(true)
  const [userId,       setUserId]       = useState<string | null>(null)
  const [myVillageIds, setMyVillageIds] = useState<string[]>([])
  const [followingIds, setFollowingIds] = useState<string[]>([])
  const [likedIds,     setLikedIds]     = useState<Set<string>>(new Set())

  const offsetRef   = useRef(0)
  const todayPrompt = DAILY_PROMPTS[new Date().getDay()]

  // ── 初期化 ──────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        setUserId(user.id)

        const [{ data: memberships }, { data: follows }, { data: reactions }] = await Promise.all([
          supabase.from('village_members').select('village_id').eq('user_id', user.id),
          supabase.from('user_follows').select('following_id').eq('follower_id', user.id),
          supabase.from('village_reactions').select('post_id').eq('user_id', user.id),
        ])

        setMyVillageIds((memberships || []).map((m: any) => m.village_id))
        setFollowingIds((follows || []).map((f: any) => f.following_id))
        setLikedIds(new Set((reactions || []).map((r: any) => r.post_id)))
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

      if (tab === 'myvillage') {
        q = q.in('village_id', myVillageIds)
      } else if (tab === 'following') {
        q = q.in('user_id', followingIds)
      }

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

  useEffect(() => {
    if (userId) fetchPosts(true)
  }, [userId, tab, fetchPosts])

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

  // ── レンダリング ─────────────────────────────────────────────
  return (
    <div className="max-w-md mx-auto min-h-screen bg-birch">

      {/* ── ヘッダー ── */}
      <div className="px-4 pt-12 pb-0"
        style={{ background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)' }}>
        <div className="flex items-end justify-between mb-3">
          <div>
            <h1 className="font-extrabold text-white text-2xl leading-tight">タイムライン</h1>
            <p className="text-xs text-white/50 mt-0.5">みんなの声が流れる場所</p>
          </div>
          <button onClick={() => fetchPosts(true)}
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
              {tab === key && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-white rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── コンテンツ ── */}
      <div className="px-4 pt-4 pb-28 space-y-3">

        {/* 今日のお題カード（みんなタブのみ） */}
        {tab === 'all' && (
          <div className="rounded-2xl overflow-hidden shadow-sm"
            style={{ background: 'linear-gradient(135deg, #1f3526 0%, #2d4d37 100%)', border: '1px solid rgba(74,124,89,0.3)' }}>
            <div className="px-4 py-2.5 flex items-center gap-2"
              style={{ background: 'rgba(74,124,89,0.25)' }}>
              <Sparkles size={14} className="text-brand-300" />
              <p className="text-[10px] font-extrabold text-brand-300 uppercase tracking-widest">今日のお題</p>
            </div>
            <div className="px-4 py-3.5">
              <p className="text-sm font-bold text-white leading-relaxed">
                「{todayPrompt.q}」
              </p>
              <p className="text-[10px] text-brand-300/70 mt-1">{todayPrompt.hint}</p>
            </div>
          </div>
        )}

        {/* 村に参加していない（マイ村タブ） */}
        {tab === 'myvillage' && myVillageIds.length === 0 && !loading && (
          <div className="bg-white border border-stone-100 rounded-2xl p-5 text-center shadow-sm">
            <p className="text-2xl mb-2">🏕️</p>
            <p className="text-sm font-extrabold text-stone-800 mb-1">まだ村に参加していません</p>
            <p className="text-xs text-stone-500 leading-relaxed mb-4">
              村に参加すると、村の投稿がここに流れます。
            </p>
            <button onClick={() => router.push('/villages')}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand-500 text-white rounded-2xl text-sm font-bold active:scale-95 transition-all">
              村を探す →
            </button>
          </div>
        )}

        {/* フォロー0人（フォロータブ） */}
        {tab === 'following' && followingIds.length === 0 && !loading && (
          <div className="bg-white border border-stone-100 rounded-2xl p-5 text-center shadow-sm">
            <p className="text-2xl mb-2">👥</p>
            <p className="text-sm font-extrabold text-stone-800 mb-1">まだ誰もフォローしていません</p>
            <p className="text-xs text-stone-500 leading-relaxed mb-4">
              村の住民をフォローすると、ここに投稿が流れます。
            </p>
            <button onClick={() => router.push('/villages')}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand-500 text-white rounded-2xl text-sm font-bold active:scale-95 transition-all">
              村を探す →
            </button>
          </div>
        )}

        {/* ローディング */}
        {loading && <Skeleton />}

        {/* 投稿リスト */}
        {!loading && posts.map(post => (
          <PostCard key={post.id} post={post} userId={userId}
            likedIds={likedIds} onToggleLike={toggleLike}
            showVillage={tab !== 'myvillage'} />
        ))}

        {/* 空状態 */}
        {!loading && posts.length === 0 && (
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
    </div>
  )
}
