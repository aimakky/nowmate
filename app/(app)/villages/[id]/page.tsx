'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Mic, Users, Send, Flag, CheckCircle, Crown,
  Pin, Trash2, Settings2, BookOpen, Save, X, PinOff, Flame,
} from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import { getOccupationBadge } from '@/lib/occupation'
import { getCurrentWeeklyEvent, VILLAGE_TYPE_STYLES } from '@/components/ui/VillageCard'
import TrustBadge from '@/components/ui/TrustBadge'
import PhoneVerifyModal from '@/components/features/PhoneVerifyModal'
import MoodWeather from '@/components/features/MoodWeather'
import DriftBottle from '@/components/features/DriftBottle'
import { getUserTrust, getTierById, awardPoints } from '@/lib/trust'

// ─── Constants ────────────────────────────────────────────────
const POST_CATEGORIES = ['全部', '雑談', '相談', '仕事', '趣味', '今日のひとこと', '初参加あいさつ', '今日のお題']

const CAT_ICONS: Record<string, string> = {
  '全部':           '📋',
  '雑談':           '💬',
  '相談':           '🤝',
  '仕事':           '💼',
  '趣味':           '🎨',
  '今日のひとこと':   '✏️',
  '初参加あいさつ':   '🌱',
  '今日のお題':       '❓',
}

const CAT_COLORS: Record<string, string> = {
  '雑談':           '#8b7355',
  '相談':           '#1a9ec8',
  '仕事':           '#4f56c8',
  '趣味':           '#d44060',
  '今日のひとこと':   '#d99820',
  '初参加あいさつ':   '#14a89a',
  '今日のお題':       '#7c3aed',
}

const VOICE_ROOM_NAMES: Record<string, string> = {
  '雑談':     '🌿 雑談広場',
  '相談':     '🤝 相談小屋',
  '仕事終わり': '🌙 仕事終わりの縁側',
  '焚き火':   '🔥 焚き火部屋',
  '初参加':   '🌱 はじめての広場',
  '趣味':     '🎨 趣味の広場',
  '職業':     '💼 職人の広場',
  '地域':     '📍 地域の広場',
}

const MILESTONES = [10, 50, 100, 300, 500]

function getLevelInfo(count: number) {
  if (count >= 500) return { icon: '✨', label: '伝説の村' }
  if (count >= 200) return { icon: '🏡', label: '栄えた村' }
  if (count >= 50)  return { icon: '🌳', label: '活発な村' }
  if (count >= 10)  return { icon: '🌿', label: '育ち中' }
  return                   { icon: '🌱', label: '芽吹いた村' }
}

function getWeekLabel(weekStart: string) {
  const d = new Date(weekStart)
  return `${d.getMonth() + 1}月${d.getDate()}日の週`
}

/** JST 時刻（時）を返す */
function getJSTHour() {
  return (new Date().getUTCHours() + 9) % 24
}

/** JST 日付文字列 YYYY-MM-DD を返す */
function getJSTDate() {
  const jst = new Date(Date.now() + 9 * 3600 * 1000)
  return jst.toISOString().split('T')[0]
}

// ─── ストリーク表示ヘルパー ────────────────────────────────────
function streakEmoji(n: number) {
  if (n >= 30) return '✨'
  if (n >= 14) return '🌳'
  if (n >= 7)  return '🔥'
  if (n >= 3)  return '🌿'
  return '🌱'
}

