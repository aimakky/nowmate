'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Crown, Lock } from 'lucide-react'
import Header from '@/components/layout/Header'
import UserCard from '@/components/features/UserCard'
import MatchModal from '@/components/features/MatchModal'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { createClient } from '@/lib/supabase/client'
import { getIsPremium } from '@/lib/premium'
import type { Profile } from '@/types'

export default function LikesMePage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [isPremium, setIsPremium] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [matchInfo, setMatchInfo] = useState<{ matchedProfile: Profile; matchId: string } | null>(null)
  const { toasts, addToast, removeToast } = useToast()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [premium, { data: myProfile }] = await Promise.all([
        getIsPremium(user.id),
        supabase.from('profiles').select('*').eq('id', user.id).single(),
      ])

      setIsPremium(premium)
      setCurrentUser(myProfile)

      if (!premium) { setLoading(false); return }

      const { data: likesData } = await supabase
        .from('likes')
        .select('from_user_id')
        .eq('to_user_id', user.id)

      const likerIds = (likesData || []).map(l => l.from_user_id)

      if (likerIds.length === 0) { setLoading(false); return }

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', likerIds)
        .eq('is_active', true)

      const { data: myLikes } = await supabase
        .from('likes').select('to_user_id').eq('from_user_id', user.id)

      setProfiles(profilesData || [])
      setLikedIds(new Set((myLikes || []).map(l => l.to_user_id)))
      setLoading(false)
    }
    load()
  }, [])

  async function handleLike(toUserId: string) {
    if (!currentUser) return
    const supabase = createClient()

    if (likedIds.has(toUserId)) {
      await supabase.from('likes').delete()
        .eq('from_user_id', currentUser.id).eq('to_user_id', toUserId)
      setLikedIds(prev => { const s = new Set(prev); s.delete(toUserId); return s })
      return
    }

    await supabase.from('likes').insert({ from_user_id: currentUser.id, to_user_id: toUserId })
    setLikedIds(prev => new Set([...prev, toUserId]))
    addToast({ type: 'info', title: 'Like sent! ❤️' })

    const { data: mutual } = await supabase.from('likes').select('id')
      .eq('from_user_id', toUserId).eq('to_user_id', currentUser.id).single()

    if (mutual) {
      const u1 = currentUser.id < toUserId ? currentUser.id : toUserId
      const u2 = currentUser.id < toUserId ? toUserId : currentUser.id
      const { data: newMatch } = await supabase.from('matches')
        .upsert({ user1_id: u1, user2_id: u2 }, { onConflict: 'user1_id,user2_id' })
        .select().single()
      const { data: matchedProfile } = await supabase.from('profiles').select('*').eq('id', toUserId).single()
      if (newMatch && matchedProfile) setMatchInfo({ matchedProfile, matchId: newMatch.id })
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <Header title="Liked You" />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !isPremium ? (
        <div className="px-5 py-12 text-center">
          <div className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <Lock size={36} className="text-amber-400" />
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-2">Premium Feature</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            See everyone who already liked you.<br />Match instantly — no guessing.
          </p>
          <Link href="/upgrade"
            className="inline-flex items-center gap-2 px-8 py-4 bg-amber-500 text-white rounded-2xl font-bold text-sm shadow-md shadow-amber-200 active:scale-95 transition-all">
            <Crown size={16} />
            Unlock for ¥980/month
          </Link>
          <p className="text-xs text-gray-400 mt-3">Cancel anytime</p>
        </div>
      ) : profiles.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <div className="text-5xl mb-4">👀</div>
          <p className="font-semibold text-gray-700">No likes yet</p>
          <p className="text-sm text-gray-400 mt-1">Complete your profile and start searching</p>
          <Link href="/search" className="inline-block mt-4 px-6 py-3 bg-brand-500 text-white rounded-2xl font-bold text-sm">
            Go to Search →
          </Link>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-3">
          <p className="text-xs text-gray-400 font-medium px-1">
            {profiles.length} person{profiles.length !== 1 ? 's' : ''} liked you
          </p>
          {profiles.map(p => (
            <UserCard key={p.id} profile={p} onLike={handleLike} liked={likedIds.has(p.id)} />
          ))}
        </div>
      )}

      {matchInfo && currentUser && (
        <MatchModal
          myProfile={currentUser}
          matchedProfile={matchInfo.matchedProfile}
          matchId={matchInfo.matchId}
          onClose={() => setMatchInfo(null)}
        />
      )}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
