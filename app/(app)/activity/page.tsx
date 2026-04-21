'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/layout/Header'
import { createClient } from '@/lib/supabase/client'
import { getNationalityFlag } from '@/lib/utils'
import { AREAS } from '@/lib/constants'
import type { HelpRequest } from '@/types'

const ACTIVITY_CATEGORIES = [
  { value: 'Drinks',      emoji: '🍻' },
  { value: 'Sightseeing', emoji: '🗺️' },
  { value: 'Culture',     emoji: '🎌' },
  { value: 'Food',        emoji: '🍜' },
  { value: 'Sports',      emoji: '⚽' },
  { value: 'Music',       emoji: '🎵' },
  { value: 'Hiking',      emoji: '🏔️' },
  { value: 'Other',       emoji: '✨' },
]

export default function ActivityPage() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentArea, setCurrentArea] = useState('')
  const [activities, setActivities] = useState<HelpRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [category, setCategory] = useState('')
  const [message, setMessage] = useState('')
  const [area, setArea] = useState('')
  const [posting, setPosting] = useState(false)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [filterCat, setFilterCat] = useState('')

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)
      const { data } = await supabase.from('profiles').select('area').eq('id', user.id).single()
      if (data?.area) { setCurrentArea(data.area); setArea(data.area) }
    }
    init()
  }, [])

  const fetchActivities = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    let query = supabase
      .from('help_requests')
      .select('*, profiles(display_name, nationality, avatar_url, arrival_stage)')
      .eq('status', 'open')
      .eq('request_type', 'activity')
      .order('created_at', { ascending: false })
      .limit(50)
    if (filterCat) query = query.eq('category', filterCat)
    const { data } = await query
    setActivities(data || [])
    setLoading(false)
  }, [filterCat])

  useEffect(() => { fetchActivities() }, [fetchActivities])

  async function handlePost() {
    if (!currentUserId || !category || !message.trim()) return
    setPosting(true)
    const supabase = createClient()
    await supabase.from('help_requests').insert({
      user_id: currentUserId,
      category,
      message: message.trim(),
      area: area || currentArea,
      is_urgent: false,
      request_type: 'activity',
    })
    setMessage(''); setCategory('')
    setShowForm(false)
    setPosting(false)
    await fetchActivities()
  }

  async function handleJoin(act: HelpRequest) {
    if (!currentUserId || currentUserId === act.user_id) return
    setJoiningId(act.id)
    const supabase = createClient()
    await supabase.from('likes').upsert({ from_user_id: currentUserId, to_user_id: act.user_id })
    setJoiningId(null)
  }

  async function handleClose(id: string) {
    const supabase = createClient()
    await supabase.from('help_requests').update({ status: 'resolved' }).eq('id', id)
    setActivities(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9]">
      <Header title="Activity" />

      {/* Category filter pills */}
      <div className="px-4 pt-3 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setFilterCat('')}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
            !filterCat ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-stone-200 text-stone-600'
          }`}
        >
          All
        </button>
        {ACTIVITY_CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setFilterCat(f => f === c.value ? '' : c.value)}
            className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
              filterCat === c.value ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-stone-200 text-stone-600'
            }`}
          >
            {c.emoji} {c.value}
          </button>
        ))}
      </div>

      <div className="px-4 pb-6 space-y-3 pt-2">
        {/* Post form */}
        {showForm ? (
          <div className="bg-white border border-brand-100 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-bold text-sm text-stone-800">🎯 Plan an activity</p>
              <button onClick={() => setShowForm(false)} className="text-xs text-stone-400">Cancel</button>
            </div>
            <div>
              <p className="text-xs text-stone-500 mb-1.5">What do you want to do?</p>
              <div className="grid grid-cols-4 gap-1.5">
                {ACTIVITY_CATEGORIES.map(c => (
                  <button key={c.value} onClick={() => setCategory(c.value)}
                    className={`flex flex-col items-center gap-0.5 py-2 rounded-xl border text-xs transition ${
                      category === c.value ? 'bg-brand-500 text-white border-brand-500' : 'border-stone-200 text-stone-600'
                    }`}>
                    <span>{c.emoji}</span>
                    <span className="text-[10px]">{c.value}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-stone-500 mb-1.5">Area</p>
              <select value={area} onChange={e => setArea(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
                <option value="">Select area...</option>
                {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs text-stone-500 mb-1.5">Tell people what you have in mind</p>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value.slice(0, 200))}
                placeholder="e.g. Looking for people to grab drinks in Shibuya this Friday. Casual vibes, all nationalities welcome!"
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              <p className="text-xs text-stone-400 text-right">{message.length}/200</p>
            </div>
            <button onClick={handlePost}
              disabled={!category || !message.trim() || posting}
              className="w-full h-12 rounded-2xl bg-brand-500 text-white text-sm font-bold disabled:opacity-50 active:scale-[0.98] transition-all">
              {posting ? 'Posting...' : '🎯 Post Activity'}
            </button>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)}
            className="w-full h-12 bg-brand-500 text-white rounded-2xl font-bold text-sm shadow-sm shadow-brand-200 active:scale-[0.98] transition-all">
            🎯 Plan an activity
          </button>
        )}

        {/* Feed */}
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-stone-100 p-4 animate-pulse">
              <div className="h-3 bg-stone-200 rounded w-1/3 mb-2" />
              <div className="h-4 bg-stone-200 rounded w-2/3 mb-2" />
              <div className="h-3 bg-stone-200 rounded w-1/2" />
            </div>
          ))
        ) : activities.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🎯</div>
            <p className="font-bold text-stone-700 text-lg">No activities yet</p>
            <p className="text-sm text-stone-400 mt-1.5">Be the first to plan something!</p>
          </div>
        ) : (
          activities.map(act => {
            const isOwn = act.user_id === currentUserId
            const catInfo = ACTIVITY_CATEGORIES.find(c => c.value === act.category)
            const flag = act.profiles ? getNationalityFlag(act.profiles.nationality || '') : ''
            return (
              <div key={act.id} className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{catInfo?.emoji ?? '🎯'}</span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                    {act.category}
                  </span>
                  {act.area && <span className="text-xs text-stone-400">{act.area}</span>}
                  {isOwn && <span className="ml-auto text-[10px] text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">Yours</span>}
                </div>
                <p className="text-sm text-stone-700 leading-relaxed mb-3">{act.message}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{flag}</span>
                    <span className="text-xs text-stone-500 font-medium">{act.profiles?.display_name}</span>
                    <span className="text-xs text-stone-300">·</span>
                    <span className="text-xs text-stone-400">
                      {new Date(act.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  {isOwn ? (
                    <button onClick={() => handleClose(act.id)}
                      className="text-xs text-stone-400 font-semibold hover:text-stone-600">
                      ✓ Close
                    </button>
                  ) : (
                    <button onClick={() => handleJoin(act)}
                      disabled={joiningId === act.id}
                      className="flex items-center gap-1 text-xs bg-brand-500 text-white px-3 py-1.5 rounded-xl font-bold hover:bg-brand-600 disabled:opacity-50 transition active:scale-95">
                      {joiningId === act.id ? '...' : '🙋 I\'m in!'}
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
