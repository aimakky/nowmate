'use client'

// グループ通話ページ。BottomNav の「グループ」タブから到達する。
// 既存の voice_rooms テーブルをそのまま再利用し、room_type='group_voice_room'
// で識別する。DB 変更なし (既存スキーマで room_type は varchar)。
//
// 機能スコープ (初期):
// - 進行中のグループ通話一覧 (active かつ room_type='group_voice_room')
// - グループ通話の作成 (タイトル + 任意で agenda)
// - 作成すると既存の /voice/[roomId] へ遷移して LiveKit セッション開始
// - 空状態
//
// 招待・参加フレンド選択は将来拡張。今は作成後に FriendAvatarRail と
// 既存共有導線 (URL) で誘う運用。

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Users, Mic, Plus, X, ChevronRight, Headphones, Loader2 } from 'lucide-react'
import { canCreateVoiceRoom } from '@/lib/permissions'

type GroupRoom = {
  id: string
  title: string
  category: string | null
  is_open: boolean
  status: string
  created_at: string
  host_id: string
  agenda: string | null
  profiles: { display_name: string; avatar_url: string | null } | null
  voice_participants: { user_id: string; profiles: { avatar_url: string | null; display_name: string } | null }[]
}

export default function GroupPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [myDisplayName, setMyDisplayName] = useState<string>('')
  const [myAgeVerified, setMyAgeVerified] = useState(false)
  const [myAgeStatus, setMyAgeStatus] = useState<string>('unverified')
  const [rooms, setRooms] = useState<GroupRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newAgenda, setNewAgenda] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const { data: p } = await supabase
        .from('profiles')
        .select('display_name, age_verified, age_verification_status')
        .eq('id', user.id)
        .single()
      setMyDisplayName(p?.display_name ?? '')
      const verified = p?.age_verified === true && p?.age_verification_status === 'age_verified'
      setMyAgeVerified(verified)
      setMyAgeStatus(p?.age_verification_status ?? 'unverified')
    })
  }, [router])

  const fetchRooms = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('voice_rooms')
      .select('*, profiles(display_name, avatar_url), voice_participants(user_id, profiles(avatar_url, display_name))')
      .eq('status', 'active')
      .eq('room_type', 'group_voice_room')
      .order('created_at', { ascending: false })
      .limit(30)
    if (error) console.error('[group] voice_rooms fetch error:', error)
    setRooms((data || []) as GroupRoom[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchRooms() }, [fetchRooms])

  // 軽量リアルタイム: voice_rooms / voice_participants の変更で再取得
  useEffect(() => {
    const supabase = createClient()
    let pending: ReturnType<typeof setTimeout> | null = null
    const debounced = () => {
      if (pending) clearTimeout(pending)
      pending = setTimeout(() => { pending = null; fetchRooms() }, 900)
    }
    const channel = supabase.channel('group_voice_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voice_rooms' }, debounced)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voice_participants' }, debounced)
      .subscribe()
    return () => {
      if (pending) clearTimeout(pending)
      supabase.removeChannel(channel)
    }
  }, [fetchRooms])

  function defaultTitle(): string {
    if (myDisplayName) return `${myDisplayName} のグループ`
    return 'グループ通話'
  }

  async function handleCreate() {
    if (!userId || creating) return
    setCreateError(null)

    const perm = canCreateVoiceRoom({
      id: userId,
      age_verified: myAgeVerified,
      age_verification_status: myAgeStatus as any,
    })
    if (!perm.allowed) {
      setCreateError('グループ通話の作成には年齢確認が必要です')
      return
    }

    const title = (newTitle.trim() || defaultTitle()).slice(0, 40)
    setCreating(true)
    const supabase = createClient()
    // 既存 voice page と同じ insert 形式 + room_type だけ 'group_voice_room' に
    const { data, error } = await supabase.from('voice_rooms').insert({
      host_id: userId,
      title,
      category: '雑談',
      is_open: true,
      room_type: 'group_voice_room',
      access_mode: 'age_verified_only',
      allow_unverified_listeners: false,
      safety_level: 3,
      ...(newAgenda.trim() ? { agenda: newAgenda.trim() } : {}),
    }).select().single()
    if (error || !data) {
      console.error('[group] create error:', error)
      setCreateError(error?.message ?? '作成に失敗しました')
      setCreating(false)
      return
    }
    // ホストとして自分を participants に登録
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
    setCreating(false)
    router.push(`/voice/${data.id}`)
  }

  return (
    <div className="max-w-md mx-auto min-h-screen" style={{ background: '#080812' }}>
      {/* タイトルブロック */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                background: 'rgba(39,223,255,0.15)',
                border: '1px solid rgba(39,223,255,0.35)',
              }}
            >
              <Users size={16} style={{ color: '#27DFFF' }} />
            </div>
            <h1 className="text-xl font-extrabold" style={{ color: '#F0EEFF' }}>グループ</h1>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-extrabold active:scale-95 transition-all"
            style={{
              background: 'linear-gradient(135deg, #27DFFF, #39FF88)',
              color: '#0a0a18',
              boxShadow: '0 4px 16px rgba(39,223,255,0.35)',
            }}
            aria-label="グループ通話を作成"
          >
            <Plus size={13} />
            作成
          </button>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(240,238,255,0.45)' }}>
          フレンドとグループ通話できます。今すぐ話したい人を集めて始めましょう。
        </p>
      </div>

      {/* 進行中グループ通話 */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-2 mt-2">
          <p className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: 'rgba(240,238,255,0.4)' }}>
            進行中のグループ通話
          </p>
          <Link
            href="/voice"
            className="text-[10px] font-bold flex items-center gap-0.5 active:opacity-70"
            style={{ color: 'rgba(240,238,255,0.4)' }}
          >
            通話ルーム全部
            <ChevronRight size={10} />
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin" style={{ color: '#27DFFF' }} />
          </div>
        ) : rooms.length === 0 ? (
          <EmptyState onCreate={() => setShowCreate(true)} />
        ) : (
          <div className="space-y-2">
            {rooms.map(r => (
              <RoomCard key={r.id} room={r} />
            ))}
          </div>
        )}
      </div>

      {/* 作成ボトムシート */}
      {showCreate && (
        <CreateSheet
          defaultTitle={defaultTitle()}
          newTitle={newTitle}
          setNewTitle={setNewTitle}
          newAgenda={newAgenda}
          setNewAgenda={setNewAgenda}
          creating={creating}
          createError={createError}
          onClose={() => { setShowCreate(false); setCreateError(null) }}
          onSubmit={handleCreate}
        />
      )}
    </div>
  )
}

