'use client'

// グループ通話ページ。BottomNav の「グループ」タブから到達する。
// 既存の voice_rooms テーブルをそのまま再利用し、room_type='group_voice_room'
// で識別する。DB 変更なし (既存スキーマで room_type は varchar)。
//
// v2 (UI restructure):
//   - 旧シアン (#27DFFF) + 緑 (#39FF88) の二色 brand → YVOICE 紫一色に統一
//   - 巨大ヒーローや作成ボタンを上部から削除し、右下 FAB に集約
//   - ルームカードを「アイコン + 名前 + 人数 + 状態 + 矢印」のシンプル一覧に
//     (ゲーム村と同じ仕様)
//   - 配色は SIMPLE_COLORS の dark purple base に統一
//   - ダーク紫基調を完全維持 (白基調にはしない)
//
// 機能・データ取得・LiveKit 中核処理は完全維持。

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Users, Mic, Plus, X, ChevronRight, Headphones, Loader2 } from 'lucide-react'
import { canCreateVoiceRoom } from '@/lib/permissions'
import { SIMPLE_COLORS } from '@/components/ui/SimpleCard'
import PageHeader from '@/components/layout/PageHeader'

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
    <div className="max-w-md mx-auto min-h-screen" style={{ background: SIMPLE_COLORS.pageBg }}>

      {/* ── ヘッダー (2026-05-09: 共通 PageHeader に移行) ──
          - 旧: 非 sticky / pt-5 pb-3 / アクセントなし / label/subtitle なし
          - 新: 共通 PageHeader (sticky top-0 z-10) / pt-12 pb-3 / 青アクセント
          - 既存の青系ネオンを accentColor=#3B82F6 として継承 */}
      <PageHeader
        label="GROUPS"
        title="グループ"
        subtitle="フレンドとグループ通話できます"
        icon={Users}
        accentColor="#3B82F6"
      />

      {/* ── 一覧 ── */}
      {/* 2026-05-09: BottomNav (h-16=64px) クリアランスを TL/通知/チャット と同じ pb-28 に統一 */}
      <div className="px-4 pb-28">
        {loading ? (
          <div className="space-y-2.5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl px-4 py-3.5 animate-pulse flex items-center gap-3"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(59,130,246,0.12)',
                }}>
                <div className="w-12 h-12 rounded-2xl flex-shrink-0"
                  style={{ background: 'rgba(59,130,246,0.12)' }} />
                <div className="flex-1 h-4 rounded" style={{ background: 'rgba(59,130,246,0.10)' }} />
                <div className="w-14 h-7 rounded-full" style={{ background: 'rgba(59,130,246,0.12)' }} />
              </div>
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <EmptyState onCreate={() => setShowCreate(true)} />
        ) : (
          <div className="space-y-2.5">
            {rooms.map(r => (
              <RoomCard key={r.id} room={r} onClick={() => router.push(`/voice/${r.id}`)} />
            ))}
          </div>
        )}
      </div>

      {/* ── FAB (グループ通話作成、紫アクセント) ── */}
      <button
        onClick={() => setShowCreate(true)}
        className="fixed right-5 w-14 h-14 rounded-2xl flex items-center justify-center active:scale-90 transition-all z-30"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
          background: SIMPLE_COLORS.accent,
          boxShadow: '0 8px 24px rgba(59,130,246,0.5), 0 0 20px rgba(59,130,246,0.3)',
        }}
        aria-label="グループ通話を作る"
      >
        <Plus size={22} className="text-white" />
      </button>

      {/* ── 作成ボトムシート ── */}
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
    <div className="flex flex-col items-center text-center px-6 py-14 rounded-3xl"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px dashed rgba(59,130,246,0.30)',
      }}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'rgba(59,130,246,0.16)', border: '1px solid rgba(59,130,246,0.35)' }}>
        <Headphones size={22} style={{ color: '#c4b5fd' }} />
      </div>
      <p className="font-extrabold text-sm mb-1.5" style={{ color: SIMPLE_COLORS.textPrimary }}>
        まだグループ通話はありません
      </p>
      <p className="text-xs mb-5 leading-relaxed" style={{ color: SIMPLE_COLORS.textSecondary }}>
        フレンドを誘って、今すぐ話してみましょう。
      </p>
      <button
        onClick={onCreate}
        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-extrabold active:scale-95 transition-all"
        style={{
          background: SIMPLE_COLORS.accent,
          color: '#ffffff',
          boxShadow: '0 4px 14px rgba(59,130,246,0.4)',
        }}
      >
        <Mic size={13} />
        グループ通話を作る
      </button>
    </div>
  )
}

