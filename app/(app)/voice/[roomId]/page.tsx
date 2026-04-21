'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getNationalityFlag } from '@/lib/utils'
import { ArrowLeft, Mic, MicOff, Radio, LogOut, Users } from 'lucide-react'

const CAT_EMOJI: Record<string, string> = {
  '雑談': '💬', '飲み': '🍻', '相談': '🤝', '作業': '💻', 'Language': '🗣️', 'Other': '✨'
}

interface Participant {
  user_id: string
  is_listener: boolean
  profiles: { display_name: string; nationality: string; avatar_url: string | null }
}

export default function VoiceRoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const router = useRouter()
  const [room, setRoom] = useState<any>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isListener, setIsListener] = useState(false)
  const [joined, setJoined] = useState(false)
  const [joining, setJoining] = useState(false)
  const [micError, setMicError] = useState(false)

  // WebRTC refs
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map())
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())
  const channelRef = useRef<any>(null)

  const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  // Fetch room info
  useEffect(() => {
    if (!roomId) return
    const supabase = createClient()
    supabase.from('voice_rooms')
      .select('*, profiles(display_name, nationality)')
      .eq('id', roomId).single()
      .then(({ data }) => setRoom(data))
  }, [roomId])

  // Fetch & subscribe to participants
  const fetchParticipants = useCallback(async () => {
    if (!roomId) return
    const supabase = createClient()
    const { data } = await supabase
      .from('voice_participants')
      .select('user_id, is_listener, profiles(display_name, nationality, avatar_url)')
      .eq('room_id', roomId)
    setParticipants((data || []) as Participant[])
  }, [roomId])

  useEffect(() => {
    fetchParticipants()
    const supabase = createClient()
    const ch = supabase.channel(`vp_${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voice_participants', filter: `room_id=eq.${roomId}` }, fetchParticipants)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [roomId, fetchParticipants])

  // ─── WebRTC helpers ───────────────────────────────────────
  function createPC(remoteUserId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    peerConnections.current.set(remoteUserId, pc)

    // Add local tracks
    localStreamRef.current?.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!))

    // Remote audio
    pc.ontrack = (e) => {
      const audio = new Audio()
      audio.srcObject = e.streams[0]
      audio.autoplay = true
      audioRefs.current.set(remoteUserId, audio)
    }

    // ICE candidates → broadcast
    pc.onicecandidate = (e) => {
      if (e.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast', event: 'ice',
          payload: { to: remoteUserId, from: userId, candidate: e.candidate }
        })
      }
    }

    return pc
  }

  async function joinRoom(asListener: boolean) {
    if (!userId || !roomId || joining) return
    setJoining(true)
    setIsListener(asListener)

    const supabase = createClient()

    // Get microphone (skip if listener)
    if (!asListener) {
      try {
        localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      } catch {
        setMicError(true)
        setIsListener(true) // fallback to listener
      }
    }

    // Register presence in DB
    await supabase.from('voice_participants').upsert({
      room_id: roomId, user_id: userId, is_listener: asListener || micError
    })

    // Setup signaling channel
    const ch = supabase.channel(`voice:${roomId}`)
    channelRef.current = ch

    ch
      .on('broadcast', { event: 'offer' }, async ({ payload }: any) => {
        if (payload.to !== userId) return
        const pc = createPC(payload.from)
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        ch.send({ type: 'broadcast', event: 'answer', payload: { to: payload.from, from: userId, sdp: answer } })
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }: any) => {
        if (payload.to !== userId) return
        const pc = peerConnections.current.get(payload.from)
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
      })
      .on('broadcast', { event: 'ice' }, async ({ payload }: any) => {
        if (payload.to !== userId) return
        const pc = peerConnections.current.get(payload.from)
        if (pc && payload.candidate) await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
      })
      .subscribe(async (status) => {
        if (status !== 'SUBSCRIBED') return

        // Send offers to existing participants (except self)
        const { data: existing } = await supabase
          .from('voice_participants')
          .select('user_id')
          .eq('room_id', roomId)
          .neq('user_id', userId)

        for (const p of existing || []) {
          const pc = createPC(p.user_id)
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          ch.send({ type: 'broadcast', event: 'offer', payload: { to: p.user_id, from: userId, sdp: offer } })
        }
      })

    setJoined(true)
    setJoining(false)
  }

  async function leaveRoom() {
    if (!userId || !roomId) return

    // Close all peer connections
    peerConnections.current.forEach(pc => pc.close())
    peerConnections.current.clear()

    // Stop local tracks
    localStreamRef.current?.getTracks().forEach(t => t.stop())

    // Stop audio elements
    audioRefs.current.forEach(a => { a.pause(); a.srcObject = null })
    audioRefs.current.clear()

    // Unsubscribe
    if (channelRef.current) {
      createClient().removeChannel(channelRef.current)
    }

    // Remove from DB
    const supabase = createClient()
    await supabase.from('voice_participants').delete()
      .eq('room_id', roomId).eq('user_id', userId)

    // Close room if host
    if (room?.host_id === userId) {
      await supabase.from('voice_rooms').update({ status: 'closed' }).eq('id', roomId)
    }

    router.push('/voice')
  }

  function toggleMute() {
    localStreamRef.current?.getAudioTracks().forEach(t => {
      t.enabled = isMuted
    })
    setIsMuted(m => !m)
  }

  // ─────────────────────────────────────────────────────────

  if (!room) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9]">
      <span className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const speakers = participants.filter(p => !p.is_listener)
  const listeners = participants.filter(p => p.is_listener)
  const isHost = room.host_id === userId
  const myParticipant = participants.find(p => p.user_id === userId)

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-stone-100 px-4 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1 text-stone-500">
            <ArrowLeft size={20} />
          </button>
          <span className="text-xl">{CAT_EMOJI[room.category] ?? '✨'}</span>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-stone-900 text-sm truncate">{room.title}</p>
            <p className="text-xs text-stone-400">{room.category} · {getNationalityFlag(room.profiles?.nationality || '')} {room.profiles?.display_name}</p>
          </div>
          <div className="flex items-center gap-1 bg-red-50 border border-red-100 px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-red-600">LIVE</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto px-4 py-5">

        {/* Mic error */}
        {micError && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4 text-xs text-amber-700 font-medium">
            ⚠️ Mic access denied — joined as listener
          </div>
        )}

        {/* Speakers section */}
        <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Mic size={12} /> Speaking ({speakers.length})
        </p>
        <div className="grid grid-cols-4 gap-3 mb-6">
          {speakers.map(p => (
            <div key={p.user_id} className="flex flex-col items-center gap-1.5">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl relative ${
                p.user_id === userId && !isMuted ? 'bg-brand-100 ring-2 ring-brand-400' : 'bg-stone-100'
              }`}>
                {getNationalityFlag(p.profiles?.nationality || '')}
                {p.user_id === userId && isMuted && (
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <MicOff size={10} className="text-white" />
                  </span>
                )}
                {p.user_id === room.host_id && (
                  <span className="absolute -top-1 -right-1 text-xs">👑</span>
                )}
              </div>
              <p className="text-[10px] text-stone-600 font-semibold text-center truncate w-full px-1">
                {p.profiles?.display_name?.split(' ')[0]}
              </p>
            </div>
          ))}

          {/* Empty speaker slot */}
          {!joined && speakers.length < 8 && (
            <div className="flex flex-col items-center gap-1.5 opacity-30">
              <div className="w-16 h-16 rounded-2xl bg-stone-100 border-2 border-dashed border-stone-300 flex items-center justify-center">
                <Plus size={20} className="text-stone-400" />
              </div>
              <p className="text-[10px] text-stone-400">You?</p>
            </div>
          )}
        </div>

        {/* Listeners section */}
        {listeners.length > 0 && (
          <>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Radio size={12} /> Listening ({listeners.length})
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              {listeners.map(p => (
                <div key={p.user_id} className="flex items-center gap-1.5 bg-white border border-stone-100 rounded-xl px-2.5 py-1.5">
                  <span className="text-sm">{getNationalityFlag(p.profiles?.nationality || '')}</span>
                  <span className="text-xs text-stone-600 font-medium">{p.profiles?.display_name?.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Chat-style instructions */}
        {!joined && (
          <div className="bg-white border border-stone-100 rounded-2xl p-5 text-center mt-4">
            <p className="text-2xl mb-2">🎙️</p>
            <p className="font-bold text-stone-800 text-sm mb-1">{participants.length} people in this room</p>
            <p className="text-xs text-stone-400 mb-4">Join to talk or listen in</p>
            <div className="flex gap-2">
              <button onClick={() => joinRoom(false)} disabled={joining}
                className="flex-1 py-3 bg-brand-500 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95 transition-all shadow-md shadow-brand-200">
                {joining ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><Mic size={15} /> Join & Talk</>}
              </button>
              <button onClick={() => joinRoom(true)} disabled={joining}
                className="flex-1 py-3 bg-stone-100 text-stone-700 rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95 transition-all">
                <Radio size={15} /> Listen only
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls (when joined) */}
      {joined && (
        <div className="bg-white border-t border-stone-100 px-4 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Users size={14} className="text-stone-400" />
              <span className="text-xs text-stone-500 font-medium">{participants.length} in room</span>
            </div>

            <div className="flex items-center gap-3">
              {!isListener && (
                <button onClick={toggleMute}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-90 ${
                    isMuted ? 'bg-red-100 text-red-500' : 'bg-brand-100 text-brand-500'
                  }`}>
                  {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
              )}
              <button onClick={leaveRoom}
                className="w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center active:scale-90 transition-all shadow-md shadow-red-200">
                <LogOut size={18} className="text-white" />
              </button>
            </div>

            <div className="w-20 text-right">
              {isHost && (
                <span className="text-[10px] text-stone-400 bg-stone-100 px-2 py-1 rounded-full">Host</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
