'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/layout/Header'
import type { NowSession } from '@/types'

const NOW_ACTIVITIES = [
  { value: 'cafe',        label: 'Cafe',           emoji: '☕' },
  { value: 'drinks',      label: 'Drinks',         emoji: '🍺' },
  { value: 'food',        label: 'Food',           emoji: '🍜' },
  { value: 'sightseeing', label: 'Sightseeing',    emoji: '🗼' },
  { value: 'language',    label: 'Lang Exchange',  emoji: '💬' },
  { value: 'karaoke',     label: 'Karaoke',        emoji: '🎤' },
  { value: 'nightlife',   label: 'Nightlife',      emoji: '🌙' },
  { value: 'shopping',    label: 'Shopping',       emoji: '🛍️' },
]

const DURATIONS = [
  { value: 1, label: '1h' },
  { value: 2, label: '2h' },
  { value: 3, label: '3h' },
  { value: 4, label: '4h' },
]

function activityInfo(value: string) {
  return NOW_ACTIVITIES.find(a => a.value === value)
}

function timeLeft(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'Expired'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`
}

export default function NowPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [userArea, setUserArea] = useState('Tokyo')
  const [sessions, setSessions] = useState<NowSession[]>([])
  const [mySession, setMySession] = useState<NowSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPicker, setShowPicker] = useState(false)

  // Picker state
  const [selectedActivity, setSelectedActivity] = useState('')
  const [selectedDuration, setSelectedDuration] = useState(2)
  const [message, setMessage] = useState('')
  const [posting, setPosting] = useState(false)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('profiles').select('id, area').eq('id', user.id).single()

    const area = profile?.area || 'Tokyo'
    setUserId(user.id)
    setUserArea(area)

    const now = new Date().toISOString()

    const [{ data: others }, { data: mine }] = await Promise.all([
      supabase
        .from('now_sessions')
        .select('*, profiles(*)')
        .eq('area', area)
        .gt('expires_at', now)
        .neq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('now_sessions')
        .select('*, profiles(*)')
        .eq('user_id', user.id)
        .gt('expires_at', now)
        .maybeSingle(),
    ])

    setSessions(others || [])
    setMySession(mine || null)
    setLoading(false)
  }, [router])

  useEffect(() => {
    load()

    const supabase = createClient()
    const channel = supabase
      .channel('now_feed')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'now_sessions',
      }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [load])

  async function goLive() {
    if (!userId || !selectedActivity) return
    setPosting(true)
    const supabase = createClient()
    const expiresAt = new Date(Date.now() + selectedDuration * 3600000).toISOString()

    await supabase.from('now_sessions').delete().eq('user_id', userId)

    const { data } = await supabase
      .from('now_sessions')
      .insert({ user_id: userId, activity: selectedActivity, area: userArea, message: message.trim() || null, expires_at: expiresAt })
      .select('*, profiles(*)')
      .single()

    setMySession(data)
    setShowPicker(false)
    setPosting(false)
    setSelectedActivity('')
    setMessage('')
    load()
  }

  async function endSession() {
    if (!userId) return
    const supabase = createClient()
    await supabase.from('now_sessions').delete().eq('user_id', userId)
    setMySession(null)
    load()
  }

  async function joinSession(session: NowSession) {
    if (!userId) return
    const supabase = createClient()

    const u1 = userId < session.user_id ? userId : session.user_id
    const u2 = userId < session.user_id ? session.user_id : userId
    const { data: match } = await supabase
      .from('matches')
      .upsert({ user1_id: u1, user2_id: u2 }, { onConflict: 'user1_id,user2_id' })
      .select()
      .single()

    if (match) {
      const act = activityInfo(session.activity)
      await supabase.from('messages').insert({
        match_id: match.id,
        sender_id: userId,
        content: `Hey! I saw you're up for ${act?.emoji} ${act?.label}. Want to meet up? 🙌`,
      })
      router.push(`/chat/${match.id}`)
    }
  }

  if (loading) return (
    <div className="max-w-md mx-auto">
      <Header title="NOW" />
      <div className="flex justify-center py-20">
        <span className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )

  return (
    <div className="max-w-md mx-auto pb-28">
      <Header title="NOW" />

      {/* My active session banner */}
      {mySession && (
        <div className="mx-4 mt-4 bg-brand-500 rounded-3xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-xs font-bold opacity-80 tracking-widest uppercase">You're Live</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{activityInfo(mySession.activity)?.emoji}</span>
            <span className="font-black text-lg">{activityInfo(mySession.activity)?.label}</span>
          </div>
          {mySession.message && (
            <p className="text-sm opacity-80 mb-2">"{mySession.message}"</p>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs opacity-70">{timeLeft(mySession.expires_at)}</span>
            <button
              onClick={endSession}
              className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full font-semibold transition"
            >
              End session
            </button>
          </div>
        </div>
      )}

      {/* Live feed */}
      <div className="px-4 mt-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-bold text-gray-700">
            {sessions.length > 0
              ? `${sessions.length} ${sessions.length === 1 ? 'person' : 'people'} active in ${userArea}`
              : `Nobody active in ${userArea} right now`}
          </span>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-14">
            <div className="text-5xl mb-3">👀</div>
            <p className="font-bold text-gray-700 text-lg">Be the first!</p>
            <p className="text-sm text-gray-400 mt-1 max-w-[220px] mx-auto leading-relaxed">
              Post what you want to do and meet someone in {userArea} today
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(s => (
              <div key={s.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center text-xl font-black text-brand-600 shrink-0">
                    {s.profiles?.display_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-gray-900 text-sm">{s.profiles?.display_name}</span>
                      {s.profiles?.age && <span className="text-gray-400 text-xs">{s.profiles.age}</span>}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-lg">{activityInfo(s.activity)?.emoji}</span>
                      <span className="text-sm font-semibold text-brand-600">{activityInfo(s.activity)?.label}</span>
                    </div>
                    {s.message && (
                      <p className="text-xs text-gray-500 mt-1 italic">"{s.message}"</p>
                    )}
                    <p className="text-[11px] text-gray-400 mt-1">{timeLeft(s.expires_at)}</p>
                  </div>
                  <button
                    onClick={() => joinSession(s)}
                    className="shrink-0 px-3 py-2 bg-brand-500 text-white rounded-xl text-xs font-bold shadow-sm shadow-brand-200 active:scale-95 transition-all"
                  >
                    Join →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Go Live FAB */}
      {!mySession && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[398px] z-30">
          <button
            onClick={() => setShowPicker(true)}
            className="w-full py-4 bg-brand-500 text-white rounded-2xl font-black text-base shadow-lg shadow-brand-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            I'm free NOW!
          </button>
        </div>
      )}

      {/* Activity picker bottom sheet */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowPicker(false)} />
          <div
            className="relative bg-white rounded-t-3xl w-full max-w-[430px] p-5 pb-10"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h2 className="text-lg font-black text-gray-900 mb-4">What do you want to do?</h2>

            <div className="grid grid-cols-4 gap-2 mb-5">
              {NOW_ACTIVITIES.map(a => (
                <button
                  key={a.value}
                  onClick={() => setSelectedActivity(a.value)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-2xl border-2 transition-all ${
                    selectedActivity === a.value
                      ? 'bg-brand-50 border-brand-400'
                      : 'bg-white border-gray-100 hover:border-brand-200'
                  }`}
                >
                  <span className="text-2xl">{a.emoji}</span>
                  <span className="text-[10px] font-semibold text-gray-600 leading-tight text-center">{a.label}</span>
                </button>
              ))}
            </div>

            <p className="text-sm font-bold text-gray-700 mb-2">Available for:</p>
            <div className="flex gap-2 mb-4">
              {DURATIONS.map(d => (
                <button
                  key={d.value}
                  onClick={() => setSelectedDuration(d.value)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                    selectedDuration === d.value
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <input
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder='Optional: "At Starbucks Shibuya 🎯"'
              maxLength={60}
              className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 text-sm focus:outline-none focus:border-brand-400 transition mb-4"
            />

            <button
              onClick={goLive}
              disabled={!selectedActivity || posting}
              className="w-full py-4 bg-brand-500 text-white rounded-2xl font-black text-base disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md shadow-brand-200"
            >
              {posting
                ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><span className="w-2 h-2 bg-white rounded-full animate-pulse" />Go LIVE!</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
