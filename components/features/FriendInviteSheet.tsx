'use client'

// ─── フレンドを「何に誘うか」選択するボトムシート (汎用) ────────────
//
// 2026-05-10 マッキーさん指示「フレンドに話す / 誘う 機能を実装」初回実装。
// 2026-05-10 Phase A 追加: ギルド (specific) 招待選択肢を追加。
//
// 仕様:
//   - 画面下からスライドアップするボトムシート
//   - 5 つの選択肢: 通話 / ゲーム村 / いますぐ村 / ギルド / チャット
//   - 通話 / ゲーム村 / いますぐ村: notifications テーブルに INSERT (招待通知)
//   - ギルド: 自分の参加中ギルド一覧を取得 → 選択 → notifications INSERT (
//     type='guild_specific_invite', target_type='guild', target_id=village.id)
//   - チャット: startDM() → /chat/[matchId] へ遷移
//   - 送信中は連打防止 (sending state)
//   - 成功 / 失敗 Toast 表示
//
// CLAUDE.md「投稿者情報の混同防止」準拠:
//   actor_id (= myId = 誘う人) と user_id (= targetUserId = 誘われる人) を明確に分離。
//
// 設計方針:
//   - 既存 notifications スキーマ (id, user_id, actor_id, type, target_id,
//     target_type, is_read, priority, created_at) に既存のまま INSERT
//   - DB 変更ゼロ (Phase A の方針)
//   - 通話機能未完成のため、通知作成のみ。自動遷移しない (安全策)
//   - チャットのみ既存 startDM ロジックで実遷移 (DM 自体が招待になる)
//   - ギルド = villages テーブル + village_members(role: host|member) を使用

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, Gamepad2, Bell, MessageCircle, Shield, X, ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { startDM } from '@/lib/dm'

type InviteKind = 'call' | 'guild_village' | 'now_village' | 'guild_specific' | 'chat'
type SheetMode = 'invite-list' | 'guild-pick'

interface VillageOption {
  id: string
  name: string
  icon: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  targetUserId: string
  targetDisplayName: string
  myId: string
}