// ─── 子コンポーネント ──────────────────────────────────────────

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div
      className="flex flex-col items-center text-center px-6 py-12 rounded-3xl"
      style={{
        background: 'linear-gradient(180deg, rgba(39,223,255,0.06), rgba(57,255,136,0.04))',
        border: '1px dashed rgba(39,223,255,0.32)',
      }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{
          background: 'rgba(39,223,255,0.14)',
          border: '1px solid rgba(39,223,255,0.35)',
        }}
      >
        <Headphones size={22} style={{ color: '#27DFFF' }} />
      </div>
      <p className="font-extrabold text-sm mb-1" style={{ color: '#F0EEFF' }}>
        まだグループ通話はありません
      </p>
      <p className="text-xs mb-5 leading-relaxed" style={{ color: 'rgba(240,238,255,0.5)' }}>
        フレンドを誘って、今すぐ話してみましょう。
      </p>
      <button
        onClick={onCreate}
        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-extrabold active:scale-95 transition-all"
        style={{
          background: 'linear-gradient(135deg, #27DFFF, #39FF88)',
          color: '#0a0a18',
          boxShadow: '0 4px 18px rgba(39,223,255,0.35)',
        }}
      >
        <Mic size={13} />
        グループ通話を作る
      </button>
    </div>
  )
}

