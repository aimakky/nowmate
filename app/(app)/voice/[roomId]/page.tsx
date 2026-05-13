'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getNationalityFlag } from '@/lib/utils'
import { ArrowLeft, Mic, MicOff, Radio, LogOut, Send, ChevronUp, ChevronDown, ShieldCheck, Lock, Settings, Volume2, X, Headphones } from 'lucide-react'
import { awardPoints, getTierById } from '@/lib/trust'
import { canSpeakInVoiceRoom, type AgeVerificationStatus } from '@/lib/permissions'
import { isVerificationBypassEnabled } from '@/lib/test-mode'
import { Room, RoomEvent, Track, type RemoteTrack, type RemoteTrackPublication, type RemoteParticipant, type Participant as LkParticipant } from 'livekit-client'
import { logVoice, userTag, startTimer, endTimer } from '@/lib/voice-telemetry'
import VerifiedBadge from '@/components/ui/VerifiedBadge'
import { isVerifiedByExistingSchema } from '@/lib/identity-types'

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
  profiles:    {
    display_name: string
    nationality: string
    avatar_url: string | null
    // Phase 1: 既存スキーマの age_verified（任意。クエリで select に含めれば来る）
    age_verified?: boolean | null
    age_verification_status?: string | null
  }
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
  // 2026-05-08 YVOICE5 テスト期間中バイパス: 年齢確認 / Tier (visitor) による
  // マイクON参加ブロックを一時的に無効化する。bypass = true なら下記 2 変数は
  // 常に false (= ブロックしない)、UI ボタンを press 可能 / 説明文を通常版に。
  // canSpeakInVoiceRoom や canJoinVoiceRoom も lib/permissions.ts 側で同じ env を
  // 見て bypass しているので、L505 付近のチェックも整合的に通る。
  const ageBlocked     = !myAgeVerified && !isVerificationBypassEnabled()
  const visitorBlocked = myTier === 'visitor' && !isVerificationBypassEnabled()
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

  // ── 2026-05-08 YVOICE5 PR-A: 設定 / 音声設定 / 入退室トースト ──
  // すべて UI のみ追加。LiveKit 接続 / mute / publish / Realtime / DB は不変。
  const [showSettings,      setShowSettings]      = useState(false)
  const [showAudioSettings, setShowAudioSettings] = useState(false)
  // Web Speech API による通話チャット読み上げ ON/OFF (localStorage で永続化)。
  // ブラウザが speechSynthesis をサポートしていれば動作、未対応なら trueでも no-op。
  const [ttsEnabled, setTtsEnabled] = useState(false)
  // 入退室トースト: participants 配列の差分で「○○が入室しました」「退出しました」を
  // 下部に短時間表示。voice_chat_messages の DB 変更は行わない。
  type ToastItem = { id: string; text: string; kind: 'enter' | 'leave' }
  const [presenceToasts, setPresenceToasts] = useState<ToastItem[]>([])
  const prevParticipantIdsRef = useRef<Set<string>>(new Set())
  const prevParticipantNamesRef = useRef<Map<string, string>>(new Map())

  // ── YouTube 同時視聴（Supabase Realtime channel 経由・DB 永続化なし） ──
  // 誰かが URL を貼ると 'youtube' broadcast が飛び、ルーム全員の videoId state が
  // 同期されて iframe を表示する。停止時は 'youtube_stop'。
  // ページリロードや退室で消える ephemeral 設計（次フェーズで永続化検討）。
  const [youtubeVideoId, setYoutubeVideoId]   = useState<string | null>(null)
  const [showYoutubeInput, setShowYoutubeInput] = useState(false)
  const [youtubeInput,   setYoutubeInput]     = useState('')
  const [youtubeError,   setYoutubeError]     = useState('')

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
      .select('user_id, is_listener, join_mode, raised_hand, role, profiles(display_name, nationality, avatar_url, age_verified, age_verification_status), user_trust(tier)')
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

  // ── 2026-05-08 YVOICE5 PR-A: 入退室トースト用差分検知 ──
  // participants が更新されるたびに前回値と比較し、新規 user は「入室」、消えた
  // user は「退出」のトーストを下部に追加する。3 秒後に自動で消える。
  // DB 変更なし。voice_chat_messages にも書き込まない (純表示のみ)。
  useEffect(() => {
    if (!joined || !userId) return
    const currentIds = new Set(participants.map(p => p.user_id))
    const currentNames = new Map<string, string>()
    for (const p of participants) {
      const display = p.join_mode === 'silent'
        ? 'こっそり参加者'
        : (p.profiles?.display_name?.split(' ')[0] ?? 'ゲスト')
      currentNames.set(p.user_id, display)
    }
    const prevIds = prevParticipantIdsRef.current
    const prevNames = prevParticipantNamesRef.current

    // 初回 (prevIds が空) は通知しない (= ロード直後の初期化扱い)
    if (prevIds.size === 0) {
      prevParticipantIdsRef.current = currentIds
      prevParticipantNamesRef.current = currentNames
      return
    }

    const newToasts: ToastItem[] = []
    // 入室検知: 自分の入室は出さない
    for (const id of currentIds) {
      if (!prevIds.has(id) && id !== userId) {
        const name = currentNames.get(id) ?? 'ゲスト'
        newToasts.push({ id: `enter-${id}-${Date.now()}`, text: `${name}が入室しました`, kind: 'enter' })
      }
    }
    // 退出検知
    for (const id of prevIds) {
      if (!currentIds.has(id) && id !== userId) {
        const name = prevNames.get(id) ?? 'ゲスト'
        newToasts.push({ id: `leave-${id}-${Date.now()}`, text: `${name}が退出しました`, kind: 'leave' })
      }
    }
    if (newToasts.length > 0) {
      setPresenceToasts(prev => [...prev, ...newToasts].slice(-3)) // 最大 3 件
      // 3 秒後に削除
      newToasts.forEach(t => {
        setTimeout(() => {
          setPresenceToasts(prev => prev.filter(x => x.id !== t.id))
        }, 3000)
      })
    }
    prevParticipantIdsRef.current = currentIds
    prevParticipantNamesRef.current = currentNames
  }, [participants, joined, userId])

  // ── 2026-05-08 YVOICE5 PR-A: 通話チャット読み上げ (Web Speech API) ──
  // 設定の永続化のみここで行う。実際の発話はチャット受信ハンドラ (voice_chat_messages
  // の Realtime callback) で window.speechSynthesis を呼ぶ。
  // ブラウザ未対応 (古い Safari / 一部 Android) の場合は trueでも no-op になる。
  useEffect(() => {
    try {
      const v = localStorage.getItem('yvoice_voice_room_tts_enabled')
      if (v === '1') setTtsEnabled(true)
    } catch { /* noop (private mode 等) */ }
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem('yvoice_voice_room_tts_enabled', ttsEnabled ? '1' : '0')
    } catch { /* noop */ }
  }, [ttsEnabled])
  // ttsEnabled の最新値を Realtime ハンドラ内のクロージャから参照するため ref 化。
  const ttsEnabledRef = useRef(ttsEnabled)
  useEffect(() => { ttsEnabledRef.current = ttsEnabled }, [ttsEnabled])

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
        // 2026-05-08 YVOICE5 PR-A: 通話チャット読み上げ。
        // 自分自身の投稿は読み上げず、設定 ON + ブラウザ対応時のみ発話。
        try {
          if (
            ttsEnabledRef.current &&
            row.user_id !== userId &&
            typeof window !== 'undefined' &&
            'speechSynthesis' in window
          ) {
            const u = new SpeechSynthesisUtterance(`${p?.display_name?.split(' ')[0] ?? '誰か'}: ${row.message}`)
            u.lang = 'ja-JP'
            u.volume = 0.7
            window.speechSynthesis.speak(u)
          }
        } catch { /* noop: TTS 失敗は静かに無視 */ }
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
      // YouTube 同時視聴：他の参加者からの URL をピックアップ → iframe 表示
      .on('broadcast', { event: 'youtube' }, ({ payload }: { payload: { videoId: string; from: string } }) => {
        if (payload?.videoId) setYoutubeVideoId(payload.videoId)
      })
      .on('broadcast', { event: 'youtube_stop' }, () => setYoutubeVideoId(null))
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

  // ── YouTube 同時視聴 ─────────────────────────────────────
  /** youtube.com/watch?v= / youtu.be/ / youtube.com/shorts/ から 11 文字の videoId を抽出 */
  function extractYoutubeId(url: string): string | null {
    const trimmed = url.trim()
    if (!trimmed) return null
    // youtu.be/<id> / youtube.com/(watch\?v=|shorts/|embed/)<id>
    const m = trimmed.match(
      /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
    )
    return m?.[1] ?? null
  }
  function shareYoutube() {
    const id = extractYoutubeId(youtubeInput)
    if (!id) {
      setYoutubeError('有効な YouTube の URL を入力してください。')
      return
    }
    setYoutubeError('')
    setYoutubeVideoId(id)
    setShowYoutubeInput(false)
    setYoutubeInput('')
    // Supabase channel で全員に同期（既存の reaction / joined と同じ仕組み）
    channelRef.current?.send({
      type: 'broadcast',
      event: 'youtube',
      payload: { videoId: id, from: userId },
    })
    logVoice('voice.youtube.shared', { roomId })
  }
  function stopYoutube() {
    setYoutubeVideoId(null)
    channelRef.current?.send({
      type: 'broadcast',
      event: 'youtube_stop',
      payload: { from: userId },
    })
    logVoice('voice.youtube.stopped', { roomId })
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

        {/* ── ステージ（登壇者）──
            2026-05-13: joined=true のみ表示。入室前は参考イラスト準拠のクリーンな
            入室前確認画面を出すため、入室前にステージは見せない。 */}
        {joined && (
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
                    {isVerifiedByExistingSchema(p.profiles) && (
                      <VerifiedBadge verified size="sm" />
                    )}
                  </div>
                )})}
              </div>
            </div>
          )}
        </div>
        )}

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

        {/* ── 観客席 ──
            2026-05-13: joined=true のみ表示 (入室前は参考イラスト下部 3 カラムに
            「0人 参加中」として集約表示)。 */}
        {joined && listeners.length > 0 && (
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
                  {p.join_mode !== 'silent' && isVerifiedByExistingSchema(p.profiles) && (
                    <VerifiedBadge verified size="sm" />
                  )}
                  {p.raised_hand && <span className="text-xs">✋</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 参加前 UI (2026-05-13 PR voice-entry-redesign 参考イラスト準拠) ──
            目的: 「いきなり声が出るのでは」という入室前の不安を消す。
            最優先 CTA = 「聞くだけで参加する」(紫プライマリ)。マイクON はセカンダリ。
            既存ロジック (joinRoom / visitorBlocked / ageBlocked / MAX_SPEAKERS /
            joining / showAgeGate) は完全に維持。表示形式のみ刷新。 */}
        {!joined && (
          <div className="mt-2">
            {/* 中央: 村アイコン + タイトル + 状態 */}
            <div className="text-center mb-6">
              <div
                className="mx-auto w-24 h-24 rounded-3xl flex items-center justify-center text-5xl mb-4"
                style={{
                  background: 'linear-gradient(135deg, rgba(157,92,255,0.28), rgba(124,58,237,0.18))',
                  border: '1.5px solid rgba(157,92,255,0.5)',
                  boxShadow: '0 0 32px rgba(157,92,255,0.45), 0 4px 18px rgba(0,0,0,0.4)',
                }}
              >
                {CAT_EMOJI[room?.category ?? ''] ?? '🎯'}
              </div>
              <h2 className="text-2xl font-extrabold mb-2" style={{ color: '#F0EEFF' }}>
                {room?.title ?? 'ルーム'} <span className="font-bold" style={{ color: 'rgba(240,238,255,0.7)' }}>の通話ルーム</span>
              </h2>
              <div className="flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: '#7CFF82', boxShadow: '0 0 6px rgba(124,255,130,0.7)' }} />
                <span className="text-sm font-bold" style={{ color: 'rgba(240,238,255,0.75)' }}>
                  {participants.length === 0 ? '今は誰もいません' : `${participants.length}人が参加中`}
                </span>
              </div>
            </div>

            {/* 安心説明 3 行カード (最重要メッセージ) */}
            <div
              className="rounded-3xl p-4 mb-5"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(157,92,255,0.2)',
                boxShadow: '0 4px 18px rgba(0,0,0,0.3)',
              }}
            >
              <div className="flex items-start gap-3 py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(157,92,255,0.18)', border: '1px solid rgba(157,92,255,0.3)' }}>
                  <Headphones size={18} style={{ color: '#c4b5fd' }} />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm font-extrabold" style={{ color: '#F0EEFF' }}>まずは聞くだけでもOK</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'rgba(240,238,255,0.55)' }}>気軽に雰囲気をのぞいてみよう</p>
                </div>
              </div>
              <div className="flex items-start gap-3 py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(157,92,255,0.18)', border: '1px solid rgba(157,92,255,0.3)' }}>
                  <Mic size={18} style={{ color: '#c4b5fd' }} />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm font-extrabold" style={{ color: '#F0EEFF' }}>マイクはあとからONにできます</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'rgba(240,238,255,0.55)' }}>タイミングは自分で決められます</p>
                </div>
              </div>
              <div className="flex items-start gap-3 py-2.5">
                <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(157,92,255,0.18)', border: '1px solid rgba(157,92,255,0.3)' }}>
                  <MicOff size={18} style={{ color: '#c4b5fd' }} />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm font-extrabold" style={{ color: '#F0EEFF' }}>入室してもすぐ声は出ません</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'rgba(240,238,255,0.55)' }}>安心して参加できます</p>
                </div>
              </div>
            </div>

            {/* 参加ボタン群 (joining 中はオーバーレイで一目で分かる) */}
            <div className="relative space-y-3 mb-3">
              {joining && (
                <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl"
                  style={{ background: 'rgba(8,8,18,0.7)', backdropFilter: 'blur(2px)' }}>
                  <div className="flex flex-col items-center gap-2 px-5 py-4 rounded-2xl"
                    style={{ background: 'rgba(157,92,255,0.12)', border: '1px solid rgba(157,92,255,0.45)' }}>
                    <span className="w-6 h-6 border-[3px] border-t-transparent rounded-full animate-spin"
                      style={{ borderColor: '#9D5CFF', borderTopColor: 'transparent' }} />
                    <p className="text-xs font-extrabold" style={{ color: '#F0EEFF' }}>
                      {connState === 'connecting' ? '通話に接続中…' : connState === 'connected' ? 'もう少しで完了…' : '準備中…'}
                    </p>
                  </div>
                </div>
              )}

              {/* 第1ボタン: 聞くだけで参加する (最重要・紫プライマリ大ボタン)
                  内部: joinRoom('listener') / role: 'listener' / is_listener: true */}
              <button
                onClick={() => joinRoom('listener')}
                disabled={joining}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #9D5CFF, #7C3AED)',
                  boxShadow: '0 6px 24px rgba(157,92,255,0.55)',
                }}
              >
                <Headphones size={20} className="text-white" />
                <span className="text-base font-extrabold text-white">聞くだけで参加する</span>
              </button>

              {/* 第2ボタン: マイクONで参加する (セカンダリ・紫縁取り)
                  内部: joinRoom('speaker') / role: 'speaker'。
                  visitorBlocked / ageBlocked / 上限到達時は disabled + 補足文言。 */}
              <button
                onClick={() => joinRoom('speaker')}
                disabled={joining || speakers.length >= MAX_SPEAKERS || visitorBlocked || ageBlocked}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50"
                style={{
                  background: 'rgba(157,92,255,0.08)',
                  border: '1.5px solid rgba(157,92,255,0.55)',
                }}
              >
                <Mic size={20} style={{ color: '#c4b5fd' }} />
                <span className="text-base font-extrabold" style={{ color: '#c4b5fd' }}>マイクONで参加する</span>
              </button>
            </div>

            {/* 補足: いつでも退室できます */}
            <p className="text-center text-xs mb-5" style={{ color: 'rgba(240,238,255,0.5)' }}>
              👋 いつでも退室できます
            </p>

            {/* マイクON参加がブロックされている場合の補足 (年齢確認 / 見習い / 上限) */}
            {ageBlocked && (
              <div className="rounded-2xl px-3 py-2.5 mb-3 flex items-start gap-2"
                style={{ background: 'rgba(157,92,255,0.1)', border: '1px solid rgba(157,92,255,0.25)' }}>
                <ShieldCheck size={16} style={{ color: '#9D5CFF', flexShrink: 0, marginTop: 2 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold" style={{ color: '#c084fc' }}>
                    {myAgeStatus === 'pending' ? '⏳ 年齢確認処理中…' : 'マイクON で参加するには年齢確認が必要です'}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(192,132,252,0.65)' }}>
                    {myAgeStatus === 'pending' ? '確認完了後に登壇できます' : '聞くだけ参加なら今すぐOK'}
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
            {visitorBlocked && !ageBlocked && (
              <div className="rounded-2xl px-3 py-2.5 mb-3 flex items-start gap-2"
                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)' }}>
                <span className="text-base flex-shrink-0">🪴</span>
                <div>
                  <p className="text-[11px] font-bold" style={{ color: '#a5b4fc' }}>マイクON は村人以上で解放</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(165,180,252,0.6)' }}>
                    聞くだけ参加 → 電話認証 + 初投稿で「村人」に昇格
                  </p>
                </div>
              </div>
            )}
            {speakers.length >= MAX_SPEAKERS && (
              <div className="rounded-2xl px-3 py-2.5 mb-3 flex items-start gap-2"
                style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                <span className="text-base flex-shrink-0">🔒</span>
                <p className="text-[11px] leading-relaxed" style={{ color: '#FCD34D' }}>
                  話す人が{MAX_SPEAKERS}人に達しました（上限）。聞くだけ参加でどうぞ。
                </p>
              </div>
            )}

            {/* 下部 3 カラム情報 (参加中 / 参加スタイル / 安心度) */}
            <div
              className="rounded-2xl flex items-stretch mt-3"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(157,92,255,0.18)',
              }}
            >
              <div className="flex-1 text-center py-3 px-2">
                <p className="text-sm font-extrabold inline-flex items-center gap-1" style={{ color: '#F0EEFF' }}>
                  👤 {participants.length}人
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(240,238,255,0.5)' }}>参加中</p>
              </div>
              <div className="w-px self-stretch my-2" style={{ background: 'rgba(157,92,255,0.18)' }} />
              <div className="flex-1 text-center py-3 px-2">
                <p className="text-sm font-extrabold inline-flex items-center gap-1" style={{ color: '#a5b4fc' }}>
                  📡 聞くだけOK
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(240,238,255,0.5)' }}>参加スタイル</p>
              </div>
              <div className="w-px self-stretch my-2" style={{ background: 'rgba(157,92,255,0.18)' }} />
              <div className="flex-1 text-center py-3 px-2">
                <p className="text-sm font-extrabold" style={{ color: '#fcd34d' }}>
                  ★★★★★
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(240,238,255,0.5)' }}>安心度</p>
              </div>
            </div>

            {/* こっそり聞く (補助オプション、控えめに) */}
            <button
              onClick={() => joinRoom('silent')}
              disabled={joining}
              className="w-full mt-3 py-2.5 rounded-2xl text-xs font-bold active:scale-95 transition-all"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(240,238,255,0.55)' }}
            >
              🫥 こっそり聞く (名前を伏せる)
            </button>
          </div>
        )}

        {/* ── リアクションパネル（参加後）── */}
        {/* ── YouTube 同時視聴パネル ── */}
        {joined && (
          <div className="mt-4 rounded-2xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base">▶️</span>
                <span className="text-xs font-bold truncate" style={{ color: 'rgba(240,238,255,0.7)' }}>
                  {youtubeVideoId ? '同時視聴中' : 'YouTube を一緒に見る'}
                </span>
              </div>
              {youtubeVideoId ? (
                <button onClick={stopYoutube}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full active:scale-95 transition-all"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>
                  停止
                </button>
              ) : (
                <button onClick={() => { setShowYoutubeInput(s => !s); setYoutubeError('') }}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full active:scale-95 transition-all"
                  style={{ background: 'rgba(157,92,255,0.18)', color: '#c4b5fd', border: '1px solid rgba(157,92,255,0.35)' }}>
                  {showYoutubeInput ? 'キャンセル' : '＋ URL を共有'}
                </button>
              )}
            </div>

            {/* URL 入力 */}
            {showYoutubeInput && !youtubeVideoId && (
              <div className="px-3 pb-3 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <input
                  type="url"
                  value={youtubeInput}
                  onChange={e => { setYoutubeInput(e.target.value); if (youtubeError) setYoutubeError('') }}
                  placeholder="https://youtu.be/... または https://youtube.com/watch?v=..."
                  className="w-full px-3 py-2 rounded-xl text-xs focus:outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(157,92,255,0.25)',
                    color: '#F0EEFF',
                    caretColor: '#9D5CFF',
                  }}
                />
                {youtubeError && (
                  <p className="text-[10px] font-bold" style={{ color: '#fca5a5' }}>⚠️ {youtubeError}</p>
                )}
                <button onClick={shareYoutube} disabled={!youtubeInput.trim()}
                  className="w-full py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40 active:scale-95 transition-all"
                  style={{ background: 'linear-gradient(135deg,#9D5CFF,#7B3FE4)', boxShadow: '0 4px 14px rgba(157,92,255,0.35)' }}>
                  ルームに共有する
                </button>
                <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(240,238,255,0.4)' }}>
                  ※ ルーム全員が同じ動画を見られます。再生位置の同期はありません（各自で操作）。
                </p>
              </div>
            )}

            {/* 埋め込みプレイヤー */}
            {youtubeVideoId && (
              <div className="px-3 pb-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="relative w-full overflow-hidden rounded-xl"
                  style={{ paddingBottom: '56.25%', background: '#000' }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=0&rel=0&modestbranding=1`}
                    className="absolute inset-0 w-full h-full"
                    title="YouTube 同時視聴"
                    allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
                <p className="text-[10px] mt-2 leading-relaxed" style={{ color: 'rgba(240,238,255,0.4)' }}>
                  同じ動画をルーム全員で見られます。再生・停止・シークは各自で操作してください。
                </p>
              </div>
            )}
          </div>
        )}

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
              {/* 登壇者: ミュートボタン (テスト期間中バイパス時は年齢未確認でも表示) */}
              {!isListener && (
                !ageBlocked ? (
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
              {/* 2026-05-08 YVOICE5 PR-A: 音声設定ボタン (新規)
                  押下で音声設定パネル (スピーカー / マイク音量 / 自動低下 / 読み上げ) を開く。
                  ブラウザ制限項目は「未対応」と明示し、見た目だけ ON/OFF の偽装はしない。
                  読み上げのみ Web Speech API で実機能。 */}
              <button onClick={() => setShowAudioSettings(true)}
                className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-90"
                style={{ background: 'rgba(99,102,241,0.12)', border: '1.5px solid rgba(99,102,241,0.35)', color: '#a5b4fc' }}
                title="音声設定">
                <Volume2 size={18} />
              </button>
              {/* 2026-05-08 YVOICE5 PR-A: 設定ボタン (新規)
                  押下で設定パネル (退出 / ルーム情報 / 音声設定への入口) を開く。
                  退出ボタンは setShowSettings 内に移動するのではなく既存ボタンも維持し、
                  ユーザーが迷わないよう既存挙動と並列にする。 */}
              <button onClick={() => setShowSettings(true)}
                className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-90"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.12)', color: 'rgba(240,238,255,0.7)' }}
                title="設定">
                <Settings size={18} />
              </button>
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

      {/* ── 2026-05-08 YVOICE5 PR-A: 入退室トースト ──
          下部コントロールの少し上に短時間表示。3秒で自動消滅。pointer-events-none
          でクリックを妨げない。voice_chat_messages には書き込まない (純表示のみ)。 */}
      {presenceToasts.length > 0 && joined && (
        <div className="fixed left-0 right-0 z-30 flex flex-col items-center gap-1.5 pointer-events-none"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 6.5rem)' }}>
          {presenceToasts.map(t => (
            <div key={t.id}
              className="px-3.5 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-2"
              style={t.kind === 'enter'
                ? { background: 'rgba(124,255,130,0.18)', border: '1px solid rgba(124,255,130,0.4)', color: '#7CFF82', backdropFilter: 'blur(8px)' }
                : { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(240,238,255,0.6)', backdropFilter: 'blur(8px)' }}>
              <span>{t.kind === 'enter' ? '👋' : '🚪'}</span>
              <span>{t.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── 2026-05-08 YVOICE5 PR-A: 設定パネル ──
          下部の歯車ボタン押下で開く。退出 / ルーム情報 / 音声設定への入口。
          既存の退出ボタン (下部赤丸) も維持しているので、ユーザーが迷わないよう
          設定パネル内の「退出」も同じ leaveRoom 関数を呼ぶ。 */}
      {showSettings && joined && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-md rounded-3xl p-5"
            style={{ background: '#0d0d1f', border: '1px solid rgba(157,92,255,0.3)', boxShadow: '0 0 40px rgba(157,92,255,0.2)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-base" style={{ color: '#F0EEFF' }}>設定</h3>
              <button onClick={() => setShowSettings(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-all"
                style={{ background: 'rgba(255,255,255,0.06)' }}>
                <X size={16} style={{ color: 'rgba(240,238,255,0.6)' }} />
              </button>
            </div>
            <div className="space-y-2">
              {/* ルーム情報 (静的表示) */}
              <div className="px-4 py-3 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(240,238,255,0.4)' }}>通話ルーム情報</p>
                <p className="text-sm font-extrabold mb-0.5" style={{ color: '#F0EEFF' }}>{room?.title ?? '-'}</p>
                <p className="text-xs" style={{ color: 'rgba(240,238,255,0.5)' }}>カテゴリ: {room?.category ?? '-'} · {participants.length}人参加中</p>
              </div>
              {/* 音声設定 */}
              <button
                onClick={() => { setShowSettings(false); setShowAudioSettings(true) }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl active:scale-[0.99] transition-all text-left"
                style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)' }}>
                <Volume2 size={20} style={{ color: '#a5b4fc' }} />
                <div className="flex-1">
                  <p className="font-bold text-sm" style={{ color: '#a5b4fc' }}>音声設定</p>
                  <p className="text-[10px]" style={{ color: 'rgba(165,180,252,0.6)' }}>マイク・スピーカー・読み上げ</p>
                </div>
              </button>
              {/* 退出 (既存 leaveRoom を呼ぶ。下部の赤退出ボタンと同じ処理) */}
              <button
                onClick={() => { setShowSettings(false); leaveRoom() }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl active:scale-[0.99] transition-all text-left"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <LogOut size={20} style={{ color: '#ef4444' }} />
                <div className="flex-1">
                  <p className="font-bold text-sm" style={{ color: '#ef4444' }}>通話ルームを退出</p>
                  <p className="text-[10px]" style={{ color: 'rgba(239,68,68,0.6)' }}>ホストの場合はルームが閉じます</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 2026-05-08 YVOICE5 PR-A: 音声設定パネル ──
          スピーカー / マイク音量 / ゲーム音自動低下はブラウザ / iOS Safari 制限で
          実効制御不可のため、トグルや実値スライダーを置かず「未対応」表記のみ。
          見た目だけ ON/OFF で実際は効かない偽装 UI を作らない方針 (CLAUDE.md 準拠)。
          通話チャット読み上げのみ Web Speech API で実機能 (ttsEnabled state)。 */}
      {showAudioSettings && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAudioSettings(false)} />
          <div className="relative w-full max-w-md rounded-3xl p-5"
            style={{ background: '#0d0d1f', border: '1px solid rgba(157,92,255,0.3)', boxShadow: '0 0 40px rgba(157,92,255,0.2)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-base" style={{ color: '#F0EEFF' }}>音声設定</h3>
              <button onClick={() => setShowAudioSettings(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-all"
                style={{ background: 'rgba(255,255,255,0.06)' }}>
                <X size={16} style={{ color: 'rgba(240,238,255,0.6)' }} />
              </button>
            </div>
            <div className="space-y-3">

              {/* スピーカー (出力先) */}
              <div className="px-4 py-3 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-extrabold" style={{ color: '#F0EEFF' }}>🔊 スピーカー</p>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(240,238,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    端末スピーカー
                  </span>
                </div>
                <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(240,238,255,0.4)' }}>
                  iPhone Safariでは出力先の切替・音量調整は本体の音量ボタンで行ってください（ブラウザ制限により未対応）。
                </p>
              </div>

              {/* マイク音量 */}
              <div className="px-4 py-3 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-extrabold" style={{ color: '#F0EEFF' }}>🎤 マイク音量</p>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(240,238,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    未対応
                  </span>
                </div>
                <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(240,238,255,0.4)' }}>
                  ブラウザの制約によりマイク音量の数値制御はできません。マイクの ON/OFF は下部のマイクボタンから切替できます。
                </p>
              </div>

              {/* ゲーム音を自動で小さくする */}
              <div className="px-4 py-3 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-extrabold" style={{ color: '#F0EEFF' }}>🎮 ゲーム音を自動で小さくする</p>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(240,238,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    未対応
                  </span>
                </div>
                <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(240,238,255,0.4)' }}>
                  ブラウザではゲーム音を自動で下げる機能（オーディオダッキング）は利用できません。
                </p>
              </div>

              {/* 通話チャット読み上げ (Web Speech API で実機能) */}
              <button
                onClick={() => setTtsEnabled(v => !v)}
                className="w-full px-4 py-3 rounded-2xl text-left active:scale-[0.99] transition-all"
                style={{
                  background: ttsEnabled ? 'rgba(124,255,130,0.10)' : 'rgba(255,255,255,0.04)',
                  border: ttsEnabled ? '1px solid rgba(124,255,130,0.4)' : '1px solid rgba(255,255,255,0.08)',
                }}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 pr-3">
                    <p className="text-xs font-extrabold" style={{ color: ttsEnabled ? '#7CFF82' : '#F0EEFF' }}>🗣️ 通話チャットを読み上げる</p>
                    <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: 'rgba(240,238,255,0.45)' }}>
                      届いた他の人のメッセージをブラウザの音声合成で読み上げます。自分の投稿は読み上げません。
                    </p>
                  </div>
                  {/* トグルスイッチ風表示 */}
                  <div className="w-11 h-6 rounded-full flex-shrink-0 flex items-center transition-colors"
                    style={{
                      background: ttsEnabled ? '#7CFF82' : 'rgba(255,255,255,0.18)',
                      paddingLeft: ttsEnabled ? '22px' : '2px',
                    }}>
                    <span className="w-5 h-5 rounded-full bg-white" />
                  </div>
                </div>
              </button>

              <p className="text-[10px] leading-relaxed pt-1" style={{ color: 'rgba(240,238,255,0.3)' }}>
                ※ 「未対応」表記の項目はブラウザ仕様の制約により、現時点では対応していません。今後のブラウザ対応や PWA / ネイティブ対応で順次拡張予定です。
              </p>
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
                YVOICEは<span className="font-bold" style={{ color: '#F0EEFF' }}>20歳以上</span>限定のコミュニティです。<br />
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