export default function FriendInviteSheet({ open, onClose, targetUserId, targetDisplayName, myId }: Props) {
  const router = useRouter()
  const [sending, setSending] = useState<InviteKind | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [mode, setMode] = useState<SheetMode>('invite-list')
  const [myGuilds, setMyGuilds] = useState<VillageOption[] | null>(null)
  const [loadingGuilds, setLoadingGuilds] = useState(false)
  const [pickingGuild, setPickingGuild] = useState<string | null>(null)

  useEffect(() => {
    // シート再オープン時に mode を初期化
    if (open) setMode('invite-list')
  }, [open])

  if (!open) return null

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // ギルド一覧を取得 (mypage と同じ村_members + villages の構造)
  async function loadMyGuilds() {
    if (myGuilds !== null) return  // 既に取得済み
    setLoadingGuilds(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('village_members')
        .select('villages(id, name, icon, type)')
        .eq('user_id', myId)
      if (error) throw error
      const rows = ((data ?? []) as any[])
        .map(r => r.villages)
        .filter((v: any) => v && v.id)
        .map((v: any) => ({ id: v.id, name: v.name ?? '無題', icon: v.icon ?? null }))
      // id で重複除去 (host + member 重複の保険)
      const seen = new Set<string>()
      const uniq: VillageOption[] = []
      for (const v of rows) {
        if (seen.has(v.id)) continue
        seen.add(v.id)
        uniq.push(v)
      }
      setMyGuilds(uniq)
    } catch (e) {
      console.error('[FriendInviteSheet.loadMyGuilds] error:', e)
      setMyGuilds([])
    } finally {
      setLoadingGuilds(false)
    }
  }

  async function handleInvite(kind: InviteKind) {
    if (sending) return
    if (kind === 'guild_specific') {
      // ギルド招待は専用モードへ切替 (サブシート)
      setMode('guild-pick')
      loadMyGuilds()
      return
    }
    setSending(kind)
    try {
      if (kind === 'chat') {
        const result = await startDM(myId, targetUserId)
        if (result.status === 'ok' || result.status === 'exists') {
          router.push(`/chat/${result.matchId}`)
          onClose()
        } else if (result.status === 'request' && 'matchId' in result) {
          router.push(`/chat/${result.matchId}`)
          onClose()
        } else if (result.status === 'age_required') {
          showToast('チャットには年齢確認が必要です')
        } else {
          showToast('このユーザーはチャットを受け付けていません')
        }
      } else {
        const typeMap: Record<Exclude<InviteKind, 'chat' | 'guild_specific'>, string> = {
          call: 'call_invite',
          guild_village: 'guild_invite',
          now_village: 'now_village_invite',
        }
        const targetTypeMap: Record<Exclude<InviteKind, 'chat' | 'guild_specific'>, string> = {
          call: 'voice',
          guild_village: 'guild',
          now_village: 'now_village',
        }
        const supabase = createClient()
        const { error } = await supabase.from('notifications').insert({
          user_id: targetUserId,
          actor_id: myId,
          type: typeMap[kind],
          target_id: null,
          target_type: targetTypeMap[kind],
          is_read: false,
          priority: 'normal',
        })
        if (error) {
          console.error('[FriendInviteSheet.invite] supabase error:', error)
          showToast('誘いを送れませんでした。もう一度お試しください。')
        } else {
          const name = targetDisplayName || '相手'
          showToast(`${name}さんを誘いました`)
          setTimeout(() => onClose(), 1500)
        }
      }
    } catch (e: any) {
      console.error('[FriendInviteSheet.invite] error:', e)
      showToast('誘いを送れませんでした。もう一度お試しください。')
    } finally {
      setSending(null)
    }
  }

  // ギルド選択モードで特定ギルドに誘う
  async function handleGuildPick(village: VillageOption) {
    if (pickingGuild) return
    setPickingGuild(village.id)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('notifications').insert({
        user_id: targetUserId,
        actor_id: myId,
        type: 'guild_specific_invite',
        target_id: village.id,
        target_type: 'guild',
        is_read: false,
        priority: 'normal',
      })
      if (error) {
        console.error('[FriendInviteSheet.handleGuildPick] supabase error:', error)
        showToast('誘いを送れませんでした。もう一度お試しください。')
      } else {
        const name = targetDisplayName || '相手'
        showToast(`${name}さんを「${village.name}」に誘いました`)
        setTimeout(() => onClose(), 1500)
      }
    } catch (e: any) {
      console.error('[FriendInviteSheet.handleGuildPick] error:', e)
      showToast('誘いを送れませんでした。もう一度お試しください。')
    } finally {
      setPickingGuild(null)
    }
  }

  const busy = sending !== null || pickingGuild !== null

  return (
    <>
      <div
        onClick={() => !busy && onClose()}
        className="fixed inset-0 z-[90]"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      />
      <div
        className="fixed left-0 right-0 bottom-0 z-[91] rounded-t-2xl"
        style={{
          background: '#0d0b1f',
          borderTop: '1px solid rgba(157,92,255,0.25)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 12px), 12px)',
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="flex justify-center pt-2 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(234,242,255,0.2)' }} />
        </div>

        {mode === 'invite-list' && (
          <>
            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
              <h3 className="text-sm font-extrabold" style={{ color: '#F0EEFF' }}>
                {targetDisplayName ? `${targetDisplayName}さんを何に誘いますか?` : '何に誘いますか?'}
              </h3>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="w-7 h-7 rounded-full flex items-center justify-center active:bg-white/5"
                style={{ color: 'rgba(240,238,255,0.5)' }}
                aria-label="閉じる"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-3 pb-4 space-y-2 overflow-y-auto">
              <InviteOption
                icon={<Phone size={16} />}
                label="通話に誘う"
                sublabel="グループ通話画面への招待通知"
                onClick={() => handleInvite('call')}
                loading={sending === 'call'}
                disabled={busy && sending !== 'call'}
                accentColor="#27DFFF"
              />
              <InviteOption
                icon={<Gamepad2 size={16} />}
                label="ゲーム村に誘う"
                sublabel="ギルド全体で遊びませんか? の招待通知"
                onClick={() => handleInvite('guild_village')}
                loading={sending === 'guild_village'}
                disabled={busy && sending !== 'guild_village'}
                accentColor="#8B5CF6"
              />
              <InviteOption
                icon={<Bell size={16} />}
                label="いますぐ村に誘う"
                sublabel="今すぐ集まれる場へ招待通知"
                onClick={() => handleInvite('now_village')}
                loading={sending === 'now_village'}
                disabled={busy && sending !== 'now_village'}
                accentColor="#FF9D00"
              />
              {/* 2026-05-10 Phase A: ギルド (specific) 招待選択肢を追加 */}
              <InviteOption
                icon={<Shield size={16} />}
                label="ギルドに誘う"
                sublabel="自分が参加中のギルドへ招待"
                onClick={() => handleInvite('guild_specific')}
                loading={false}
                disabled={busy}
                accentColor="#22D3EE"
              />
              <InviteOption
                icon={<MessageCircle size={16} />}
                label="チャットする"
                sublabel="1対1のチャット画面を開く"
                onClick={() => handleInvite('chat')}
                loading={sending === 'chat'}
                disabled={busy && sending !== 'chat'}
                accentColor="#FF4FD8"
              />
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="w-full mt-2 px-4 py-3 rounded-xl text-sm font-bold active:opacity-70 transition-opacity disabled:opacity-50"
                style={{
                  color: 'rgba(240,238,255,0.55)',
                  background: 'rgba(255,255,255,0.04)',
                }}
              >
                キャンセル
              </button>
            </div>
          </>
        )}

        {mode === 'guild-pick' && (
          <>
            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setMode('invite-list')}
                disabled={busy}
                className="flex items-center gap-1 text-xs font-bold active:opacity-70"
                style={{ color: 'rgba(196,181,253,0.9)' }}
                aria-label="戻る"
              >
                <ChevronLeft size={14} /> 戻る
              </button>
              <h3 className="text-sm font-extrabold" style={{ color: '#F0EEFF' }}>
                どのギルドに誘いますか?
              </h3>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="w-7 h-7 rounded-full flex items-center justify-center active:bg-white/5"
                style={{ color: 'rgba(240,238,255,0.5)' }}
                aria-label="閉じる"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-3 pb-4 space-y-2 overflow-y-auto">
              {loadingGuilds && (
                <div className="px-3 py-8 text-center text-sm" style={{ color: 'rgba(240,238,255,0.5)' }}>
                  ギルドを読み込み中...
                </div>
              )}
              {!loadingGuilds && myGuilds !== null && myGuilds.length === 0 && (
                <div className="px-3 py-8 text-center">
                  <p className="text-3xl mb-2">🛡️</p>
                  <p className="text-sm font-bold" style={{ color: 'rgba(240,238,255,0.55)' }}>
                    参加中のギルドがありません
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(240,238,255,0.35)' }}>
                    ギルドに参加 / 作成してから誘えます
                  </p>
                </div>
              )}
              {!loadingGuilds && myGuilds !== null && myGuilds.length > 0 && (
                <ul className="space-y-2">
                  {myGuilds.map(v => (
                    <li key={v.id}>
                      <button
                        type="button"
                        onClick={() => handleGuildPick(v)}
                        disabled={busy && pickingGuild !== v.id}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left active:scale-[0.99] transition-all disabled:opacity-50"
                        style={{
                          background: 'rgba(34,211,238,0.10)',
                          border: '1px solid rgba(34,211,238,0.30)',
                        }}
                      >
                        <span className="text-xl flex-shrink-0">{v.icon ?? '🛡️'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate" style={{ color: '#F0EEFF' }}>
                            {pickingGuild === v.id ? '送信中...' : v.name}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => setMode('invite-list')}
                disabled={busy}
                className="w-full mt-2 px-4 py-3 rounded-xl text-sm font-bold active:opacity-70 transition-opacity disabled:opacity-50"
                style={{
                  color: 'rgba(240,238,255,0.55)',
                  background: 'rgba(255,255,255,0.04)',
                }}
              >
                戻る
              </button>
            </div>
          </>
        )}
      </div>

      {toast && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] px-4 py-2 rounded-full text-sm font-bold shadow-lg pointer-events-none"
          style={{
            background: 'rgba(0,0,0,0.9)',
            color: '#FFE6F0',
            border: '1px solid rgba(157,92,255,0.4)',
          }}
        >
          {toast}
        </div>
      )}
    </>
  )
}

interface OptionProps {
  icon: React.ReactNode
  label: string
  sublabel: string
  onClick: () => void
  loading: boolean
  disabled: boolean
  accentColor: string
}

function InviteOption({ icon, label, sublabel, onClick, loading, disabled, accentColor }: OptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left active:scale-[0.99] transition-all disabled:opacity-50"
      style={{
        background: `${accentColor}1a`,
        border: `1px solid ${accentColor}66`,
      }}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: `${accentColor}33`, color: accentColor }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold" style={{ color: '#F0EEFF' }}>
          {loading ? '送信中...' : label}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: 'rgba(240,238,255,0.5)' }}>
          {sublabel}
        </p>
      </div>
    </button>
  )
}
