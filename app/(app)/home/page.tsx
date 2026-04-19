'use client'

import { useState, useEffect, useCallback } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import Header from '@/components/layout/Header'
import UserCard from '@/components/features/UserCard'
import MatchModal from '@/components/features/MatchModal'
import ProfileCompletionBanner from '@/components/features/ProfileCompletionBanner'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { createClient } from '@/lib/supabase/client'
import { AREAS, NATIONALITIES, PURPOSES } from '@/lib/constants'
import type { Profile, Purpose } from '@/types'

interface MatchInfo {
  matchedProfile: Profile
  matchId: string
}

export default function HomePage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [showFilter, setShowFilter] = useState(false)
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null)
  const { toasts, addToast, removeToast } = useToast()

  const [filterArea, setFilterArea] = useState('')
  const [filterNationality, setFilterNationality] = useState('')
  const [filterPurpose, setFilterPurpose] = useState<Purpose | ''>('')

  const fetchProfiles = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: myProfile }, { data: blocksData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('blocks').select('blocked_id, blocker_id')
        .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`),
    ])
    setCurrentUser(myProfile)

    const blockedIds = new Set(
      (blocksData || []).flatMap(b => [b.blocked_id, b.blocker_id]).filter(id => id !== user.id)
    )

    let query = supabase.from('profiles').select('*')
      .eq('is_active', true).neq('id', user.id)
      .order('updated_at', { ascending: false }).limit(50)

    if (filterArea)        query = query.eq('area', filterArea)
    if (filterNationality) query = query.eq('nationality', filterNationality)
    if (filterPurpose)     query = query.contains('purposes', [filterPurpose])

    const { data } = await query
    setProfiles((data || []).filter(p => !blockedIds.has(p.id)))

    const { data: likesData } = await supabase.from('likes')
      .select('to_user_id').eq('from_user_id', user.id)
    setLikedIds(new Set((likesData || []).map(l => l.to_user_id)))
    setLoading(false)
  }, [filterArea, filterNationality, filterPurpose])

  useEffect(() => { fetchProfiles() }, [fetchProfiles])

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
    addToast({ type: 'info', title: 'Like sent! ❤️', message: 'If they like you back, it\'s a match!' })

    const { data: mutual } = await supabase.from('likes').select('id')
      .eq('from_user_id', toUserId).eq('to_user_id', currentUser.id).single()

    if (mutual) {
      const u1 = currentUser.id < toUserId ? currentUser.id : toUserId
      const u2 = currentUser.id < toUserId ? toUserId : currentUser.id
      const { data: newMatch } = await supabase.from('matches')
        .upsert({ user1_id: u1, user2_id: u2 }, { onConflict: 'user1_id,user2_id' })
        .select().single()

      const { data: matchedProfile } = await supabase
        .from('profiles').select('*').eq('id', toUserId).single()

      if (newMatch && matchedProfile) {
        setMatchInfo({ matchedProfile, matchId: newMatch.id })
      }
    }
  }

  const hasFilter = filterArea || filterNationality || filterPurpose

  return (
    <div className="max-w-md mx-auto">
      <Header
        title="Discover"
        right={
          <button
            onClick={() => setShowFilter(f => !f)}
            className={`p-1.5 rounded-xl transition ${
              hasFilter ? 'text-brand-500 bg-brand-50' : 'text-gray-400 hover:bg-gray-100'
            }`}
          >
            <SlidersHorizontal size={20} strokeWidth={hasFilter ? 2.5 : 1.8} />
          </button>
        }
      />

      {/* Filter Panel */}
      {showFilter && (
        <div className="bg-white border-b border-gray-100 px-4 py-4 space-y-3 animate-slide-down">
          <div className="grid grid-cols-1 gap-3">
            {[
              { label: 'Area', value: filterArea, set: setFilterArea,
                options: AREAS.map(a => ({ value: a, label: a })), placeholder: 'All Areas' },
              { label: 'Nationality', value: filterNationality, set: setFilterNationality,
                options: NATIONALITIES.map(n => ({ value: n.code, label: `${n.flag} ${n.name}` })), placeholder: 'All Nationalities' },
              { label: 'Looking for', value: filterPurpose, set: (v: string) => setFilterPurpose(v as Purpose | ''),
                options: PURPOSES.map(p => ({ value: p.value, label: `${p.icon} ${p.value}` })), placeholder: 'All Purposes' },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-xs font-semibold text-gray-500 mb-1">{f.label}</label>
                <select
                  value={f.value}
                  onChange={e => f.set(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
                >
                  <option value="">{f.placeholder}</option>
                  {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            ))}
          </div>
          {hasFilter && (
            <button
              onClick={() => { setFilterArea(''); setFilterNationality(''); setFilterPurpose('') }}
              className="text-xs text-red-400 hover:text-red-500 font-medium"
            >
              ✕ Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Profile Completion Banner (Ava's KPI #2) */}
      {currentUser && !loading && (
        <div className="pt-3">
          <ProfileCompletionBanner profile={currentUser} />
        </div>
      )}

      {/* User List */}
      <div className="px-4 py-3 space-y-3">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-3xl p-4 animate-pulse border border-gray-50">
              <div className="flex gap-3">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2.5 py-1">
                  <div className="h-4 bg-gray-200 rounded-lg w-2/3" />
                  <div className="h-3 bg-gray-200 rounded-lg w-1/3" />
                  <div className="flex gap-1.5">
                    <div className="h-5 bg-gray-100 rounded-full w-16" />
                    <div className="h-5 bg-gray-100 rounded-full w-20" />
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : profiles.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🔍</span>
            </div>
            <p className="font-bold text-gray-700 text-lg">No one found</p>
            <p className="text-sm text-gray-400 mt-1.5 leading-relaxed">
              {hasFilter
                ? 'Try changing your filters.'
                : 'Be the first in your area! More people join every day.'}
            </p>
            {hasFilter && (
              <button
                onClick={() => { setFilterArea(''); setFilterNationality(''); setFilterPurpose('') }}
                className="mt-4 text-sm text-brand-500 font-semibold hover:text-brand-600"
              >
                Clear filters →
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 font-medium px-1">
              {profiles.length} people nearby{hasFilter ? ' (filtered)' : ''}
            </p>
            {profiles.map(p => (
              <UserCard
                key={p.id}
                profile={p}
                onLike={handleLike}
                liked={likedIds.has(p.id)}
              />
            ))}
          </>
        )}
      </div>

      {/* Match Modal */}
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
