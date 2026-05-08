'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getNationalityFlag, timeAgo } from '@/lib/utils'
import { Repeat2, MoreHorizontal, Pencil, Trash2, X, Flag, Ban } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import VerifiedBadge from '@/components/ui/VerifiedBadge'
import PostActions from '@/components/ui/PostActions'
import ReportModal from '@/components/features/ReportModal'
import { getTierById } from '@/lib/trust'
import { isVerifiedByExistingSchema } from '@/lib/identity-types'
import { getUserDisplayName } from '@/lib/user-display'

export const REACTIONS = [
  { key: 'heart',   emoji: '❤️', label: 'Love' },
  { key: 'haha',    emoji: '😂', label: 'Haha' },
  { key: 'wow',     emoji: '😮', label: 'Wow' },
  { key: 'support', emoji: '🙌', label: 'Support' },
  { key: 'sad',     emoji: '😢', label: 'Sad' },
  { key: 'fire',    emoji: '🔥', label: 'Fire' },
]

export interface TweetData {
  id: string
  content: string
  created_at: string
  user_id: string
  reply_count: number
  repost_count: number
  repost_of: string | null
  profiles: {
    display_name: string
    nationality: string
    avatar_url: string | null
    // Phase 1: 既存スキーマの age_verified を optional として受け取れるように。
    // クエリ側で select に追加していなければ undefined → バッジ非表示。
    age_verified?: boolean | null
    age_verification_status?: string | null
  }
  tweet_reactions: { user_id: string; reaction: string }[]
  tweet_replies?: { id: string }[]
  // 投稿者の Trust Tier（任意・取得側がマージ済みなら表示する）
  user_trust?: { tier: string } | null
  original?: {
    content: string
    user_id: string
    profiles: { display_name: string; nationality: string }
  } | null
}

interface Props {
  tweet: TweetData
  myId: string | null
  onUpdate: () => void
  showBorder?: boolean
  canInteract?: boolean
  /**
   * 親側で投稿者の verified 状態を持っている場合に明示的に上書きできる。
   * 例: マイページで自分の投稿一覧を表示するとき、profile.age_verified を渡す。
   */
  verified?: boolean
  /**
   * アバターのカラー指定。default = 共有 Avatar コンポーネント (紫 brand-100)、
   * 'green' = タイムラインで PostCard と色味を統一するための緑グラデアバター
   * (linear-gradient(135deg,#059669,#047857) + 緑リング)。
   * 2026-05-08: マッキーさん指示「タイムラインの紫アイコンも緑に統一して
   * フォーマットは変えないで」を受けて追加。timeline からのみ green を渡し、
   * mypage / profile / tweet 詳細からは default (紫) のままにする。
   */
  avatarVariant?: 'default' | 'green'
}

