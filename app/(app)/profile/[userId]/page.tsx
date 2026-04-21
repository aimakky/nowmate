'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getNationalityFlag } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import TweetCard, { TweetData } from '@/components/ui/TweetCard'

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [tweets, setTweets] = useState<TweetData[]>([])
  const [myId, setMyId] = useState<string | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [toggling, setToggling] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setMyId(user.id)
    })
  }, [])

  useEffect(() => {
    if (!userId) return
    async function load() {
      const supabase = createClient()
      const [{ data: p }, { data: tw }, { count: followers }, { count: following }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('tweets').select('*, profiles(display_name, nationality, avatar_url), tweet_reactions(user_id, reaction), tweet_replies(id)').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
      ])
      setProfile(p)
      setTweets((tw || []) as TweetData[])
      setFollowerCount(followers ?? 0)
      setFollowingCount(following ?? 0)
      setLoading(false)
    }
    load()
  }, [userId])

  useEffect(() => {
    if (!myId || !userId) return
    const supabase = createClient()
    supabase.from('follows').select('follower_id').eq('follower_id', myId).eq('following_id', userId).maybeSingle()
      .then(({ data }) => setIsFollowing(!!data))
  }, [myId, userId])

  async function toggleFollow() {
    if (!myId || toggling || myId === userId) return
    setToggling(true)
    const supabase = createClient()
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', myId).eq('following_id', userId)
      setIsFollowing(false)
      setFollowerCount(c => Math.max(0, c - 1))
    } else {
      await supabase.from('follows').insert({ follower_id: myId, following_id: userId })
      setIsFollowing(true)
      setFollowerCount(c => c + 1)
    }
    setToggling(false)
  }

  async function reloadTweets() {
    const supabase = createClient()
    const { data } = await supabase
      .from('tweets')
      .select('*, profiles(display_name, nationality, avatar_url), tweet_reactions(user_id, reaction), tweet_replies(id)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) setTweets(data as TweetData[])
  }

if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9]">
      <span className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!profile) return null

  const flag = getNationalityFlag(profile.nationality || '')
  const isMe = myId === userId

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9]">
      {/* Header */}
      <div className="bg-white border-b border-stone-100 px-4 pt-4 pb-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-stone-500">
          <ArrowLeft size={20} />
        </button>
        <p className="font-extrabold text-stone-900 flex-1 truncate">{profile.display_name}</p>
      </div>

      {/* Profile card */}
      <div className="bg-white px-5 pt-5 pb-4 border-b border-stone-100">
        <div className="flex items-start gap-4 mb-4">
          <Avatar src={profile.avatar_url} name={profile.display_name} size="lg" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-extrabold text-stone-900 text-lg leading-tight">{profile.display_name}</p>
              <span className="text-xl">{flag}</span>
            </div>
            <p className="text-xs text-stone-400 mb-2">{profile.arrival_stage || 'Samee member'}</p>
            {profile.bio && <p className="text-sm text-stone-600 leading-relaxed">{profile.bio}</p>}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mb-4">
          <div className="text-center">
            <p className="font-extrabold text-stone-900 text-lg">{tweets.length}</p>
            <p className="text-xs text-stone-400">Posts</p>
          </div>
          <div className="text-center">
            <p className="font-extrabold text-stone-900 text-lg">{followerCount}</p>
            <p className="text-xs text-stone-400">Followers</p>
          </div>
          <div className="text-center">
            <p className="font-extrabold text-stone-900 text-lg">{followingCount}</p>
            <p className="text-xs text-stone-400">Following</p>
          </div>
        </div>

        {!isMe && (
          <button onClick={toggleFollow} disabled={toggling}
            className={`w-full py-2.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50 ${
              isFollowing
                ? 'bg-stone-100 text-stone-700 border border-stone-200'
                : 'bg-brand-500 text-white shadow-md shadow-brand-200'
            }`}>
            {toggling ? '...' : isFollowing ? '✓ Following' : '+ Follow'}
          </button>
        )}
        {isMe && (
          <button onClick={() => router.push('/mypage')}
            className="w-full py-2.5 rounded-2xl font-bold text-sm bg-stone-100 text-stone-700 border border-stone-200">
            Edit profile →
          </button>
        )}
      </div>

      {/* Tweet feed */}
      <div className="bg-white divide-y divide-stone-50">
        {tweets.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-3xl mb-2">🐦</p>
            <p className="text-sm font-medium text-stone-500">No posts yet</p>
          </div>
        ) : (
          tweets.map(tweet => (
            <TweetCard key={tweet.id} tweet={tweet} myId={myId} onUpdate={reloadTweets} />
          ))
        )}
      </div>
      <div className="h-28" />
    </div>
  )
}
