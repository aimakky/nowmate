'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mic, Users, Radio, ShieldCheck, Lock } from 'lucide-react'
import Header from '@/components/layout/Header'
import { canCreateVoiceRoom } from '@/lib/permissions'
import VoiceRulesModal from '@/components/rules/VoiceRulesModal'
import { fetchRulesBundle, hasVoiceRulesAck } from '@/lib/rules'

const CATEGORIES = ['雑談', '夜話', '相談', '悩み', '笑い', '趣味']

const CAT_EMOJI: Record<string, string> = {
  '雑談': '💬', '夜話': '🌙', '相談': '🤝', '悩み': '💭', '笑い': '😂', '趣味': '🎵'
}

interface Room {
  id: string
  title: string
  category: string
  is_open: boolean
  status: string
  created_at: string
  host_id: string
  agenda?: string | null
  profiles: { display_name: string; nationality: string; avatar_url: string | null }
  voice_participants: { user_id: string; is_listener: boolean; profiles: { avatar_url: string | null; display_name: string } | null }[]
}

export default function VoicePage() {
  const router = useRouter()
  const [tab, setTab] = useState<'follow' | 'open'>('open')
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [showCreate,    setShowCreate]    = useState(false)
  const [newTitle,      setNewTitle]      = useState('')
  const [newCat,        setNewCat]        = useState('雑談')
  const [newIsOpen,     setNewIsOpen]     = useState(true)
  const [newAgenda,     setNewAgenda]     = useState('')
  const [creating,      setCreating]      = useState(false)
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null)

  // ルーム入室前ガイドゲート（fail-closed: 取得失敗時もモーダルを表示し、ユーザーが意識して同意してから入室）
  async function attemptEnterRoom(roomId: string) {
    try {
      const bundle = await fetchRulesBundle()
      if (hasVoiceRulesAck(bundle.bundleVersion)) {
        router.push(`/voice/${roomId}`)
        return
      }
    } catch {
      // フォールスルーしてモーダル表示
    }
    setPendingRoomId(roomId)
  }
  const [myAgeVerified, setMyAgeVerified] = useState(false)
  const [myAgeStatus,   setMyAgeStatus]   = useState<string>('unverified')
  const [showAgeGate,   setShowAgeGate]   = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const { data: p } = await supabase
        .from('profiles')
        .select('age_verified, age_verification_status')
        .eq('id', user.id)
        .single()
      const verified = p?.age_verified === true && p?.age_verification_status === 'age_verified'
      setMyAgeVerified(verified)
      setMyAgeStatus(p?.age_verification_status ?? 'unverified')
    })
  }, [])

  const fetchRooms = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('voice_rooms')
      .select('*, profiles(display_name, nationality, avatar_url), voice_participants(user_id, is_listener, profiles(avatar_url, display_name))')
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

  useEffect(() => {
    const supabase = createClient()
    // postgres_changes はテーブル全体への broadcast のため、参加者の
    // 入退室が頻発するピーク時には N ユーザー × M イベントの fan-out
    // で fetchRooms が叩かれる。900ms デバウンスでまとめて 1 回に集約。
    let pending: ReturnType<typeof setTimeout> | null = null
    const debouncedFetch = () => {
      if (pending) clearTimeout(pending)
      pending = setTimeout(() => { pending = null; fetchRooms() }, 900)
    }
    const channel = supabase.channel('voice_rooms_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voice_participants' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voice_rooms' }, debouncedFetch)
      .subscribe()
    return () => {
      if (pending) clearTimeout(pending)
      supabase.removeChannel(channel)
    }
  }, [fetchRooms])

  async function handleCreate() {
    if (!userId || !newTitle.trim() || creating) return
    const perm = canCreateVoiceRoom({ id: userId, age_verified: myAgeVerified, age_verification_status: myAgeStatus as any })
    if (!perm.allowed) {
      setShowCreate(false)
      setShowAgeGate(true)
      return
    }
    setCreating(true)
    const supabase = createClient()
    const { data } = await supabase.from('voice_rooms').insert({
      host_id:  userId,
      title:    newTitle.trim(),
      category: newCat,
      is_open:  newIsOpen,
      room_type: 'open_voice_room',
      access_mode: 'age_verified_only',
      allow_unverified_listeners: false,
      safety_level: 3,
      ...(newAgenda.trim() ? { agenda: newAgenda.trim() } : {}),
    }).select().single()
    if (data) {
      await supabase.from('voice_participants').insert({
        room_id: data.id,
        user_id: userId,
        is_listener: false,
        join_mode: 'speaker',
        role: 'host',
      })
      setShowCreate(false)
      setNewTitle('')
      setNewAgenda('')
      attemptEnterRoom(data.id)
    }
    setCreating(false)
  }

  const displayed = rooms.filter(r =>
    tab === 'open' ? r.is_open : followingIds.has(r.host_id) || r.host_id === userId
  )

  return (
    <div className="max-w-md mx-auto min-h-screen" style={{ background: '#080812' }}>
      <Header title="通話ルーム" />

      {/* フォロー中 / すべて タブ */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex gap-1 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(157,92,255,0.15)' }}>
          <button onClick={() => setTab('follow')}
            className="flex-1 py-2 text-xs font-bold rounded-lg transition-all"
            style={tab === 'follow'
              ? { background: 'rgba(157,92,255,0.2)', color: '#9D5CFF', border: '1px solid rgba(157,92,255,0.35)' }
              : { color: 'rgba(240,238,255,0.4)' }}>
            👥 フォロー中
          </button>
          <button onClick={() => setTab('open')}
            className="flex-1 py-2 text-xs font-bold rounded-lg transition-all"
            style={tab === 'open'
              ? { background: 'rgba(157,92,255,0.2)', color: '#9D5CFF', border: '1px solid rgba(157,92,255,0.35)' }
              : { color: 'rgba(240,238,255,0.4)' }}>
            🎙️ すべての通話
          </button>
        </div>
      </div>

      {/* ルーム一覧 */}
      <div className="px-4 pb-28 space-y-3 pt-2">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl p-4 h-36 animate-shimmer"
              style={{ border: '1px solid rgba(157,92,255,0.15)' }} />
          ))
        ) : displayed.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🎙️</div>
            <p className="font-bold mb-1" style={{ color: '#F0EEFF' }}>
              {tab === 'follow' ? 'フォロー中の人の通話はまだありません' : '今は通話ルームがありません'}
            </p>
            <p className="text-sm mb-5" style={{ color: 'rgba(240,238,255,0.4)' }}>最初のルームを開いてみましょう！</p>
            <button onClick={() => setShowCreate(true)}
              className="px-5 py-2.5 rounded-2xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#9D5CFF,#7B3FE4)', boxShadow: '0 4px 16px rgba(157,92,255,0.4)' }}>
              🎙️ 通話を始める
            </button>
          </div>
        ) : (
          displayed.map(room => {
            const speakers  = room.voice_participants?.filter(p => !p.is_listener) || []
            const listeners = room.voice_participants?.filter(p =>  p.is_listener) || []
            const total     = room.voice_participants?.length || 0
            const bannerPeople = [...speakers, ...listeners].slice(0, 6)

            const CAT_GRADIENT: Record<string, string> = {
              '雑談': 'linear-gradient(135deg,#4C1D95 0%,#7C3AED 100%)',
              '夜話': 'linear-gradient(135deg,#1e1b4b 0%,#312e81 100%)',
              '相談': 'linear-gradient(135deg,#0f766e 0%,#0891b2 100%)',
              '悩み': 'linear-gradient(135deg,#7c3aed 0%,#FF4D90 100%)',
              '笑い': 'linear-gradient(135deg,#b45309 0%,#FF4D90 100%)',
              '趣味': 'linear-gradient(135deg,#9D5CFF 0%,#49E1FF 100%)',
            }
            const gradient = CAT_GRADIENT[room.category] ?? 'linear-gradient(135deg,#9D5CFF 0%,#FF4D90 100%)'

            return (
              <div key={room.id}
                onClick={() => attemptEnterRoom(room.id)}
                className="rounded-2xl overflow-hidden cursor-pointer active:scale-[0.99] transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(157,92,255,0.2)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>

                {/* カラーバナー */}
                <div className="relative h-24 flex items-end px-4 pb-3" style={{ background: gradient }}>
                  <div className="absolute top-3 left-4 flex items-center gap-2">
                    <span className="text-lg">{CAT_EMOJI[room.category] ?? '✨'}</span>
                    <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider">{room.category}</span>
                  </div>
                  <div className="absolute top-3 right-4 flex items-center gap-1.5 px-2 py-1 rounded-full"
                    style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)' }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#7CFF82', boxShadow: '0 0 6px #7CFF82' }} />
                    <span className="text-[10px] font-extrabold tracking-wider" style={{ color: '#7CFF82' }}>LIVE</span>
                  </div>

                  <div className="flex items-center">
                    {bannerPeople.map((p, i) => (
                      <div key={p.user_id}
                        className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                        style={{ marginLeft: i === 0 ? 0 : '-10px', zIndex: bannerPeople.length - i, border: '2px solid rgba(255,255,255,0.4)', background: 'rgba(0,0,0,0.3)' }}>
                        {p.profiles?.avatar_url
                          ? <img src={p.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                          : <span className="text-base font-bold text-white">{p.profiles?.display_name?.[0]?.toUpperCase() ?? '?'}</span>
                        }
                      </div>
                    ))}
                    {total > 6 && (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ marginLeft: '-10px', background: 'rgba(0,0,0,0.5)', border: '2px solid rgba(255,255,255,0.3)' }}>
                        <span className="text-[10px] font-bold text-white">+{total - 6}</span>
                      </div>
                    )}
                    {total === 0 && <span className="text-xs text-white/50">まだ誰もいません</span>}
                  </div>
                </div>

                {/* カード本文 */}
                <div className="px-4 pt-3 pb-3.5">
                  <p className="font-extrabold text-sm leading-snug mb-1" style={{ color: '#F0EEFF' }}>{room.title}</p>
                  {room.agenda && (
                    <p className="text-[11px] leading-relaxed line-clamp-2 mb-2" style={{ color: 'rgba(240,238,255,0.5)' }}>{room.agenda}</p>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium truncate max-w-[120px]" style={{ color: 'rgba(240,238,255,0.5)' }}>
                        👑 {room.profiles?.display_name}
                      </span>
                      {!room.is_open && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                          style={{ background: 'rgba(157,92,255,0.15)', color: '#c084fc', border: '1px solid rgba(157,92,255,0.3)' }}>限定</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs flex items-center gap-1" style={{ color: 'rgba(240,238,255,0.45)' }}>
                        <Mic size={10} /> {speakers.length}
                      </span>
                      {listeners.length > 0 && (
                        <span className="text-xs flex items-center gap-1" style={{ color: 'rgba(240,238,255,0.45)' }}>
                          <Radio size={10} /> {listeners.length}
                        </span>
                      )}
                      <span className="text-[11px] font-bold px-3 py-1.5 rounded-xl text-white"
                        style={{ background: gradient, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                        参加 →
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* フローティングボタン */}
      <button
        onClick={() => myAgeVerified ? setShowCreate(true) : setShowAgeGate(true)}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-2xl flex items-center justify-center active:scale-90 transition-all z-30"
        style={{
          background: 'linear-gradient(135deg, #9D5CFF 0%, #FF4D90 100%)',
          boxShadow: '0 4px 20px rgba(157,92,255,0.5), 0 0 40px rgba(157,92,255,0.2)',
        }}>
        {myAgeVerified ? <Mic size={22} className="text-white" /> : <Lock size={22} className="text-white" />}
      </button>

      {/* 年齢確認ゲートモーダル */}
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
              <h3 className="font-extrabold text-lg mb-1.5" style={{ color: '#F0EEFF' }}>通話機能は年齢確認が必要です</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(240,238,255,0.55)' }}>
                sameeの通話ルーム作成・参加は、<br />
                <span className="font-bold" style={{ color: '#F0EEFF' }}>20歳以上</span>であることの確認が必要です。
              </p>
            </div>
            {myAgeStatus === 'pending' ? (
              <div className="rounded-2xl px-4 py-3 mb-4 text-center"
                style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)' }}>
                <p className="text-sm font-bold" style={{ color: '#FCD34D' }}>⏳ 確認処理中</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(252,211,77,0.7)' }}>通常1〜2営業日でご連絡します</p>
              </div>
            ) : myAgeStatus === 'rejected' ? (
              <div className="rounded-2xl px-4 py-3 mb-4 text-center"
                style={{ background: 'rgba(255,77,144,0.1)', border: '1px solid rgba(255,77,144,0.25)' }}>
                <p className="text-sm font-bold" style={{ color: '#FF84B0' }}>❌ 確認が却下されました</p>
              </div>
            ) : null}
            <div className="space-y-2.5">
              <button
                onClick={() => { setShowAgeGate(false); router.push('/verify-age') }}
                className="w-full py-3.5 rounded-2xl font-extrabold text-sm text-white active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#9D5CFF,#7B3FE4)', boxShadow: '0 4px 20px rgba(157,92,255,0.4)' }}>
                <ShieldCheck size={16} /> 年齢確認をする
              </button>
              <button onClick={() => setShowAgeGate(false)}
                className="w-full py-3 text-sm font-medium" style={{ color: 'rgba(240,238,255,0.4)' }}>
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ルーム作成モーダル */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-md rounded-3xl p-6"
            style={{ background: '#0d0d1f', border: '1px solid rgba(157,92,255,0.3)', boxShadow: '0 0 40px rgba(157,92,255,0.15)' }}>
            <h3 className="font-extrabold text-lg mb-4" style={{ color: '#F0EEFF' }}>🎙️ 通話ルームを作る</h3>

            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="タイトル… 例：APEXランク募集・雑談しようよ"
              className="w-full px-4 py-3 rounded-2xl text-sm mb-3"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(157,92,255,0.25)', color: '#F0EEFF', outline: 'none' }}
              autoFocus
            />

            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(240,238,255,0.4)' }}>
              アジェンダ <span className="normal-case font-normal" style={{ color: 'rgba(240,238,255,0.25)' }}>（任意）</span>
            </p>
            <textarea
              value={newAgenda}
              onChange={e => setNewAgenda(e.target.value.slice(0, 120))}
              placeholder="今日話したいこと…"
              rows={2}
              className="w-full px-4 py-2.5 rounded-2xl text-sm resize-none mb-4"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(157,92,255,0.25)', color: '#F0EEFF', outline: 'none' }}
            />

            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(240,238,255,0.4)' }}>カテゴリ</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setNewCat(c)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                  style={newCat === c
                    ? { background: 'rgba(157,92,255,0.25)', color: '#9D5CFF', border: '1px solid rgba(157,92,255,0.5)' }
                    : { background: 'rgba(255,255,255,0.05)', color: 'rgba(240,238,255,0.5)', border: '1px solid rgba(157,92,255,0.15)' }}>
                  {CAT_EMOJI[c]} {c}
                </button>
              ))}
            </div>

            <div className="flex gap-2 mb-5">
              <button onClick={() => setNewIsOpen(true)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                style={newIsOpen
                  ? { background: 'rgba(157,92,255,0.2)', color: '#9D5CFF', border: '1px solid rgba(157,92,255,0.4)' }
                  : { background: 'rgba(255,255,255,0.04)', color: 'rgba(240,238,255,0.4)', border: '1px solid rgba(157,92,255,0.15)' }}>
                🌏 全員に公開
              </button>
              <button onClick={() => setNewIsOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                style={!newIsOpen
                  ? { background: 'rgba(157,92,255,0.2)', color: '#9D5CFF', border: '1px solid rgba(157,92,255,0.4)' }
                  : { background: 'rgba(255,255,255,0.04)', color: 'rgba(240,238,255,0.4)', border: '1px solid rgba(157,92,255,0.15)' }}>
                👥 フォロワーのみ
              </button>
            </div>

            <button onClick={handleCreate} disabled={!newTitle.trim() || creating}
              className="w-full py-4 rounded-2xl font-extrabold text-base text-white disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#9D5CFF,#FF4D90)', boxShadow: '0 4px 20px rgba(157,92,255,0.4)' }}>
              {creating
                ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Mic size={18} /> ルームを開く</>}
            </button>
          </div>
        </div>
      )}

      {/* 通話ルーム入室前の安心ガイド */}
      {pendingRoomId && (
        <VoiceRulesModal
          onAcknowledged={() => {
            const id = pendingRoomId
            setPendingRoomId(null)
            router.push(`/voice/${id}`)
          }}
          onClose={() => setPendingRoomId(null)}
        />
      )}
    </div>
  )
}