export default function TweetCard({ tweet, myId, onUpdate, showBorder = true, canInteract = true, verified, avatarVariant = 'default' }: Props) {
  // 投稿者の verified 判定: 明示 props 優先、次に tweet.profiles の既存カラム
  const isVerified = verified ?? isVerifiedByExistingSchema(tweet.profiles)
  const router = useRouter()
  const [showMenu,    setShowMenu]    = useState(false)
  const [showEdit,    setShowEdit]    = useState(false)
  const [editText,    setEditText]    = useState(tweet.content)
  const [saving,      setSaving]      = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [confirmDel,  setConfirmDel]  = useState(false)
  const [showReport,  setShowReport]  = useState(false)
  const [blockDone,   setBlockDone]   = useState(false)
  const [blocking,    setBlocking]    = useState(false)

  const isOwn = myId === tweet.user_id
  // 投稿者プロフィール遷移先: 自分なら黒背景マイページ、他人なら他ユーザー
  // プロフィール。自分用に白背景プロフィールへ飛ばないよう分岐する。
  const profileHref = isOwn ? '/mypage' : `/profile/${tweet.user_id}`
  const MAX = 280

  // ── reactions ────────────────────────────────────────────────
  // 2026-05-08: B-1 方式 (Heart 1 種類リアクション) に統合。
  // tweet_reactions テーブルは既存スキーマ維持 (heart/haha/wow/support/sad/fire 全 6 種を
  // 引き続き保存可能) だが、UI からは Heart タップで 'heart' のみ upsert する。
  const myReaction = tweet.tweet_reactions.find(r => r.user_id === myId)?.reaction

  async function toggleReaction(key: string) {
    if (!myId || !canInteract) return
    const supabase = createClient()
    if (myReaction === key) {
      await supabase.from('tweet_reactions').delete().eq('tweet_id', tweet.id).eq('user_id', myId)
    } else {
      await supabase.from('tweet_reactions').upsert(
        { tweet_id: tweet.id, user_id: myId, reaction: key },
        { onConflict: 'tweet_id,user_id' }
      )
    }
    onUpdate()
  }

  // ── edit ─────────────────────────────────────────────────────
  async function handleSaveEdit() {
    if (!editText.trim() || editText.length > MAX || saving) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('tweets').update({ content: editText.trim() }).eq('id', tweet.id)
    setSaving(false)
    setShowEdit(false)
    onUpdate()
  }

  // ── block ────────────────────────────────────────────────────
  async function handleBlock() {
    if (!myId || blocking) return
    setBlocking(true)
    const supabase = createClient()
    await supabase.from('blocks').upsert(
      { blocker_id: myId, blocked_id: tweet.user_id },
      { onConflict: 'blocker_id,blocked_id' }
    )
    setBlocking(false)
    setBlockDone(true)
    setTimeout(() => { setShowMenu(false); setBlockDone(false); onUpdate() }, 1200)
  }

  // ── delete ───────────────────────────────────────────────────
  async function handleDelete() {
    if (deleting) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('tweets').delete().eq('id', tweet.id)
    setDeleting(false)
    setConfirmDel(false)
    setShowMenu(false)
    onUpdate()
  }

  // ── share to X ───────────────────────────────────────────────
  // 2026-05-08 マッキーさん指示: 投稿カード下部アクションを timeline PostCard と
  // 完全統一 (Heart / Comment / Share)。Share2 タップで X 共有を起動。
  function shareToX() {
    const host = (typeof window !== 'undefined' ? window.location.host : '') || 'nowmatejapan.com'
    const text = `${tweet.content}\n\n— YVOICE より\n#YVOICE #ゲームコミュニティ\n${host}`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  const flag = getNationalityFlag(tweet.profiles?.nationality || '')
  // 全リアクション総数 (heart/haha/wow/support/sad/fire 全部を「いいね」として扱う)
  const totalReactions = tweet.tweet_reactions.length
  const liked = myReaction === 'heart'

  return (
    <>
      <div
        className={`px-4 py-4 ${showBorder ? 'border-b' : ''}`}
        style={{
          background: 'rgba(255,255,255,0.04)',
          borderColor: 'rgba(157,92,255,0.1)',
          ...(showBorder ? {} : { borderBottom: 'none' }),
        }}
      >
        {/* Repost header */}
        {tweet.repost_of && (
          <div className="flex items-center gap-1.5 text-xs font-semibold mb-2 ml-1"
            style={{ color: 'rgba(240,238,255,0.4)' }}>
            <Repeat2 size={12} />
            <span>{getUserDisplayName(tweet.profiles)} reposted</span>
          </div>
        )}

        <div className="flex items-start gap-3">
          {/* Avatar — avatarVariant により色味を切替。
              default: 共有 Avatar (紫 brand-100)
              green:   PostCard と同じ緑グラデ + 緑リング (タイムライン用) */}
          <button onClick={() => router.push(profileHref)} className="flex-shrink-0 mt-0.5">
            {avatarVariant === 'green' ? (
              <div
                className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold text-white"
                style={{
                  background: 'linear-gradient(135deg,#059669,#047857)',
                  boxShadow: '0 0 0 2px rgba(57,255,136,0.3)',
                }}
              >
                {tweet.profiles?.avatar_url
                  ? <img src={tweet.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                  : (tweet.profiles?.display_name?.[0] ?? '?')}
              </div>
            ) : (
              <Avatar src={tweet.profiles?.avatar_url} name={tweet.profiles?.display_name} size="sm" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            {/* Name + time + menu */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button onClick={() => router.push(profileHref)}
                  className="font-extrabold text-sm leading-tight"
                  style={{ color: '#F0EEFF' }}>
                  {getUserDisplayName(tweet.profiles)}
                </button>
                {isVerified && <VerifiedBadge verified size="sm" />}
                {tweet.user_trust?.tier && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 leading-none"
                    style={{
                      background: 'rgba(57,255,136,0.12)',
                      color: '#39FF88',
                      border: '1px solid rgba(57,255,136,0.3)',
                    }}
                  >
                    {getTierById(tweet.user_trust.tier).label}
                  </span>
                )}
                <span className="text-base leading-none">{flag}</span>
                <span className="text-xs" style={{ color: 'rgba(240,238,255,0.4)' }}>{timeAgo(tweet.created_at)}</span>
              </div>
              {myId && (
                <button
                  onClick={() => setShowMenu(true)}
                  className="w-7 h-7 flex items-center justify-center rounded-full transition-colors -mr-1 flex-shrink-0 active:opacity-60"
                  style={{ color: 'rgba(240,238,255,0.35)' }}>
                  <MoreHorizontal size={16} />
                </button>
              )}
            </div>

            {/* Content */}
            <p className="text-sm leading-relaxed mb-3 whitespace-pre-wrap" style={{ color: 'rgba(240,238,255,0.85)' }}>
              {tweet.content}
            </p>

            {/* アクション = 共通 PostActions コンポーネント
                2026-05-08 (5 回目) マッキーさん指示「ミヤを含む全マイページで統一 +
                共通コンポーネント化」を受け、行内 JSX から共通部品 PostActions に切替。
                これにより今後アクション行を変更する際は components/ui/PostActions.tsx
                の 1 ファイルだけ直せば timeline / mypage / profile すべてに反映される。 */}
            <PostActions
              liked={liked}
              reactionCount={totalReactions}
              replyCount={tweet.reply_count ?? tweet.tweet_replies?.length ?? 0}
              canInteract={canInteract}
              onHeart={() => toggleReaction('heart')}
              onComment={() => router.push(`/tweet/${tweet.id}`)}
              onShare={shareToX}
            />
          </div>
        </div>
      </div>

      {/* ── アクションシート ── */}
      {showMenu && (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowMenu(false); setConfirmDel(false) }} />
          <div className="relative rounded-t-3xl w-full max-w-md mx-auto overflow-hidden pb-safe"
            style={{ background: '#0f0820', border: '1px solid rgba(157,92,255,0.2)', borderBottom: 'none' }}>

            {/* ハンドル */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(157,92,255,0.3)' }} />
            </div>

            {!confirmDel ? (
              <div className="px-4 pb-6">
                <p className="text-xs font-bold uppercase tracking-wider mb-3 px-1"
                  style={{ color: 'rgba(240,238,255,0.3)' }}>投稿の操作</p>

                {isOwn ? (
                  <>
                    {/* 編集 */}
                    <button
                      onClick={() => { setEditText(tweet.content); setShowMenu(false); setShowEdit(true) }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl active:opacity-70 transition-opacity text-left"
                      style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(157,92,255,0.15)' }}>
                        <Pencil size={16} style={{ color: '#9D5CFF' }} />
                      </div>
                      <div>
                        <p className="text-sm font-bold" style={{ color: '#F0EEFF' }}>編集する</p>
                        <p className="text-xs" style={{ color: 'rgba(240,238,255,0.4)' }}>内容を修正できます</p>
                      </div>
                    </button>

                    {/* 削除 */}
                    <button
                      onClick={() => setConfirmDel(true)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl active:opacity-70 transition-opacity text-left mt-1"
                      style={{ background: 'rgba(255,77,144,0.06)' }}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(255,77,144,0.12)' }}>
                        <Trash2 size={16} style={{ color: '#FF4D90' }} />
                      </div>
                      <div>
                        <p className="text-sm font-bold" style={{ color: '#FF4D90' }}>削除する</p>
                        <p className="text-xs" style={{ color: 'rgba(255,77,144,0.6)' }}>この操作は取り消せません</p>
                      </div>
                    </button>
                  </>
                ) : (
                  <>
                    {/* 通報 */}
                    <button
                      onClick={() => { setShowMenu(false); setShowReport(true) }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl active:opacity-70 transition-opacity text-left"
                      style={{ background: 'rgba(251,146,60,0.06)' }}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(251,146,60,0.12)' }}>
                        <Flag size={16} style={{ color: '#fb923c' }} />
                      </div>
                      <div>
                        <p className="text-sm font-bold" style={{ color: '#fb923c' }}>通報する</p>
                        <p className="text-xs" style={{ color: 'rgba(251,146,60,0.6)' }}>不適切な投稿を報告する</p>
                      </div>
                    </button>

                    {/* ブロック */}
                    <button
                      onClick={handleBlock}
                      disabled={blocking || blockDone}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl active:opacity-70 transition-opacity text-left mt-1 disabled:opacity-60"
                      style={{ background: 'rgba(255,77,144,0.06)' }}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(255,77,144,0.12)' }}>
                        {blockDone
                          ? <span className="text-base">✅</span>
                          : <Ban size={16} style={{ color: '#FF4D90' }} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold" style={{ color: '#FF4D90' }}>
                          {blockDone ? 'ブロックしました' : 'ブロックする'}
                        </p>
                        <p className="text-xs" style={{ color: 'rgba(255,77,144,0.6)' }}>
                          {blockDone ? 'このユーザーの投稿が非表示になります' : 'このユーザーを非表示にする'}
                        </p>
                      </div>
                    </button>
                  </>
                )}

                {/* キャンセル */}
                <button
                  onClick={() => setShowMenu(false)}
                  className="w-full mt-3 py-3.5 rounded-2xl text-sm font-bold active:opacity-70 transition-opacity"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(240,238,255,0.6)' }}>
                  キャンセル
                </button>
              </div>
            ) : (
              /* 削除確認 */
              <div className="px-4 pb-6">
                <div className="text-center py-4">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
                    style={{ background: 'rgba(255,77,144,0.12)' }}>
                    <Trash2 size={24} style={{ color: '#FF4D90' }} />
                  </div>
                  <p className="font-extrabold text-base" style={{ color: '#F0EEFF' }}>本当に削除しますか？</p>
                  <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'rgba(240,238,255,0.4)' }}>
                    この投稿は完全に削除されます。<br />この操作は取り消せません。
                  </p>
                </div>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full py-3.5 rounded-2xl text-white text-sm font-extrabold active:opacity-80 transition-opacity disabled:opacity-50 mt-2"
                  style={{ background: 'linear-gradient(135deg,#FF4D90,#e0195a)' }}>
                  {deleting ? '削除中…' : '削除する'}
                </button>
                <button
                  onClick={() => setConfirmDel(false)}
                  className="w-full mt-2 py-3.5 rounded-2xl text-sm font-bold active:opacity-70 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(240,238,255,0.6)' }}>
                  戻る
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 通報モーダル ── */}
      {showReport && (
        <ReportModal
          reportedId={tweet.user_id}
          reportedName={getUserDisplayName(tweet.profiles, 'このユーザー')}
          onClose={() => setShowReport(false)}
        />
      )}

      {/* ── 編集シート ── */}
      {showEdit && (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowEdit(false)} />
          <div
            className="relative rounded-t-3xl w-full max-w-md mx-auto overflow-hidden"
            style={{ background: '#0f0820', border: '1px solid rgba(157,92,255,0.2)', borderBottom: 'none' }}
            onClick={e => e.stopPropagation()}
          >
            {/* ハンドル */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(157,92,255,0.3)' }} />
            </div>

            {/* ヘッダー */}
            <div className="flex items-center justify-between px-5 py-2.5">
              <button onClick={() => setShowEdit(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full active:opacity-60 transition-opacity"
                style={{ background: 'rgba(255,255,255,0.06)' }}>
                <X size={18} style={{ color: 'rgba(240,238,255,0.55)' }} />
              </button>
              <span className="text-sm font-extrabold" style={{ color: '#F0EEFF' }}>投稿を編集</span>
              <button
                onClick={handleSaveEdit}
                disabled={!editText.trim() || editText.length > MAX || saving}
                className="px-5 py-1.5 rounded-full text-sm font-extrabold text-white disabled:opacity-40 active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg,#9D5CFF,#7B3FE4)', boxShadow: '0 4px 16px rgba(157,92,255,0.4)' }}>
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin block" />
                ) : '保存する'}
              </button>
            </div>

            {/* テキストエリア */}
            <div className="px-5 pt-1 pb-4">
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                rows={5}
                autoFocus
                className="w-full text-[17px] leading-relaxed resize-none focus:outline-none bg-transparent"
                style={{ color: '#F0EEFF', caretColor: '#9D5CFF' }}
              />
            </div>

            {/* フッター（文字数） */}
            <div className="flex items-center justify-end gap-2 px-5 py-3"
              style={{ borderTop: '1px solid rgba(157,92,255,0.15)' }}>
              <span className="text-xs font-bold"
                style={{ color: MAX - editText.length < 20 ? '#FF4D90' : 'rgba(240,238,255,0.3)' }}>
                {MAX - editText.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
