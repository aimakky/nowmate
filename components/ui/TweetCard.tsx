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
      <div className={`bg-white px-4 py-4 ${showBorder ? 'border-b border-stone-100' : ''}`}>
        {/* Repost header */}
        {tweet.repost_of && (
          <div className="flex items-center gap-1.5 text-xs text-stone-400 font-semibold mb-2 ml-1">
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
                  className="font-extrabold text-stone-900 text-sm hover:underline leading-tight">
                  {tweet.profiles?.display_name}
                </button>
                <span className="text-base leading-none">{flag}</span>
                <span className="text-xs text-stone-400">{timeAgo(tweet.created_at)}</span>
              </div>
              {myId && (
                <button
                  onClick={() => setShowMenu(true)}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 active:bg-stone-200 transition-colors -mr-1 flex-shrink-0">
                  <MoreHorizontal size={16} />
                </button>
              )}
            </div>

            {/* Content */}
            <p className="text-sm text-stone-800 leading-relaxed mb-3 whitespace-pre-wrap">
              {tweet.content}
            </p>

            {/* Reaction summary */}
            {hasReactions && (
              <div className="flex items-center gap-1 mb-2 flex-wrap">
                {activeReactions.map(r => (
                  <button key={r.key} onClick={() => toggleReaction(r.key)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold transition-all active:scale-90 ${
                      myReaction === r.key
                        ? 'bg-brand-100 text-brand-700 ring-1 ring-brand-300'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}>
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
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-90 ${
                        myReaction
                          ? 'text-brand-600 bg-brand-50'
                          : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'
                      }`}>
                      {myReaction
                        ? <span>{REACTIONS.find(r => r.key === myReaction)?.emoji}</span>
                        : <span>＋ React</span>
                      }
                    </button>
                    {showPicker && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
                        <div className="absolute bottom-9 left-0 z-50 bg-white border border-stone-200 rounded-2xl shadow-xl p-2 flex gap-1">
                          {REACTIONS.map(r => (
                            <button key={r.key} onClick={() => toggleReaction(r.key)} title={r.label}
                              className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all hover:scale-125 active:scale-95 ${
                                myReaction === r.key ? 'bg-brand-100 ring-2 ring-brand-300' : 'hover:bg-stone-100'
                              }`}>
                              {r.emoji}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Reply */}
                  <button onClick={() => router.push(`/tweet/${tweet.id}`)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-all active:scale-90">
                    <MessageCircle size={13} />
                    {(tweet.reply_count ?? tweet.tweet_replies?.length ?? 0) > 0 && (
                      <span>{tweet.reply_count ?? tweet.tweet_replies?.length}</span>
                    )}
                  </button>

                  {/* Repost */}
                  {tweet.repost_of === null && (
                    <button onClick={handleRepost} disabled={reposting}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all active:scale-90 disabled:opacity-40">
                      <Repeat2 size={13} />
                      {(tweet.repost_count ?? 0) > 0 && <span>{tweet.repost_count}</span>}
                    </button>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-1.5">
                  {!hasReactions && <span className="text-[11px] text-stone-300 font-medium">🇯🇵 Japan only</span>}
                  {(tweet.reply_count ?? 0) > 0 && (
                    <span className="flex items-center gap-1 px-2 py-1 text-xs text-stone-300">
                      <MessageCircle size={12} />{tweet.reply_count}
                    </span>
                  )}
                  {(tweet.repost_count ?? 0) > 0 && (
                    <span className="flex items-center gap-1 px-2 py-1 text-xs text-stone-300">
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
          <div className="relative bg-white rounded-t-3xl w-full max-w-md mx-auto overflow-hidden pb-safe">

            {/* ハンドル */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-stone-200" />
            </div>

            {!confirmDel ? (
              <div className="px-4 pb-6">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 px-1">投稿の操作</p>

                {isOwn ? (
                  <>
                    {/* 編集 */}
                    <button
                      onClick={() => { setEditText(tweet.content); setShowMenu(false); setShowEdit(true) }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-stone-50 active:bg-stone-100 transition-colors text-left">
                      <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0">
                        <Pencil size={16} className="text-stone-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-stone-900">編集する</p>
                        <p className="text-xs text-stone-400">内容を修正できます</p>
                      </div>
                    </button>

                    {/* 削除 */}
                    <button
                      onClick={() => setConfirmDel(true)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-red-50 active:bg-red-100 transition-colors text-left mt-1">
                      <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                        <Trash2 size={16} className="text-red-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-red-600">削除する</p>
                        <p className="text-xs text-red-400">この操作は取り消せません</p>
                      </div>
                    </button>
                  </>
                ) : (
                  <>
                    {/* 通報 */}
                    <button
                      onClick={() => { setShowMenu(false); setShowReport(true) }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-orange-50 active:bg-orange-100 transition-colors text-left">
                      <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                        <Flag size={16} className="text-orange-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-orange-600">通報する</p>
                        <p className="text-xs text-orange-400">不適切な投稿を報告する</p>
                      </div>
                    </button>

                    {/* ブロック */}
                    <button
                      onClick={handleBlock}
                      disabled={blocking || blockDone}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-red-50 active:bg-red-100 transition-colors text-left mt-1 disabled:opacity-60">
                      <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                        {blockDone
                          ? <span className="text-base">✅</span>
                          : <Ban size={16} className="text-red-500" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-red-600">
                          {blockDone ? 'ブロックしました' : 'ブロックする'}
                        </p>
                        <p className="text-xs text-red-400">
                          {blockDone ? 'このユーザーの投稿が非表示になります' : 'このユーザーを非表示にする'}
                        </p>
                      </div>
                    </button>
                  </>
                )}

                {/* キャンセル */}
                <button
                  onClick={() => setShowMenu(false)}
                  className="w-full mt-3 py-3.5 rounded-2xl bg-stone-100 text-sm font-bold text-stone-600 active:bg-stone-200 transition-colors">
                  キャンセル
                </button>
              </div>
            ) : (
              /* 削除確認 */
              <div className="px-4 pb-6">
                <div className="text-center py-4">
                  <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                    <Trash2 size={24} className="text-red-500" />
                  </div>
                  <p className="font-extrabold text-stone-900 text-base">本当に削除しますか？</p>
                  <p className="text-xs text-stone-400 mt-1.5 leading-relaxed">この投稿は完全に削除されます。<br />この操作は取り消せません。</p>
                </div>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full py-3.5 rounded-2xl bg-red-500 text-white text-sm font-extrabold active:opacity-80 transition-opacity disabled:opacity-50 mt-2">
                  {deleting ? '削除中…' : '削除する'}
                </button>
                <button
                  onClick={() => setConfirmDel(false)}
                  className="w-full mt-2 py-3.5 rounded-2xl bg-stone-100 text-sm font-bold text-stone-600 active:bg-stone-200 transition-colors">
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
            className="relative bg-white rounded-t-3xl w-full max-w-md mx-auto overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* ハンドル */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-stone-200" />
            </div>

            {/* ヘッダー */}
            <div className="flex items-center justify-between px-5 py-2.5">
              <button onClick={() => setShowEdit(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full active:bg-stone-100 transition-colors">
                <X size={18} className="text-stone-500" />
              </button>
              <span className="text-sm font-extrabold text-stone-900">投稿を編集</span>
              <button
                onClick={handleSaveEdit}
                disabled={!editText.trim() || editText.length > MAX || saving}
                className="px-5 py-1.5 rounded-full text-sm font-extrabold text-white disabled:opacity-40 active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg,#1c1917,#3c3836)' }}>
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
                className="w-full text-[17px] leading-relaxed resize-none focus:outline-none text-stone-900 bg-transparent"
              />
            </div>

            {/* フッター（文字数） */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-stone-100">
              <span className={`text-xs font-bold ${MAX - editText.length < 20 ? 'text-orange-500' : 'text-stone-300'}`}>
                {MAX - editText.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
