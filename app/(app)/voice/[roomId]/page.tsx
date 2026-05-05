'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getNationalityFlag } from '@/lib/utils'
import { ArrowLeft, Mic, MicOff, Radio, LogOut, Send, ChevronUp, ChevronDown, ShieldCheck, Lock } from 'lucide-react'
import { awardPoints, getTierById } from '@/lib/trust'
import { canSpeakInVoiceRoom, type AgeVerificationStatus } from '@/lib/permissions'
import { Room, RoomEvent, Track, type RemoteTrack, type RemoteTrackPublication, type RemoteParticipant, type Participant as LkParticipant } from 'livekit-client'
import { logVoice, userTag, startTimer, endTimer } from '@/lib/voice-telemetry'

// ─── 定数 ────────────────────────────────────────────────────
const CAT_EMOJI: Record<string, string> = {
  '雑談': '💬', '夜話': '🌙', '相談': '🤝', '悩み': '💭', '笑い': '😂', '趣味': '🎵', 'Other': '✨'
}

const REACTION_EMOJIS = ['👋', '👏', '😂', '❤️', '🔥', '🤔']

// ウェルカムカウントダウン（秒）
const WELCOME_TIMEOUT = 15

interface Participant {
  user_id:     string
  is_listener: boolean
  join_mode:   'speaker' | 'listener' | 'silent'
  raised_hand: boolean
  role:        'host' | 'speaker' | 'listener'
  profiles:    { display_name: string; nationality: string; avatar_url: string | null }
  user_trust?: { tier: string } | null
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
  const [myTier,            setMyTier]            = useState<string>('visitor')
  const [myAgeVerified,     setMyAgeVerified]     = useState(false)
  const [myAgeStatus,       setMyAgeStatus]       = useState<AgeVerificationStatus>('unverified')
  const [showAgeGate,       setShowAgeGate]       = useState(false)
  const MAX_SPEAKERS = 8  // 広場トークは最大8名まで登壇可能

  // ── 広場トーク: 挙手・昇格 ───────────────────────────────
  const [isRaisingHand,  setIsRaisingHand]  = useState(false)
  const [promoted,       setPromoted]       = useState(false)
  const [promotionBanner,setPromotionBanner]= useState(false)

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

  // ── LiveKit (SFU) ────────────────────────────────────────
  // Mesh WebRTC は廃止。音声 transport は LiveKit Cloud / Server に集約。
  // Supabase Realtime は reaction / joined ブロードキャストにのみ使用。
  const livekitRef    = useRef<Room | null>(null)
  const audioElsRef   = useRef<Map<string, HTMLAudioElement>>(new Map())
  const channelRef    = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const tokenPrefetchRef = useRef<{ token: string; url: string; fetchedAt: number } | null>(null)
  const [connState, setConnState] = useState<'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'left'>('idle')
  const [serviceState, setServiceState] = useState<'ok' | 'not_configured' | 'unavailable'>('ok')
  const [activeSpeakerIds, setActiveSpeakerIds] = useState<Set<string>>(new Set())
  const [silenceLong, setSilenceLong] = useState(false)
  const [showFirstHint, setShowFirstHint] = useState(false)
  const lastSpeakAtRef = useRef<number>(Date.now())

