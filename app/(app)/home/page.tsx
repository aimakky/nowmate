'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { createClient } from '@/lib/supabase/client'
import { getNationalityFlag, getDistanceKm, formatDistance, timeAgo, checkSupportedLocation, detectCurrentCountryCode, SUPPORTED_COUNTRIES } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import TweetCard, { TweetData } from '@/components/ui/TweetCard'
import type { Post } from '@/types'

const TAGS = [
  { value: '',            emoji: '✨', label: 'All' },
  { value: 'Drinks',      emoji: '🍻', label: 'Drinks' },
  { value: 'Food',        emoji: '🍜', label: 'Food' },
  { value: 'Coffee',      emoji: '☕', label: 'Coffee' },
  { value: 'Sightseeing', emoji: '🗺️', label: 'Sight' },
  { value: 'Culture',     emoji: '🎌', label: 'Culture' },
  { value: 'Talk',        emoji: '💬', label: 'Talk' },
  { value: 'Help',        emoji: '🆘', label: 'Help' },
]

const TAG_EMOJIS: Record<string, string> = {
  Drinks: '🍻', Food: '🍜', Coffee: '☕', Sightseeing: '🗺️',
  Culture: '🎌', Talk: '💬', Help: '🆘', Other: '✨',
}

function minsLeft(until: string) {
  const diff = new Date(until).getTime() - Date.now()
  return Math.max(0, Math.floor(diff / 60000))
}

