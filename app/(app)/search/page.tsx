'use client'

import { useState, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import Header from '@/components/layout/Header'
import UserCard from '@/components/features/UserCard'
import MatchModal from '@/components/features/MatchModal'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { createClient } from '@/lib/supabase/client'
import { AREAS, NATIONALITIES, LANGUAGES, PURPOSES } from '@/lib/constants'
import type { Profile, Purpose } from '@/types'

const AGE_RANGES = [
  { label: 'All Ages', min: 18, max: 99 },
  { label: '18 – 24', min: 18, max: 24 },
  { label: '25 – 34', min: 25, max: 34 },
  { label: '35 – 44', min: 35, max: 44 },
  { label: '45+',     min: 45, max: 99 },
]

export default function SearchPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [matchInfo, setMatchInfo] = useState<{ matchedProfile: Profile; matchId: string } | null>(null)
  const { toasts, addToast, removeToast } = useToast()

  const [area, setArea] = useState('')
  const [nationality, setNationality] = useState('')
  const [purpose, setPurpose] = useState<Purpose | ''>('')
  const [language, setLanguage] = useState('')
  const [ageRange, setAgeRange] = useState(0)
  const [keyword, setKeyword] = useState('')

  const handleSearch = useCallback(async () => {
    setLoading(true)
    setSearched(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: myProfile }, { data: blocksData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('blocks').select('blocked_id,blocker_id')
        .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`),
    ])
    setCurrentUser(myProfile)

    const blockedIds = new Set(
      (blocksData || []).flatMap(b => [b.blocked_id, b.blocker_id]).filter(id => id !== user.id)
    )

    const selectedAge = AGE_RANGES[ageRange]
    let query = supabase.from('profiles').select('*')
      .eq('is_active', true).neq('id', user.id)
      .gte('age', selectedAge.min).lte('age', selectedAge.max)
      .order('updated_at', { ascending: false }).limit(60)

    if (area)        query = query.eq('area', area)
    if (nationality) query = query.eq('nationality', nationality)
    if (purpose)     query = query.contains('purposes', [purpose])
    if (language)    query = query.contains('spoken_languages', [language])

    const { data } = await query
    let results = (data || []).filter(p => !blockedIds.has(p.id))

    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase()
      results = results.filter(p =>
        p.display_name.toLowerCase().includes(kw) ||
        (p.bio || '').toLowerCase().includes(kw)
      )
    }

    setProfiles(results)

    const { data: likesData } = await supabase.from('likes')
      .select('to_user_id').eq('from_user_id', user.id)
    setLikedIds(new Set((likesData || []).map(l => l.to_user_id)))
    setLoading(false)
  }, [area, nationality, purpose, language, ageRange, keyword])

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

  const hasFilter = area || nationality || purpose || language || ageRange > 0 || keyword.trim()

  function clearAll() {
    setArea(''); setNationality(''); setPurpose(''); setLanguage(''); setAgeRange(0); setKeyword('')
  }

  return (
    <div className="max-w-md mx-auto">
      <Header title="Search" />

      <div className="px-4 py-4 space-y-3">
        {/* Keyword search */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="Search by name or bio..."
            className="w-full pl-9 pr-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          {keyword && (
            <button onClick={() => setKeyword('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Area</label>
            <select value={area} onChange={e => setArea(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
              <option value="">All Areas</option>
              {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Nationality</label>
            <select value={nationality} onChange={e => setNationality(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
              <option value="">All</option>
              {NATIONALITIES.map(n => <option key={n.code} value={n.code}>{n.flag} {n.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Purpose</label>
            <select value={purpose} onChange={e => setPurpose(e.target.value as Purpose | '')}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
              <option value="">All</option>
              {PURPOSES.map(p => <option key={p.value} value={p.value}>{p.icon} {p.value}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Language</label>
            <select value={language} onChange={e => setLanguage(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
              <option value="">All</option>
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        {/* Age range */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Age Range</label>
          <div className="flex gap-1.5 flex-wrap">
            {AGE_RANGES.map((r, i) => (
              <button key={r.label} onClick={() => setAgeRange(i)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                  ageRange === i ? 'bg-brand-500 text-white border-brand-500' : 'border-gray-200 text-gray-600 hover:border-brand-300'
                }`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action row */}
        <div className="flex gap-2">
          {hasFilter && (
            <button onClick={clearAll}
              className="px-4 py-3 rounded-2xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition">
              Clear
            </button>
          )}
          <button onClick={handleSearch} disabled={loading}
            className="flex-1 py-3 bg-brand-500 text-white rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-brand-600 transition disabled:opacity-50 shadow-sm shadow-brand-200">
            {loading
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Searching...</>
              : <><Search size={16} />Search</>
            }
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="px-4 pb-6 space-y-3">
        {!searched ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Search size={28} className="text-brand-300" />
            </div>
            <p className="text-gray-500 text-sm">Set your filters and tap Search</p>
          </div>
        ) : loading ? null : profiles.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-4xl mb-2">🤷</div>
            <p className="font-semibold text-gray-700">No results found</p>
            <p className="text-sm text-gray-400 mt-1">Try different filters</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 font-medium px-1">{profiles.length} result{profiles.length !== 1 ? 's' : ''}</p>
            {profiles.map(p => (
              <UserCard key={p.id} profile={p} onLike={handleLike} liked={likedIds.has(p.id)} />
            ))}
          </>
        )}
      </div>

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
