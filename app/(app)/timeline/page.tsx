'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getOccupationBadge } from '@/lib/occupation'
import { timeAgo } from '@/lib/utils'
import { Heart, RefreshCw, ChevronRight, Users, Globe, Briefcase } from 'lucide-react'
import Link from 'next/link'

type Tab = 'occupation' | 'following' | 'open'

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

const TAB_CONFIG: { key: Tab; label: string; labelEn: string; icon: React.ElementType }[] = [
  { key: 'occupation', label: '職業別',     labelEn: 'My Profession', icon: Briefcase },
  { key: 'following',  label: 'フォロー中', labelEn: 'Following',     icon: Users     },
  { key: 'open',       label: 'オープン',   labelEn: 'Open',          icon: Globe     },
]

const CAT_COLOR: Record<string, string> = {
  '雑談':           '#8b7355',
  '相談':           '#1a9ec8',
  '仕事':           '#4f56c8',
  '趣味':           '#d44060',
  '今日のひとこと': '#d99820',
  '初参加あいさつ': '#14a89a',
  '今日のお題':     '#7c3aed',
}

export default function TimelinePage() {
  const router  = useRouter()
  const [tab,        setTab]        = useState<Tab>('occupation')
  const [posts,      setPosts]      = useState<TPost[]>([])
  const [loading,    setLoading]    = useState(true)
  const [loadingMore,setLoadingMore]= useState(false)
  const [hasMore,    setHasMore]    = useState(true)
  const [userId,     setUserId]     = useState<string | null>(null)
  const [occupation, setOccupation] = useState<string | null>(null)
  const [likedIds,   setLikedIds]   = useState<Set<string>>(new Set())
  const [todayCount, setTodayCount] = useState(0)
  const [followingIds, setFollowingIds] = useState<string[]>([])
  const offsetRef = useRef(0)

  // ── 初期化 ──────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const [{ data: prof }, { data: follows }] = await Promise.all([
        supabase.from('profiles').select('occupation').eq('id', user.id).single(),
        supabase.from('user_follows').select('following_id').eq('follower_id', user.id),
      ])
      setOccupation(prof?.occupation ?? null)
      setFollowingIds((follows || []).map((f: any) => f.following_id))

      // いいね済みの投稿
      const { data: reactions } = await supabase
        .from('village_reactions').select('post_id').eq('user_id', user.id)
      setLikedIds(new Set((reactions || []).map((r: any) => r.post_id)))
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

    let userIds: string[] | null = null

    if (tab === 'occupation') {
      if (!occupation) { setPosts([]); setLoading(false); return }
      // 同じ職業のユーザーIDを取得
      const { data: sameOcc } = await supabase
        .from('profiles')
        .select('id')
        .eq('occupation', occupation)
        .neq('id', userId)
      userIds = (sameOcc || []).map((p: any) => p.id)
      if (userIds.length === 0) { setPosts([]); setLoading(false); setHasMore(false); return }
    }

    if (tab === 'following') {
      if (followingIds.length === 0) { setPosts([]); setLoading(false); setHasMore(false); return }
      userIds = followingIds
    }

    let q = supabase
      .from('village_posts')
      .select('id, content, category, created_at, village_id, user_id, reaction_count, profiles(display_name, avatar_url, occupation), villages(id, name, icon), user_trust!village_posts_user_id_fkey(is_shadow_banned, tier)')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)

    if (userIds !== null) {
      q = q.in('user_id', userIds)
    } else {
      // オープン: 認証済み（tier >= 1）かつ非BANのみ
      q = q.eq('user_trust.is_shadow_banned', false)
    }

    const { data } = await q

    // shadow_ban フィルター（全タブ共通）
    const filtered = (data || []).filter((p: any) =>
      p.user_trust?.is_shadow_banned !== true
    ).map((p: any) => ({
      ...p,
      profiles: Array.isArray(p.profiles) ? p.profiles[0] ?? null : p.profiles,
      villages: Array.isArray(p.villages) ? p.villages[0] ?? null : p.villages,
    })) as TPost[]

    if (reset) {
      setPosts(filtered)
      // 職業別タイムラインの今日のカウント
      if (tab === 'occupation' && userIds) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const { count } = await supabase
          .from('village_posts')
          .select('*', { count: 'exact', head: true })
          .in('user_id', userIds)
          .gte('created_at', today.toISOString())
        setTodayCount(count ?? 0)
      } else {
        setTodayCount(0)
      }
    } else {
      setPosts(prev => [...prev, ...filtered])
    }

    offsetRef.current = from + PAGE_SIZE
    setHasMore(filtered.length === PAGE_SIZE)
    setLoading(false)
    setLoadingMore(false)
  }, [userId, tab, occupation, followingIds])

  useEffect(() => {
    if (userId) fetchPosts(true)
  }, [userId, tab, fetchPosts])

  // ── いいね ──────────────────────────────────────────────────
  async function toggleLike(postId: string, currentCount: number) {
    if (!userId) return
    const supabase = createClient()
    if (likedIds.has(postId)) {
      await supabase.from('village_reactions').delete()
        .eq('post_id', postId).eq('user_id', userId)
      setLikedIds(prev => { const n = new Set(prev); n.delete(postId); return n })
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, reaction_count: Math.max(0, p.reaction_count - 1) } : p))
    } else {
      await supabase.from('village_reactions').upsert({ post_id: postId, user_id: userId })
      setLikedIds(prev => new Set([...prev, postId]))
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, reaction_count: p.reaction_count + 1 } : p))
    }
  }

  const occBadge = occupation ? getOccupationBadge(occupation) : null

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
                  <span className="text-[11px] text-white/50 font-medium">
                    今日{todayCount}件の投稿
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => fetchPosts(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <RefreshCw size={15} className="text-white/70" />
          </button>
        </div>

        {/* ── タブ ── */}
        <div className="flex border-b border-white/10">
          {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex-1 flex flex-col items-center gap-0.5 pt-2 pb-3 transition-all relative"
            >
              <Icon
                size={16}
                className={tab === key ? 'text-white' : 'text-white/40'}
                strokeWidth={tab === key ? 2.5 : 1.8}
              />
              <span className={`text-[11px] font-bold ${tab === key ? 'text-white' : 'text-white/40'}`}>
                {label}
              </span>
              {tab === key && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-white rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── コンテンツ ── */}
      <div className="px-4 pt-4 pb-28 space-y-3">

        {/* 職業未設定の案内 */}
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

        {/* フォロー0人の案内 */}
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

        {/* ローディング */}
        {loading && (
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
        )}

        {/* 投稿リスト */}
        {!loading && posts.map(post => {
          const pOccBadge = getOccupationBadge(post.profiles?.occupation)
          const liked     = likedIds.has(post.id)
          const catColor  = CAT_COLOR[post.category] ?? '#8b7355'

          return (
            <div key={post.id}
              className="bg-white border border-stone-100 rounded-2xl shadow-sm overflow-hidden">

              {/* 投稿者 */}
              <div className="px-4 pt-3.5 pb-2 flex items-start gap-2.5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
                >
                  {post.profiles?.display_name?.[0] ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-bold text-stone-900 truncate">
                      {post.profiles?.display_name ?? '名無し'}
                    </span>
                    {pOccBadge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 whitespace-nowrap">
                        {pOccBadge.emoji} {pOccBadge.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: `${catColor}18`, color: catColor }}
                    >
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

              {/* フッター: 村バッジ + いいね */}
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-stone-50">
                <Link
                  href={`/villages/${post.village_id}`}
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1.5 active:opacity-70 transition-opacity"
                >
                  <span className="text-sm">{post.villages?.icon ?? '🏕️'}</span>
                  <span className="text-[11px] font-bold text-stone-500 truncate max-w-[140px]">
                    {post.villages?.name ?? '村'}
                  </span>
                  <ChevronRight size={11} className="text-stone-300 flex-shrink-0" />
                </Link>

                <button
                  onClick={() => toggleLike(post.id, post.reaction_count)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl transition-all active:scale-90"
                  style={liked
                    ? { background: '#fff1f2', color: '#f43f5e' }
                    : { background: '#f5f5f4', color: '#a8a29e' }
                  }
                >
                  <Heart size={13} fill={liked ? '#f43f5e' : 'none'} strokeWidth={liked ? 0 : 1.8} />
                  {post.reaction_count > 0 && (
                    <span className="text-[11px] font-bold">{post.reaction_count}</span>
                  )}
                </button>
              </div>
            </div>
          )
        })}

        {/* 投稿ゼロ（フィルター結果なし） */}
        {!loading && posts.length === 0 && occupation && tab !== 'following' && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🌿</p>
            <p className="text-sm font-bold text-stone-600">まだ投稿がありません</p>
            <p className="text-xs text-stone-400 mt-1">
              {tab === 'occupation' ? '同じ職業の人がまだ投稿していません' : '新しい投稿をお待ちください'}
            </p>
          </div>
        )}

        {/* もっと読む */}
        {!loading && hasMore && posts.length > 0 && (
          <button
            onClick={() => fetchPosts(false)}
            disabled={loadingMore}
            className="w-full py-3.5 bg-white border border-stone-200 rounded-2xl text-sm font-bold text-stone-600 flex items-center justify-center gap-2 active:bg-stone-50 transition-all shadow-sm disabled:opacity-50"
          >
            {loadingMore
              ? <span className="w-4 h-4 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
              : '続きを読む'}
          </button>
        )}
      </div>
    </div>
  )
}
