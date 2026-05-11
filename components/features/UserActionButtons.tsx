'use client'

// ─── ユーザーへのアクション 2 ボタン (汎用) ────────────────────────
//
// 2026-05-10 マッキーさん指示「フレンドに話す / 誘う 機能を実装」初回実装。
//
// 仕様:
//   - 表示: 「話す」「誘う」の 2 ボタン
//   - 「話す」 = startDM() → /chat/[matchId] へ遷移
//   - 「誘う」 = FriendInviteSheet を開く (4 つの選択肢)
//   - 自分自身 (myId === targetUserId) には表示しない
//   - 連打防止: talkLoading 中は disabled
//
// 設計方針 (CLAUDE.md「ミヤ専用ハードコード禁止」+ ユーザー指示):
//   - ミヤ専用名にしない (UserActionButtons 汎用名)
//   - 表示対象は targetUserId props で指定 (フレンド / プロフィール どこからでも使える)
//   - オンライン判定は今回は実装しない (将来追加しやすい汎用設計)

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, UserPlus } from 'lucide-react'
import { startDM } from '@/lib/dm'
import FriendInviteSheet from '@/components/features/FriendInviteSheet'

interface Props {
  targetUserId: string
  myId: string | null
  targetDisplayName?: string
  /** size 'sm' = フレンド一覧用の小型 / 'md' = プロフィールページ用の標準 */
  size?: 'sm' | 'md'
}

export default function UserActionButtons({ targetUserId, myId, targetDisplayName, size = 'md' }: Props) {
  const router = useRouter()
  const [talkLoading, setTalkLoading] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // 自分自身には表示しない
  if (!myId || myId === targetUserId) return null

  async function handleTalk() {
    if (talkLoading || !myId) return
    setTalkLoading(true)
    try {
      const result = await startDM(myId, targetUserId)
      if (result.status === 'age_required') {
        showToast('話すには年齢確認が必要です')
      } else if (result.status === 'ok' || result.status === 'exists') {
        router.push(`/chat/${result.matchId}`)
      } else if (result.status === 'request' && 'matchId' in result) {
        router.push(`/chat/${result.matchId}`)
      } else {
        showToast('このユーザーはDMを受け付けていません')
      }
    } catch (e: any) {
      console.error('[UserActionButtons.handleTalk] error:', e)
      showToast('エラーが発生しました')
    } finally {
      setTalkLoading(false)
    }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const baseBtnCls = size === 'sm'
    ? 'px-3 py-1.5 text-xs rounded-full font-bold flex items-center gap-1.5'
    : 'px-4 py-2 text-sm rounded-full font-bold flex items-center gap-1.5'
  const iconSize = size === 'sm' ? 12 : 14

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleTalk()
          }}
          disabled={talkLoading}
          className={`${baseBtnCls} active:scale-95 transition-all disabled:opacity-50`}
          style={{
            background: 'linear-gradient(135deg, #FF4FD8 0%, #9D5CFF 100%)',
            color: '#fff',
            boxShadow: '0 2px 8px rgba(255,79,216,0.3)',
          }}
          aria-label="話す"
        >
          <MessageCircle size={iconSize} strokeWidth={2.2} />
          {talkLoading ? '送信中...' : '話す'}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setShowInvite(true)
          }}
          className={`${baseBtnCls} active:scale-95 transition-all`}
          style={{
            background: 'rgba(157,92,255,0.15)',
            border: '1px solid rgba(157,92,255,0.5)',
            color: '#c4b5fd',
          }}
          aria-label="誘う"
        >
          <UserPlus size={iconSize} strokeWidth={2.2} />
          誘う
        </button>
      </div>

      <FriendInviteSheet
        open={showInvite}
        onClose={() => setShowInvite(false)}
        targetUserId={targetUserId}
        targetDisplayName={targetDisplayName ?? ''}
        myId={myId}
      />

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
