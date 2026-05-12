'use client'

// 募集カード表示 (Phase B PR-B2)
//
// PostCardShell の dark theme に揃えつつ、緑グラデーション + 募集情報を
// 詰めた専用カード。
// 既存 PostCard / TweetCard とは別レイアウトだが、フォントサイズ・余白・
// アバター径などは PostCardHeader / PostActions の canonical 値に揃える。

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mic, Users, Sparkles, Crown, Clock, Gamepad2, Lock } from 'lucide-react'
import PostCardShell from '@/components/ui/PostCardShell'
import PostCardHeader from '@/components/ui/PostCardHeader'
import { getUserDisplayName } from '@/lib/user-display'
import { timeAgo } from '@/lib/utils'
import {
  joinRecruitment,
  leaveRecruitment,
  closeRecruitment,
  notifyRecruitmentJoin,
  RECRUITMENT_TYPE_LABEL,
  PLAY_STYLE_LABEL,
  RECRUITMENT_STATUS_LABEL,
  type RecruitmentPost,
} from '@/lib/recruitment'
import { createClient } from '@/lib/supabase/client'
import RecruitmentParticipantsSheet from '@/components/features/RecruitmentParticipantsSheet'

interface Props {
  post: RecruitmentPost
  currentUserId: string | null
  onChange?: () => void  // 参加/解除/終了の後で親に refetch を促す
}