// ─── 相談解決モーダル ─────────────────────────────────────────
function ResolveModal({
  post, members, userId, onClose, onResolved,
}: {
  post: any; members: any[]; userId: string; onClose: () => void; onResolved: () => void
}) {
  const [selectedHelper, setSelectedHelper] = useState<string | null>(null)
  const [resolving, setResolving] = useState(false)
  const others = members.filter(m => m.user_id !== userId)

  async function handleResolve() {
    setResolving(true)
    const supabase = createClient()
    await supabase.from('village_posts')
      .update({ is_resolved: true, resolved_by_user_id: userId }).eq('id', post.id)
    await supabase.from('consultation_resolutions').upsert({
      post_id: post.id, resolved_by: userId, helper_user_id: selectedHelper ?? null,
    })
    onResolved(); onClose(); setResolving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl">
        <div className="text-center mb-4">
          <div className="text-3xl mb-2">✅</div>
          <h3 className="font-extrabold text-stone-900 text-base">解決済みにする</h3>
          <p className="text-xs text-stone-500 mt-1 leading-relaxed">
            誰かのおかげで解決しましたか？<br />選ぶとその住民の信頼ポイントが上がります。
          </p>
        </div>
        <div className="space-y-2 mb-5 max-h-48 overflow-y-auto">
          <button
            onClick={() => setSelectedHelper(null)}
            className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
              selectedHelper === null ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-stone-200 text-stone-600'
            }`}
          >🙋 自分で解決しました</button>
          {others.map(m => (
            <button key={m.user_id} onClick={() => setSelectedHelper(m.user_id)}
              className={`w-full text-left px-4 py-2.5 rounded-xl border flex items-center gap-2.5 transition-all ${
                selectedHelper === m.user_id ? 'border-emerald-400 bg-emerald-50' : 'border-stone-200'
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-600 flex-shrink-0">
                {m.profiles?.display_name?.[0] ?? '?'}
              </div>
              <span className={`text-sm font-medium flex-1 ${selectedHelper === m.user_id ? 'text-emerald-700' : 'text-stone-700'}`}>
                {m.profiles?.display_name ?? '住民'}
              </span>
              {selectedHelper === m.user_id && (
                <span className="text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">+25pt</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-stone-200 text-sm font-bold text-stone-500">キャンセル</button>
          <button onClick={handleResolve} disabled={resolving}
            className="flex-1 py-3 rounded-2xl text-white text-sm font-bold disabled:opacity-40 active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}
          >
            {resolving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> : '解決済みにする'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 今日のお題カード ─────────────────────────────────────────
function DailyPromptCard({
  prompt, stampCount, hasStamped, style, canPost,
  onAnswer, onSuggest, isBonfireTime,
}: {
  prompt: { id: string; text: string } | null
  stampCount: number
  hasStamped: boolean
  style: any
  canPost: boolean
  onAnswer: (text: string) => Promise<void>
  onSuggest: (text: string) => Promise<void>
  isBonfireTime: boolean
}) {
  const [expanded,   setExpanded]   = useState(false)
  const [answer,     setAnswer]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showSuggest, setShowSuggest] = useState(false)
  const [suggestText, setSuggestText] = useState('')
  const [suggesting,  setSuggesting]  = useState(false)

  async function handleAnswer() {
    if (!answer.trim()) return
    setSubmitting(true)
    await onAnswer(answer.trim())
    setAnswer('')
    setExpanded(false)
    setSubmitting(false)
  }

  async function handleSuggest() {
    if (!suggestText.trim()) return
    setSuggesting(true)
    await onSuggest(suggestText.trim())
    setSuggestText('')
    setShowSuggest(false)
    setSuggesting(false)
  }

  if (!prompt) return null

  return (
    <div
      className="rounded-3xl overflow-hidden shadow-md"
      style={{
        background: isBonfireTime
          ? 'linear-gradient(135deg, #1c0a00 0%, #3d1500 100%)'
          : `linear-gradient(135deg, ${style.accent}18 0%, ${style.accent}08 100%)`,
        border: isBonfireTime
          ? '1px solid rgba(255,140,0,0.3)'
          : `1px solid ${style.accent}30`,
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-2.5 flex items-center gap-2"
        style={{
          background: isBonfireTime
            ? 'linear-gradient(90deg, rgba(255,100,0,0.4) 0%, rgba(255,60,0,0.2) 100%)'
            : `${style.accent}20`,
        }}
      >
        <span className="text-base">{isBonfireTime ? '🔥' : '❓'}</span>
        <p className="text-xs font-extrabold uppercase tracking-wider flex-1"
          style={{ color: isBonfireTime ? '#ff9950' : style.accent }}>
          {isBonfireTime ? '焚き火のお題' : '今日のお題'}
        </p>
        {stampCount > 0 && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{
              background: isBonfireTime ? 'rgba(255,140,0,0.25)' : `${style.accent}20`,
              color: isBonfireTime ? '#ffaa60' : style.accent,
            }}
          >
            {stampCount}人が回答
          </span>
        )}
      </div>

      <div className="p-4">
        {/* Question */}
        <p className="font-bold leading-relaxed mb-3"
          style={{ color: isBonfireTime ? '#ffe0c0' : '#1c1917', fontSize: '0.9rem' }}>
          {prompt.text}
        </p>

        {hasStamped ? (
          /* 回答済み */
          <div className="flex items-center gap-2">
            <span
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{
                background: isBonfireTime ? 'rgba(255,140,0,0.2)' : `${style.accent}15`,
                color: isBonfireTime ? '#ffaa60' : style.accent,
              }}
            >
              <CheckCircle size={12} /> 今日は答えました ✨
            </span>
            <button
              onClick={() => setShowSuggest(v => !v)}
              className="text-[10px] text-stone-400 hover:text-stone-600 transition-colors ml-auto"
            >
              別のお題を提案する
            </button>
          </div>
        ) : (
          /* 未回答 */
          expanded ? (
            <div className="space-y-2">
              <textarea
                value={answer}
                onChange={e => setAnswer(e.target.value.slice(0, 200))}
                placeholder="あなたの答えを書いてください…"
                rows={3}
                autoFocus
                className="w-full px-3 py-2.5 rounded-2xl border text-sm resize-none focus:outline-none leading-relaxed"
                style={{
                  background: isBonfireTime ? 'rgba(255,255,255,0.06)' : '#fff',
                  borderColor: isBonfireTime ? 'rgba(255,140,0,0.3)' : `${style.accent}40`,
                  color: isBonfireTime ? '#ffe0c0' : '#1c1917',
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setExpanded(false); setAnswer('') }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold border"
                  style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#a8a29e' }}
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAnswer}
                  disabled={!answer.trim() || submitting}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-40 active:scale-95 transition-all flex items-center justify-center gap-1"
                  style={{
                    background: isBonfireTime
                      ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                      : style.accent,
                  }}
                >
                  {submitting
                    ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    : <><Send size={11} /> 答える</>}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => canPost ? setExpanded(true) : undefined}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white active:scale-95 transition-all"
                style={{
                  background: isBonfireTime
                    ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                    : style.accent,
                  opacity: canPost ? 1 : 0.5,
                }}
              >
                {canPost ? '✍️ 答える' : '📱 認証すると答えられます'}
              </button>
              <button
                onClick={() => setShowSuggest(v => !v)}
                className="text-[10px] text-stone-400 hover:text-stone-600 transition-colors flex-shrink-0"
              >
                提案する
              </button>
            </div>
          )
        )}

        {/* お題を提案するフォーム */}
        {showSuggest && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <p className="text-[10px] font-bold mb-2" style={{ color: isBonfireTime ? '#ffaa60' : style.accent }}>
              💡 明日以降のお題を提案する
            </p>
            <div className="flex gap-2">
              <input
                value={suggestText}
                onChange={e => setSuggestText(e.target.value.slice(0, 80))}
                placeholder="みんなへの質問を書いてね"
                className="flex-1 px-3 py-2 rounded-xl border text-xs focus:outline-none"
                style={{
                  background: isBonfireTime ? 'rgba(255,255,255,0.06)' : '#fff',
                  borderColor: isBonfireTime ? 'rgba(255,140,0,0.2)' : '#e7e5e4',
                  color: isBonfireTime ? '#ffe0c0' : '#1c1917',
                }}
              />
              <button
                onClick={handleSuggest}
                disabled={!suggestText.trim() || suggesting}
                className="px-3 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40"
                style={{ background: style.accent }}
              >
                {suggesting ? '…' : '送る'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 締め切りカウントダウン ──────────────────────────────────────
function DeadlineBadge({ deadline_at, is_closed }: { deadline_at: string; is_closed?: boolean }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])

  const ms   = new Date(deadline_at).getTime() - now
  const past = ms <= 0

  if (past || is_closed) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
        style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca' }}>
        ⏱️ 締め切り
      </span>
    )
  }

  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const label = h > 0 ? `残り${h}時間` : `残り${m}分`
  const urgent = ms < 3600000 // 1時間未満

  return (
    <span
      className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${urgent ? 'animate-pulse' : ''}`}
      style={urgent
        ? { background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa' }
        : { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}
    >
      ⏱️ {label}
    </span>
  )
}

// ─── PostCard ─────────────────────────────────────────────────
function PostCard({
  post, style, likedPosts, onToggleLike, onResolve, onPin, onDelete, isPinned, userId, isHost, villageId,
}: {
  post: any; style: any; likedPosts: Set<string>
  onToggleLike: (id: string) => void
  onResolve?: (post: any) => void
  onPin?: (id: string | null) => void
  onDelete?: (id: string) => void
  isPinned?: boolean; userId: string | null; isHost: boolean; villageId: string
}) {
  const catColor = CAT_COLORS[post.category] ?? style.accent
  const [showComments,    setShowComments]    = useState(false)
  const [comments,        setComments]        = useState<any[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentText,     setCommentText]     = useState('')
  const [submitting,      setSubmitting]      = useState(false)
  const [localCount,      setLocalCount]      = useState(post.comment_count ?? 0)

  async function loadComments() {
    setLoadingComments(true)
    const { data } = await createClient()
      .from('village_post_comments')
      .select('*, profiles(display_name)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
      .limit(30)
    setComments(data || [])
    setLoadingComments(false)
  }

  async function toggleComments() {
    const next = !showComments
    setShowComments(next)
    if (next && comments.length === 0) await loadComments()
  }

  async function submitComment() {
    if (!commentText.trim() || submitting || !userId) return
    setSubmitting(true)
    await createClient().from('village_post_comments').insert({
      post_id: post.id, village_id: villageId, user_id: userId, content: commentText.trim(),
    })
    setCommentText('')
    setLocalCount((n: number) => n + 1)
    await loadComments()
    setSubmitting(false)
  }

  return (
    <div
      className="bg-white rounded-3xl overflow-hidden shadow-sm"
      style={{
        border: isPinned ? `1px solid ${style.accent}60`
          : post.is_resolved ? '1px solid #bbf7d0' : '1px solid #f5f5f4',
        boxShadow: isPinned ? `0 2px 16px ${style.accent}18`
          : post.is_resolved ? '0 2px 12px rgba(34,197,94,0.08)' : '0 2px 12px rgba(0,0,0,0.05)',
      }}
    >
      <div className="h-1 w-full" style={{ background: isPinned ? style.accent : catColor }} />
      <div className="p-4">
        {isPinned && (
          <div className="flex items-center gap-1.5 text-[10px] font-bold mb-2 px-2 py-1 rounded-full w-fit"
            style={{ background: `${style.accent}15`, color: style.accent }}>
            <Pin size={10} /> ピン留め中
          </div>
        )}
        <div className="flex items-start justify-between mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold text-white"
                style={{ background: `linear-gradient(135deg, ${catColor} 0%, ${catColor}99 100%)` }}>
                {post.profiles?.avatar_url
                  ? <img src={post.profiles.avatar_url} className="w-full h-full object-cover rounded-full" alt="" />
                  : post.profiles?.display_name?.[0] ?? '?'}
              </div>
              {(() => {
                const occ = getOccupationBadge(post.profiles?.occupation)
                return occ ? (
                  <span className="inline-flex items-center gap-0.5 text-[7px] font-bold px-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 whitespace-nowrap leading-tight py-0">
                    {occ.emoji}{occ.label}
                  </span>
                ) : null
              })()}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-stone-800">{post.profiles?.display_name ?? '住民'}</p>
                {post.user_trust?.tier && <TrustBadge tierId={post.user_trust.tier} size="xs" />}
              </div>
              <p className="text-[10px] text-stone-400">{timeAgo(post.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
            {post.is_resolved && (
              <span className="flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                <CheckCircle size={10} /> 解決済み
              </span>
            )}
            {post.deadline_at && (
              <DeadlineBadge deadline_at={post.deadline_at} is_closed={post.is_deadline_closed} />
            )}
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: `${catColor}15`, color: catColor, border: `1px solid ${catColor}30` }}>
              {CAT_ICONS[post.category]} {post.category}
            </span>
          </div>
        </div>
        <p className="text-sm text-stone-800 leading-relaxed mb-3">{post.content}</p>
        <div className="flex items-center justify-between pt-2 border-t border-stone-50">
          <div className="flex items-center gap-3">
            <button onClick={() => onToggleLike(post.id)}
              className="flex items-center gap-1.5 text-xs font-semibold transition-all active:scale-90"
              style={{ color: likedPosts.has(post.id) ? '#f43f5e' : '#a8a29e' }}>
              <span className="text-base">{likedPosts.has(post.id) ? '❤️' : '🤍'}</span>
              <span>{post.reaction_count}</span>
            </button>
            <button onClick={toggleComments}
              className="flex items-center gap-1.5 text-xs font-semibold transition-all active:scale-90"
              style={{ color: showComments ? style.accent : '#a8a29e' }}>
              <span className="text-base">💬</span>
              <span>{localCount}</span>
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            {post.category === '相談' && post.user_id === userId && !post.is_resolved && onResolve && (
              <button onClick={() => onResolve(post)}
                className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full active:scale-95 transition-all"
                style={{ background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                <CheckCircle size={10} /> 解決済みにする
              </button>
            )}
            {isHost && onPin && (
              <button onClick={() => onPin(isPinned ? null : post.id)}
                className="p-1.5 rounded-full transition-all active:scale-90"
                style={{ background: isPinned ? `${style.accent}20` : '#f5f5f4', color: isPinned ? style.accent : '#a8a29e' }}>
                {isPinned ? <PinOff size={12} /> : <Pin size={12} />}
              </button>
            )}
            {isHost && onDelete && post.user_id !== userId && (
              <button onClick={() => onDelete(post.id)}
                className="p-1.5 rounded-full transition-all active:scale-90 text-stone-300 hover:text-red-400 hover:bg-red-50">
                <Trash2 size={12} />
              </button>
            )}
            {!isHost && <button className="text-stone-200 hover:text-stone-400 transition-colors"><Flag size={12} /></button>}
          </div>
        </div>
      </div>

      {/* ── コメントセクション ── */}
      {showComments && (
        <div className="border-t border-stone-100 bg-stone-50/70 px-4 py-3 space-y-3">
          {loadingComments ? (
            <div className="flex justify-center py-3">
              <span className="w-4 h-4 border-2 border-stone-300 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-[11px] text-stone-400 text-center py-2">まだコメントがありません。最初のコメントをどうぞ！</p>
          ) : (
            <div className="space-y-2.5">
              {comments.map(c => (
                <div key={c.id} className="flex gap-2.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white flex-shrink-0 mt-0.5"
                    style={{ background: style.accent }}>
                    {c.profiles?.display_name?.[0] ?? '?'}
                  </div>
                  <div className="flex-1 bg-white rounded-2xl px-3 py-2 shadow-sm border border-stone-100">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[11px] font-bold text-stone-800">{c.profiles?.display_name ?? '住民'}</span>
                      <span className="text-[9px] text-stone-400">{timeAgo(c.created_at)}</span>
                    </div>
                    <p className="text-xs text-stone-700 leading-relaxed mt-0.5">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {userId && (
            <div className="flex gap-2 pt-0.5">
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value.slice(0, 300))}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment() } }}
                placeholder="コメントする…"
                className="flex-1 px-3 py-2 rounded-2xl border border-stone-200 text-xs bg-white focus:outline-none focus:border-stone-400 transition-colors"
              />
              <button onClick={submitComment} disabled={!commentText.trim() || submitting}
                className="w-9 h-9 rounded-2xl flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all flex-shrink-0"
                style={{ background: style.accent }}>
                {submitting
                  ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                  : <Send size={13} className="text-white" />}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────
export default function VillageDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()

  // ── Core state ──────────────────────────────────────────
  const [village,     setVillage]     = useState<any>(null)
  const [posts,       setPosts]       = useState<any[]>([])
  const [voiceRooms,  setVoiceRooms]  = useState<any[]>([])
  const [members,     setMembers]     = useState<any[]>([])
  const [userTrust,   setUserTrust]   = useState<any>(null)
  const [diary,       setDiary]       = useState<any[]>([])
  const [pinnedPost,  setPinnedPost]  = useState<any>(null)

  const [tab,       setTab]       = useState<'posts' | 'voice' | 'members' | 'diary' | 'diplo' | 'admin'>('posts')
  const [postCat,   setPostCat]   = useState('全部')
  const [isMember,  setIsMember]  = useState(false)
  const [isHost,    setIsHost]    = useState(false)
  const [userId,    setUserId]    = useState<string | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [newPost,        setNewPost]        = useState('')
  const [newPostCat,     setNewPostCat]     = useState('雑談')
  const [newPostDeadline,setNewPostDeadline]= useState<number | null>(null) // 時間（h）
  const [posting,        setPosting]        = useState(false)
  const [likedPosts,setLikedPosts]= useState<Set<string>>(new Set())
  const [joining,   setJoining]   = useState(false)

  // ── 中毒性 3機能 ─────────────────────────────────────────
  const [todayPrompt,     setTodayPrompt]     = useState<{ id: string; text: string } | null>(null)
  const [stampCount,      setStampCount]      = useState(0)
  const [hasStampedToday, setHasStampedToday] = useState(false)
  const [visitStreak,     setVisitStreak]     = useState(0)
  const [jstHour,         setJstHour]         = useState(getJSTHour)

  // ── Admin state ──────────────────────────────────────────
  const [rules,           setRules]           = useState<string[]>(['', '', ''])
  const [savingRules,     setSavingRules]     = useState(false)
  const [savedRules,      setSavedRules]      = useState(false)
  const [generatingDiary, setGeneratingDiary] = useState(false)
  const [kickingUser,     setKickingUser]     = useState<string | null>(null)

  const [showPhoneVerify, setShowPhoneVerify] = useState(false)
  const [resolvePost,     setResolvePost]     = useState<any>(null)

  // ── 廃村システム ─────────────────────────────────────────────
  const [daysLeft,      setDaysLeft]      = useState<number | null>(null)
  const [isAbandoned,   setIsAbandoned]   = useState(false)
  const [showRevival,   setShowRevival]   = useState(false)

  // ── フォロー・今ヒマ ──────────────────────────────────────────
  const [followingIds,  setFollowingIds]  = useState<Set<string>>(new Set())
  const [freeMembers,   setFreeMembers]   = useState<any[]>([])
  const [isFreeNow,     setIsFreeNow]     = useState(false)
  const [togglingFree,  setTogglingFree]  = useState(false)

  // ── はじめまして投稿モーダル ──────────────────────────────────
  const [showWelcome,   setShowWelcome]   = useState(false)
  const [welcomeText,   setWelcomeText]   = useState('')
  const [postingWelcome, setPostingWelcome] = useState(false)

  // ── 村外交システム ────────────────────────────────────────────
  const [diplomacyIn,    setDiplomacyIn]    = useState<any[]>([])
  const [diplomacyOut,   setDiplomacyOut]   = useState<any[]>([])
  const [mergeRequests,  setMergeRequests]  = useState<any[]>([])
  const [showDiploForm,  setShowDiploForm]  = useState(false)
  const [showMergeForm,  setShowMergeForm]  = useState(false)
  const [diploMsg,       setDiploMsg]       = useState('')
  const [diploEmoji,     setDiploEmoji]     = useState('📜')
  const [diploTarget,    setDiploTarget]    = useState<any>(null)
  const [diploSearch,    setDiploSearch]    = useState('')
  const [diploResults,   setDiploResults]   = useState<any[]>([])
  const [sendingDiplo,   setSendingDiplo]   = useState(false)
  const [mergeTarget,    setMergeTarget]    = useState<any>(null)
  const [mergeSearch,    setMergeSearch]    = useState('')
  const [mergeResults,   setMergeResults]   = useState<any[]>([])
  const [mergeMsg,       setMergeMsg]       = useState('')
  const [sendingMerge,   setSendingMerge]   = useState(false)

  // JST時刻を毎分更新
  useEffect(() => {
    const t = setInterval(() => setJstHour(getJSTHour()), 60_000)
    return () => clearInterval(t)
  }, [])

  const isBonfireTime = jstHour >= 21 && jstHour < 23
  const weeklyEvent   = getCurrentWeeklyEvent()

  // ── Auth ─────────────────────────────────────────────────
  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const trust = await getUserTrust(user.id)
      setUserTrust(trust)
    })
  }, [])

  // ── Fetchers ─────────────────────────────────────────────
  const fetchVillage = useCallback(async () => {
    const { data } = await createClient()
      .from('villages').select('*, profiles(display_name), job_locked, job_type').eq('id', id).single()
    if (data) {
      setVillage(data)
      setRules(data.rules ?? ['', '', ''])
      setIsAbandoned(data.is_abandoned ?? false)
    }
    setLoading(false)
  }, [id])

  // 廃村チェック（ページ読み込み時）
  const checkAbandonment = useCallback(async () => {
    const { data } = await createClient().rpc('check_village_abandonment', { p_village_id: id })
    if (data) {
      setIsAbandoned(data.is_abandoned ?? false)
      setDaysLeft(data.days_left ?? null)
    }
  }, [id])

  const checkMembership = useCallback(async () => {
    if (!userId) return
    const { data } = await createClient()
      .from('village_members').select('user_id, role')
      .eq('village_id', id).eq('user_id', userId).maybeSingle()
    setIsMember(!!data)
    setIsHost(data?.role === 'host')
  }, [id, userId])

  const fetchPosts = useCallback(async () => {
    let q = createClient()
      .from('village_posts')
      .select('*, profiles(display_name, avatar_url, occupation), user_trust!village_posts_user_id_fkey(tier, is_shadow_banned)')
      .eq('village_id', id).order('created_at', { ascending: false }).limit(50)
    if (postCat !== '全部') q = q.eq('category', postCat)
    const { data } = await q
    setPosts((data || []).filter((p: any) => !p.user_trust?.is_shadow_banned))
  }, [id, postCat])

  const fetchPinnedPost = useCallback(async () => {
    if (!village?.pinned_post_id) { setPinnedPost(null); return }
    const { data } = await createClient()
      .from('village_posts')
      .select('*, profiles(display_name), user_trust!village_posts_user_id_fkey(tier)')
      .eq('id', village.pinned_post_id).single()
    setPinnedPost(data ?? null)
  }, [village?.pinned_post_id])

  const fetchVoiceRooms = useCallback(async () => {
    const { data } = await createClient()
      .from('voice_rooms')
      .select('*, profiles(display_name), voice_participants(user_id, is_listener)')
      .eq('village_id', id).eq('status', 'active').order('created_at', { ascending: false })
    setVoiceRooms(data || [])
  }, [id])

  const fetchMembers = useCallback(async () => {
    const { data } = await createClient()
      .from('village_members')
      .select('user_id, role, joined_at, visit_streak, max_streak, profiles(display_name, avatar_url), user_trust(tier)')
      .eq('village_id', id).order('joined_at', { ascending: true }).limit(50)
    setMembers(data || [])
  }, [id])

  const fetchLikes = useCallback(async () => {
    if (!userId) return
    const { data } = await createClient()
      .from('village_reactions').select('post_id').eq('user_id', userId)
    setLikedPosts(new Set((data || []).map((r: any) => r.post_id)))
  }, [userId])

  const fetchDiary = useCallback(async () => {
    const { data } = await createClient()
      .from('village_diary')
      .select('*, top_post:top_post_id(content, profiles(display_name))')
      .eq('village_id', id).order('week_start', { ascending: false }).limit(8)
    setDiary(data || [])
  }, [id])

  const fetchTodayPrompt = useCallback(async () => {
    const { data } = await createClient().rpc('get_today_prompt')
    setTodayPrompt((data as any)?.[0] ?? null)
  }, [])

  const fetchStamps = useCallback(async () => {
    if (!userId) return
    const today = getJSTDate()
    const supabase = createClient()
    const [{ count }, { data: myStamp }] = await Promise.all([
      supabase.from('daily_stamps').select('*', { count: 'exact', head: true })
        .eq('village_id', id).eq('date', today),
      supabase.from('daily_stamps').select('id')
        .eq('village_id', id).eq('user_id', userId).eq('date', today).maybeSingle(),
    ])
    setStampCount(count ?? 0)
    setHasStampedToday(!!myStamp)
  }, [id, userId])

  const recordVisit = useCallback(async () => {
    if (!userId || !isMember) return
    const { data } = await createClient().rpc('record_village_visit', {
      p_village_id: id, p_user_id: userId,
    })
    setVisitStreak(data ?? 0)
  }, [id, userId, isMember])

  // ── 外交フェッチャー ──────────────────────────────────────────
  const fetchDiplomacy = useCallback(async () => {
    const supabase = createClient()
    const [{ data: inData }, { data: outData }, { data: mergeData }] = await Promise.all([
      supabase.from('village_diplomacy')
        .select('*, from_village:from_village_id(id,name,icon,type), sender:sender_id(display_name)')
        .eq('to_village_id', id).order('created_at', { ascending: false }).limit(20),
      supabase.from('village_diplomacy')
        .select('*, to_village:to_village_id(id,name,icon,type)')
        .eq('from_village_id', id).order('created_at', { ascending: false }).limit(20),
      supabase.from('village_merge_requests')
        .select('*, from_village:from_village_id(id,name,icon), to_village:to_village_id(id,name,icon), requester:requester_id(display_name)')
        .or(`from_village_id.eq.${id},to_village_id.eq.${id}`)
        .eq('status', 'pending').order('created_at', { ascending: false }),
    ])
    setDiplomacyIn(inData || [])
    setDiplomacyOut(outData || [])
    setMergeRequests(mergeData || [])
  }, [id])

  // 外交：村検索
  async function searchVillages(q: string, setter: (v: any[]) => void) {
    if (!q.trim()) { setter([]); return }
    const { data } = await createClient()
      .from('villages').select('id,name,icon,type,member_count')
      .ilike('name', `%${q}%`).neq('id', id).limit(5)
    setter(data || [])
  }

  // 外交メッセージ送信
  async function sendDiplomacy() {
    if (!diploTarget || !diploMsg.trim() || !userId || sendingDiplo) return
    setSendingDiplo(true)
    await createClient().from('village_diplomacy').insert({
      from_village_id: id, to_village_id: diploTarget.id,
      sender_id: userId, message: diploMsg.trim(), emoji: diploEmoji,
    })
    setDiploMsg(''); setDiploTarget(null); setDiploSearch(''); setDiploResults([]); setShowDiploForm(false)
    await fetchDiplomacy()
    setSendingDiplo(false)
  }

  // 外交返答（ホストのみ）
  async function respondDiplomacy(diploId: string, status: 'accepted' | 'declined', reply?: string) {
    await createClient().from('village_diplomacy')
      .update({ status, reply: reply ?? null, responded_at: new Date().toISOString() })
      .eq('id', diploId)
    await fetchDiplomacy()
  }

  // 合併申請
  async function sendMergeRequest() {
    if (!mergeTarget || !userId || sendingMerge) return
    setSendingMerge(true)
    await createClient().from('village_merge_requests').insert({
      from_village_id: id, to_village_id: mergeTarget.id,
      requester_id: userId, message: mergeMsg.trim() || null,
    })
    setMergeMsg(''); setMergeTarget(null); setMergeSearch(''); setMergeResults([]); setShowMergeForm(false)
    await fetchDiplomacy()
    setSendingMerge(false)
  }

  // 合併実行（ホストが受諾）
  async function executeMerge(fromId: string, toId: string) {
    if (!userId) return
    await createClient().rpc('merge_villages', { p_from_id: fromId, p_to_id: toId, p_user_id: userId })
    await fetchDiplomacy()
    await fetchVillage()
    await fetchMembers()
    await fetchPosts()
  }

  // ── フォロー取得 ──────────────────────────────────────────────
  const fetchFollowing = useCallback(async () => {
    if (!userId) return
    const { data } = await createClient().from('user_follows').select('following_id').eq('follower_id', userId)
    setFollowingIds(new Set((data || []).map((r: any) => r.following_id)))
  }, [userId])

  // ── 今ヒマ取得（30秒ポーリング）──────────────────────────────
  const fetchFreeNow = useCallback(async () => {
    const { data } = await createClient().rpc('get_free_now_members', { p_village_id: id })
    const members = (data || []) as any[]
    setFreeMembers(members)
    setIsFreeNow(userId ? members.some((m: any) => m.user_id === userId) : false)
  }, [id, userId])

  // ── フォロートグル ────────────────────────────────────────────
  async function toggleFollow(targetId: string) {
    if (!userId) return
    const supabase = createClient()
    if (followingIds.has(targetId)) {
      await supabase.from('user_follows').delete().eq('follower_id', userId).eq('following_id', targetId)
      setFollowingIds(prev => { const n = new Set(prev); n.delete(targetId); return n })
    } else {
      await supabase.from('user_follows').upsert({ follower_id: userId, following_id: targetId })
      setFollowingIds(prev => new Set([...prev, targetId]))
    }
  }

  // ── 今ヒマトグル ──────────────────────────────────────────────
  async function toggleFreeNow() {
    if (!userId || !isMember || togglingFree) return
    setTogglingFree(true)
    const supabase = createClient()
    if (isFreeNow) {
      await supabase.from('village_free_now').delete().eq('user_id', userId).eq('village_id', id)
      setIsFreeNow(false)
      setFreeMembers(prev => prev.filter(m => m.user_id !== userId))
    } else {
      await supabase.from('village_free_now').upsert({
        user_id: userId, village_id: id,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      }, { onConflict: 'user_id,village_id' })
      setIsFreeNow(true)
      await fetchFreeNow()
    }
    setTogglingFree(false)
  }

  useEffect(() => { fetchVillage() },       [fetchVillage])
  useEffect(() => { checkMembership() },    [checkMembership])
  useEffect(() => { fetchPosts() },         [fetchPosts])
  useEffect(() => { fetchVoiceRooms() },    [fetchVoiceRooms])
  useEffect(() => { fetchMembers() },       [fetchMembers])
  useEffect(() => { fetchLikes() },         [fetchLikes])
  useEffect(() => { fetchDiary() },         [fetchDiary])
  useEffect(() => { fetchPinnedPost() },    [fetchPinnedPost])
  useEffect(() => { fetchTodayPrompt() },   [fetchTodayPrompt])
  useEffect(() => { fetchStamps() },        [fetchStamps])
  useEffect(() => { recordVisit() },        [recordVisit])
  useEffect(() => { checkAbandonment() },   [checkAbandonment])
  useEffect(() => { fetchDiplomacy() },     [fetchDiplomacy])
  useEffect(() => { fetchFollowing() },     [fetchFollowing])
  useEffect(() => { fetchFreeNow() },       [fetchFreeNow])
  // 今ヒマを30秒ごとにポーリング
  useEffect(() => {
    const t = setInterval(() => fetchFreeNow(), 30_000)
    return () => clearInterval(t)
  }, [fetchFreeNow])

  const tier = userTrust ? getTierById(userTrust.tier) : getTierById('visitor')

  // ── Actions ───────────────────────────────────────────────
  async function toggleMembership() {
    if (!userId) { router.push('/login'); return }
    setJoining(true)
    const supabase = createClient()
    if (isMember) {
      await supabase.from('village_members').delete().eq('village_id', id).eq('user_id', userId)
      setIsMember(false); setIsHost(false)
    } else {
      await supabase.from('village_members').insert({ village_id: id, user_id: userId })
      setIsMember(true)
      // はじめまして投稿モーダルを表示
      if (tier.canPost) {
        const { data: prof } = await supabase.from('profiles').select('display_name').eq('id', userId).single()
        setWelcomeText(`はじめまして！${prof?.display_name ?? ''}です。よろしくお願いします🌱`)
        setShowWelcome(true)
      }
      // Milestone check
      const { data: v } = await supabase.from('villages').select('member_count, milestone_reached').eq('id', id).single()
      if (v) {
        const reached  = (v.milestone_reached as number[]) ?? []
        const nextMile = MILESTONES.find(m => m <= (v.member_count ?? 0) && !reached.includes(m))
        if (nextMile) {
          await supabase.rpc('notify_village_milestone', { p_village_id: id, p_milestone: nextMile })
          await supabase.from('villages').update({ milestone_reached: [...reached, nextMile] }).eq('id', id)
        }
      }
    }
    setJoining(false); fetchVillage()
  }

  async function submitWelcomePost() {
    if (!userId || !welcomeText.trim() || postingWelcome) return
    setPostingWelcome(true)
    const supabase = createClient()
    await supabase.from('village_posts').insert({
      village_id: id, user_id: userId,
      content: welcomeText.trim(),
      category: '初参加あいさつ',
    })
    setShowWelcome(false)
    setPostingWelcome(false)
    await fetchPosts()
  }

  async function submitPost() {
    if (!userId || !newPost.trim() || posting) return
    if (!tier.canPost) { setShowPhoneVerify(true); return }
    setPosting(true)
    const supabase = createClient()
    const deadlineAt = newPostDeadline
      ? new Date(Date.now() + newPostDeadline * 3600000).toISOString()
      : null
    await supabase.from('village_posts').insert({
      village_id: id, user_id: userId, content: newPost.trim(), category: newPostCat,
      ...(deadlineAt ? { deadline_at: deadlineAt } : {}),
    })
    if (newPostCat === '初参加あいさつ') await awardPoints('welcomed_new_member', id)
    // 廃村だった場合は復興
    if (isAbandoned) {
      await supabase.rpc('revive_village', { p_village_id: id })
      setIsAbandoned(false)
      setDaysLeft(30)
      setShowRevival(true)
      setTimeout(() => setShowRevival(false), 5000)
    }
    setNewPost(''); setNewPostDeadline(null); await fetchPosts(); setPosting(false)
  }

  async function answerPrompt(text: string) {
    if (!userId || !todayPrompt) return
    if (!tier.canPost) { setShowPhoneVerify(true); return }
    const supabase = createClient()
    await supabase.from('village_posts').insert({
      village_id: id, user_id: userId, content: text, category: '今日のお題',
    })
    await supabase.from('daily_stamps').upsert({
      user_id: userId, village_id: id, date: getJSTDate(),
    }, { onConflict: 'user_id,village_id,date', ignoreDuplicates: true })
    setHasStampedToday(true)
    setStampCount(prev => prev + 1)
    await fetchPosts()
  }

  async function submitPromptSuggestion(text: string) {
    if (!userId || !text.trim()) return
    await createClient().from('prompt_pool').insert({ text, submitted_by: userId })
  }

  async function toggleLike(postId: string) {
    if (!userId) return
    if (!tier.canPost) { setShowPhoneVerify(true); return }
    const supabase = createClient()
    if (likedPosts.has(postId)) {
      await supabase.from('village_reactions').delete().eq('post_id', postId).eq('user_id', userId)
      setLikedPosts(prev => { const n = new Set(prev); n.delete(postId); return n })
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, reaction_count: Math.max(0, p.reaction_count - 1) } : p))
    } else {
      await supabase.from('village_reactions').upsert({ post_id: postId, user_id: userId })
      setLikedPosts(prev => new Set([...prev, postId]))
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, reaction_count: p.reaction_count + 1 } : p))
    }
  }

  async function createVoiceRoom() {
    if (!userId || !village) return
    if (!tier.canCreateRoom) { setShowPhoneVerify(true); return }
    const supabase = createClient()
    const { data } = await supabase.from('voice_rooms').insert({
      host_id: userId, title: VOICE_ROOM_NAMES[village.type] ?? '🌿 村の広場',
      category: '雑談', is_open: true, village_id: id,
    }).select().single()
    if (data) {
      await supabase.from('voice_participants').insert({ room_id: data.id, user_id: userId })
      await awardPoints('voice_participated', data.id)
      router.push(`/voice/${data.id}`)
    }
  }

  // ── Admin ─────────────────────────────────────────────────
  async function saveRules() {
    setSavingRules(true)
    await createClient().from('villages').update({ rules: rules.map(r => r.trim()).filter(Boolean) }).eq('id', id)
    setSavingRules(false); setSavedRules(true); setTimeout(() => setSavedRules(false), 2000); fetchVillage()
  }

  async function setPinnedPostId(postId: string | null) {
    await createClient().from('villages').update({ pinned_post_id: postId }).eq('id', id)
    fetchVillage()
  }

  async function deletePost(postId: string) {
    await createClient().from('village_posts').delete().eq('id', postId)
    setPosts(prev => prev.filter(p => p.id !== postId))
    if (village?.pinned_post_id === postId) {
      await createClient().from('villages').update({ pinned_post_id: null }).eq('id', id)
      setPinnedPost(null)
    }
  }

  async function kickMember(memberId: string) {
    setKickingUser(memberId)
    await createClient().from('village_members').delete().eq('village_id', id).eq('user_id', memberId)
    setMembers(prev => prev.filter(m => m.user_id !== memberId))
    setKickingUser(null)
  }

  async function generateDiary() {
    setGeneratingDiary(true)
    await createClient().rpc('generate_village_diary', { p_village_id: id })
    await fetchDiary(); setGeneratingDiary(false)
  }

  // ─────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9]">
      <span className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!village) return null

  const style        = VILLAGE_TYPE_STYLES[village.type] ?? VILLAGE_TYPE_STYLES['雑談']
  const level        = getLevelInfo(village.member_count)
  const busyScore    = Math.min(5, Math.floor(village.post_count_7d / 5))
  const safetyScore  = village.report_count_7d === 0 ? 5 : village.report_count_7d < 2 ? 3 : 1
  const welcomeScore = Math.min(5, Math.floor(village.welcome_reply_count_7d / 2) + 1)

  // 焚き火モード：ヒーローに重ねるグラデント
  const bonfireOverlay = isBonfireTime
    ? 'linear-gradient(180deg, rgba(120,40,0,0.55) 0%, rgba(180,60,0,0.35) 100%)'
    : null

  const pendingDiploCount = diplomacyIn.filter(d => d.status === 'pending').length + mergeRequests.filter(r => r.to_village_id === id).length

  const allTabs = [
    { key: 'posts',   label: '📝 投稿' },
    { key: 'voice',   label: '🎙️ 通話' },
    { key: 'members', label: '👥 住民' },
    { key: 'diary',   label: '📰 だより' },
    { key: 'diplo',   label: `🌐 外交${pendingDiploCount > 0 ? ` (${pendingDiploCount})` : ''}` },
    ...(isHost ? [{ key: 'admin', label: '⚙️ 管理' }] : []),
  ]

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9]">

      {/* ══ HERO ═══════════════════════════════════════════════ */}
      <div className="relative overflow-hidden" style={{ background: style.gradient, minHeight: 200 }}>
        {/* Noise texture */}
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}
        />
        {/* 焚き火オーバーレイ */}
        {bonfireOverlay && (
          <div className="absolute inset-0 transition-opacity duration-1000" style={{ background: bonfireOverlay }} />
        )}

        {/* Back */}
        <button onClick={() => router.back()}
          className="absolute top-4 left-4 w-9 h-9 flex items-center justify-center rounded-full active:scale-90 transition-all z-10"
          style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
          <ArrowLeft size={18} className="text-white" />
        </button>

        {/* Join */}
        <button onClick={toggleMembership} disabled={joining}
          className="absolute top-4 right-4 px-4 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 z-10"
          style={isMember
            ? { background: 'rgba(0,0,0,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(8px)' }
            : { background: '#fff', color: style.accent, fontWeight: 800 }}>
          {joining ? '…' : isMember ? '参加中 ✓' : 'この村で増やす →'}
        </button>

        {/* Level badge */}
        <div className="absolute top-14 left-4 flex items-center gap-1 text-white text-[9px] font-bold px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
          {level.icon} {level.label}
        </div>

        {/* ストリークバッジ */}
        {visitStreak >= 2 && (
          <div className="absolute top-14 right-4 flex items-center gap-1 text-[9px] font-bold px-2.5 py-1 rounded-full"
            style={{
              background: isBonfireTime ? 'rgba(255,100,0,0.35)' : 'rgba(0,0,0,0.25)',
              border: `1px solid ${isBonfireTime ? 'rgba(255,140,0,0.5)' : 'rgba(255,255,255,0.2)'}`,
              backdropFilter: 'blur(8px)',
              color: isBonfireTime ? '#ffcc80' : '#fde047',
            }}>
            {streakEmoji(visitStreak)} {visitStreak}日連続
          </div>
        )}

        {village.season_title && !visitStreak && (
          <div className="absolute top-14 right-4 text-white text-[9px] font-bold px-2.5 py-1 rounded-full max-w-[130px] truncate"
            style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
            {village.season_title}
          </div>
        )}

        {/* Center */}
        <div className="flex flex-col items-center justify-center pt-16 pb-6 px-6">
          <span style={{ fontSize: '3.5rem', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}>
            {village.icon}
          </span>
          <h1 className="font-extrabold text-white text-xl mt-2 text-center leading-tight drop-shadow-md">
            {village.name}
          </h1>
          <p className="text-white/70 text-xs mt-1 text-center line-clamp-2 max-w-[280px]">
            {village.description}
          </p>
          {isHost && (
            <div className="mt-2 flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(255,215,0,0.25)', color: '#fde047', border: '1px solid rgba(255,215,0,0.3)' }}>
              <Crown size={10} /> 村長
            </div>
          )}
        </div>

        {/* Stats bar */}
        <div className="mx-4 mb-4 rounded-2xl px-4 py-3 grid grid-cols-3 gap-3"
          style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)' }}>
          {[
            { label: 'にぎわい',   value: busyScore },
            { label: '安心度',     value: safetyScore },
            { label: '入りやすさ', value: welcomeScore },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-[9px] text-white/50 font-semibold mb-1">{label}</p>
              <div className="flex gap-0.5 justify-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="w-2.5 h-1.5 rounded-full"
                    style={{ background: i < value ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)' }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ 焚き火バナー（21-23時JST）══════════════════════════ */}
      {isBonfireTime && (
        <div className="mx-4 mt-3 rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{ background: 'linear-gradient(135deg, #1c0a00 0%, #2d1200 100%)', border: '1px solid rgba(255,120,0,0.35)' }}>
          <div className="relative flex-shrink-0">
            <span className="text-2xl">🔥</span>
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-400 rounded-full animate-ping" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-extrabold text-orange-300">夜の焚き火タイム</p>
            <p className="text-[10px] text-orange-500/80 mt-0.5">
              {stampCount > 0 ? `今夜${stampCount}人が集まっています` : '今夜最初に火をつけよう'}
            </p>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-orange-400/60">
            <Flame size={11} />
            <span>〜23:00</span>
          </div>
        </div>
      )}

      {/* ══ 復興セレブレーション ══════════════════════════════ */}
      {showRevival && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-3xl shadow-2xl px-8 py-7 text-center animate-bounce mx-6"
            style={{ border: '2px solid #22c55e', boxShadow: '0 0 40px rgba(34,197,94,0.3)' }}>
            <div className="text-5xl mb-3">🌱</div>
            <p className="font-extrabold text-stone-900 text-lg">村が復興しました！</p>
            <p className="text-xs text-stone-500 mt-1">あなたの投稿が村を救いました</p>
          </div>
        </div>
      )}

      {/* ══ 廃村バナー ══════════════════════════════════════════ */}
      {isAbandoned && (
        <div className="mx-4 mt-3 rounded-2xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#1c1c1c 0%,#2d2d2d 100%)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="px-4 py-3 flex items-center gap-3">
            <span className="text-2xl flex-shrink-0">🏚️</span>
            <div className="flex-1">
              <p className="text-xs font-extrabold text-stone-300">この村は廃村です</p>
              <p className="text-[10px] text-stone-500 mt-0.5 leading-relaxed">
                長い間、誰も投稿しませんでした。<br />
                あなたの一言が村を復興させるかもしれません。
              </p>
            </div>
            {village?.revival_count > 0 && (
              <div className="flex-shrink-0 text-center">
                <p className="text-lg font-extrabold text-stone-400">{village.revival_count}</p>
                <p className="text-[8px] text-stone-600">度目の復興</p>
              </div>
            )}
          </div>
          {isMember && tier.canPost && (
            <div className="px-4 pb-3">
              <button
                onClick={() => { setNewPostCat('雑談'); document.querySelector('textarea')?.focus() }}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg,#22c55e 0%,#16a34a 100%)' }}>
                🌱 この村を復興する
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══ 廃村警告バナー（7日以下）══════════════════════════ */}
      {!isAbandoned && daysLeft !== null && daysLeft <= 7 && (
        <div className="mx-4 mt-3 rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{
            background: daysLeft <= 3
              ? 'linear-gradient(135deg,#450a0a 0%,#7f1d1d 100%)'
              : 'linear-gradient(135deg,#1c1407 0%,#3d2c00 100%)',
            border: `1px solid ${daysLeft <= 3 ? 'rgba(239,68,68,0.4)' : 'rgba(234,179,8,0.3)'}`,
          }}>
          <div className="relative flex-shrink-0">
            <span className="text-2xl">{daysLeft <= 3 ? '⚠️' : '🕯️'}</span>
            {daysLeft <= 3 && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-ping"
                style={{ background: '#ef4444' }} />
            )}
          </div>
          <div className="flex-1">
            <p className="text-xs font-extrabold" style={{ color: daysLeft <= 3 ? '#fca5a5' : '#fde68a' }}>
              {daysLeft <= 3 ? `あと${daysLeft}日で廃村になります` : `${daysLeft}日後に廃村の危機`}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: daysLeft <= 3 ? '#f87171' : '#d97706' }}>
              誰かが投稿すると廃村を免れます
            </p>
          </div>
          <div className="flex-shrink-0 text-center">
            <p className="font-extrabold text-2xl" style={{ color: daysLeft <= 3 ? '#ef4444' : '#eab308' }}>
              {daysLeft}
            </p>
            <p className="text-[8px]" style={{ color: daysLeft <= 3 ? '#f87171' : '#ca8a04' }}>日</p>
          </div>
        </div>
      )}

      {/* ── 見習いバナー ── */}
      {userTrust && userTrust.tier === 'visitor' && (
        <div onClick={() => setShowPhoneVerify(true)}
          className="mx-4 mt-3 rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer active:scale-[0.99] transition-all"
          style={{ background: `${style.accent}15`, border: `1px solid ${style.accent}30` }}>
          <span className="text-2xl">📱</span>
          <div className="flex-1">
            <p className="text-xs font-bold" style={{ color: style.accent }}>電話番号を認証して「住民」になろう</p>
            <p className="text-[10px] text-stone-400">投稿・通話ができるようになります · +30pt</p>
          </div>
          <span className="text-stone-400 text-sm">›</span>
        </div>
      )}

      {/* ── ルールバナー ── */}
      {village.rules && village.rules.length > 0 && (
        <div className="mx-4 mt-3 rounded-2xl px-4 py-3"
          style={{ background: `${style.accent}08`, border: `1px solid ${style.accent}20` }}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: style.accent }}>
            📜 村のルール
          </p>
          <div className="space-y-1">
            {(village.rules as string[]).map((r, i) => r && (
              <p key={i} className="text-xs text-stone-600 leading-relaxed">・{r}</p>
            ))}
          </div>
        </div>
      )}

      {/* ── 週次イベント ── */}
      <div className="mx-4 mt-3 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl"
        style={{ background: `${style.accent}12`, border: `1px solid ${style.accent}25` }}>
        <span className="text-base">{weeklyEvent.icon}</span>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: style.accent }}>今週のイベント</p>
          <p className="text-xs font-bold text-stone-800">{weeklyEvent.label}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-stone-400 text-xs">
          <Users size={11} />
          <span className="font-semibold">{village.member_count} 住民</span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="px-4 pt-3 pb-2 sticky top-0 z-10 bg-[#FAFAF9]">
        <div className="flex gap-1 rounded-2xl p-1 overflow-x-auto scrollbar-none"
          style={{ background: `${style.accent}12`, border: `1px solid ${style.accent}20` }}>
          {allTabs.map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key as any)}
              className="flex-shrink-0 flex-1 py-2 text-[11px] font-bold rounded-xl transition-all whitespace-nowrap px-1"
              style={tab === key
                ? { background: style.accent, color: '#fff', boxShadow: `0 2px 8px ${style.accent}40` }
                : { color: style.accent }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ════════ POSTS TAB ════════ */}
      {tab === 'posts' && (
        <div className="px-4 pb-32 space-y-3">

          {/* カテゴリフィルター */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            {POST_CATEGORIES.map(c => (
              <button key={c} onClick={() => setPostCat(c)}
                className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-bold border transition-all"
                style={postCat === c
                  ? { background: c === '今日のお題' ? '#7c3aed' : style.accent, color: '#fff', border: `1px solid ${c === '今日のお題' ? '#7c3aed' : style.accent}` }
                  : { background: '#fff', borderColor: '#e7e5e4', color: '#78716c' }}>
                {CAT_ICONS[c]} {c}
              </button>
            ))}
          </div>

          {/* 感情の天気図 */}
          <MoodWeather
            villageId={id}
            villageName={village.name}
            userId={userId ?? ''}
            style={style}
            isMember={isMember}
          />

          {/* 漂流瓶 */}
          <DriftBottle
            villageId={id}
            villageName={village.name}
            userId={userId ?? ''}
            style={style}
            isMember={isMember}
            canPost={tier.canPost}
          />

          {/* 今日のお題カード（メンバーのみ表示） */}
          {isMember && (
            <DailyPromptCard
              prompt={todayPrompt}
              stampCount={stampCount}
              hasStamped={hasStampedToday}
              style={style}
              canPost={tier.canPost}
              onAnswer={answerPrompt}
              onSuggest={submitPromptSuggestion}
              isBonfireTime={isBonfireTime}
            />
          )}

          {/* 投稿コンポーザー */}
          {isMember && (
            tier.canPost ? (
              <div className="bg-white border border-stone-100 rounded-3xl p-4 shadow-md"
                style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                <div className="flex gap-1.5 overflow-x-auto scrollbar-none mb-3 pb-0.5">
                  {POST_CATEGORIES.slice(1).map(c => (
                    <button key={c} onClick={() => setNewPostCat(c)}
                      className="flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all"
                      style={newPostCat === c
                        ? { background: `${CAT_COLORS[c] ?? style.accent}18`, color: CAT_COLORS[c] ?? style.accent, borderColor: `${CAT_COLORS[c] ?? style.accent}40` }
                        : { background: '#fafaf9', borderColor: '#e7e5e4', color: '#a8a29e' }}>
                      {CAT_ICONS[c]} {c}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 items-end">
                  <textarea value={newPost} onChange={e => setNewPost(e.target.value)}
                    placeholder="考えを出す…" rows={2} maxLength={300}
                    className="flex-1 px-3 py-2.5 rounded-2xl border border-stone-200 text-sm resize-none focus:outline-none" />
                  <button onClick={submitPost} disabled={!newPost.trim() || posting}
                    className="w-11 h-11 rounded-2xl flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all flex-shrink-0"
                    style={{ background: style.accent, boxShadow: `0 4px 12px ${style.accent}50` }}>
                    {posting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={15} className="text-white" />}
                  </button>
                </div>

                {/* 締め切り設定 */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-[10px] text-stone-400 font-medium">⏱️ 締め切り：</span>
                  {[null, 1, 3, 6, 24].map(h => (
                    <button
                      key={h ?? 'none'}
                      onClick={() => setNewPostDeadline(prev => prev === h ? null : h)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all active:scale-95"
                      style={newPostDeadline === h
                        ? { background: style.accent, color: '#fff', borderColor: style.accent }
                        : { background: '#fafaf9', color: '#a8a29e', borderColor: '#e7e5e4' }
                      }
                    >
                      {h === null ? 'なし' : h === 1 ? '1時間' : h === 3 ? '3時間' : h === 6 ? '6時間' : '24時間'}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <button onClick={() => setShowPhoneVerify(true)}
                className="w-full rounded-2xl px-4 py-3.5 text-center border-dashed border-2 transition-all active:scale-[0.99]"
                style={{ borderColor: `${style.accent}40`, background: `${style.accent}08` }}>
                <p className="text-xs font-bold" style={{ color: style.accent }}>📱 電話認証すると投稿できます</p>
                <p className="text-[10px] text-stone-400 mt-0.5">タップして認証 (+30pt)</p>
              </button>
            )
          )}

          {/* 職業限定村：詐称フィルタートピックバナー */}
          {(village as any)?.job_locked && (village as any)?.job_type && postCat === '全部' && (
            <div className="rounded-2xl px-4 py-3 flex items-center gap-3"
              style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)', border: '1px solid #c7d2fe' }}>
              <span className="text-xl flex-shrink-0">💼</span>
              <div>
                <p className="text-xs font-extrabold text-indigo-700">{(village as any).job_type}限定村</p>
                <p className="text-[10px] text-indigo-500 leading-relaxed mt-0.5">
                  同じ職業の人だけが集まる場所です。下の「村の問い」から話してみましょう。
                </p>
              </div>
            </div>
          )}

          {/* ピン留め投稿 */}
          {pinnedPost && postCat === '全部' && (
            <PostCard post={pinnedPost} style={style} likedPosts={likedPosts}
              onToggleLike={toggleLike} onResolve={setResolvePost}
              onPin={isHost ? setPinnedPostId : undefined} onDelete={isHost ? deletePost : undefined}
              isPinned={true} userId={userId} isHost={isHost} villageId={id} />
          )}

          {/* 投稿一覧 */}
          {posts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">🌿</p>
              <p className="text-sm font-bold text-stone-600">まだ投稿がありません</p>
              <p className="text-xs text-stone-400 mt-1">最初の投稿をしてみましょう</p>
            </div>
          ) : (
            posts.filter(p => p.id !== village?.pinned_post_id || postCat !== '全部').map(post => (
              <PostCard key={post.id} post={post} style={style} likedPosts={likedPosts}
                onToggleLike={toggleLike} onResolve={setResolvePost}
                onPin={isHost ? setPinnedPostId : undefined} onDelete={isHost ? deletePost : undefined}
                isPinned={false} userId={userId} isHost={isHost} villageId={id} />
            ))
          )}
        </div>
      )}

      {/* ════════ VOICE TAB ════════ */}
      {tab === 'voice' && (
        <div className="px-4 pb-32 space-y-3 pt-1">

          {/* ── 今ヒマパネル ── */}
          {isMember && (
            <div className="rounded-2xl overflow-hidden shadow-sm"
              style={{
                background: isFreeNow
                  ? 'linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)'
                  : 'white',
                border: isFreeNow ? '1px solid #86efac' : '1px solid #f5f5f4',
              }}>
              <div className="px-4 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-extrabold" style={{ color: isFreeNow ? '#16a34a' : '#1c1917' }}>
                    {isFreeNow ? '🙋 今ヒマと伝えています' : '🙋 今ヒマですか？'}
                  </p>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    {isFreeNow
                      ? '15分間、住民に表示されます'
                      : '住民に「今話せます」と伝えよう'}
                  </p>
                </div>
                <button
                  onClick={toggleFreeNow}
                  disabled={togglingFree}
                  className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-90 disabled:opacity-50"
                  style={isFreeNow
                    ? { background: '#dcfce7', color: '#16a34a', border: '1px solid #86efac' }
                    : { background: style.accent, color: '#fff', boxShadow: `0 3px 10px ${style.accent}40` }}>
                  {togglingFree ? '…' : isFreeNow ? 'やめる' : 'ヒマです！'}
                </button>
              </div>

              {/* 今ヒマな他の住民 */}
              {freeMembers.filter(m => m.user_id !== userId).length > 0 && (
                <div className="px-4 pb-3 space-y-2">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">今ヒマな住民</p>
                  <div className="space-y-1.5">
                    {freeMembers.filter(m => m.user_id !== userId).map(m => (
                      <div key={m.user_id}
                        className="flex items-center gap-2.5 px-3 py-2 bg-white rounded-xl border border-stone-100">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse flex-shrink-0" />
                        <span className="text-sm font-semibold text-stone-700">{m.display_name}</span>
                        <span className="ml-auto text-[10px] text-stone-400">
                          {Math.max(0, Math.ceil((new Date(m.expires_at).getTime() - Date.now()) / 60000))}分
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={createVoiceRoom}
                    className="w-full py-3 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
                    style={{ background: 'linear-gradient(135deg,#22c55e 0%,#16a34a 100%)', boxShadow: '0 4px 12px rgba(34,197,94,0.35)' }}>
                    🎙️ 今すぐ一緒に話す →
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="rounded-2xl px-4 py-3.5 flex items-start gap-3"
            style={{ background: `${style.accent}10`, border: `1px solid ${style.accent}20` }}>
            <span className="text-2xl mt-0.5">🎙️</span>
            <div>
              <p className="text-sm font-bold" style={{ color: style.accent }}>村の通話広場</p>
              <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">住民と声で話せます。聴くだけでも参加OKです。</p>
            </div>
          </div>
          {isMember && (
            <button onClick={createVoiceRoom}
              className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
              style={tier.canCreateRoom
                ? { background: style.gradient, color: '#fff', boxShadow: `0 6px 20px ${style.accent}40` }
                : { background: '#f5f5f4', color: '#a8a29e' }}>
              <Mic size={16} />
              {tier.canCreateRoom ? '広場を開く' : '「常連」になると広場を開けます'}
            </button>
          )}
          {voiceRooms.length === 0 ? (
            <div className="text-center py-14">
              <p className="text-4xl mb-3">🔥</p>
              <p className="text-sm font-bold text-stone-600">今は誰もいません</p>
              <p className="text-xs text-stone-400 mt-1">最初に広場を開いてみましょう</p>
            </div>
          ) : (
            voiceRooms.map(room => (
              <div key={room.id} onClick={() => router.push(`/voice/${room.id}`)}
                className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm cursor-pointer active:scale-[0.99] hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-stone-900 text-sm">{room.title}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{room.profiles?.display_name} が開催中</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-red-50 border border-red-100 px-2 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-xs font-bold text-red-600">LIVE</span>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-semibold text-stone-600">
                      <Users size={12} /> {room.voice_participants?.length ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ════════ MEMBERS TAB ════════ */}
      {tab === 'members' && (
        <div className="px-4 pb-32 space-y-2 pt-1">
          <p className="text-xs text-stone-400 font-semibold mb-3">{village.member_count} 人が住んでいます</p>
          {members.map((m: any) => (
            <div key={m.user_id}
              className="bg-white border border-stone-100 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold text-white flex-shrink-0"
                style={{ background: style.gradient }}>
                {m.profiles?.display_name?.[0] ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-stone-800 truncate">{m.profiles?.display_name ?? '住民'}</p>
                  {m.user_trust?.tier && <TrustBadge tierId={m.user_trust.tier} size="xs" />}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[10px] text-stone-400">
                    {m.role === 'host' ? '👑 村長' : '住民'} · {timeAgo(m.joined_at)}に参加
                  </p>
                  {/* ストリーク表示 */}
                  {(m.visit_streak ?? 0) >= 3 && (
                    <span className="text-[10px] font-bold" style={{ color: style.accent }}>
                      {streakEmoji(m.visit_streak)} {m.visit_streak}日連続
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {m.role === 'host' && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: `${style.accent}20` }}>
                    <Crown size={13} style={{ color: style.accent }} />
                  </div>
                )}
                {m.user_id !== userId && (
                  <button
                    onClick={() => toggleFollow(m.user_id)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-90"
                    style={followingIds.has(m.user_id)
                      ? { background: '#f5f5f4', color: '#78716c', border: '1px solid #e7e5e4' }
                      : { background: style.accent, color: '#fff', boxShadow: `0 2px 8px ${style.accent}40` }}>
                    {followingIds.has(m.user_id) ? '学んでいる ✓' : 'この人から学ぶ'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════════ DIARY TAB ════════ */}
      {tab === 'diary' && (
        <div className="px-4 pb-32 space-y-3 pt-1">
          <div className="rounded-2xl px-4 py-3.5 flex items-start gap-3"
            style={{ background: `${style.accent}10`, border: `1px solid ${style.accent}20` }}>
            <span className="text-2xl mt-0.5">📰</span>
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: style.accent }}>村のだより</p>
              <p className="text-xs text-stone-500 mt-0.5">毎週の村の活動まとめ</p>
            </div>
            {isHost && (
              <button onClick={generateDiary} disabled={generatingDiary}
                className="px-3 py-1.5 rounded-full text-[10px] font-bold text-white flex items-center gap-1 disabled:opacity-50 active:scale-95 transition-all"
                style={{ background: style.accent }}>
                {generatingDiary ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <BookOpen size={11} />}
                {generatingDiary ? '生成中…' : '今週分を作成'}
              </button>
            )}
          </div>
          {diary.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-sm font-bold text-stone-600">まだ村のだよりがありません</p>
              {isHost && <p className="text-xs text-stone-400 mt-1">「今週分を作成」ボタンで生成できます</p>}
            </div>
          ) : (
            diary.map((entry: any) => (
              <div key={entry.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-100">
                <div className="px-4 py-2.5 flex items-center justify-between"
                  style={{ background: `${style.accent}15`, borderBottom: `1px solid ${style.accent}20` }}>
                  <p className="text-xs font-extrabold" style={{ color: style.accent }}>{getWeekLabel(entry.week_start)}</p>
                  <p className="text-[10px] text-stone-400">村のだより</p>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-sm text-stone-700 leading-relaxed">{entry.summary_text}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: entry.new_members,    label: '新しい住民', icon: '🌱' },
                      { value: entry.total_posts,    label: '投稿数',     icon: '📝' },
                      { value: entry.resolved_count, label: '解決した相談', icon: '✅' },
                    ].map(s => (
                      <div key={s.label} className="text-center rounded-xl py-2"
                        style={{ background: `${style.accent}08`, border: `1px solid ${style.accent}18` }}>
                        <p className="text-base mb-0.5">{s.icon}</p>
                        <p className="font-extrabold text-stone-900 text-base leading-none">{s.value}</p>
                        <p className="text-[9px] text-stone-400 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {entry.top_post && (
                    <div className="rounded-xl p-3"
                      style={{ background: `${style.accent}08`, border: `1px solid ${style.accent}20` }}>
                      <p className="text-[10px] font-bold mb-1" style={{ color: style.accent }}>🏆 今週の注目投稿</p>
                      <p className="text-xs text-stone-700 line-clamp-2 leading-relaxed">{entry.top_post?.content}</p>
                      {entry.top_post?.profiles?.display_name && (
                        <p className="text-[10px] text-stone-400 mt-1">by {entry.top_post.profiles.display_name}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ════════ DIPLOMACY TAB ════════ */}
      {tab === 'diplo' && (
        <div className="px-4 pb-32 space-y-4 pt-1">

          {/* ヘッダー */}
          <div className="rounded-2xl px-4 py-3.5 flex items-start gap-3"
            style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)', border: '1px solid rgba(99,179,237,0.2)' }}>
            <span className="text-2xl mt-0.5">🌐</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">村外交センター</p>
              <p className="text-xs text-white/60 mt-0.5 leading-relaxed">他の村と交流したり、同盟を結んだり、合併を申請できます。</p>
            </div>
          </div>

          {/* 手紙を送るボタン */}
          {isMember && (
            <button onClick={() => setShowDiploForm(v => !v)}
              className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
              style={{ background: 'linear-gradient(135deg,#3b82f6 0%,#2563eb 100%)', color: '#fff', boxShadow: '0 6px 20px rgba(59,130,246,0.35)' }}>
              📜 他の村に手紙を送る
            </button>
          )}

          {/* 外交手紙フォーム */}
          {showDiploForm && (
            <div className="bg-white rounded-3xl p-4 shadow-md border border-stone-100">
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">📮 外交手紙を送る</p>

              {/* 絵文字選択 */}
              <div className="flex gap-2 mb-3">
                {['📜','🤝','⚔️','🎉','💌','🌸'].map(e => (
                  <button key={e} onClick={() => setDiploEmoji(e)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all active:scale-90"
                    style={{ background: diploEmoji === e ? `${style.accent}20` : '#f5f5f4', border: diploEmoji === e ? `1.5px solid ${style.accent}` : '1.5px solid transparent' }}>
                    {e}
                  </button>
                ))}
              </div>

              {/* 村検索 */}
              {!diploTarget ? (
                <div className="mb-3">
                  <input
                    value={diploSearch}
                    onChange={e => { setDiploSearch(e.target.value); searchVillages(e.target.value, setDiploResults) }}
                    placeholder="送り先の村を検索…"
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none"
                  />
                  {diploResults.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {diploResults.map(v => (
                        <button key={v.id} onClick={() => { setDiploTarget(v); setDiploSearch(v.name); setDiploResults([]) }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border border-stone-100 bg-stone-50 active:scale-[0.98] transition-all text-left">
                          <span className="text-xl">{v.icon}</span>
                          <div>
                            <p className="text-sm font-bold text-stone-800">{v.name}</p>
                            <p className="text-[10px] text-stone-400">{v.member_count} 住民</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl border border-blue-200 bg-blue-50">
                  <span className="text-xl">{diploTarget.icon}</span>
                  <p className="text-sm font-bold text-blue-800 flex-1">{diploTarget.name}</p>
                  <button onClick={() => { setDiploTarget(null); setDiploSearch('') }}
                    className="text-blue-400"><X size={14} /></button>
                </div>
              )}

              {/* メッセージ */}
              <textarea
                value={diploMsg}
                onChange={e => setDiploMsg(e.target.value.slice(0, 200))}
                placeholder="メッセージを書いてください（200文字以内）"
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm resize-none focus:outline-none mb-3"
              />
              <div className="flex gap-2">
                <button onClick={() => setShowDiploForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm font-bold text-stone-500">キャンセル</button>
                <button onClick={sendDiplomacy} disabled={!diploTarget || !diploMsg.trim() || sendingDiplo}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  style={{ background: 'linear-gradient(135deg,#3b82f6 0%,#2563eb 100%)' }}>
                  {sendingDiplo ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Send size={13} /> 送る</>}
                </button>
              </div>
            </div>
          )}

          {/* 受信した外交メッセージ */}
          {diplomacyIn.length > 0 && (
            <div>
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2.5 px-1">📬 届いた手紙</p>
              <div className="space-y-3">
                {diplomacyIn.map(d => (
                  <div key={d.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-stone-100">
                    <div className="h-1 w-full" style={{
                      background: d.status === 'accepted' ? '#22c55e' : d.status === 'declined' ? '#ef4444' : '#3b82f6'
                    }} />
                    <div className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl">{d.emoji}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{d.from_village?.icon}</span>
                            <p className="text-sm font-bold text-stone-800">{d.from_village?.name}</p>
                          </div>
                          <p className="text-[10px] text-stone-400">{d.sender?.display_name} · {timeAgo(d.created_at)}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          d.status === 'accepted' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : d.status === 'declined' ? 'bg-red-50 text-red-600 border border-red-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {d.status === 'accepted' ? '✅ 承認済み' : d.status === 'declined' ? '❌ 断った' : '⏳ 返事待ち'}
                        </span>
                      </div>
                      <div className="bg-stone-50 rounded-2xl px-3 py-2.5 mb-3">
                        <p className="text-sm text-stone-700 leading-relaxed">{d.message}</p>
                      </div>
                      {d.status === 'pending' && isHost && (
                        <div className="flex gap-2">
                          <button onClick={() => respondDiplomacy(d.id, 'declined')}
                            className="flex-1 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-500 active:scale-95 transition-all">
                            断る
                          </button>
                          <button onClick={() => respondDiplomacy(d.id, 'accepted')}
                            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white active:scale-95 transition-all"
                            style={{ background: 'linear-gradient(135deg,#22c55e 0%,#16a34a 100%)' }}>
                            🤝 同盟を結ぶ
                          </button>
                        </div>
                      )}
                      {d.status === 'accepted' && (
                        <div className="text-center">
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                            🌟 同盟村
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 送信した外交メッセージ */}
          {diplomacyOut.length > 0 && (
            <div>
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2.5 px-1">📤 送った手紙</p>
              <div className="space-y-2">
                {diplomacyOut.map(d => (
                  <div key={d.id} className="bg-white rounded-2xl p-3 shadow-sm border border-stone-100 flex items-center gap-3">
                    <span className="text-2xl">{d.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{d.to_village?.icon}</span>
                        <p className="text-sm font-bold text-stone-800 truncate">{d.to_village?.name}</p>
                      </div>
                      <p className="text-[10px] text-stone-500 mt-0.5 truncate">{d.message}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      d.status === 'accepted' ? 'bg-emerald-50 text-emerald-700'
                      : d.status === 'declined' ? 'bg-red-50 text-red-600'
                      : 'bg-stone-100 text-stone-500'
                    }`}>
                      {d.status === 'accepted' ? '✅' : d.status === 'declined' ? '❌' : '⏳'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 合併申請 */}
          {mergeRequests.length > 0 && (
            <div>
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2.5 px-1">🔀 合併申請</p>
              <div className="space-y-3">
                {mergeRequests.map(r => {
                  const isIncoming = r.to_village_id === id
                  const other = isIncoming ? r.from_village : r.to_village
                  return (
                    <div key={r.id} className="bg-white rounded-3xl p-4 shadow-sm border border-amber-100"
                      style={{ borderColor: 'rgba(245,158,11,0.3)' }}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl">🔀</span>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-stone-800">
                            {isIncoming ? `${other?.name} から合併の申請` : `${other?.name} へ合併申請中`}
                          </p>
                          <p className="text-[10px] text-stone-400">{r.requester?.display_name} · {timeAgo(r.created_at)}</p>
                        </div>
                      </div>
                      {r.message && (
                        <div className="bg-amber-50 rounded-xl px-3 py-2 mb-3 border border-amber-100">
                          <p className="text-xs text-amber-900 leading-relaxed">{r.message}</p>
                        </div>
                      )}
                      {isIncoming && isHost && (
                        <div className="flex gap-2">
                          <button onClick={() => respondDiplomacy(r.id, 'declined')}
                            className="flex-1 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-500">
                            断る
                          </button>
                          <button onClick={() => executeMerge(r.from_village_id, id)}
                            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white active:scale-95 transition-all"
                            style={{ background: 'linear-gradient(135deg,#f59e0b 0%,#d97706 100%)' }}>
                            🔀 合併を承認する
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 空状態 */}
          {diplomacyIn.length === 0 && diplomacyOut.length === 0 && mergeRequests.length === 0 && !showDiploForm && (
            <div className="text-center py-16">
              <p className="text-5xl mb-3">🌐</p>
              <p className="text-sm font-bold text-stone-600">まだ外交がありません</p>
              <p className="text-xs text-stone-400 mt-1">他の村と交流を始めよう</p>
            </div>
          )}
        </div>
      )}

      {/* ════════ ADMIN TAB ════════ */}
      {tab === 'admin' && isHost && (
        <div className="px-4 pb-32 space-y-4 pt-1">
          <div className="rounded-2xl px-4 py-3.5 flex items-center gap-3"
            style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)' }}>
            <Crown size={20} className="text-yellow-300 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-white">村長ダッシュボード</p>
              <p className="text-xs text-white/60">村の設定・管理ができます</p>
            </div>
          </div>

          {/* ルール設定 */}
          <div className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                <Settings2 size={12} /> 村のルール
              </p>
              <p className="text-[10px] text-stone-400">3つまで</p>
            </div>
            <div className="space-y-2 mb-3">
              {[0, 1, 2].map(i => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-stone-400 font-bold flex-shrink-0 w-4">{i + 1}.</span>
                  <input value={rules[i] ?? ''}
                    onChange={e => setRules(prev => { const n = [...prev]; n[i] = e.target.value; return n })}
                    maxLength={60} placeholder={`ルール ${i + 1}（任意）`}
                    className="flex-1 px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-indigo-300" />
                  {rules[i] && (
                    <button onClick={() => setRules(prev => { const n = [...prev]; n[i] = ''; return n })}
                      className="text-stone-300 hover:text-stone-500 flex-shrink-0"><X size={14} /></button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={saveRules} disabled={savingRules}
              className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
              style={{ background: savedRules ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}>
              {savingRules ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : savedRules ? <><CheckCircle size={14} /> 保存しました</> : <><Save size={14} /> ルールを保存</>}
            </button>
          </div>

          {/* ピン留め */}
          <div className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Pin size={12} /> ピン留め投稿
            </p>
            {pinnedPost ? (
              <div className="space-y-3">
                <div className="rounded-xl p-3" style={{ background: `${style.accent}08`, border: `1px solid ${style.accent}25` }}>
                  <p className="text-xs font-bold mb-1" style={{ color: style.accent }}>現在ピン留め中</p>
                  <p className="text-sm text-stone-700 line-clamp-2">{pinnedPost.content}</p>
                  <p className="text-[10px] text-stone-400 mt-1">by {pinnedPost.profiles?.display_name}</p>
                </div>
                <button onClick={() => setPinnedPostId(null)}
                  className="w-full py-2.5 rounded-xl border border-stone-200 text-sm font-bold text-stone-500 flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all">
                  <PinOff size={13} /> ピン解除
                </button>
              </div>
            ) : (
              <p className="text-xs text-stone-400 text-center py-3">投稿タブの各投稿からピン留めできます</p>
            )}
          </div>

          {/* だより生成 */}
          <div className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <BookOpen size={12} /> 村のだより
            </p>
            <p className="text-xs text-stone-500 mb-3 leading-relaxed">今週の活動をまとめた「村のだより」を生成します。</p>
            <button onClick={async () => { await generateDiary(); setTab('diary') }} disabled={generatingDiary}
              className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 active:scale-[0.99] transition-all disabled:opacity-50"
              style={{ background: style.accent }}>
              {generatingDiary ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <BookOpen size={14} />}
              今週のだよりを生成
            </button>
          </div>

          {/* 合併申請 */}
          <div className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              🔀 村の合併
            </p>
            <p className="text-xs text-stone-400 mb-3 leading-relaxed">別の村に合併を申請できます。承認されると、住民と投稿が移行されます。</p>
            <button onClick={() => setShowMergeForm(v => !v)}
              className="w-full py-2.5 rounded-xl text-sm font-bold border border-amber-200 text-amber-700 bg-amber-50 flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all">
              🔀 合併を申請する
            </button>
            {showMergeForm && (
              <div className="mt-3 space-y-3">
                {!mergeTarget ? (
                  <div>
                    <input
                      value={mergeSearch}
                      onChange={e => { setMergeSearch(e.target.value); searchVillages(e.target.value, setMergeResults) }}
                      placeholder="合併先の村を検索…"
                      className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none"
                    />
                    {mergeResults.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {mergeResults.map(v => (
                          <button key={v.id} onClick={() => { setMergeTarget(v); setMergeSearch(v.name); setMergeResults([]) }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border border-stone-100 bg-stone-50 text-left active:scale-[0.98] transition-all">
                            <span className="text-xl">{v.icon}</span>
                            <p className="text-sm font-bold text-stone-800">{v.name}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50">
                    <span className="text-xl">{mergeTarget.icon}</span>
                    <p className="text-sm font-bold text-amber-800 flex-1">{mergeTarget.name}</p>
                    <button onClick={() => { setMergeTarget(null); setMergeSearch('') }}><X size={14} className="text-amber-400" /></button>
                  </div>
                )}
                <textarea
                  value={mergeMsg}
                  onChange={e => setMergeMsg(e.target.value.slice(0, 200))}
                  placeholder="メッセージ（任意）"
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm resize-none focus:outline-none"
                />
                <button onClick={sendMergeRequest} disabled={!mergeTarget || sendingMerge}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  style={{ background: 'linear-gradient(135deg,#f59e0b 0%,#d97706 100%)' }}>
                  {sendingMerge ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '🔀 合併を申請する'}
                </button>
              </div>
            )}
          </div>

          {/* 住民管理 */}
          <div className="bg-white border border-stone-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-stone-50 flex items-center justify-between">
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                <Users size={12} /> 住民管理
              </p>
              <p className="text-[10px] text-stone-400">{members.length} 人</p>
            </div>
            <div className="divide-y divide-stone-50 max-h-72 overflow-y-auto">
              {members.filter(m => m.role !== 'host').map((m: any) => (
                <div key={m.user_id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold text-white flex-shrink-0"
                    style={{ background: style.gradient }}>
                    {m.profiles?.display_name?.[0] ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-stone-800 truncate">{m.profiles?.display_name ?? '住民'}</p>
                    <p className="text-[10px] text-stone-400">{timeAgo(m.joined_at)}に参加</p>
                  </div>
                  <button onClick={() => kickMember(m.user_id)} disabled={kickingUser === m.user_id}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-red-400 border border-red-100 hover:bg-red-50 transition-all active:scale-95 disabled:opacity-40">
                    {kickingUser === m.user_id ? '…' : '退村'}
                  </button>
                </div>
              ))}
              {members.filter(m => m.role !== 'host').length === 0 && (
                <p className="text-xs text-stone-400 text-center py-6">まだ住民がいません</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {showPhoneVerify && (
        <PhoneVerifyModal onClose={() => setShowPhoneVerify(false)}
          onVerified={async () => { const t = await getUserTrust(userId!); setUserTrust(t) }} />
      )}
      {resolvePost && (
        <ResolveModal post={resolvePost} members={members} userId={userId!}
          onClose={() => setResolvePost(null)} onResolved={() => fetchPosts()} />
      )}

      {/* ── はじめまして投稿モーダル ── */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl animate-scale-pop">
            {/* ヘッダー */}
            <div className="text-center mb-5">
              <div className="text-5xl mb-3">🌱</div>
              <h3 className="font-extrabold text-stone-900 text-xl leading-tight mb-1">
                村へようこそ！
              </h3>
              <p className="text-sm text-stone-500 leading-relaxed">
                最初のあいさつ投稿をしましょう。<br />住民に気づいてもらえます。
              </p>
            </div>

            {/* テキストエリア */}
            <div className="relative mb-4">
              <textarea
                value={welcomeText}
                onChange={e => setWelcomeText(e.target.value.slice(0, 200))}
                rows={3}
                autoFocus
                className="w-full px-4 py-3 rounded-2xl border-2 text-sm resize-none focus:outline-none leading-relaxed transition-colors"
                style={{ borderColor: style?.accent ?? '#0ea5e9' }}
              />
              <span className="absolute bottom-2 right-3 text-[10px] text-stone-400">
                {welcomeText.length}/200
              </span>
            </div>

            {/* ボタン */}
            <button
              onClick={submitWelcomePost}
              disabled={!welcomeText.trim() || postingWelcome}
              className="w-full py-4 rounded-2xl font-extrabold text-white text-base disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mb-3"
              style={{ background: `linear-gradient(135deg, ${style?.accent ?? '#0ea5e9'} 0%, ${style?.accent ?? '#0ea5e9'}cc 100%)`, boxShadow: `0 6px 20px ${style?.accent ?? '#0ea5e9'}40` }}
            >
              {postingWelcome
                ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <>🌱 はじめましてを投稿する</>
              }
            </button>
            <button
              onClick={() => setShowWelcome(false)}
              className="w-full py-2.5 text-sm text-stone-400 hover:text-stone-600 transition-colors"
            >
              スキップ
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
