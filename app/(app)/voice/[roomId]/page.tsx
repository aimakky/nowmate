'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getNationalityFlag, checkSupportedLocation } from '@/lib/utils'
import { ArrowLeft, Mic, MicOff, Radio, LogOut, Send, ChevronUp, ChevronDown } from 'lucide-react'
import { awardPoints } from '@/lib/trust'

// ─── 定数 ────────────────────────────────────────────────────
const CAT_EMOJI: Record<string, string> = {
  '雑談': '💬', '飲み': '🍻', '相談': '🤝', '作業': '💻', 'Language': '🗣️', 'Other': '✨'
}

const REACTION_EMOJIS = ['👋', '👏', '😂', '❤️', '🔥', '🤔']

// ウェルカムカウントダウン（秒）
const WELCOME_TIMEOUT = 15

interface Participant {
  user_id:   string
  is_listener: boolean
  join_mode: 'speaker' | 'listener' | 'silent'
  profiles:  { display_name: string; nationality: string; avatar_url: string | null }
}

interface FloatingReaction {
  id:    string
  emoji: string
  x:     number  // 0-100%
}

interface ChatMessage {
  id:       string
  user_id:  string
  name:     string
  message:  string
  ts:       number
}

interface WelcomeEvent {
  userId:   string
  name:     string
  flag:     string
  deadline: number  // Date.now() + 15000
}

// ─── ユーザーアバター ─────────────────────────────────────────
function Avatar({
  participant, isMe, isMuted, isHost, size = 'md',
}: {
  participant: Participant
  isMe: boolean
  isMuted?: boolean
  isHost: boolean
  size?: 'sm' | 'md'
}) {
  const sz = size === 'sm' ? 'w-11 h-11 text-xl' : 'w-16 h-16 text-2xl'
  const flag = getNationalityFlag(participant.profiles?.nationality || '')
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`${sz} rounded-2xl flex items-center justify-center relative transition-all ${
        isMe && !isMuted ? 'ring-2 ring-emerald-400 bg-emerald-50' : 'bg-stone-100'
      }`}>
        {participant.profiles?.avatar_url
          ? <img src={participant.profiles.avatar_url} className="w-full h-full object-cover rounded-2xl" alt="" />
          : <span className="text-2xl">{flag}</span>
        }
        {isMe && isMuted && (
          <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
            <MicOff size={10} className="text-white" />
          </span>
        )}
        {isHost && (
          <span className="absolute -top-1.5 -right-1 text-sm">👑</span>
        )}
        {participant.is_listener && !isMe && (
          <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-stone-400 rounded-full flex items-center justify-center">
            <Radio size={9} className="text-white" />
          </span>
        )}
      </div>
      <p className="text-[10px] text-stone-600 font-semibold text-center truncate w-14 px-0.5">
        {participant.profiles?.display_name?.split(' ')[0] ?? '?'}
      </p>
    </div>
  )
}

