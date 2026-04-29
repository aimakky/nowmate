'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getNationalityFlag, timeAgo } from '@/lib/utils'
import { MessageCircle, Repeat2, MoreHorizontal, Pencil, Trash2, X, Flag, Ban } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import ReportModal from '@/components/features/ReportModal'

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
  profiles: { display_name: string; nationality: string; avatar_url: string | null }
  tweet_reactions: { user_id: string; reaction: string }[]
  tweet_replies?: { id: string }[]
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
}

export default function TweetCard({ tweet, myId, onUpdate, showBorder = true, canInteract = true }: Props) {
  const router = useRouter()
  const [showPicker,  setShowPicker]  = useState(false)
  const [reposting,   setReposting]   = useState(false)
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
  const MAX = 280

  // ── reactions ────────────────────────────────────────────────
  const reactionMap = tweet.tweet_reactions.reduce((acc, r) => {
    acc[r.reaction] = (acc[r.reaction] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const myReaction    = tweet.tweet_reactions.find(r => r.user_id === myId)?.reaction
  const activeReactions = REACTIONS.filter(r => reactionMap[r.key])
  const hasReactions  = activeReactions.length > 0

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
    setShowPicker(false)
    onUpdate()
  }

  async function handleRepost() {
    if (!myId || reposting || !canInteract) return
    const supabase = createClient()
    const { data: existing } = await supabase.from('tweets')
      .select('id').eq('user_id', myId).eq('repost_of', tweet.id).maybeSingle()
    if (existing) { setReposting(false); return }
    setReposting(true)
    await supabase.from('tweets').insert({ user_id: myId, content: tweet.content, repost_of: tweet.id })
    setReposting(false)
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

  const flag = getNationalityFlag(tweet.profiles?.nationality || '')

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
            <span>{tweet.profiles?.display_name} reposted</span>
          </div>
        )}

        <div className="flex items-start gap-3">
          {/* Avatar */}
          <button onClick={() => router.push(`/profile/${tweet.user_id}`)} className="flex-shrink-0 mt-0.5">
            <Avatar src={tweet.profiles?.avatar_url} name={tweet.profiles?.display_name} size="sm" />
          </button>

          <div className="flex-1 min-w-0">
            {/* Name + time + menu */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button onClick={() => router.push(`/profile/${tweet.user_id}`)}
                  className="font-extrabold text-sm leading-tight"
                  style={{ color: '#F0EEFF' }}>
                  {tweet.profiles?.display_name}
                </button>
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

            {/* Reaction summary */}
            {hasReactions && (
              <div className="flex items-center gap-1 mb-2 flex-wrap">
                {activeReactions.map(r => (
                  <button key={r.key} onClick={() => toggleReaction(r.key)}
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold transition-all active:scale-90"
                    style={myReaction === r.key
                      ? { background: 'rgba(57,255,136,0.15)', color: '#39FF88', border: '1px solid rgba(57,255,136,0.4)' }
                      : { background: 'rgba(255,255,255,0.06)', color: 'rgba(240,238,255,0.55)', border: '1px solid rgba(255,255,255,0.08)' }
                    }>
                    <span>{r.emoji}</span>
                    <span>{reactionMap[r.key]}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Action bar */}
            <div className="flex items-center gap-1 relative">
              {canInteract ? (
                <>
                  {/* Reaction picker */}
                  <div className="relative">
                    <button
                      onClick={() => setShowPicker(p => !p)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-90"
                      style={myReaction
                        ? { color: '#39FF88', background: 'rgba(57,255,136,0.1)' }
                        : { color: '#39FF88', background: 'transparent' }
                      }>
                      {myReaction
                        ? <span>{REACTIONS.find(r => r.key === myReaction)?.emoji}</span>
                        : <span>＋ React</span>
                      }
                    </button>
                    {showPicker && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
                        <div className="absolute bottom-9 left-0 z-50 rounded-2xl shadow-xl p-2 flex gap-1"
                          style={{ background: '#080f0a', border: '1px solid rgba(57,255,136,0.25)', boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(57,255,136,0.1)' }}>
                          {REACTIONS.map(r => (
                            <button key={r.key} onClick={() => toggleReaction(r.key)} title={r.label}
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all hover:scale-125 active:scale-95"
                              style={myReaction === r.key
                                ? { background: 'rgba(57,255,136,0.2)', border: '1px solid rgba(57,255,136,0.45)' }
                                : { background: 'rgba(255,255,255,0.06)' }
                              }>
                              {r.emoji}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Reply */}
                  <button onClick={() => router.push(`/tweet/${tweet.id}`)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-90"
                    style={{ color: 'rgba(240,238,255,0.4)' }}>
                    <MessageCircle size={13} />
                    {(tweet.reply_count ?? tweet.tweet_replies?.length ?? 0) > 0 && (
                      <span>{tweet.reply_count ?? tweet.tweet_replies?.length}</span>
                    )}
                  </button>

                  {/* Repost */}
                  {tweet.repost_of === null && (
                    <button onClick={handleRepost} disabled={reposting}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-90 disabled:opacity-40"
                      style={{ color: 'rgba(240,238,255,0.4)' }}>
                      <Repeat2 size={13} />
                      {(tweet.repost_count ?? 0) > 0 && <span>{tweet.repost_count}</span>}
                    </button>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-1.5">
                  {!hasReactions && (
                    <span className="text-[11px] font-medium" style={{ color: 'rgba(240,238,255,0.25)' }}>🇯🇵 Japan only</span>
                  )}
                  {(tweet.reply_count ?? 0) > 0 && (
                    <span className="flex items-center gap-1 px-2 py-1 text-xs" style={{ color: 'rgba(240,238,255,0.3)' }}>
                      <MessageCircle size={12} />{tweet.reply_count}
                    </span>
                  )}
                  {(tweet.repost_count ?? 0) > 0 && (
                    <span className="flex items-center gap-1 px-2 py-1 text-xs" style={{ color: 'rgba(240,238,255,0.3)' }}>
                      <Repeat2 size={12} />{tweet.repost_count}
                    </span>
                  )}
                </div>
              )}
            </div>
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
          reportedName={tweet.profiles?.display_name ?? 'このユーザー'}
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