export default function RecruitmentCard({ post, currentUserId, onChange }: Props) {
  const router = useRouter()
  const [optimisticJoined, setOptimisticJoined] = useState<boolean | null>(null)
  const [optimisticCountDelta, setOptimisticCountDelta] = useState<number>(0)
  const [actionLoading, setActionLoading] = useState<'join' | 'leave' | 'close' | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [showParticipants, setShowParticipants] = useState(false)

  const joined = optimisticJoined === null ? Boolean(post.joined_by_me) : optimisticJoined
  const participantCount = Math.max(0, (post.participant_count ?? 0) + optimisticCountDelta)
  const isOwner = currentUserId !== null && currentUserId === post.user_id
  const isFull =
    post.max_participants !== null &&
    participantCount >= post.max_participants
  const statusInfo = RECRUITMENT_STATUS_LABEL[post.recruitment_status] ?? RECRUITMENT_STATUS_LABEL.open
  const isClosed = post.recruitment_status !== 'open'

  const typeInfo =
    post.recruitment_type
      ? RECRUITMENT_TYPE_LABEL[post.recruitment_type] ?? RECRUITMENT_TYPE_LABEL.other
      : null
  const styleInfo = post.play_style ? PLAY_STYLE_LABEL[post.play_style] : null

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  async function handleJoin() {
    if (!currentUserId || actionLoading) return
    setActionLoading('join')
    setOptimisticJoined(true)
    setOptimisticCountDelta(prev => prev + 1)
    const supabase = createClient()
    const res = await joinRecruitment(supabase, post.id, currentUserId)
    if (res.ok) {
      // 募集主への通知 (silent fail)
      void notifyRecruitmentJoin(supabase, {
        recruitmentOwnerId: post.user_id,
        joinerId: currentUserId,
        postId: post.id,
      })
      showToast('参加しました')
      onChange?.()
    } else {
      setOptimisticJoined(false)
      setOptimisticCountDelta(prev => prev - 1)
      showToast(res.message)
    }
    setActionLoading(null)
  }

  async function handleLeave() {
    if (!currentUserId || actionLoading) return
    setActionLoading('leave')
    setOptimisticJoined(false)
    setOptimisticCountDelta(prev => prev - 1)
    const supabase = createClient()
    const res = await leaveRecruitment(supabase, post.id, currentUserId)
    if (res.ok) {
      showToast('参加を取り消しました')
      onChange?.()
    } else {
      setOptimisticJoined(true)
      setOptimisticCountDelta(prev => prev + 1)
      showToast(res.message)
    }
    setActionLoading(null)
  }

  async function handleClose() {
    if (!currentUserId || actionLoading) return
    if (!confirm('この募集を終了しますか？')) return
    setActionLoading('close')
    const supabase = createClient()
    const res = await closeRecruitment(supabase, post.id, currentUserId)
    if (res.ok) {
      showToast('募集を終了しました')
      onChange?.()
    } else {
      showToast(res.message)
    }
    setActionLoading(null)
  }

  const profileHref = currentUserId === post.user_id ? '/mypage' : `/profile/${post.user_id}`

  return (
    <PostCardShell>
      {/* ── 募集中バッジ + 状態 + ボイス/初心者バッジ ── */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        <span
          className="text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1"
          style={{
            background: isClosed ? 'rgba(156,163,175,0.18)' : 'rgba(57,255,136,0.18)',
            color: statusInfo.color,
            border: `1px solid ${statusInfo.color}40`,
          }}
        >
          <Gamepad2 size={10} strokeWidth={2.4} />
          {statusInfo.label}
        </span>
        {typeInfo && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{
              background: 'rgba(157,92,255,0.15)',
              color: '#C7B4FF',
              border: '1px solid rgba(157,92,255,0.3)',
            }}
          >
            {typeInfo.emoji} {typeInfo.label}
          </span>
        )}
        {post.voice_enabled && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
            style={{
              background: 'rgba(255,77,144,0.15)',
              color: '#FFA8C8',
              border: '1px solid rgba(255,77,144,0.3)',
            }}
          >
            <Mic size={9} strokeWidth={2.4} /> ボイス
          </span>
        )}
        {post.beginner_friendly && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
            style={{
              background: 'rgba(57,255,136,0.15)',
              color: '#9CFFC7',
              border: '1px solid rgba(57,255,136,0.3)',
            }}
          >
            <Sparkles size={9} strokeWidth={2.4} /> 初心者歓迎
          </span>
        )}
        {styleInfo && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(240,238,255,0.65)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            {styleInfo.emoji} {styleInfo.label}
          </span>
        )}
      </div>

      {/* ── ヘッダー (元投稿者: post.user_id) ── */}
      <PostCardHeader
        profileHref={profileHref}
        displayName={getUserDisplayName(post.profiles)}
        avatarUrl={post.profiles?.avatar_url}
        avatarVariant="green"
        trustTier={post.user_trust?.tier ?? 'visitor'}
        timestamp={post.created_at}
      />

      {/* ── 本文 ── */}
      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(240,238,255,0.88)' }}>
        {post.content}
      </p>

      {/* ── ゲーム / 時間帯 / プラットフォーム (任意) ── */}
      {(post.lfg_game || post.lfg_time || (post.lfg_platform && post.lfg_platform.length > 0)) && (
        <div
          className="mt-2.5 px-3 py-2 rounded-xl flex flex-col gap-1"
          style={{
            background: 'rgba(157,92,255,0.07)',
            border: '1px solid rgba(157,92,255,0.18)',
          }}
        >
          {post.lfg_game && (
            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(240,238,255,0.75)' }}>
              <Gamepad2 size={11} strokeWidth={2} />
              <span className="font-semibold">{post.lfg_game}</span>
            </div>
          )}
          {post.lfg_time && (
            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(240,238,255,0.75)' }}>
              <Clock size={11} strokeWidth={2} />
              <span>{post.lfg_time}</span>
            </div>
          )}
          {post.lfg_platform && post.lfg_platform.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap text-[10px]" style={{ color: 'rgba(240,238,255,0.6)' }}>
              {post.lfg_platform.map((p, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 rounded font-semibold"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 参加者数 + 参加/解除/終了 ボタン ── */}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowParticipants(true)}
          className="flex items-center gap-1.5 text-[12px] font-semibold active:opacity-70 transition-opacity"
          style={{ color: 'rgba(240,238,255,0.7)' }}
          aria-label="参加者を表示"
        >
          <Users size={13} strokeWidth={2} />
          <span className="tabular-nums">
            {participantCount}
            {post.max_participants !== null && (
              <span style={{ color: 'rgba(240,238,255,0.4)' }}> / {post.max_participants}</span>
            )}
            {' '}人参加
          </span>
        </button>

        <div className="ml-auto flex items-center gap-2">
          {isOwner ? (
            isClosed ? (
              <span className="text-[11px] font-semibold px-2 py-1 rounded-full" style={{ color: 'rgba(240,238,255,0.4)' }}>
                <Crown size={11} className="inline mr-1" /> 募集主
              </span>
            ) : (
              <button
                type="button"
                onClick={handleClose}
                disabled={actionLoading !== null}
                className="text-[12px] font-bold px-3 py-1.5 rounded-full active:scale-95 transition-all disabled:opacity-50"
                style={{
                  background: 'rgba(156,163,175,0.18)',
                  color: '#D1D5DB',
                  border: '1px solid rgba(156,163,175,0.35)',
                }}
              >
                {actionLoading === 'close' ? '...' : '募集を終了'}
              </button>
            )
          ) : isClosed ? (
            <span className="text-[11px] font-semibold flex items-center gap-1" style={{ color: 'rgba(240,238,255,0.4)' }}>
              <Lock size={11} /> 終了
            </span>
          ) : joined ? (
            <button
              type="button"
              onClick={handleLeave}
              disabled={actionLoading !== null}
              className="text-[12px] font-bold px-3 py-1.5 rounded-full active:scale-95 transition-all disabled:opacity-50"
              style={{
                background: 'rgba(57,255,136,0.18)',
                color: '#39FF88',
                border: '1px solid rgba(57,255,136,0.4)',
              }}
            >
              {actionLoading === 'leave' ? '...' : '参加中 ✓'}
            </button>
          ) : isFull ? (
            <span
              className="text-[11px] font-bold px-3 py-1.5 rounded-full"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(240,238,255,0.4)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              満員
            </span>
          ) : (
            <button
              type="button"
              onClick={handleJoin}
              disabled={actionLoading !== null || !currentUserId}
              className="text-[12px] font-extrabold px-4 py-1.5 rounded-full active:scale-95 transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #39FF88 0%, #2dd96a 100%)',
                color: '#0a1a0f',
                boxShadow: '0 4px 16px rgba(57,255,136,0.35)',
              }}
            >
              {actionLoading === 'join' ? '...' : '参加する'}
            </button>
          )}
        </div>
      </div>

      {/* ── 村ラベル (任意) ── */}
      {post.villages && (
        <button
          type="button"
          onClick={() => router.push(`/villages/${post.villages!.id}`)}
          className="mt-2 text-[10px] font-semibold flex items-center gap-1 active:opacity-70"
          style={{ color: 'rgba(240,238,255,0.45)' }}
          aria-label="村を開く"
        >
          <span>{post.villages.icon ?? '🏠'}</span>
          <span>{post.villages.name}</span>
        </button>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div
          className="mt-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-center"
          style={{
            background: 'rgba(57,255,136,0.12)',
            color: '#9CFFC7',
            border: '1px solid rgba(57,255,136,0.3)',
          }}
        >
          {toast}
        </div>
      )}

      <RecruitmentParticipantsSheet
        open={showParticipants}
        onClose={() => setShowParticipants(false)}
        postId={post.id}
        currentUserId={currentUserId}
      />
    </PostCardShell>
  )
}