// ─── メインページ ─────────────────────────────────────────────
export default function VoiceRoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const router = useRouter()

  // ── コア状態 ──────────────────────────────────────────────
  const [room,           setRoom]           = useState<any>(null)
  const [participants,   setParticipants]   = useState<Participant[]>([])
  const [userId,         setUserId]         = useState<string | null>(null)
  const [myName,         setMyName]         = useState('')
  const [myFlag,         setMyFlag]         = useState('')
  const [joined,         setJoined]         = useState(false)
  const [joining,        setJoining]        = useState(false)
  const [isMuted,        setIsMuted]        = useState(false)
  const [isListener,     setIsListener]     = useState(false)
  const [micError,       setMicError]       = useState(false)
  const [locationStatus, setLocationStatus] = useState<'checking'|'supported'|'outside'|'denied'>('checking')

  // ── ウェルカムシステム ────────────────────────────────────
  const [welcomeEvent,   setWelcomeEvent]   = useState<WelcomeEvent | null>(null)
  const [welcomeTimer,   setWelcomeTimer]   = useState(WELCOME_TIMEOUT)
  const [welcomed,       setWelcomed]       = useState<Set<string>>(new Set())
  const welcomeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── リアクション ─────────────────────────────────────────
  const [floatings, setFloatings] = useState<FloatingReaction[]>([])

  // ── テキストチャット ──────────────────────────────────────
  const [chatOpen,    setChatOpen]    = useState(false)
  const [chatMsgs,    setChatMsgs]    = useState<ChatMessage[]>([])
  const [chatInput,   setChatInput]   = useState('')
  const [chatUnread,  setChatUnread]  = useState(0)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // ── WebRTC ───────────────────────────────────────────────
  const localStreamRef  = useRef<MediaStream | null>(null)
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map())
  const audioRefs       = useRef<Map<string, HTMLAudioElement>>(new Map())
  const channelRef      = useRef<any>(null)

  const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]

  // ── 初期化 ───────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      supabase.from('profiles').select('display_name, nationality').eq('id', user.id).single()
        .then(({ data }) => {
          if (data) {
            setMyName(data.display_name ?? '')
            setMyFlag(getNationalityFlag(data.nationality ?? ''))
          }
        })
    })
    checkSupportedLocation().then(s => setLocationStatus(s))
  }, [])

  // ── ルーム取得 ───────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return
    createClient().from('voice_rooms')
      .select('*, profiles(display_name, nationality)')
      .eq('id', roomId).single()
      .then(({ data }) => setRoom(data))
  }, [roomId])

  // ── 参加者購読 ───────────────────────────────────────────
  const fetchParticipants = useCallback(async () => {
    if (!roomId) return
    const { data } = await createClient()
      .from('voice_participants')
      .select('user_id, is_listener, join_mode, profiles(display_name, nationality, avatar_url)')
      .eq('room_id', roomId)
    setParticipants((data || []) as unknown as Participant[])
  }, [roomId])

  useEffect(() => {
    fetchParticipants()
    const supabase = createClient()
    const ch = supabase.channel(`vp_${roomId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'voice_participants', filter: `room_id=eq.${roomId}`
      }, fetchParticipants)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [roomId, fetchParticipants])

  // ── チャット購読 ─────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return
    const supabase = createClient()
    const ch = supabase.channel(`chat_${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'voice_chat_messages', filter: `room_id=eq.${roomId}`
      }, async ({ new: row }) => {
        const { data: p } = await supabase.from('profiles')
          .select('display_name').eq('id', row.user_id).single()
        const msg: ChatMessage = {
          id: row.id, user_id: row.user_id,
          name: p?.display_name ?? '?', message: row.message, ts: Date.now(),
        }
        setChatMsgs(prev => [...prev.slice(-49), msg])
        if (!chatOpen) setChatUnread(n => n + 1)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [roomId, chatOpen])

  useEffect(() => {
    if (chatOpen) {
      setChatUnread(0)
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatOpen, chatMsgs])

  // ── ウェルカムタイマー ───────────────────────────────────
  useEffect(() => {
    if (!welcomeEvent) return
    setWelcomeTimer(WELCOME_TIMEOUT)
    welcomeTimerRef.current && clearInterval(welcomeTimerRef.current)

    welcomeTimerRef.current = setInterval(() => {
      setWelcomeTimer(t => {
        if (t <= 1) {
          clearInterval(welcomeTimerRef.current!)
          // 誰も挨拶しなかった → ペナルティ
          if (userId && !welcomed.has(welcomeEvent.userId)) {
            createClient().rpc('penalize_cold_room', {
              p_room_id:     roomId,
              p_welcomed_id: welcomeEvent.userId,
            })
          }
          setWelcomeEvent(null)
          return 0
        }
        return t - 1
      })
    }, 1000)

    return () => { clearInterval(welcomeTimerRef.current!) }
  }, [welcomeEvent])

  // ── WebRTC ───────────────────────────────────────────────
  function createPC(remoteUserId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    peerConnections.current.set(remoteUserId, pc)
    localStreamRef.current?.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!))
    pc.ontrack = (e) => {
      const audio = new Audio()
      audio.srcObject = e.streams[0]
      audio.autoplay = true
      audioRefs.current.set(remoteUserId, audio)
    }
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

  async function joinRoom(mode: 'speaker' | 'listener' | 'silent') {
    if (!userId || !roomId || joining) return
    setJoining(true)
    const asListener = mode !== 'speaker'
    setIsListener(asListener)

    if (!asListener) {
      try {
        localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      } catch {
        setMicError(true)
        setIsListener(true)
      }
    }

    const supabase = createClient()
    await supabase.from('voice_participants').upsert({
      room_id: roomId, user_id: userId,
      is_listener: asListener || micError,
      join_mode: mode,
    })

    // ── シグナリングチャンネル設定 ─────────────────────
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
      // リアクション受信
      .on('broadcast', { event: 'reaction' }, ({ payload }: any) => {
        spawnFloat(payload.emoji)
      })
      // 入室通知受信
      .on('broadcast', { event: 'joined' }, ({ payload }: any) => {
        if (payload.userId === userId) return
        setWelcomeEvent({ userId: payload.userId, name: payload.name, flag: payload.flag, deadline: Date.now() + WELCOME_TIMEOUT * 1000 })
      })
      .subscribe(async (status) => {
        if (status !== 'SUBSCRIBED') return

        // 既存参加者へ offer
        const { data: existing } = await supabase
          .from('voice_participants').select('user_id')
          .eq('room_id', roomId).neq('user_id', userId)
        for (const p of existing || []) {
          const pc = createPC(p.user_id)
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          ch.send({ type: 'broadcast', event: 'offer', payload: { to: p.user_id, from: userId, sdp: offer } })
        }

        // 入室通知をブロードキャスト
        ch.send({
          type: 'broadcast', event: 'joined',
          payload: { userId, name: myName, flag: myFlag }
        })
      })

    setJoined(true)
    setJoining(false)
  }

  async function leaveRoom() {
    if (!userId || !roomId) return
    peerConnections.current.forEach(pc => pc.close())
    peerConnections.current.clear()
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    audioRefs.current.forEach(a => { a.pause(); a.srcObject = null })
    audioRefs.current.clear()
    if (channelRef.current) createClient().removeChannel(channelRef.current)
    const supabase = createClient()
    await supabase.from('voice_participants').delete().eq('room_id', roomId).eq('user_id', userId)
    if (room?.host_id === userId) await supabase.from('voice_rooms').update({ status: 'closed' }).eq('id', roomId)
    router.push('/voice')
  }

  function toggleMute() {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = isMuted })
    setIsMuted(m => !m)
  }

  // ── リアクション送信 ─────────────────────────────────────
  function sendReaction(emoji: string) {
    if (!channelRef.current) return
    channelRef.current.send({ type: 'broadcast', event: 'reaction', payload: { emoji, from: userId } })
    spawnFloat(emoji)
  }

  function spawnFloat(emoji: string) {
    const id = `${Date.now()}_${Math.random()}`
    const x  = 10 + Math.random() * 80
    setFloatings(prev => [...prev, { id, emoji, x }])
    setTimeout(() => setFloatings(prev => prev.filter(f => f.id !== id)), 2500)
  }

  // ── ウェルカム！ボタン ───────────────────────────────────
  async function sendWelcome() {
    if (!welcomeEvent || !userId || welcomed.has(welcomeEvent.userId)) return
    sendReaction('👋')
    setWelcomed(prev => new Set([...prev, welcomeEvent.userId]))
    await createClient().rpc('award_welcome_points', {
      p_room_id:     roomId,
      p_greeter_id:  userId,
      p_welcomed_id: welcomeEvent.userId,
    })
    setWelcomeEvent(null)
  }

  // ── テキスト送信 ─────────────────────────────────────────
  async function sendChat() {
    if (!chatInput.trim() || !userId || !roomId) return
    await createClient().from('voice_chat_messages').insert({
      room_id: roomId, user_id: userId, message: chatInput.trim(),
    })
    setChatInput('')
  }

  // ─────────────────────────────────────────────────────────
  if (!room || locationStatus === 'checking') return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9]">
      <span className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (locationStatus === 'outside') return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9] flex flex-col">
      <div className="bg-white border-b border-stone-100 px-4 pt-4 pb-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-stone-500"><ArrowLeft size={20} /></button>
        <p className="font-extrabold text-stone-900">Voice Room</p>
      </div>
      <div className="flex flex-col items-center justify-center flex-1 px-8 text-center">
        <div className="text-6xl mb-5">🇯🇵</div>
        <h2 className="font-extrabold text-stone-900 text-xl mb-3">Available in 9 countries</h2>
        <p className="text-sm text-stone-500 leading-relaxed">Voice rooms are available in Japan, Korea, Vietnam, Brazil, Philippines, USA, Germany, China & Australia.</p>
      </div>
    </div>
  )

  if (locationStatus === 'denied') return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9] flex flex-col">
      <div className="bg-white border-b border-stone-100 px-4 pt-4 pb-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-stone-500"><ArrowLeft size={20} /></button>
        <p className="font-extrabold text-stone-900">Voice Room</p>
      </div>
      <div className="flex flex-col items-center justify-center flex-1 px-8 text-center">
        <div className="text-6xl mb-5">📍</div>
        <h2 className="font-extrabold text-stone-900 text-xl mb-3">Location required</h2>
        <button onClick={() => checkSupportedLocation().then(s => setLocationStatus(s))}
          className="px-6 py-3 bg-brand-500 text-white rounded-2xl text-sm font-bold active:scale-95 transition-all">
          Try again
        </button>
      </div>
    </div>
  )

  const speakers  = participants.filter(p => !p.is_listener)
  const listeners = participants.filter(p => p.is_listener)
  const isHost    = room.host_id === userId

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9] flex flex-col relative overflow-hidden">

      {/* ── フローティングリアクション ── */}
      {floatings.map(f => (
        <div key={f.id}
          className="fixed z-50 text-3xl pointer-events-none animate-bounce"
          style={{ bottom: 120, left: `${f.x}%`, animation: 'floatUp 2.5s ease-out forwards' }}>
          {f.emoji}
        </div>
      ))}
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0)   scale(1);   opacity: 1; }
          100% { transform: translateY(-180px) scale(1.4); opacity: 0; }
        }
      `}</style>

      {/* ══ ウェルカムバナー ═══════════════════════════════════ */}
      {welcomeEvent && (
        <div className="absolute top-0 left-0 right-0 z-40 px-4 pt-2">
          <div className="rounded-2xl overflow-hidden shadow-xl"
            style={{ background: 'linear-gradient(135deg,#1a1a2e 0%,#0f3460 100%)', border: '1px solid rgba(100,140,255,0.3)' }}>
            <div className="px-4 py-3 flex items-center gap-3">
              <span className="text-2xl flex-shrink-0">{welcomeEvent.flag}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-extrabold text-white">
                  {welcomeEvent.name} さんが入室！
                </p>
                <p className="text-[10px] text-blue-300/70 mt-0.5">
                  ウェルカムすると <span className="text-yellow-300 font-bold">+5pt</span> もらえます
                </p>
              </div>
              {/* カウントダウン */}
              <div className="flex-shrink-0 text-center">
                <div className="w-9 h-9 rounded-full flex items-center justify-center border-2 relative"
                  style={{ borderColor: welcomeTimer <= 5 ? '#ef4444' : '#60a5fa' }}>
                  <span className="font-extrabold text-white text-sm">{welcomeTimer}</span>
                </div>
              </div>
              <button
                onClick={sendWelcome}
                disabled={welcomed.has(welcomeEvent.userId)}
                className="flex-shrink-0 px-3 py-2 rounded-xl text-sm font-extrabold disabled:opacity-50 active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%)', color: '#fff', boxShadow: '0 4px 12px rgba(59,130,246,0.4)' }}>
                {welcomed.has(welcomeEvent.userId) ? '✓ 済' : '👋 ウェルカム！'}
              </button>
            </div>
            {/* タイマーバー */}
            <div className="h-1 bg-white/10">
              <div className="h-full transition-all duration-1000"
                style={{
                  width: `${(welcomeTimer / WELCOME_TIMEOUT) * 100}%`,
                  background: welcomeTimer <= 5 ? '#ef4444' : '#3b82f6',
                }} />
            </div>
          </div>
        </div>
      )}

      {/* ── ヘッダー ── */}
      <div className="bg-white border-b border-stone-100 px-4 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1 text-stone-500">
            <ArrowLeft size={20} />
          </button>
          <span className="text-xl">{CAT_EMOJI[room.category] ?? '✨'}</span>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-stone-900 text-sm truncate">{room.title}</p>
            <p className="text-xs text-stone-400">
              {room.category} · {getNationalityFlag(room.profiles?.nationality || '')} {room.profiles?.display_name}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-red-50 border border-red-100 px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-red-600">LIVE</span>
          </div>
        </div>
      </div>

      {/* ── メインコンテンツ ── */}
      <div className={`flex-1 overflow-y-auto px-4 transition-all ${welcomeEvent ? 'pt-20' : 'pt-4'}`}>

        {micError && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4 text-xs text-amber-700 font-medium">
            ⚠️ マイクが使えません — リスナーとして参加中
          </div>
        )}

        {/* ── スピーカー ── */}
        {speakers.length > 0 && (
          <div className="mb-5">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Mic size={11} /> 話している ({speakers.length})
            </p>
            <div className="grid grid-cols-5 gap-2">
              {speakers.map(p => (
                <Avatar key={p.user_id}
                  participant={p}
                  isMe={p.user_id === userId}
                  isMuted={p.user_id === userId && isMuted}
                  isHost={p.user_id === room.host_id}
                  size="sm"
                />
              ))}
            </div>
          </div>
        )}

        {/* ── リスナー ── */}
        {listeners.length > 0 && (
          <div className="mb-5">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Radio size={11} /> 聞いている ({listeners.length})
            </p>
            <div className="grid grid-cols-5 gap-2">
              {listeners.map(p => (
                <Avatar key={p.user_id}
                  participant={p}
                  isMe={p.user_id === userId}
                  isHost={p.user_id === room.host_id}
                  size="sm"
                />
              ))}
            </div>
          </div>
        )}

        {/* ── 参加前 UI ── */}
        {!joined && (
          <div className="bg-white border border-stone-100 rounded-3xl p-5 mt-2 shadow-sm">
            <p className="text-center text-2xl mb-3">🎙️</p>
            <p className="font-bold text-stone-800 text-sm text-center mb-0.5">
              {participants.length}人が参加中
            </p>
            <p className="text-xs text-stone-400 text-center mb-5">どのモードで入りますか？</p>

            <div className="space-y-2.5">
              {/* 話す */}
              <button onClick={() => joinRoom('speaker')} disabled={joining}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 active:scale-[0.98] transition-all text-left"
                style={{ borderColor: '#6366f1', background: '#eef2ff' }}>
                <span className="text-2xl flex-shrink-0">🎙️</span>
                <div>
                  <p className="font-extrabold text-indigo-700 text-sm">話す</p>
                  <p className="text-[10px] text-indigo-400">マイクをオンにして参加</p>
                </div>
                {joining && <span className="ml-auto w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />}
              </button>

              {/* 聞いている */}
              <button onClick={() => joinRoom('listener')} disabled={joining}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 active:scale-[0.98] transition-all text-left"
                style={{ borderColor: '#10b981', background: '#f0fdf4' }}>
                <span className="text-2xl flex-shrink-0">👂</span>
                <div>
                  <p className="font-extrabold text-emerald-700 text-sm">聞いています</p>
                  <p className="text-[10px] text-emerald-400">名前が表示される。リアクションOK</p>
                </div>
              </button>

              {/* こっそり */}
              <button onClick={() => joinRoom('silent')} disabled={joining}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 active:scale-[0.98] transition-all text-left"
                style={{ borderColor: '#e7e5e4', background: '#fafaf9' }}>
                <span className="text-2xl flex-shrink-0">🫥</span>
                <div>
                  <p className="font-extrabold text-stone-600 text-sm">こっそり聞く</p>
                  <p className="text-[10px] text-stone-400">名前は「こっそり」と表示される</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── リアクションパネル（参加後）── */}
        {joined && (
          <div className="mt-4 mb-2">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2.5">リアクション</p>
            <div className="flex gap-2 justify-between">
              {REACTION_EMOJIS.map(emoji => (
                <button key={emoji} onClick={() => sendReaction(emoji)}
                  className="flex-1 aspect-square rounded-2xl flex items-center justify-center text-xl bg-white border border-stone-100 shadow-sm active:scale-90 active:bg-stone-50 transition-all"
                  style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── テキストチャット ── */}
        {joined && (
          <div className="mt-3 mb-4 bg-white border border-stone-100 rounded-2xl overflow-hidden shadow-sm">
            <button
              onClick={() => setChatOpen(o => !o)}
              className="w-full px-4 py-2.5 flex items-center gap-2 text-left">
              <span className="text-sm">💬</span>
              <span className="text-xs font-bold text-stone-600 flex-1">テキストチャット</span>
              {chatUnread > 0 && (
                <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white">
                  {chatUnread}
                </span>
              )}
              {chatOpen ? <ChevronUp size={14} className="text-stone-400" /> : <ChevronDown size={14} className="text-stone-400" />}
            </button>

            {chatOpen && (
              <>
                <div className="border-t border-stone-50 px-3 py-2 max-h-36 overflow-y-auto space-y-1.5">
                  {chatMsgs.length === 0 ? (
                    <p className="text-xs text-stone-300 text-center py-2">
                      話せなくてもここから参加できます
                    </p>
                  ) : (
                    chatMsgs.map(m => (
                      <div key={m.id} className={`flex items-start gap-1.5 ${m.user_id === userId ? 'flex-row-reverse' : ''}`}>
                        <span className="text-[9px] text-stone-400 mt-0.5 flex-shrink-0 font-medium">
                          {m.user_id === userId ? 'あなた' : m.name.split(' ')[0]}
                        </span>
                        <div className={`px-2.5 py-1.5 rounded-xl text-xs max-w-[75%] leading-relaxed ${
                          m.user_id === userId
                            ? 'bg-indigo-500 text-white rounded-tr-sm'
                            : 'bg-stone-100 text-stone-700 rounded-tl-sm'
                        }`}>
                          {m.message}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="border-t border-stone-50 px-3 py-2 flex items-center gap-2">
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendChat()}
                    placeholder="メッセージを送る…"
                    maxLength={100}
                    className="flex-1 text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 focus:outline-none"
                  />
                  <button onClick={sendChat} disabled={!chatInput.trim()}
                    className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all flex-shrink-0">
                    <Send size={12} className="text-white" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── コントロール（参加後）── */}
      {joined && (
        <div className="bg-white border-t border-stone-100 px-4 py-3.5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-xs text-stone-500">
              <span className="font-bold text-stone-800">{participants.length}</span> 人参加中
            </div>

            <div className="flex items-center gap-3">
              {!isListener && (
                <button onClick={toggleMute}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-90 ${
                    isMuted ? 'bg-red-100 text-red-500' : 'bg-emerald-100 text-emerald-600'
                  }`}>
                  {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
              )}
              <button onClick={leaveRoom}
                className="w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center active:scale-90 transition-all shadow-md shadow-red-200">
                <LogOut size={18} className="text-white" />
              </button>
            </div>

            <div className="text-right">
              {isHost && <span className="text-[10px] text-stone-400 bg-stone-100 px-2 py-1 rounded-full">Host 👑</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