export default function HomePage() {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTag, setFilterTag] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set())
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [feedTab, setFeedTab] = useState<'discover' | 'following'>('discover')
  const [freeNowUsers, setFreeNowUsers] = useState<{ id: string; display_name: string; nationality: string; free_now_until: string }[]>([])
  const [myFreeUntil, setMyFreeUntil] = useState<string | null>(null)
  const [settingFree, setSettingFree] = useState(false)
  const [myCoords, setMyCoords] = useState<{ lat: number; lng: number } | null>(null)
  // Following feed
  const [followingTweets, setFollowingTweets] = useState<TweetData[]>([])
  const [tweetInput, setTweetInput] = useState('')
  const [posting, setPosting] = useState(false)
  const [tweetLocationStatus, setTweetLocationStatus] = useState<'checking' | 'supported' | 'outside' | 'denied'>('checking')
  const [currentCountry, setCurrentCountry] = useState<string>('JP')
  const [showCountryPicker, setShowCountryPicker] = useState(false)

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
        // Load saved country preference
        const { data: profile } = await supabase
          .from('profiles').select('current_country').eq('id', user.id).single()
        if (profile?.current_country) setCurrentCountry(profile.current_country)
      }
    }
    init()

    // GPS: coords for distance + country detection
    navigator.geolocation?.getCurrentPosition(
      async pos => {
        setMyCoords({
          lat: Math.round(pos.coords.latitude * 100) / 100,
          lng: Math.round(pos.coords.longitude * 100) / 100,
        })
      },
      () => {}
    )

    // Auto-detect country and save to profile
    detectCurrentCountryCode().then(async code => {
      if (code) {
        setCurrentCountry(code)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('profiles').update({ current_country: code }).eq('id', user.id)
        }
      }
    })

    checkSupportedLocation().then(s => setTweetLocationStatus(s))
  }, [])

  // Following feed: tweets from people I follow + my own (country-filtered)
  const fetchFollowingFeed = useCallback(async () => {
    if (!currentUserId) return
    const supabase = createClient()
    const { data: followData } = await supabase
      .from('user_follows').select('following_id').eq('follower_id', currentUserId)
    const ids = [...(followData || []).map((f: any) => f.following_id), currentUserId]
    const { data } = await supabase
      .from('tweets')
      .select('*, profiles(display_name, nationality, avatar_url), tweet_reactions(user_id, reaction), tweet_replies(id)')
      .in('user_id', ids)
      .eq('country', currentCountry)
      .order('created_at', { ascending: false })
      .limit(50)
    setFollowingTweets((data || []) as TweetData[])
  }, [currentUserId, currentCountry])

  useEffect(() => { if (feedTab === 'following') fetchFollowingFeed() }, [feedTab, fetchFollowingFeed])

  async function postTweet() {
    if (!tweetInput.trim() || !currentUserId || posting) return
    setPosting(true)
    const supabase = createClient()
    const { data } = await supabase.from('tweets')
      .insert({ user_id: currentUserId, content: tweetInput.trim(), country: currentCountry })
      .select('*, profiles(display_name, nationality, avatar_url), tweet_reactions(user_id, reaction), tweet_replies(id)')
      .single()
    if (data) setFollowingTweets(prev => [data as TweetData, ...prev])
    setTweetInput('')
    setPosting(false)
  }

  // Fetch free-now users
  const fetchFreeNow = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, nationality, free_now_until')
      .gt('free_now_until', new Date().toISOString())
      .limit(20)
    setFreeNowUsers((data || []) as any[])
    if (currentUserId && data) {
      const me = (data as any[]).find(p => p.id === currentUserId)
      setMyFreeUntil(me?.free_now_until ?? null)
    }
  }, [currentUserId])

  useEffect(() => { fetchFreeNow() }, [fetchFreeNow])

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    let query = supabase
      .from('posts')
      .select('*, profiles(display_name, nationality, avatar_url, arrival_stage), post_joins(user_id), post_messages(id)')
      .eq('status', 'active')
      .eq('country', currentCountry)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(50)
    if (filterTag) query = query.eq('tag', filterTag)
    const { data } = await query
    setPosts((data || []) as Post[])
    if (currentUserId && data) {
      setJoinedIds(new Set(
        data.filter((p: Post) => p.post_joins?.some(j => j.user_id === currentUserId)).map((p: Post) => p.id)
      ))
    }
    setLoading(false)
  }, [filterTag, currentUserId, currentCountry])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  async function handleFreeNow() {
    if (!currentUserId) { router.push('/login'); return }
    if (settingFree) return
    setSettingFree(true)
    const supabase = createClient()
    // Toggle: if already free, clear it; else set 1 hour
    if (myFreeUntil && new Date(myFreeUntil) > new Date()) {
      await supabase.from('profiles').update({ free_now_until: null }).eq('id', currentUserId)
      setMyFreeUntil(null)
      setFreeNowUsers(prev => prev.filter(u => u.id !== currentUserId))
    } else {
      const until = new Date(Date.now() + 60 * 60 * 1000).toISOString()
      await supabase.from('profiles').update({ free_now_until: until }).eq('id', currentUserId)
      setMyFreeUntil(until)
      await fetchFreeNow()
    }
    setSettingFree(false)
  }

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

  async function handleCountryChange(code: string) {
    setCurrentCountry(code)
    setShowCountryPicker(false)
    // Save preference to profile
    if (currentUserId) {
      const supabase = createClient()
      await supabase.from('profiles').update({ current_country: code }).eq('id', currentUserId)
    }
  }

  const isFreeNow = myFreeUntil && new Date(myFreeUntil) > new Date()
  const othersOnline = freeNowUsers.filter(u => u.id !== currentUserId)
  const currentCountryInfo = SUPPORTED_COUNTRIES.find(c => c.code === currentCountry)

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9]">
      <Header title="Samee" />

      {/* Country selector */}
      <div className="px-4 pt-3 pb-0 relative">
        <button
          onClick={() => setShowCountryPicker(p => !p)}
          className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-xl px-3 py-1.5 shadow-sm active:scale-95 transition-all">
          <span className="text-base">{currentCountryInfo?.flag ?? '🌍'}</span>
          <span className="text-xs font-bold text-stone-700">{currentCountryInfo?.name ?? 'Global'}</span>
          <span className="text-[10px] text-stone-400">▼</span>
        </button>

        {showCountryPicker && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowCountryPicker(false)} />
            <div className="absolute top-10 left-4 z-50 bg-white border border-stone-200 rounded-2xl shadow-xl p-2 grid grid-cols-3 gap-1 w-64">
              {SUPPORTED_COUNTRIES.map(c => (
                <button key={c.code} onClick={() => handleCountryChange(c.code)}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                    currentCountry === c.code
                      ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-300'
                      : 'hover:bg-stone-50 text-stone-600'
                  }`}>
                  <span className="text-xl">{c.flag}</span>
                  <span className="text-[10px]">{c.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Discover / Following tabs */}
      <div className="px-4 pt-2 pb-0">
        <div className="flex gap-1 bg-stone-100 rounded-xl p-1">
          <button onClick={() => setFeedTab('discover')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              feedTab === 'discover' ? 'bg-white text-brand-600 shadow-sm' : 'text-stone-500'
            }`}>
            🌏 Discover
          </button>
          <button onClick={() => setFeedTab('following')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              feedTab === 'following' ? 'bg-white text-brand-600 shadow-sm' : 'text-stone-500'
            }`}>
            👥 Following
          </button>
        </div>
      </div>

      {/* Following feed */}
      {feedTab === 'following' && (
        <div className="px-4 pb-28 pt-3 space-y-0">
          {/* Tweet compose — Japan only */}
          {tweetLocationStatus === 'supported' ? (
            <div className="bg-white border border-stone-100 rounded-2xl p-4 mb-3 shadow-sm">
              <textarea
                value={tweetInput}
                onChange={e => setTweetInput(e.target.value.slice(0, 280))}
                placeholder="What's on your mind? 🌏"
                rows={2}
                className="w-full text-sm resize-none focus:outline-none text-stone-800 placeholder-stone-400"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-stone-400">{tweetInput.length}/280</span>
                <button onClick={postTweet} disabled={!tweetInput.trim() || posting}
                  className="px-4 py-1.5 bg-brand-500 text-white rounded-xl text-xs font-bold disabled:opacity-40 active:scale-95 transition-all">
                  {posting ? '...' : 'Post'}
                </button>
              </div>
            </div>
          ) : tweetLocationStatus === 'checking' ? (
            <div className="bg-white border border-stone-100 rounded-2xl p-4 mb-3 shadow-sm flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <span className="text-xs text-stone-400">Checking location…</span>
            </div>
          ) : (
            <div className="bg-stone-50 border border-stone-100 rounded-2xl p-4 mb-3 text-center">
              <p className="text-2xl mb-1.5">🇯🇵</p>
              <p className="text-xs font-bold text-stone-600 mb-0.5">Posting is Japan only</p>
              <p className="text-xs text-stone-400">You can still read and react to posts from anywhere.</p>
            </div>
          )}

          {/* Tweet list */}
          {followingTweets.length === 0 ? (
            <div className="text-center py-14">
              <p className="text-4xl mb-3">👥</p>
              <p className="font-bold text-stone-700">No posts from people you follow</p>
              <p className="text-sm text-stone-400 mt-1.5">Follow people to see their posts here</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              {followingTweets.map(tweet => (
                <TweetCard key={tweet.id} tweet={tweet} myId={currentUserId} onUpdate={fetchFollowingFeed} canInteract={tweetLocationStatus === 'supported'} />
              ))}
            </div>
          )}
        </div>
      )}

      {feedTab === 'discover' && <>
      {/* I'm Free Now Banner */}
      <div className="px-4 pt-3 pb-2">
        <div className={`rounded-2xl p-3.5 flex items-center gap-3 border transition-all ${
          isFreeNow
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-white border-stone-100'
        }`}>
          <div className="flex-1 min-w-0">
            {othersOnline.length > 0 ? (
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span className="text-xs font-bold text-stone-700">🟢 Free now:</span>
                {othersOnline.slice(0, 8).map(u => (
                  <span key={u.id} className="text-base" title={u.display_name}>
                    {getNationalityFlag(u.nationality || '')}
                  </span>
                ))}
                {othersOnline.length > 8 && (
                  <span className="text-xs text-stone-400">+{othersOnline.length - 8}</span>
                )}
              </div>
            ) : (
              <p className="text-xs font-bold text-stone-600 mb-0.5">🟡 No one free right now</p>
            )}
            <p className="text-[11px] text-stone-400">
              {isFreeNow
                ? `✅ You're visible for ${minsLeft(myFreeUntil!)}min`
                : 'Let people know you\'re free for 1 hour'}
            </p>
          </div>
          <button
            onClick={handleFreeNow}
            disabled={settingFree || tweetLocationStatus !== 'supported'}
            className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 ${
              isFreeNow
                ? 'bg-emerald-500 text-white'
                : 'bg-brand-500 text-white shadow-sm shadow-brand-200'
            }`}>
            {settingFree ? '...' : isFreeNow ? '✓ Free' : '🙋 I\'m free'}
          </button>
        </div>
      </div>

      {/* Tag filter pills */}
      <div className="px-4 pt-1 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
        {TAGS.map(t => (
          <button key={t.value} onClick={() => setFilterTag(t.value)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filterTag === t.value
                ? 'bg-brand-500 text-white border-brand-500'
                : 'bg-white border-stone-200 text-stone-600 hover:border-brand-300'
            }`}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 pb-28 space-y-3 pt-1">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-stone-100 p-4 animate-pulse">
              <div className="flex gap-2 mb-3">
                <div className="h-7 w-7 bg-stone-200 rounded-xl" />
                <div className="h-6 w-20 bg-stone-200 rounded-full" />
              </div>
              <div className="h-4 bg-stone-200 rounded w-full mb-1.5" />
              <div className="h-4 bg-stone-100 rounded w-3/4" />
            </div>
          ))
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-3">🌏</div>
            <p className="font-bold text-stone-700 text-lg">No posts yet</p>
            <p className="text-sm text-stone-400 mt-1.5 mb-6">Be the first to post something!</p>
            <button onClick={() => router.push('/create')}
              className="px-6 py-3 bg-brand-500 text-white rounded-2xl font-bold text-sm shadow-md shadow-brand-200 active:scale-95 transition-all">
              🚀 Post something now
            </button>
          </div>
        ) : (
          posts.map(post => {
            const joined = joinedIds.has(post.id)
            const isOwn = post.user_id === currentUserId
            const flag = post.profiles ? getNationalityFlag(post.profiles.nationality || '') : ''
            const joinCount = post.post_joins?.length ?? 0
            const msgCount = post.post_messages?.length ?? 0
            const distStr = myCoords && (post as any).lat && (post as any).lng
              ? formatDistance(getDistanceKm(myCoords.lat, myCoords.lng, (post as any).lat, (post as any).lng))
              : null

            return (
              <div key={post.id}
                className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm active:scale-[0.99] transition-all cursor-pointer"
                onClick={() => router.push(`/post/${post.id}`)}>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-xl">{TAG_EMOJIS[post.tag] ?? '✨'}</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                    post.tag === 'Help'
                      ? 'bg-red-50 text-red-700 border-red-100'
                      : 'bg-brand-50 text-brand-700 border-brand-100'
                  }`}>
                    {post.tag}
                  </span>
                  {post.area && <span className="text-xs text-stone-400">📍 {post.area}</span>}
                  {distStr && <span className="text-xs font-semibold text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded-full">📡 {distStr}</span>}
                </div>
                <p className="text-sm text-stone-800 leading-relaxed mb-3 font-medium">{post.content}</p>
                <div className="flex items-center justify-between" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-base">{flag}</span>
                    <button onClick={e => { e.stopPropagation(); router.push(`/profile/${post.user_id}`) }}
                      className="text-xs text-stone-500 font-medium hover:underline">
                      {post.profiles?.display_name}
                    </button>
                    <span className="text-xs text-stone-300">·</span>
                    <span className="text-xs text-stone-400">{timeAgo(post.created_at)}</span>
                    {joinCount > 0 && <><span className="text-xs text-stone-300">·</span><span className="text-xs text-stone-400">👥 {joinCount}</span></>}
                    {msgCount > 0 && <><span className="text-xs text-stone-300">·</span><span className="text-xs text-stone-400">💬 {msgCount}</span></>}
                  </div>
                  {!isOwn ? (
                    <button
                      onClick={() => handleJoin(post)}
                      disabled={joiningId === post.id}
                      className={`text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95 disabled:opacity-50 ${
                        joined ? 'bg-emerald-500 text-white'
                        : post.tag === 'Help' ? 'bg-red-500 text-white'
                        : 'bg-brand-500 text-white'
                      }`}>
                      {joiningId === post.id ? '...' : joined ? 'Chat →' : post.tag === 'Help' ? 'Help →' : "I'm in!"}
                    </button>
                  ) : (
                    <span className="text-[10px] text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">Your post</span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
      </> }
    </div>
  )
}