  // ── 初期化 ───────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      Promise.all([
        supabase.from('profiles').select('display_name, nationality, age_verified, age_verification_status').eq('id', user.id).single(),
        supabase.from('user_trust').select('tier').eq('user_id', user.id).maybeSingle(),
      ]).then(([{ data: p }, { data: t }]) => {
        if (p) {
          setMyName(p.display_name ?? '')
          setMyFlag(getNationalityFlag(p.nationality ?? ''))
          const verified = p.age_verified === true && p.age_verification_status === 'age_verified'
          setMyAgeVerified(verified)
          setMyAgeStatus((p.age_verification_status ?? 'unverified') as AgeVerificationStatus)
        }
        if (t?.tier) setMyTier(t.tier)
      })
    })
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
      .select('user_id, is_listener, join_mode, raised_hand, role, profiles(display_name, nationality, avatar_url), user_trust(tier)')
      .eq('room_id', roomId)
    setParticipants((data || []) as unknown as Participant[])
  }, [roomId])

  // ── 自分の昇格を検知してマイク有効化 ─────────────────────
  // LiveKit に既に接続済みなので、token は再取得せず mic だけ enable する
  useEffect(() => {
    if (!joined || !userId || !isListener) return
    const myParticipant = participants.find(p => p.user_id === userId)
    if (!myParticipant) return
    if (!myParticipant.is_listener && isListener) {
      setIsListener(false)
      setIsRaisingHand(false)
      setPromotionBanner(true)
      setTimeout(() => setPromotionBanner(false), 4000)
      ;(async () => {
        try {
          await livekitRef.current?.localParticipant.setMicrophoneEnabled(true)
          setIsMuted(false)
        } catch (e) {
          console.error('[livekit] enable mic on promote failed', e)
          setMicError(true)
        }
      })()
    }
  }, [participants, isListener, joined, userId, roomId])

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

  // ── アンマウント時に LiveKit を必ず切断（タブ閉じ・前画面戻る等） ──
  useEffect(() => {
    return () => {
      try { livekitRef.current?.disconnect() } catch { /* noop */ }
      livekitRef.current = null
      audioElsRef.current.forEach(el => { try { el.pause() } catch { /* noop */ }; el.remove() })
      audioElsRef.current.clear()
    }
  }, [])

  // ── 初回到達 + token プリフェッチで体感高速化 ──────────────
  useEffect(() => {
    if (!roomId || !userId || joined) return
    logVoice('voice.entry.viewed', { roomId, userTag: userTag(userId) })
    // 初回ヒント（sessionStorage で 1 度だけ）
    try {
      const k = `samee_voice_first_hint_${roomId}`
      if (!sessionStorage.getItem(k)) {
        setShowFirstHint(true)
        sessionStorage.setItem(k, '1')
      }
    } catch { /* noop */ }
    // 入室前に裏で token を取得しておく（500ms 短縮効果）
    ;(async () => {
      const r = await fetchLkToken({ silentForUser: true })
      if (r.ok) {
        tokenPrefetchRef.current = { token: r.token, url: r.url, fetchedAt: Date.now() }
      }
    })()
  }, [roomId, userId, joined])

  // ── アクティブ話者検知（誰がいま話しているか） ─────────────
  useEffect(() => {
    if (!joined || !livekitRef.current) return
    const room = livekitRef.current
    const onActive = (speakers: LkParticipant[]) => {
      const ids = new Set(speakers.map(s => s.identity))
      setActiveSpeakerIds(ids)
      if (ids.size > 0) {
        lastSpeakAtRef.current = Date.now()
        if (silenceLong) setSilenceLong(false)
      }
    }
    room.on(RoomEvent.ActiveSpeakersChanged, onActive)
    return () => { room.off(RoomEvent.ActiveSpeakersChanged, onActive) }
  }, [joined, silenceLong])

  // ── 無音検知（30 秒以上誰も話してない時に控えめなヒント） ──
  useEffect(() => {
    if (!joined) return
    const t = setInterval(() => {
      const idle = Date.now() - lastSpeakAtRef.current
      if (idle > 30_000 && !silenceLong) {
        setSilenceLong(true)
        logVoice('voice.silence.detected', { roomId, ms: idle })
      }
    }, 5000)
    return () => clearInterval(t)
  }, [joined, silenceLong, roomId])

  // ── ウェルカムタイマー ───────────────────────────────────
  useEffect(() => {
    if (!welcomeEvent) return
    setWelcomeTimer(WELCOME_TIMEOUT)
    welcomeTimerRef.current && clearInterval(welcomeTimerRef.current)

    welcomeTimerRef.current = setInterval(() => {
      setWelcomeTimer(t => {
        if (t <= 1) {
          clearInterval(welcomeTimerRef.current!)
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

  // ── LiveKit Room 接続 ────────────────────────────────────
  type TokenError =
    | 'not_configured'
    | 'unauthenticated'
    | 'invalid_room_id'
    | 'room_not_found'
    | 'room_closed'
    | 'rate_limited'
    | 'internal'
    | 'network'

  async function fetchLkToken(opts?: { silentForUser?: boolean }): Promise<
    | { ok: true;  token: string; url: string }
    | { ok: false; reason: TokenError }
  > {
    const t0 = Date.now()
    if (!opts?.silentForUser) logVoice('voice.token.requested', { roomId, userTag: userTag(userId) })
    try {
      const res = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ roomId }),
      })
      if (res.ok) {
        const j = await res.json() as { token?: string; url?: string }
        if (!j.token || !j.url) {
          if (!opts?.silentForUser) logVoice('voice.token.failed', { roomId, reason: 'internal', ms: Date.now() - t0 })
          return { ok: false, reason: 'internal' }
        }
        if (!opts?.silentForUser) logVoice('voice.token.success', { roomId, ms: Date.now() - t0 })
        return { ok: true, token: j.token, url: j.url }
      }
      // 既知のエラーコードを抽出
      let reason: TokenError = 'internal'
      try {
        const j = await res.json() as { error?: string }
        if (j.error === 'not_configured'
            || j.error === 'unauthenticated'
            || j.error === 'invalid_room_id'
            || j.error === 'room_not_found'
            || j.error === 'room_closed'
            || j.error === 'rate_limited') {
          reason = j.error as TokenError
        }
      } catch { /* レスポンス body が JSON でない時はステータスから推測 */
        if (res.status === 503) reason = 'not_configured'
        else if (res.status === 401) reason = 'unauthenticated'
        else if (res.status === 404) reason = 'room_not_found'
        else if (res.status === 410) reason = 'room_closed'
        else if (res.status === 429) reason = 'rate_limited'
      }
      if (!opts?.silentForUser) logVoice('voice.token.failed', { roomId, reason, ms: Date.now() - t0 })
      return { ok: false, reason }
    } catch (e) {
      if (!opts?.silentForUser) logVoice('voice.token.failed', { roomId, reason: 'network', ms: Date.now() - t0 })
      console.error('[livekit] token fetch failed', e)
      return { ok: false, reason: 'network' }
    }
  }

  function attachLkRoomEvents(room: Room) {
    room
      .on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _pub: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (track.kind !== Track.Kind.Audio) return
        const el = track.attach() as HTMLAudioElement
        el.style.display = 'none'
        el.setAttribute('data-lk-user', participant.identity)
        document.body.appendChild(el)
        audioElsRef.current.set(participant.identity, el)
      })
      .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, _pub: RemoteTrackPublication, participant: RemoteParticipant) => {
        track.detach().forEach(e => e.remove())
        audioElsRef.current.delete(participant.identity)
      })
      .on(RoomEvent.Reconnecting,    () => { setConnState('reconnecting'); logVoice('voice.reconnect.started', { roomId }) })
      .on(RoomEvent.Reconnected,     () => { setConnState('connected');    logVoice('voice.reconnect.recovered', { roomId }) })
      .on(RoomEvent.Disconnected,    () => setConnState('disconnected'))
      .on(RoomEvent.ConnectionStateChanged, (s) => {
        // 'connected' | 'reconnecting' | 'disconnected' などをマップ
        if (s === 'connected')         setConnState('connected')
        else if (s === 'reconnecting') setConnState('reconnecting')
        else if (s === 'disconnected') setConnState('disconnected')
      })
  }

  async function joinRoom(mode: 'speaker' | 'listener' | 'silent') {
    if (!userId || !roomId || joining) return

    if (mode === 'speaker') {
      const { allowed } = canSpeakInVoiceRoom({ id: userId, age_verified: myAgeVerified, age_verification_status: myAgeStatus })
      if (!allowed) {
        setShowAgeGate(true)
        return
      }
    }

    logVoice('voice.entry.cta_clicked', { roomId, userTag: userTag(userId), mode })
    startTimer(`session_${roomId}`)
    setJoining(true)
    setConnState('connecting')
    setMicError(false)
    setServiceState('ok')
    const asListener = mode !== 'speaker'
    setIsListener(asListener)

    // 1) LiveKit token: プリフェッチ済みなら使い、無ければ取りに行く（最大 60 秒キャッシュ）
    let lkToken: string, lkUrl: string
    const pre = tokenPrefetchRef.current
    if (pre && Date.now() - pre.fetchedAt < 60_000) {
      lkToken = pre.token
      lkUrl   = pre.url
    } else {
      const lk = await fetchLkToken()
      if (!lk.ok) {
        setConnState('disconnected')
        setJoining(false)
        if (lk.reason === 'not_configured') {
          setServiceState('not_configured')
        } else if (lk.reason === 'room_closed' || lk.reason === 'room_not_found') {
          setServiceState('unavailable')
        } else if (lk.reason === 'unauthenticated') {
          router.push('/login')
          return
        } else if (lk.reason === 'rate_limited') {
          setServiceState('unavailable')
        } else {
          setServiceState('unavailable')
        }
        return
      }
      lkToken = lk.token
      lkUrl   = lk.url
    }

    // 2) Room 作成 + 接続
    const room = new Room({
      adaptiveStream: true,
      dynacast:       true,
      // モバイル・iOS Safari 安定化のための既定値
      publishDefaults: {
        audioPreset: { maxBitrate: 32000 },
        dtx:         true,
        red:         true,
      },
    })
    attachLkRoomEvents(room)

    const tConnect0 = Date.now()
    logVoice('voice.connect.started', { roomId, userTag: userTag(userId) })
    try {
      await room.connect(lkUrl, lkToken, { autoSubscribe: true })
    } catch (e) {
      console.error('[livekit] connect failed', e)
      logVoice('voice.connect.failed', { roomId, ms: Date.now() - tConnect0, reason: e instanceof Error ? e.message : 'unknown' })
      setServiceState('unavailable')
      setConnState('disconnected')
      setJoining(false)
      return
    }
    livekitRef.current = room
    setConnState('connected')
    logVoice('voice.connect.success', { roomId, ms: Date.now() - tConnect0, size: room.numParticipants })

    // 3) speaker ならマイク publish（getUserMedia は LiveKit が user gesture 文脈で実行）
    if (!asListener) {
      logVoice('voice.mic.requested', { roomId })
      try {
        await room.localParticipant.setMicrophoneEnabled(true)
        logVoice('voice.mic.granted', { roomId })
      } catch (e) {
        console.error('[livekit] enable mic failed', e)
        logVoice('voice.mic.denied', { roomId, reason: e instanceof Error ? e.message : 'unknown' })
        setMicError(true)
        setIsListener(true)
      }
    }

    // 4) Supabase 参加レコード upsert（既存 UI ロジックが参照）
    const supabase = createClient()
    await supabase.from('voice_participants').upsert({
      room_id: roomId, user_id: userId,
      is_listener: asListener || micError,
      join_mode: mode,
    })

    // 5) reaction / joined ブロードキャスト用の Supabase channel（音声シグナリングは含めない）
    const ch = supabase.channel(`voice:${roomId}`)
    channelRef.current = ch
    ch
      .on('broadcast', { event: 'reaction' }, ({ payload }: { payload: { emoji: string } }) => {
        spawnFloat(payload.emoji)
      })
      .on('broadcast', { event: 'joined' }, ({ payload }: { payload: { userId: string; name: string; flag: string } }) => {
        if (payload.userId === userId) return
        setWelcomeEvent({ userId: payload.userId, name: payload.name, flag: payload.flag, deadline: Date.now() + WELCOME_TIMEOUT * 1000 })
      })
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') return
        ch.send({
          type: 'broadcast', event: 'joined',
          payload: { userId, name: myName, flag: myFlag },
        })
      })

    setJoined(true)
    setJoining(false)
  }

  async function leaveRoom() {
    if (!userId || !roomId) return
    const dur = endTimer(`session_${roomId}`)
    if (dur !== undefined) logVoice('voice.session.duration', { roomId, ms: dur })
    logVoice('voice.session.left', { roomId, userTag: userTag(userId) })
    // LiveKit 切断 + 全 track の track.stop()（disconnect 内で実行）
    try { await livekitRef.current?.disconnect() } catch { /* noop */ }
    livekitRef.current = null
    audioElsRef.current.forEach(el => { try { el.pause() } catch { /* noop */ }; el.remove() })
    audioElsRef.current.clear()
    setConnState('left')
    if (channelRef.current) createClient().removeChannel(channelRef.current)
    const supabase = createClient()
    await supabase.from('voice_participants').delete().eq('room_id', roomId).eq('user_id', userId)
    if (room?.host_id === userId) await supabase.from('voice_rooms').update({ status: 'closed' }).eq('id', roomId)
    router.push('/voice')
  }

  async function toggleRaiseHand() {
    if (!userId || !roomId || !isListener) return
    const next = !isRaisingHand
    setIsRaisingHand(next)
    await createClient().from('voice_participants')
      .update({ raised_hand: next })
      .eq('room_id', roomId).eq('user_id', userId)
  }

  async function promoteToSpeaker(targetUserId: string) {
    if (!isHost || !roomId) return
    await createClient().from('voice_participants')
      .update({ is_listener: false, raised_hand: false, role: 'speaker', join_mode: 'speaker' })
      .eq('room_id', roomId).eq('user_id', targetUserId)
  }

  async function demoteToListener(targetUserId: string) {
    if (!isHost || !roomId || targetUserId === userId) return
    await createClient().from('voice_participants')
      .update({ is_listener: true, role: 'listener', join_mode: 'listener' })
      .eq('room_id', roomId).eq('user_id', targetUserId)
  }

  async function toggleMute() {
    const room = livekitRef.current
    if (!room) return
    const next = !isMuted
    try {
      await room.localParticipant.setMicrophoneEnabled(!next)
      setIsMuted(next)
      logVoice('voice.mic.toggled', { roomId, mode: next ? 'muted' : 'unmuted' })
    } catch (e) {
      console.error('[livekit] toggle mute failed', e)
    }
  }

  /** マイク許可拒否後の再リクエスト（モバイル UX 改善） */
  async function retryMic() {
    const room = livekitRef.current
    if (!room) return
    logVoice('voice.mic.requested', { roomId, mode: 'retry' })
    try {
      await room.localParticipant.setMicrophoneEnabled(true)
      setMicError(false)
      setIsMuted(false)
      setIsListener(false)
      logVoice('voice.mic.granted', { roomId, mode: 'retry' })
    } catch (e) {
      logVoice('voice.mic.denied', { roomId, mode: 'retry', reason: e instanceof Error ? e.message : 'unknown' })
    }
  }

  /** 接続失敗・切断後の再接続トリガ — 既存の joinRoom を呼び直す */
  async function retryConnect() {
    setServiceState('ok')
    setConnState('idle')
    setJoined(false)
    livekitRef.current = null
    audioElsRef.current.forEach(el => el.remove())
    audioElsRef.current.clear()
    if (channelRef.current) {
      try { createClient().removeChannel(channelRef.current) } catch { /* noop */ }
      channelRef.current = null
    }
    // 直前の mode を保持してないので listener 既定で再試行（speaker は別 CTA から）
    await joinRoom('listener')
  }

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

  async function sendChat() {
    if (!chatInput.trim() || !userId || !roomId) return
    await createClient().from('voice_chat_messages').insert({
      room_id: roomId, user_id: userId, message: chatInput.trim(),
    })
    setChatInput('')
  }

  // ─────────────────────────────────────────────────────────
  if (!room) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#080812' }}>
      <span className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: '#9D5CFF', borderTopColor: 'transparent' }} />
    </div>
  )

  // 派生データはメモ化（participants が変わった時だけ再計算）
  const speakers  = useMemo(() => participants.filter(p => !p.is_listener), [participants])
  const listeners = useMemo(() => participants.filter(p => p.is_listener),  [participants])
  const isHost    = room.host_id === userId

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col relative overflow-hidden" style={{ background: '#080812' }}>

      {/* ── フローティングリアクション ── */}
      {floatings.map(f => (
        <div key={f.id}
          className="fixed z-50 text-3xl pointer-events-none"
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
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(147,197,253,0.7)' }}>
                  ウェルカムすると <span className="font-bold" style={{ color: '#FDE68A' }}>+5pt</span> もらえます
                </p>
              </div>
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
            <div className="h-1" style={{ background: 'rgba(255,255,255,0.08)' }}>
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
      <div className="px-4 pt-4 pb-3 flex-shrink-0"
        style={{ background: 'rgba(8,8,18,0.9)', borderBottom: '1px solid rgba(157,92,255,0.15)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1" style={{ color: 'rgba(240,238,255,0.5)' }}>
            <ArrowLeft size={20} />
          </button>
          <span className="text-xl">{CAT_EMOJI[room.category] ?? '✨'}</span>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-sm truncate" style={{ color: '#F0EEFF' }}>{room.title}</p>
            <p className="text-xs" style={{ color: 'rgba(240,238,255,0.45)' }}>
              {room.category} · {getNationalityFlag(room.profiles?.nationality || '')} {room.profiles?.display_name}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {participants.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-1 rounded-full"
                style={{ background: 'rgba(167,139,250,0.12)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.3)' }}>
                {participants.length}人
              </span>
            )}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(124,255,130,0.1)', border: '1px solid rgba(124,255,130,0.25)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: '#7CFF82', boxShadow: '0 0 6px rgba(124,255,130,0.8)' }} />
              <span className="text-xs font-extrabold tracking-wider" style={{ color: '#7CFF82' }}>LIVE</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── メインコンテンツ ── */}
      <div className={`flex-1 overflow-y-auto px-4 transition-all ${welcomeEvent ? 'pt-20' : 'pt-4'}`}>

        {micError && (
          <div className="rounded-2xl px-4 py-3 mb-4"
            style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
            <p className="text-xs font-medium" style={{ color: '#FCD34D' }}>
              マイクが使えません。今は聞き専で参加しています。
            </p>
            <p className="text-[11px] mt-1" style={{ color: 'rgba(252,211,77,0.65)' }}>
              アドレスバーの 🔒 → サイトの設定 → マイクを「許可」にすると話せます。
            </p>
            <button
              onClick={retryMic}
              className="mt-2 text-[11px] font-bold px-3 py-1.5 rounded-full active:scale-95"
              style={{ background: 'rgba(252,211,77,0.18)', color: '#FCD34D', border: '1px solid rgba(252,211,77,0.4)' }}
            >
              もう一度マイクを試す
            </button>
          </div>
        )}

        {/* LiveKit 環境変数未設定（運用者作業待ち） */}
        {serviceState === 'not_configured' && (
          <div className="rounded-2xl px-4 py-4 mb-4"
            style={{ background: 'rgba(167,139,250,0.10)', border: '1px solid rgba(167,139,250,0.30)', color: '#e0d4ff' }}>
            <p className="text-sm font-bold mb-1">通話機能を準備中です</p>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(224,212,255,0.65)' }}>
              通話サービスの設定中につき、現在ご利用いただけません。少し時間を置いて再度お試しください。
            </p>
            {process.env.NODE_ENV !== 'production' && (
              <p className="text-[11px] mt-2 font-mono" style={{ color: 'rgba(224,212,255,0.5)' }}>
                [admin] LIVEKIT_API_KEY / LIVEKIT_API_SECRET / NEXT_PUBLIC_LIVEKIT_URL を Vercel に設定し再デプロイしてください
              </p>
            )}
          </div>
        )}

        {/* ルーム自体が利用不可（閉じた / 削除 / connect 失敗） */}
        {serviceState === 'unavailable' && (
          <div className="rounded-2xl px-4 py-3 mb-4"
            style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', color: '#fecaca' }}>
            <p className="text-sm font-bold mb-1">この通話には入れません</p>
            <p className="text-xs">部屋が閉じられたか、接続に失敗しました。少し時間を置いて再度お試しください。</p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={retryConnect}
                className="text-[11px] font-bold px-3 py-1.5 rounded-full active:scale-95"
                style={{ background: 'rgba(239,68,68,0.18)', color: '#fecaca', border: '1px solid rgba(239,68,68,0.4)' }}
              >
                もう一度試す
              </button>
              <button
                onClick={() => router.push('/voice')}
                className="text-[11px] font-bold px-3 py-1.5 rounded-full active:scale-95"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(240,238,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                通話一覧に戻る
              </button>
            </div>
          </div>
        )}

        {connState === 'reconnecting' && (
          <div className="rounded-2xl px-4 py-3 mb-4 text-xs font-medium flex items-center gap-2"
            style={{ background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.3)', color: '#FCD34D' }}>
            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            通話に再接続中…
          </div>
        )}
        {connState === 'disconnected' && joined && (
          <div className="rounded-2xl px-4 py-3 mb-4"
            style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <p className="text-xs font-medium" style={{ color: '#fecaca' }}>
              通話の接続が切れました
            </p>
            <button
              onClick={retryConnect}
              className="mt-2 text-[11px] font-bold px-3 py-1.5 rounded-full active:scale-95"
              style={{ background: 'rgba(239,68,68,0.18)', color: '#fecaca', border: '1px solid rgba(239,68,68,0.4)' }}
            >
              もう一度入る
            </button>
          </div>
        )}
        {connState === 'left' && (
          <div className="rounded-2xl px-4 py-3 mb-4 text-xs font-medium"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(240,238,255,0.55)' }}>
            通話から退出しました
          </div>
        )}

        {/* 初回ヒント（sessionStorage で 1 度だけ） */}
        {showFirstHint && !joined && (
          <div className="rounded-2xl px-4 py-3 mb-4"
            style={{ background: 'rgba(124,58,237,0.10)', border: '1px solid rgba(167,139,250,0.30)' }}>
            <p className="text-xs font-bold mb-1" style={{ color: '#c4b5fd' }}>はじめての通話？</p>
            <ul className="text-[11px] space-y-0.5 leading-relaxed" style={{ color: 'rgba(196,181,253,0.85)' }}>
              <li>・最初は「観客として参加」がおすすめ。聞くだけで OK。</li>
              <li>・「お疲れさま」だけ言って退出する人もたくさんいます。</li>
              <li>・気まずくなったら、何も言わずに退出ボタンで OK。</li>
            </ul>
            <button
              onClick={() => setShowFirstHint(false)}
              className="mt-2 text-[10px] font-bold underline"
              style={{ color: 'rgba(196,181,253,0.6)' }}
            >
              閉じる
            </button>
          </div>
        )}

        {/* 無音ヒント（30 秒以上誰も話してない時） */}
        {silenceLong && joined && connState === 'connected' && (
          <div className="rounded-2xl px-4 py-2.5 mb-4 text-[11px] flex items-center gap-2"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(240,238,255,0.55)' }}>
            <span>🤫</span>
            <span>今はみんな静か。「お疲れさま」から始めてみる？</span>
          </div>
        )}

        {/* ── 昇格バナー ── */}
        {promotionBanner && (
          <div className="mb-4 rounded-2xl px-4 py-3 flex items-center gap-3"
            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)' }}>
            <span className="text-2xl">🎙️</span>
            <div>
              <p className="text-sm font-extrabold" style={{ color: '#a5b4fc' }}>登壇を許可されました！</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(165,180,252,0.7)' }}>マイクがオンになりました。話してみましょう。</p>
            </div>
          </div>
        )}

        {/* ── ステージ（登壇者）── */}
        <div className="mb-4 rounded-3xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%)', border: '1px solid rgba(100,140,255,0.2)' }}>
          <div className="px-4 pt-3 pb-1 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>
              🎙️ ステージ — {speakers.length}人登壇中
            </p>
          </div>
          {speakers.length === 0 ? (
            <div className="px-4 pb-4 pt-2 text-center">
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>まだ誰も登壇していません</p>
            </div>
          ) : (
            <div className="px-4 pb-4 pt-2">
              <div className="grid grid-cols-4 gap-3">
                {speakers.map(p => {
                  const sp = activeSpeakerIds.has(p.user_id)
                  const meHi = p.user_id === userId && !isMuted
                  return (
                  <div key={p.user_id} className="flex flex-col items-center gap-1">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center relative transition-all ${sp ? 'animate-[pulse_1.2s_ease-in-out_infinite]' : ''}`}
                      style={{
                        background: sp ? 'rgba(124,255,130,0.18)' : meHi ? 'rgba(124,255,130,0.12)' : 'rgba(255,255,255,0.08)',
                        border:     sp ? '2px solid rgba(124,255,130,0.85)' : meHi ? '2px solid rgba(124,255,130,0.6)' : '1.5px solid rgba(255,255,255,0.1)',
                        boxShadow:  sp ? '0 0 18px rgba(124,255,130,0.55)' : meHi ? '0 0 14px rgba(124,255,130,0.3)' : 'none',
                      }}
                    >
                      {p.profiles?.avatar_url
                        ? <img src={p.profiles.avatar_url} className="w-full h-full object-cover rounded-2xl" alt="" />
                        : <span className="text-2xl">{getNationalityFlag(p.profiles?.nationality || '')}</span>
                      }
                      {p.user_id === room.host_id && (
                        <span className="absolute -top-1.5 -right-1 text-sm">👑</span>
                      )}
                      {p.user_id === userId && isMuted && (
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <MicOff size={9} className="text-white" />
                        </span>
                      )}
                      {isHost && p.user_id !== userId && (
                        <button onClick={() => demoteToListener(p.user_id)}
                          className="absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] transition-all"
                          style={{ background: 'rgba(30,30,50,0.9)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.15)' }}
                          title="リスナーに戻す">✕</button>
                      )}
                    </div>
                    <p className="text-[10px] font-semibold text-center truncate w-14 px-0.5"
                      style={{ color: sp ? '#7CFF82' : 'rgba(255,255,255,0.75)' }}>
                      {p.profiles?.display_name?.split(' ')[0] ?? '?'}
                    </p>
                  </div>
                )})}
              </div>
            </div>
          )}
        </div>

        {/* ── ホスト: 挙手者リスト ── */}
        {isHost && participants.filter(p => p.raised_hand).length > 0 && (
          <div className="mb-4 rounded-2xl p-3"
            style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2.5"
              style={{ color: '#FCD34D' }}>
              ✋ 登壇リクエスト ({participants.filter(p => p.raised_hand).length})
            </p>
            <div className="space-y-2">
              {participants.filter(p => p.raised_hand).map(p => (
                <div key={p.user_id} className="flex items-center gap-2">
                  <span className="text-sm">{getNationalityFlag(p.profiles?.nationality || '')}</span>
                  <span className="text-xs font-bold flex-1 truncate" style={{ color: '#F0EEFF' }}>
                    {p.profiles?.display_name ?? '?'}
                  </span>
                  <button onClick={() => promoteToSpeaker(p.user_id)}
                    className="text-[10px] font-bold px-3 py-1.5 rounded-xl text-white active:scale-95 transition-all"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 2px 8px rgba(99,102,241,0.4)' }}>
                    登壇を許可
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 観客席 ── */}
        {listeners.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"
              style={{ color: 'rgba(240,238,255,0.4)' }}>
              <Radio size={11} /> 観客席 ({listeners.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {listeners.map(p => (
                <div key={p.user_id} className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <span className="text-xs">{getNationalityFlag(p.profiles?.nationality || '')}</span>
                  <span className="text-[10px] font-medium max-w-[60px] truncate"
                    style={{ color: 'rgba(240,238,255,0.6)' }}>
                    {p.join_mode === 'silent' ? 'こっそり' : (p.profiles?.display_name?.split(' ')[0] ?? '?')}
                  </span>
                  {p.raised_hand && <span className="text-xs">✋</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 参加前 UI ── */}
        {!joined && (
          <div className="rounded-3xl p-5 mt-2"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(157,92,255,0.2)', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
            <p className="text-center text-2xl mb-3">🎙️</p>
            <p className="font-bold text-sm text-center mb-0.5" style={{ color: '#F0EEFF' }}>
              {participants.length}人が参加中
            </p>
            <p className="text-xs text-center mb-1" style={{ color: 'rgba(240,238,255,0.4)' }}>広場トーク</p>
            <p className="text-xs text-center mb-5" style={{ color: 'rgba(240,238,255,0.4)' }}>どのモードで入りますか？</p>

            {/* 見学者はスピーカー不可 */}
            {myTier === 'visitor' && (
              <div className="rounded-2xl px-3 py-2.5 mb-4 flex items-start gap-2"
                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)' }}>
                <span className="text-base flex-shrink-0">🪴</span>
                <div>
                  <p className="text-[11px] font-bold" style={{ color: '#a5b4fc' }}>見学者は聴くだけ参加できます</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(165,180,252,0.6)' }}>
                    電話認証 + 初投稿で「住人」に昇格すると話せるようになります
                  </p>
                </div>
              </div>
            )}

            {/* 年齢確認バナー（未確認） */}
            {!myAgeVerified && (
              <div className="rounded-2xl px-3 py-2.5 mb-4 flex items-start gap-2"
                style={{ background: 'rgba(157,92,255,0.1)', border: '1px solid rgba(157,92,255,0.25)' }}>
                <ShieldCheck size={16} style={{ color: '#9D5CFF', flexShrink: 0, marginTop: 2 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold" style={{ color: '#c084fc' }}>
                    {myAgeStatus === 'pending' ? '⏳ 年齢確認処理中…' : '年齢確認で話せるようになります'}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(192,132,252,0.65)' }}>
                    {myAgeStatus === 'pending'
                      ? '確認完了後に登壇できます'
                      : '免許証・パスポートで確認できます（聴くだけなら今すぐOK）'}
                  </p>
                </div>
                {myAgeStatus !== 'pending' && (
                  <button
                    onClick={() => setShowAgeGate(true)}
                    className="flex-shrink-0 text-[10px] font-bold px-2.5 py-1.5 rounded-xl active:scale-95 transition-all"
                    style={{ background: '#9D5CFF', color: '#fff' }}>
                    確認する
                  </button>
                )}
              </div>
            )}

            {/* スピーカー上限 */}
            {speakers.length >= MAX_SPEAKERS && (
              <div className="rounded-2xl px-3 py-2.5 mb-4 flex items-start gap-2"
                style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                <span className="text-base flex-shrink-0">🔒</span>
                <p className="text-[11px] leading-relaxed" style={{ color: '#FCD34D' }}>
                  話す人が{MAX_SPEAKERS}人に達しました（上限）。「聞いている」モードで参加できます。
                </p>
              </div>
            )}

            <div className="space-y-2.5">
              {/* 話す */}
              <button
                onClick={() => joinRoom('speaker')}
                disabled={joining || speakers.length >= MAX_SPEAKERS || myTier === 'visitor'}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl active:scale-[0.98] transition-all text-left disabled:opacity-40"
                style={!myAgeVerified || speakers.length >= MAX_SPEAKERS || myTier === 'visitor'
                  ? { background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.1)' }
                  : { background: 'rgba(99,102,241,0.12)', border: '1.5px solid rgba(99,102,241,0.4)' }}>
                <span className="text-2xl flex-shrink-0">
                  {!myAgeVerified ? '🔒' : '🎙️'}
                </span>
                <div>
                  <p className="font-extrabold text-sm"
                    style={{ color: !myAgeVerified || speakers.length >= MAX_SPEAKERS || myTier === 'visitor'
                      ? 'rgba(240,238,255,0.35)'
                      : '#a5b4fc' }}>
                    {!myAgeVerified
                      ? '登壇する（年齢確認が必要）'
                      : myTier === 'visitor'
                        ? '登壇する（住人以上で解放）'
                        : speakers.length >= MAX_SPEAKERS
                          ? `登壇する（上限${MAX_SPEAKERS}名）`
                          : `登壇する（残り${MAX_SPEAKERS - speakers.length}枠）`}
                  </p>
                  <p className="text-[10px]" style={{ color: 'rgba(240,238,255,0.3)' }}>
                    {!myAgeVerified ? '年齢確認済みユーザーのみ話せます' : 'マイクをオンにしてステージへ'}
                  </p>
                </div>
                {joining && <span className="ml-auto w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }} />}
              </button>

              {/* 観客として参加 */}
              <button onClick={() => joinRoom('listener')} disabled={joining}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl active:scale-[0.98] transition-all text-left"
                style={{ background: 'rgba(124,255,130,0.08)', border: '1.5px solid rgba(124,255,130,0.3)' }}>
                <span className="text-2xl flex-shrink-0">👂</span>
                <div>
                  <p className="font-extrabold text-sm" style={{ color: '#7CFF82' }}>観客として参加</p>
                  <p className="text-[10px]" style={{ color: 'rgba(124,255,130,0.55)' }}>✋ 手を挙げて登壇リクエスト可能</p>
                </div>
              </button>

              {/* こっそり */}
              <button onClick={() => joinRoom('silent')} disabled={joining}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl active:scale-[0.98] transition-all text-left"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(255,255,255,0.1)' }}>
                <span className="text-2xl flex-shrink-0">🫥</span>
                <div>
                  <p className="font-extrabold text-sm" style={{ color: 'rgba(240,238,255,0.7)' }}>こっそり聞く</p>
                  <p className="text-[10px]" style={{ color: 'rgba(240,238,255,0.35)' }}>名前は「こっそり」と表示される</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── リアクションパネル（参加後）── */}
        {joined && (
          <div className="mt-4 mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2.5"
              style={{ color: 'rgba(240,238,255,0.4)' }}>リアクション</p>
            <div className="flex gap-2 justify-between">
              {REACTION_EMOJIS.map(emoji => (
                <button key={emoji} onClick={() => sendReaction(emoji)}
                  className="flex-1 aspect-square rounded-2xl flex items-center justify-center text-xl active:scale-90 transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── テキストチャット ── */}
        {joined && (
          <div className="mt-3 mb-28 rounded-2xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(157,92,255,0.18)' }}>
            <button
              onClick={() => setChatOpen(o => !o)}
              className="w-full px-4 py-2.5 flex items-center gap-2 text-left">
              <span className="text-sm">💬</span>
              <span className="text-xs font-bold flex-1" style={{ color: 'rgba(240,238,255,0.7)' }}>テキストチャット</span>
              {chatUnread > 0 && (
                <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white">
                  {chatUnread}
                </span>
              )}
              {chatOpen
                ? <ChevronUp size={14} style={{ color: 'rgba(240,238,255,0.35)' }} />
                : <ChevronDown size={14} style={{ color: 'rgba(240,238,255,0.35)' }} />}
            </button>

            {chatOpen && (
              <>
                <div className="px-3 py-2 max-h-36 overflow-y-auto space-y-1.5"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  {chatMsgs.length === 0 ? (
                    <p className="text-xs text-center py-2" style={{ color: 'rgba(240,238,255,0.25)' }}>
                      話せなくてもここから参加できます
                    </p>
                  ) : (
                    chatMsgs.map(m => (
                      <div key={m.id} className={`flex items-start gap-1.5 ${m.user_id === userId ? 'flex-row-reverse' : ''}`}>
                        <span className="text-[9px] mt-0.5 flex-shrink-0 font-medium"
                          style={{ color: 'rgba(240,238,255,0.4)' }}>
                          {m.user_id === userId ? 'あなた' : m.name.split(' ')[0]}
                        </span>
                        <div className={`px-2.5 py-1.5 rounded-xl text-xs max-w-[75%] leading-relaxed`}
                          style={m.user_id === userId
                            ? { background: 'rgba(99,102,241,0.35)', color: '#e0e7ff', borderRadius: '12px 2px 12px 12px' }
                            : { background: 'rgba(255,255,255,0.08)', color: 'rgba(240,238,255,0.8)', borderRadius: '2px 12px 12px 12px' }}>
                          {m.message}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="px-3 py-2 flex items-center gap-2"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendChat()}
                    placeholder="メッセージを送る…"
                    maxLength={100}
                    className="flex-1 text-xs rounded-xl px-3 py-2 focus:outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(157,92,255,0.2)',
                      color: '#F0EEFF',
                    }}
                  />
                  <button onClick={sendChat} disabled={!chatInput.trim()}
                    className="w-8 h-8 rounded-xl flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#9D5CFF,#7B3FE4)', boxShadow: '0 2px 8px rgba(157,92,255,0.35)' }}>
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
        <div className="px-4 py-3.5 flex-shrink-0"
          style={{ background: 'rgba(8,8,18,0.95)', borderTop: '1px solid rgba(157,92,255,0.15)', backdropFilter: 'blur(12px)' }}>
          <div className="flex items-center justify-between">
            <div className="text-xs" style={{ color: 'rgba(240,238,255,0.45)' }}>
              <span className="font-bold" style={{ color: '#9D5CFF' }}>{participants.length}</span> 人参加中
            </div>

            <div className="flex items-center gap-3">
              {/* 登壇者: ミュートボタン */}
              {!isListener && (
                myAgeVerified ? (
                  <button onClick={toggleMute}
                    className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-90"
                    style={isMuted
                      ? { background: 'rgba(239,68,68,0.15)', border: '1.5px solid rgba(239,68,68,0.3)', color: '#ef4444' }
                      : { background: 'rgba(124,255,130,0.12)', border: '1.5px solid rgba(124,255,130,0.35)', color: '#7CFF82' }}>
                    {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>
                ) : (
                  <button onClick={() => setShowAgeGate(true)}
                    className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-90"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)', color: 'rgba(240,238,255,0.4)' }}
                    title="年齢確認が必要です">
                    <Lock size={20} />
                  </button>
                )
              )}
              {/* 観客: 手を挙げるボタン */}
              {isListener && joined && (
                <button onClick={toggleRaiseHand}
                  className="flex items-center gap-2 px-4 h-12 rounded-2xl font-bold text-sm transition-all active:scale-95"
                  style={isRaisingHand
                    ? { background: '#f59e0b', color: '#fff', boxShadow: '0 4px 12px rgba(245,158,11,0.4)' }
                    : { background: 'rgba(251,191,36,0.1)', color: '#FCD34D', border: '1px solid rgba(251,191,36,0.3)' }}>
                  <span>✋</span>
                  <span className="text-xs">{isRaisingHand ? '手を下げる' : '登壇リクエスト'}</span>
                </button>
              )}
              <button onClick={leaveRoom}
                className="w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center active:scale-90 transition-all"
                style={{ boxShadow: '0 4px 12px rgba(239,68,68,0.4)' }}>
                <LogOut size={18} className="text-white" />
              </button>
            </div>

            <div className="text-right">
              {isHost && (
                <span className="text-[10px] px-2 py-1 rounded-full font-bold"
                  style={{ background: 'rgba(157,92,255,0.15)', color: '#9D5CFF', border: '1px solid rgba(157,92,255,0.3)' }}>
                  Host 👑
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 年齢確認ゲートモーダル ── */}
      {showAgeGate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAgeGate(false)} />
          <div className="relative w-full max-w-md rounded-3xl p-6"
            style={{ background: '#0d0d1f', border: '1px solid rgba(157,92,255,0.3)', boxShadow: '0 0 40px rgba(157,92,255,0.2)' }}>
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: 'rgba(157,92,255,0.15)', border: '1px solid rgba(157,92,255,0.3)' }}>
                <ShieldCheck size={32} style={{ color: '#9D5CFF' }} />
              </div>
              <h3 className="font-extrabold text-lg mb-1.5" style={{ color: '#F0EEFF' }}>通話で話すには年齢確認が必要</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(240,238,255,0.55)' }}>
                sameeは<span className="font-bold" style={{ color: '#F0EEFF' }}>20歳以上</span>限定のコミュニティです。<br />
                免許証・マイナンバーカード・パスポートで確認できます。
              </p>
            </div>
            {myAgeStatus === 'pending' && (
              <div className="rounded-2xl px-4 py-3 mb-4 text-center"
                style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)' }}>
                <p className="text-sm font-bold" style={{ color: '#FCD34D' }}>⏳ 確認処理中</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(252,211,77,0.7)' }}>通常1〜2営業日でご連絡します</p>
              </div>
            )}
            <div className="space-y-2.5">
              {myAgeStatus !== 'pending' && (
                <button
                  onClick={() => { setShowAgeGate(false); router.push('/verify-age') }}
                  className="w-full py-3.5 rounded-2xl font-extrabold text-sm text-white active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#9D5CFF,#7B3FE4)', boxShadow: '0 4px 20px rgba(157,92,255,0.4)' }}>
                  <ShieldCheck size={16} /> 年齢確認をする（無料）
                </button>
              )}
              <button onClick={() => setShowAgeGate(false)}
                className="w-full py-3 text-sm font-medium"
                style={{ color: 'rgba(240,238,255,0.4)' }}>
                閉じる（聴くだけで参加）
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
