'use client'

// 募集参加者一覧シート (LikedUsersSheet と同じ pattern)
//
// - 画面下からスライドアップ
// - village_post_participants から status='joined' を取得して表示
// - 各行 tap で /mypage (自分) / /profile/[id] (他人) へ遷移
// - 親 (RecruitmentCard) から open / postId / currentUserId を受け取る

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { fetchParticipants, type RecruitmentParticipant } from '@/lib/recruitment'
import { getUserDisplayName } from '@/lib/user-display'

interface Props {
  open: boolean
  onClose: () => void
  postId: string
  currentUserId: string | null
}

export default function RecruitmentParticipantsSheet({ open, onClose, postId, currentUserId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [participants, setParticipants] = useState<RecruitmentParticipant[]>([])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const supabase = createClient()
      const list = await fetchParticipants(supabase, postId)
      if (!cancelled) {
        setParticipants(list.filter(p => p.status === 'joined'))
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [open, postId])

  if (!open) return null

  function handleRowTap(userId: string) {
    onClose()
    if (currentUserId === userId) router.push('/mypage')
    else router.push(`/profile/${userId}`)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
        style={{
          background: '#0E0B1F',
          borderTop: '1px solid rgba(157,92,255,0.25)',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
          maxHeight: '70vh',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(240,238,255,0.18)' }} />
        </div>

        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <Users size={16} style={{ color: '#39FF88' }} />
            <p className="text-sm font-extrabold" style={{ color: '#F0EEFF' }}>
              参加者一覧 ({participants.length})
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center active:bg-white/10 transition-all"
            aria-label="閉じる"
            style={{ color: 'rgba(240,238,255,0.6)' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 64px)' }}>
          {loading ? (
            <div className="py-10 text-center text-xs" style={{ color: 'rgba(240,238,255,0.45)' }}>
              読み込み中...
            </div>
          ) : participants.length === 0 ? (
            <div className="py-10 text-center text-xs" style={{ color: 'rgba(240,238,255,0.45)' }}>
              まだ参加者はいません
            </div>
          ) : (
            <ul className="pb-6">
              {participants.map(p => {
                const displayName = getUserDisplayName(p.profile ?? null)
                const isMe = currentUserId === p.user_id
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => handleRowTap(p.user_id)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 active:bg-white/5 transition-all"
                    >
                      <div
                        className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-sm font-bold text-white"
                        style={{
                          background: 'linear-gradient(135deg,#059669,#047857)',
                          boxShadow: '0 0 0 1.5px rgba(57,255,136,0.3)',
                        }}
                      >
                        {p.profile?.avatar_url
                          ? <img src={p.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                          : (displayName?.[0] ?? '?')}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-bold truncate" style={{ color: '#F0EEFF' }}>
                          {displayName}
                          {isMe && (
                            <span
                              className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                              style={{
                                background: 'rgba(57,255,136,0.15)',
                                color: '#9CFFC7',
                              }}
                            >
                              あなた
                            </span>
                          )}
                        </p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
