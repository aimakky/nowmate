'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { createClient } from '@/lib/supabase/client'
import { getNationalityFlag, getDistanceKm, formatDistance } from '@/lib/utils'
import { AREAS } from '@/lib/constants'
import type { Post } from '@/types'

const TAG_EMOJIS: Record<string, string> = {
  Drinks: '🍻', Food: '🍜', Coffee: '☕', Sightseeing: '🗺️',
  Culture: '🎌', Talk: '💬', Help: '🆘', Other: '✨',
}

const TAGS = [
  { value: '', emoji: '✨', label: 'All' },
  { value: 'Drinks', emoji: '🍻', label: 'Drinks' },
  { value: 'Food', emoji: '🍜', label: 'Food' },
  { value: 'Coffee', emoji: '☕', label: 'Coffee' },
  { value: 'Sightseeing', emoji: '🗺️', label: 'Sight' },
  { value: 'Culture', emoji: '🎌', label: 'Culture' },
  { value: 'Talk', emoji: '💬', label: 'Talk' },
  { value: 'Help', emoji: '🆘', label: 'Help' },
]

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function ExplorePage() {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTag, setFilterTag] = useState('')
  const [filterArea, setFilterArea] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set())
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [myCoords, setMyCoords] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id)
    })
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setMyCoords({
          lat: Math.round(pos.coords.latitude * 100) / 100,
          lng: Math.round(pos.coords.longitude * 100) / 100,
        }),
        () => {}
      )
    }
  }, [])

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    // Note: 現在 /explore は next.config.js で /villages に redirect されているため
    // この fetch は通常実行されないが、redirect 解除時の安全のため embed 撤廃済。
    // profiles の embed (PostgREST) を撤廃し別 query で merge (docs/development-checklist.md 遵守)
    let query = supabase
      .from('posts')
      .select('*, post_joins(user_id), post_messages(id)')
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(100)
    if (filterTag) query = query.eq('tag', filterTag)
    if (filterArea) query = query.eq('area', filterArea)
    const { data, error } = await query
    if (error) console.error('[explore] fetchPosts error:', error)

    const rawPosts = (data ?? []) as any[]

    // 投稿者 profiles を別 query で取得 (fail-open)
    const userIds = Array.from(new Set(
      rawPosts.map(p => p.user_id).filter((id: any): id is string => typeof id === 'string' && id.length > 0)
    ))
    const profMap = new Map<string, any>()
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, display_name, nationality')
        .in('id', userIds)
      for (const p of (profs ?? []) as any[]) {
        profMap.set(p.id, p)
      }
    }
    const enriched = rawPosts.map(p => ({
      ...p,
      profiles: profMap.get(p.user_id) ?? null,
    })) as Post[]

    setPosts(enriched)
    if (currentUserId) {
      setJoinedIds(new Set(
        enriched.filter((p: Post) => p.post_joins?.some(j => j.user_id === currentUserId)).map((p: Post) => p.id)
      ))
    }
    setLoading(false)
  }, [filterTag, filterArea, currentUserId])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  async function handleJoin(post: Post) {
    if (!currentUserId) { router.push('/login'); return }
    if (joiningId) return
    if (joinedIds.has(post.id)) { router.push(`/post/${post.id}`); return }
    setJoiningId(post.id)
    const supabase = createClient()
    await supabase.from('post_joins').upsert({ post_id: post.id, user_id: currentUserId })
    setJoinedIds(prev => new Set([...prev, post.id]))
    setJoiningId(null)
    router.push(`/post/${post.id}`)
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-birch">
      <Header title="Explore" />

      {/* Area filter */}
      <div className="px-4 pt-3 pb-1 flex gap-2 overflow-x-auto no-scrollbar">
        <button onClick={() => setFilterArea('')}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            !filterArea ? 'bg-stone-800 text-white border-stone-800' : 'bg-white border-stone-200 text-stone-600'
          }`}>
          🗾 All Japan
        </button>
        {AREAS.slice(0, 7).map(a => (
          <button key={a} onClick={() => setFilterArea(fa => fa === a ? '' : a)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filterArea === a ? 'bg-stone-800 text-white border-stone-800' : 'bg-white border-stone-200 text-stone-600'
            }`}>
            {a}
          </button>
        ))}
      </div>

      {/* Tag filter */}
      <div className="px-4 pt-1.5 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
        {TAGS.map(t => (
          <button key={t.value} onClick={() => setFilterTag(t.value)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filterTag === t.value ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-stone-200 text-stone-600'
            }`}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* Count */}
      {!loading && (
        <p className="px-5 text-xs text-stone-400 font-medium pb-1">
          {posts.length} post{posts.length !== 1 ? 's' : ''}{filterArea ? ` in ${filterArea}` : ' across Japan'}
        </p>
      )}

      <div className="px-4 pb-28 space-y-3 pt-1">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-stone-100 p-4 animate-pulse">
              <div className="h-4 bg-stone-200 rounded w-full mb-2" />
              <div className="h-3 bg-stone-100 rounded w-2/3" />
            </div>
          ))
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-2">🔍</div>
            <p className="font-bold text-stone-700">Nothing found</p>
            <p className="text-sm text-stone-400 mt-1">Try a different area or tag</p>
            <button onClick={() => router.push('/create')}
              className="mt-4 px-5 py-2.5 bg-brand-500 text-white rounded-2xl text-sm font-bold shadow-sm">
              Post first →
            </button>
          </div>
        ) : (
          posts.map(post => {
            const joined = joinedIds.has(post.id)
            const isOwn = post.user_id === currentUserId
            const flag = post.profiles ? getNationalityFlag(post.profiles.nationality || '') : ''
            const joinCount = post.post_joins?.length ?? 0
            const distStr = myCoords && (post as any).lat && (post as any).lng
              ? formatDistance(getDistanceKm(myCoords.lat, myCoords.lng, (post as any).lat, (post as any).lng))
              : null

            return (
              <div key={post.id}
                className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm cursor-pointer active:scale-[0.99] transition-all"
                onClick={() => router.push(`/post/${post.id}`)}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{TAG_EMOJIS[post.tag] ?? '✨'}</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                    post.tag === 'Help' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-brand-50 text-brand-700 border-brand-100'
                  }`}>
                    {post.tag}
                  </span>
                  {post.area && <span className="text-xs text-stone-400">📍 {post.area}</span>}
                  {distStr && <span className="text-xs font-semibold text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded-full">📡 {distStr}</span>}
                </div>
                <p className="text-sm text-stone-800 leading-relaxed mb-3 font-medium">{post.content}</p>
                <div className="flex items-center justify-between" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1.5">
                    <span>{flag}</span>
                    <span className="text-xs text-stone-500">{post.profiles?.display_name}</span>
                    <span className="text-xs text-stone-300">·</span>
                    <span className="text-xs text-stone-400">{timeAgo(post.created_at)}</span>
                    {joinCount > 0 && <><span className="text-xs text-stone-300">·</span><span className="text-xs text-stone-400">👥 {joinCount}</span></>}
                  </div>
                  {!isOwn && (
                    <button onClick={() => handleJoin(post)} disabled={joiningId === post.id}
                      className={`text-xs font-bold px-4 py-2 rounded-xl transition active:scale-95 disabled:opacity-50 ${
                        joined ? 'bg-emerald-500 text-white' : 'bg-brand-500 text-white'
                      }`}>
                      {joiningId === post.id ? '...' : joined ? 'Chat →' : "I'm in!"}
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
