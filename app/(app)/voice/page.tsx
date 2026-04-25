'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getNationalityFlag, checkSupportedLocation } from '@/lib/utils'
import { Mic, Users, Plus, Radio } from 'lucide-react'
import Header from '@/components/layout/Header'

const CATEGORIES = ['雑談', '飲み', '相談', '作業', 'Language', 'Other']

const CAT_EMOJI: Record<string, string> = {
  '雑談': '💬', '飲み': '🍻', '相談': '🤝', '作業': '💻', 'Language': '🗣️', 'Other': '✨'
}

interface Room {
  id: string
  title: string
  category: string
  is_open: boolean
  status: string
  created_at: string
  host_id: string
  profiles: { display_name: string; nationality: string; avatar_url: string | null }
  voice_participants: { user_id: string; is_listener: boolean; profiles: { nationality: string } }[]
}

export default function VoicePage() {
  const router = useRouter()
  const [tab, setTab] = useState<'follow' | 'open'>('open')
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCat, setNewCat] = useState('雑談')
  const [newIsOpen, setNewIsOpen] = useState(true)
  const [creating, setCreating] = useState(false)
  const [locationStatus, setLocationStatus] = useState<'checking' | 'supported' | 'outside' | 'denied'>('checking')

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
    checkSupportedLocation().then(status => setLocationStatus(status))
  }, [])

  const fetchRooms = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('voice_rooms')
      .select('*, profiles(display_name, nationality, avatar_url), voice_participants(user_id, is_listener, profiles(nationality))')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    setRooms((data || []) as Room[])
    setLoading(false)
  }, [])

  const fetchFollowing = useCallback(async () => {
    if (!userId) return
    const supabase = createClient()
    const { data } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', userId)
    setFollowingIds(new Set((data || []).map((f: any) => f.following_id)))
  }, [userId])

  useEffect(() => { fetchRooms() }, [fetchRooms])
  useEffect(() => { fetchFollowing() }, [fetchFollowing])

  // Realtime: update participant counts
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel('voice_rooms_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voice_participants' }, fetchRooms)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voice_rooms' }, fetchRooms)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchRooms])

  async function handleCreate() {
    if (!userId || !newTitle.trim() || creating) return
    setCreating(true)
    const supabase = createClient()
    const { data } = await supabase.from('voice_rooms').insert({
      host_id: userId,
      title: newTitle.trim(),
      category: newCat,
      is_open: newIsOpen,
    }).select().single()
    if (data) {
      await supabase.from('voice_participants').insert({ room_id: data.id, user_id: userId })
      setShowCreate(false)
      setNewTitle('')
      router.push(`/voice/${data.id}`)
    }
    setCreating(false)
  }

  const displayed = rooms.filter(r =>
    tab === 'open' ? r.is_open : followingIds.has(r.host_id) || r.host_id === userId
  )

  // Location gate
  if (locationStatus === 'outside') {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9]">
        <Header title="Voice" />
        <div className="flex flex-col items-center justify-center min-h-[75vh] px-8 text-center">
          <div className="text-6xl mb-5">🇯🇵</div>
          <h2 className="font-extrabold text-stone-900 text-xl mb-3">Available in 9 countries</h2>
          <p className="text-sm text-stone-500 leading-relaxed mb-6">
            Voice rooms are exclusively for people physically in Japan.{'\n'}
            Come back when you're here! 🗾
          </p>
          <div className="bg-stone-50 border border-stone-100 rounded-2xl px-5 py-4 text-xs text-stone-400">
            📍 Your location is outside a supported country
          </div>
        </div>
      </div>
    )
  }

  if (locationStatus === 'denied') {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9]">
        <Header title="Voice" />
        <div className="flex flex-col items-center justify-center min-h-[75vh] px-8 text-center">
          <div className="text-6xl mb-5">📍</div>
          <h2 className="font-extrabold text-stone-900 text-xl mb-3">Location required</h2>
          <p className="text-sm text-stone-500 leading-relaxed mb-6">
            Voice rooms are only available in supported countries. Please enable location access to continue.
          </p>
          <button
            onClick={() => checkSupportedLocation().then(s => setLocationStatus(s))}
            className="px-6 py-3 bg-brand-500 text-white rounded-2xl text-sm font-bold shadow-md shadow-brand-200 active:scale-95 transition-all">
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9]">
      <Header title="Voice" />
      {locationStatus === 'checking' && (
        <div className="px-4 pt-3">
          <div className="bg-brand-50 border border-brand-100 rounded-2xl px-4 py-2.5 flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <span className="text-xs font-semibold text-brand-700">Checking your location…</span>
          </div>
        </div>
      )}

      {/* Follow / Open tabs */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex gap-1 bg-stone-100 rounded-xl p-1">
          <button onClick={() => setTab('follow')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              tab === 'follow' ? 'bg-white text-brand-600 shadow-sm' : 'text-stone-500'
            }`}>
            👥 Follow
          </button>
          <button onClick={() => setTab('open')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              tab === 'open' ? 'bg-white text-brand-600 shadow-sm' : 'text-stone-500'
            }`}>
            🌏 Open
          </button>
        </div>
      </div>

      {/* Room list */}
      <div className="px-4 pb-28 space-y-3 pt-2">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-stone-100 p-4 animate-pulse h-24" />
          ))
        ) : displayed.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🎙️</div>
            <p className="font-bold text-stone-700">
              {tab === 'follow' ? 'No rooms from people you follow' : 'No voice rooms right now'}
            </p>
            <p className="text-sm text-stone-400 mt-1.5 mb-5">Be the first to start a room!</p>
            <button onClick={() => setShowCreate(true)}
              className="px-5 py-2.5 bg-brand-500 text-white rounded-2xl text-sm font-bold shadow-sm">
              🎙️ Start a room
            </button>
          </div>
        ) : (
          displayed.map(room => {
            const speakers = room.voice_participants?.filter(p => !p.is_listener) || []
            const listeners = room.voice_participants?.filter(p => p.is_listener) || []
            const total = room.voice_participants?.length || 0
            const hostFlag = getNationalityFlag(room.profiles?.nationality || '')
            return (
              <div key={room.id}
                onClick={() => locationStatus === 'supported' && router.push(`/voice/${room.id}`)}
                className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm cursor-pointer active:scale-[0.99] transition-all hover:shadow-md">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{CAT_EMOJI[room.category] ?? '✨'}</span>
                    <div>
                      <p className="font-extrabold text-stone-900 text-sm leading-snug">{room.title}</p>
                      <p className="text-xs text-stone-400">{room.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-red-50 border border-red-100 px-2 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs font-bold text-red-600">LIVE</span>
                  </div>
                </div>

                {/* Speaker flags */}
                {speakers.length > 0 && (
                  <div className="flex items-center gap-1.5 mb-3">
                    <Mic size={12} className="text-stone-400" />
                    <div className="flex gap-1">
                      {speakers.slice(0, 6).map((p, i) => (
                        <span key={i} className="text-lg">
                          {getNationalityFlag((p as any).profiles?.nationality || '')}
                        </span>
                      ))}
                    </div>
                    {speakers.length > 6 && <span className="text-xs text-stone-400">+{speakers.length - 6}</span>}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{hostFlag}</span>
                    <span className="text-xs text-stone-500 font-medium">{room.profiles?.display_name}</span>
                    {!room.is_open && (
                      <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded-full font-semibold">Followers only</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {listeners.length > 0 && (
                      <span className="text-xs text-stone-400 flex items-center gap-1">
                        <Radio size={10} /> {listeners.length}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs font-semibold text-stone-600">
                      <Users size={12} /> {total}
                    </span>
                    <span className="text-xs font-bold px-3 py-1.5 bg-brand-500 text-white rounded-xl">
                      Join →
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Floating create button */}
      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-24 right-5 w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center shadow-xl shadow-brand-200 hover:bg-brand-600 active:scale-90 transition-all z-30">
        <Mic size={22} className="text-white" />
      </button>

      {/* Create Room Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl">
            <h3 className="font-extrabold text-stone-900 text-lg mb-4">🎙️ Start a voice room</h3>

            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Room title... e.g. Casual chat in English"
              className="w-full px-4 py-3 rounded-2xl border-2 border-stone-200 text-sm focus:outline-none focus:border-brand-400 mb-4"
              autoFocus
            />

            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Category</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setNewCat(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                    newCat === c ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-stone-200 text-stone-600'
                  }`}>
                  {CAT_EMOJI[c]} {c}
                </button>
              ))}
            </div>

            <div className="flex gap-2 mb-5">
              <button onClick={() => setNewIsOpen(true)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  newIsOpen ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-stone-200 text-stone-600'
                }`}>
                🌏 Open to all
              </button>
              <button onClick={() => setNewIsOpen(false)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  !newIsOpen ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-stone-200 text-stone-600'
                }`}>
                👥 Followers only
              </button>
            </div>

            <button onClick={handleCreate} disabled={!newTitle.trim() || creating}
              className="w-full py-4 bg-brand-500 text-white rounded-2xl font-extrabold text-base disabled:opacity-40 shadow-lg shadow-brand-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
              {creating
                ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Mic size={18} /> Start room</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