// ── シンプルカード (アイコン + 名前 + 人数 + 状態 + 矢印) ──
function RoomCard({ room, onClick }: { room: GroupRoom; onClick: () => void }) {
  const participants = room.voice_participants ?? []
  const visible = participants.slice(0, 3)
  const more = Math.max(0, participants.length - visible.length)
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl active:scale-[0.99] transition-all cursor-pointer"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(59,130,246,0.18)',
      }}
    >
      {/* アイコンタイル + LIVE 状態ドット */}
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 relative"
        style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.22), rgba(29,78,216,0.16))',
          border: '1px solid rgba(59,130,246,0.30)',
        }}>
        <Headphones size={18} style={{ color: '#c4b5fd' }} />
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
          style={{
            background: '#3B82F6',
            border: '2px solid #0a0a18',
            boxShadow: '0 0 6px rgba(59,130,246,0.7)',
          }} />
      </div>

      {/* 名前 + 状態 */}
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-extrabold truncate" style={{ color: SIMPLE_COLORS.textPrimary }}>
          {room.title || 'グループ通話'}
          <span className="ml-1.5 font-bold" style={{ color: SIMPLE_COLORS.textSecondary }}>
            ({participants.length})
          </span>
        </p>
        <p className="text-[11px] mt-0.5 flex items-center gap-1.5" style={{ color: SIMPLE_COLORS.textTertiary }}>
          <span style={{ color: '#c4b5fd' }}>● 通話中</span>
          {room.profiles?.display_name && (
            <>
              <span>・</span>
              <span className="truncate">{room.profiles.display_name}さん</span>
            </>
          )}
        </p>
      </div>

      {/* 参加アバタースタック */}
      {visible.length > 0 && (
        <div className="flex -space-x-1.5 flex-shrink-0">
          {visible.map((p, i) => (
            <div
              key={`${p.user_id}-${i}`}
              className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-extrabold text-white"
              style={{
                background: 'rgba(59,130,246,0.4)',
                border: '2px solid #0a0a18',
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
                background: 'rgba(255,255,255,0.06)',
                border: '2px solid #0a0a18',
                color: SIMPLE_COLORS.textSecondary,
              }}
            >
              +{more}
            </div>
          )}
        </div>
      )}

      <ChevronRight size={14} style={{ color: SIMPLE_COLORS.textTertiary }} className="flex-shrink-0" />
    </div>
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
          border: '1px solid rgba(59,130,246,0.20)',
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
          <p className="text-sm font-extrabold flex-1" style={{ color: SIMPLE_COLORS.textPrimary }}>
            グループ通話を作る
          </p>
          <button
            onClick={onSubmit}
            disabled={creating}
            className="px-4 py-1.5 rounded-full text-xs font-extrabold transition-all active:scale-95 disabled:opacity-50"
            style={{
              background: SIMPLE_COLORS.accent,
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(59,130,246,0.4)',
            }}
          >
            {creating ? '作成中...' : '作成'}
          </button>
        </div>

        <div className="px-5 pt-2 pb-6 space-y-4">
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-widest block mb-1.5"
              style={{ color: SIMPLE_COLORS.textTertiary }}>
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
                border: '1px solid rgba(59,130,246,0.18)',
                color: SIMPLE_COLORS.textPrimary,
              }}
            />
            <p className="text-[10px] mt-1" style={{ color: SIMPLE_COLORS.textTertiary }}>
              空欄なら「{defaultTitle}」になります
            </p>
          </div>

          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-widest block mb-1.5"
              style={{ color: SIMPLE_COLORS.textTertiary }}>
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
                border: '1px solid rgba(59,130,246,0.18)',
                color: SIMPLE_COLORS.textPrimary,
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

          <p className="text-[10px] leading-relaxed" style={{ color: SIMPLE_COLORS.textTertiary }}>
            ⚠️ 出会い系ではなくゲーム仲間と話すための通話です。録音・録画は禁止です。
          </p>
        </div>
      </div>
    </div>
  )
}