function RoomCard({ room }: { room: GroupRoom }) {
  const participants = room.voice_participants ?? []
  const visible = participants.slice(0, 4)
  const more = Math.max(0, participants.length - visible.length)
  return (
    <Link
      href={`/voice/${room.id}`}
      className="flex items-center gap-3 px-4 py-3 rounded-2xl active:scale-[0.99] transition-all"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.10)',
      }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 relative"
        style={{
          background: 'rgba(39,223,255,0.14)',
          border: '1px solid rgba(39,223,255,0.35)',
        }}
      >
        <Headphones size={18} style={{ color: '#27DFFF' }} />
        <span
          className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full"
          style={{
            background: '#39FF88',
            border: '2px solid #080812',
            boxShadow: '0 0 6px rgba(57,255,136,0.6)',
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-extrabold truncate" style={{ color: '#F0EEFF' }}>
          {room.title || 'グループ通話'}
        </p>
        <p className="text-[11px] mt-0.5 flex items-center gap-1.5" style={{ color: 'rgba(240,238,255,0.45)' }}>
          <span className="flex items-center gap-0.5">
            <Users size={10} />
            {participants.length}人
          </span>
          {room.profiles?.display_name && (
            <>
              <span style={{ color: 'rgba(240,238,255,0.25)' }}>・</span>
              <span className="truncate">{room.profiles.display_name}さんのルーム</span>
            </>
          )}
        </p>
      </div>
      {visible.length > 0 && (
        <div className="flex -space-x-1.5 flex-shrink-0">
          {visible.map((p, i) => (
            <div
              key={`${p.user_id}-${i}`}
              className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-extrabold text-white"
              style={{
                background: 'rgba(157,92,255,0.4)',
                border: '2px solid #080812',
              }}
            >
              {p.profiles?.avatar_url ? (
                <img src={p.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>{(p.profiles?.display_name ?? '?').charAt(0).toUpperCase()}</span>
              )}
            </div>
          ))}
          {more > 0 && (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-extrabold"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '2px solid #080812',
                color: 'rgba(240,238,255,0.6)',
              }}
            >
              +{more}
            </div>
          )}
        </div>
      )}
      <ChevronRight size={14} style={{ color: 'rgba(240,238,255,0.35)' }} className="flex-shrink-0" />
    </Link>
  )
}

function CreateSheet({
  defaultTitle, newTitle, setNewTitle, newAgenda, setNewAgenda,
  creating, createError, onClose, onSubmit,
}: {
  defaultTitle: string
  newTitle: string
  setNewTitle: (v: string) => void
  newAgenda: string
  setNewAgenda: (v: string) => void
  creating: boolean
  createError: string | null
  onClose: () => void
  onSubmit: () => void
}) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])
  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md mx-auto rounded-t-3xl overflow-hidden"
        style={{
          background: '#0d0b1f',
          border: '1px solid rgba(255,255,255,0.08)',
          borderBottom: 'none',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} />
        </div>
        <div className="flex items-center gap-2 px-4 py-2">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center active:opacity-60"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <X size={16} style={{ color: 'rgba(255,255,255,0.6)' }} />
          </button>
          <p className="text-sm font-extrabold flex-1" style={{ color: '#F0EEFF' }}>
            グループ通話を作る
          </p>
          <button
            onClick={onSubmit}
            disabled={creating}
            className="px-4 py-1.5 rounded-full text-xs font-extrabold transition-all active:scale-95 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #27DFFF, #39FF88)',
              color: '#0a0a18',
            }}
          >
            {creating ? '作成中...' : '作成'}
          </button>
        </div>

        <div className="px-5 pt-2 pb-6 space-y-4">
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-widest block mb-1.5"
              style={{ color: 'rgba(240,238,255,0.4)' }}>
              ルーム名
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder={defaultTitle}
              maxLength={40}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#F0EEFF',
              }}
            />
            <p className="text-[10px] mt-1" style={{ color: 'rgba(240,238,255,0.3)' }}>
              空欄なら「{defaultTitle}」になります
            </p>
          </div>

          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-widest block mb-1.5"
              style={{ color: 'rgba(240,238,255,0.4)' }}>
              話したいこと (任意)
            </label>
            <textarea
              value={newAgenda}
              onChange={e => setNewAgenda(e.target.value)}
              placeholder="例: 今夜のゲームの相談、雑談"
              rows={2}
              maxLength={120}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none resize-none"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#F0EEFF',
              }}
            />
          </div>

          {createError && (
            <div
              className="rounded-xl px-3 py-2 text-xs font-bold"
              style={{
                background: 'rgba(239,68,68,0.10)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#fecaca',
              }}
            >
              {createError}
            </div>
          )}

          <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(240,238,255,0.35)' }}>
            ⚠️ 出会い系ではなくゲーム仲間と話すための通話です。録音・録画は禁止です。
          </p>
        </div>
      </div>
    </div>
  )
}
