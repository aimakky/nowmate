'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getNationalityFlag } from '@/lib/utils'
import { timeAgo } from '@/lib/utils'
import { ArrowLeft, Heart, ChevronRight } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import TrustBadge from '@/components/ui/TrustBadge'
import { getOccupationBadge, getBigCategory } from '@/lib/occupation'
import Link from 'next/link'

interface VillagePost {
  id: string
  content: string
  category: string
  created_at: string
  village_id: string
  reaction_count: number
  villages: { id: string; name: string; icon: string } | null
}

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [recentPosts, setRecentPosts] = useState<VillagePost[]>([])
  const [postCount, setPostCount] = useState(0)
  const [myId, setMyId] = useState<string | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [toggling, setToggling] = useState(false)
  const [loading, setLoading] = useState(true)
  const [trustTier, setTrustTier] = useState<string | null>(null)
  const [isPremium, setIsPremium] = useState(false)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setMyId(user.id)
    })
  }, [])

  useEffect(() => {
    if (!userId) return
    async function load() {
      const supabase = createClient()
      const [{ data: p }, { data: posts }, { count: totalPosts }, { count: followers }, { count: following }, { data: trust }, { data: premSub }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('village_posts')
          .select('id, content, category, created_at, village_id, reaction_count, villages(id, name, icon)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase.from('village_posts').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
        supabase.from('user_trust').select('tier').eq('user_id', userId).maybeSingle(),
        supabase.from('premium_subscriptions').select('id').eq('user_id', userId).eq('status', 'active').gt('expires_at', new Date().toISOString()).maybeSingle(),
      ])
      setProfile(p)
      const normalized = (posts || []).map((post: any) => ({
        ...post,
        villages: Array.isArray(post.villages) ? post.villages[0] ?? null : post.villages,
      })) as VillagePost[]
      setRecentPosts(normalized)
      setPostCount(totalPosts ?? 0)
      setFollowerCount(followers ?? 0)
      setFollowingCount(following ?? 0)
      if (trust?.tier) setTrustTier(trust.tier)
      setIsPremium(!!premSub)
      setLoading(false)
    }
    load()
  }, [userId])

  useEffect(() => {
    if (!myId || !userId) return
    const supabase = createClient()
    supabase.from('user_follows').select('follower_id').eq('follower_id', myId).eq('following_id', userId).maybeSingle()
      .then(({ data }) => setIsFollowing(!!data))
  }, [myId, userId])

  async function toggleFollow() {
    if (!myId || toggling || myId === userId) return
    setToggling(true)
    const supabase = createClient()
    if (isFollowing) {
      await supabase.from('user_follows').delete().eq('follower_id', myId).eq('following_id', userId)
      setIsFollowing(false)
      setFollowerCount(c => Math.max(0, c - 1))
    } else {
      await supabase.from('user_follows').insert({ follower_id: myId, following_id: userId })
      setIsFollowing(true)
      setFollowerCount(c => c + 1)
    }
    setToggling(false)
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
            {trustTier && (
              <div className="mb-1">
                <TrustBadge tierId={trustTier} size="md" isPremium={isPremium} />
              </div>
            )}
            {/* 大カテゴリ表示（デフォルト）*/}
            {profile.occupation && (() => {
              const cat = getBigCategory(profile.occupation)
              return cat ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mb-1.5"
                  style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', color: '#4f46e5' }}>
                  {cat.emoji} {cat.label}
                </span>
              ) : null
            })()}
            {profile.bio && <p className="text-sm text-stone-600 leading-relaxed mt-1">{profile.bio}</p>}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mb-4">
          <div className="text-center">
            <p className="font-extrabold text-stone-900 text-lg">{postCount}</p>
            <p className="text-xs text-stone-400">投稿</p>
          </div>
          <div className="text-center">
            <p className="font-extrabold text-stone-900 text-lg">{followerCount}</p>
            <p className="text-xs text-stone-400">フォロワー</p>
          </div>
          <div className="text-center">
            <p className="font-extrabold text-stone-900 text-lg">{followingCount}</p>
            <p className="text-xs text-stone-400">フォロー中</p>
          </div>
        </div>

        {!isMe && (
          <button onClick={toggleFollow} disabled={toggling}
            className={`w-full py-2.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50 ${
              isFollowing
                ? 'bg-stone-100 text-stone-700 border border-stone-200'
                : 'bg-brand-500 text-white shadow-md shadow-brand-200'
            }`}>
            {toggling ? '...' : isFollowing ? '✓ この人から学んでいる' : 'この人から学ぶ'}
          </button>
        )}
        {isMe && (
          <button onClick={() => router.push('/mypage')}
            className="w-full py-2.5 rounded-2xl font-bold text-sm bg-stone-100 text-stone-700 border border-stone-200">
            Edit profile →
          </button>
        )}
      </div>

      {/* 最近の村投稿 */}
      <div className="px-4 pt-4 pb-28 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-extrabold text-stone-500 uppercase tracking-wider">最近の投稿</p>
          {postCount > 3 && (
            <span className="text-[10px] text-stone-400">{postCount}件中3件を表示</span>
          )}
        </div>

        {recentPosts.length === 0 ? (
          <div className="bg-white border border-stone-100 rounded-2xl p-8 text-center">
            <p className="text-3xl mb-2">✍️</p>
            <p className="text-sm font-bold text-stone-500">まだ投稿がありません</p>
          </div>
        ) : (
          recentPosts.map(post => {
            const occBadge = getOccupationBadge(profile?.occupation)
            return (
              <div key={post.id} className="bg-white border border-stone-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 pt-3.5 pb-2.5">
                  <p className="text-sm text-stone-800 leading-relaxed">{post.content}</p>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-stone-50">
                  {post.villages ? (
                    <Link href={`/villages/${post.village_id}`}
                      className="flex items-center gap-1.5 active:opacity-70 transition-opacity">
                      <span className="text-sm">{post.villages.icon}</span>
                      <span className="text-[11px] font-bold text-stone-500 truncate max-w-[160px]">
                        {post.villages.name}
                      </span>
                      <ChevronRight size={11} className="text-stone-300 flex-shrink-0" />
                    </Link>
                  ) : <span />}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-stone-400">{timeAgo(post.created_at)}</span>
                    {post.reaction_count > 0 && (
                      <div className="flex items-center gap-1 text-rose-400">
                        <Heart size={12} fill="#f43f5e" strokeWidth={0} />
                        <span className="text-[11px] font-bold">{post.reaction_count}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
