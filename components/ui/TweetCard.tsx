'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getNationalityFlag } from '@/lib/utils'
import { Repeat2, Pencil, Trash2, X, Flag, Ban } from 'lucide-react'
import PostActions from '@/components/ui/PostActions'
import PostCardHeader from '@/components/ui/PostCardHeader'
import ReportModal from '@/components/features/ReportModal'
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

// 2026-05-08 (8 回目): TweetCard の外側 wrapper (background / padding /
// border / shadow) は撤去し、呼出側の PostCardShell (timeline / mypage /
// profile/[userId]) または白背景 wrapper (/tweet/[tweetId] 詳細) に
// 委譲する。これにより village 投稿カードと色味・浮き方・余白が完全一致し、
// 「同じ画面で 1 投稿だけ違う」事故 (PR #13〜#17 で 4 連続発生) を構造的に
// 防止する。showBorder prop は API 互換のため残置するが no-op。
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function TweetCard({ tweet, myId, onUpdate, showBorder: _showBorder = true, canInteract = true, verified, avatarVariant = 'default' }: Props) {
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
    // eslint-disable-next-line no-console
    console.log('[LIKE_DEBUG] TweetCard toggleReaction start:', { tweetId: tweet.id, key, currentMyReaction: myReaction, myId })
    const supabase = createClient()
    // 2026-05-09 マッキーさん指示: 「ハート押しても DB に保存されない」事象の
    // 真因究明のためエラーを画面に出す。旧実装は await の result を受け取らず
    // RLS や validation エラーを silent failure させていた (楽観的 UI でハートが
    // 赤くなるが DB には保存されない → ページ離れて戻ると消える)。
    // 確認後、エラーが出ない正常状態が確認できたら alert は除去予定。
    let error: { message: string; code?: string; details?: string; hint?: string } | null = null
    let resultStatus: number | undefined
    if (myReaction === key) {
      const r = await supabase.from('tweet_reactions').delete().eq('tweet_id', tweet.id).eq('user_id', myId)
      error = r.error as any
      resultStatus = r.status
    } else {
      const r = await supabase.from('tweet_reactions').upsert(
        { tweet_id: tweet.id, user_id: myId, reaction: key },
        { onConflict: 'tweet_id,user_id' }
      )
      error = r.error as any
      resultStatus = r.status
    }
    // eslint-disable-next-line no-console
    console.log('[LIKE_DEBUG] TweetCard toggleReaction result:', { tweetId: tweet.id, error, status: resultStatus })
    if (error) {
      // eslint-disable-next-line no-console
      console.error('[toggleReaction] supabase error:', error)
      // 一時 alert: マッキーさんが iPhone で原因を目視できるように。
      // 確認後の次 commit で除去 (CLAUDE.md「一時 console.log の最短ライフサイクル」)。
      alert(`いいね保存エラー (tweet)\nmessage: ${error.message ?? '(no message)'}\ncode: ${error.code ?? '(no code)'}\ndetails: ${error.details ?? '(no details)'}\nhint: ${error.hint ?? '(no hint)'}`)
      return
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
      {/* Repost header (リポスト時のみ) */}
      {tweet.repost_of && (
        <div className="flex items-center gap-1.5 text-xs font-semibold mb-2 ml-1"
          style={{ color: 'rgba(240,238,255,0.4)' }}>
          <Repeat2 size={12} />
          <span>{getUserDisplayName(tweet.profiles)} reposted</span>
        </div>
      )}

      {/* ヘッダー = 共通 PostCardHeader コンポーネント
          2026-05-08 (9 回目): village 投稿カードと内部レイアウトを完全統一する
          ため、アバター + 名前 + バッジ + 国旗 + 時刻 + 三点メニューを
          PostCardHeader (components/ui/PostCardHeader.tsx) に集約。
          本文と PostActions はヘッダーの sibling になり、カード左端から
          フル幅で配置される (旧: アバター右にインデント)。 */}
      <PostCardHeader
        profileHref={profileHref}
        displayName={getUserDisplayName(tweet.profiles)}
        avatarUrl={tweet.profiles?.avatar_url}
        avatarVariant={avatarVariant}
        isVerified={isVerified}
        trustTier={tweet.user_trust?.tier ?? null}
        flag={flag}
        timestamp={tweet.created_at}
        onMenuClick={myId ? () => setShowMenu(true) : undefined}
        menuLabel="投稿メニュー"
      />

      {/* Content (カード左端からフル幅で配置) */}
      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(240,238,255,0.85)' }}>
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
