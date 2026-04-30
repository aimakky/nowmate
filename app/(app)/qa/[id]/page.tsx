'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Flag, CheckCircle, Star, Send, ThumbsUp, Trophy, ImagePlus, X } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import { getCategoryStyle, getAnonDisplay, getTitleName, awardQaTitle } from '@/lib/qa'
import TrustBadge from '@/components/ui/TrustBadge'
import { getUserTrust, getTierById } from '@/lib/trust'

// ─── 通報モーダル ─────────────────────────────────────────────
const REPORT_REASONS = ['誹謗中傷・侮辱', 'スパム・宣伝', '個人情報の掲載', '不適切なコンテンツ', 'その他']

function ReportModal({ targetType, targetId, userId, onClose }: {
  targetType: 'question' | 'answer'; targetId: string; userId: string; onClose: () => void
}) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function submit() {
    if (!reason || submitting) return
    setSubmitting(true)
    await createClient().from('qa_reports').upsert({ target_type: targetType, target_id: targetId, reporter_id: userId, reason })
    setDone(true)
    setTimeout(onClose, 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl">
        {done ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-bold text-stone-800">通報しました</p>
            <p className="text-xs text-stone-400 mt-1">確認後に対処します。ありがとうございます。</p>
          </div>
        ) : (
          <>
            <h3 className="font-extrabold text-stone-900 text-base mb-1">通報する</h3>
            <p className="text-xs text-stone-500 mb-4">通報理由を選んでください</p>
            <div className="space-y-2 mb-5">
              {REPORT_REASONS.map(r => (
                <button key={r} onClick={() => setReason(r)}
                  className="w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-all"
                  style={reason === r ? { borderColor: '#e11d48', background: '#fff1f2', color: '#e11d48' } : { borderColor: '#e7e5e4', color: '#57534e' }}>
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-stone-200 text-sm font-bold text-stone-500">キャンセル</button>
              <button onClick={submit} disabled={!reason || submitting}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-bold disabled:opacity-40 active:scale-95 transition-all">
                通報する
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── お礼メッセージモーダル ────────────────────────────────────
function ThankYouModal({ onConfirm, onSkip, cs }: {
  onConfirm: (msg: string) => void; onSkip: () => void; cs: any
}) {
  const [msg, setMsg] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl">
        {/* Trophy icon */}
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: cs.bg }}>
          <Trophy size={28} style={{ color: cs.color }} />
        </div>
        <h3 className="font-extrabold text-stone-900 text-base text-center mb-1">
          ベストアンサーを選びました！
        </h3>
        <p className="text-xs text-stone-500 text-center mb-4">
          回答してくれた人へ一言お礼を伝えましょう
        </p>
        <textarea
          value={msg}
          onChange={e => setMsg(e.target.value.slice(0, 200))}
          placeholder="例：とても参考になりました。早速試してみます！"
          rows={3}
          autoFocus
          className="w-full px-4 py-3 rounded-2xl border-2 border-stone-200 text-sm resize-none focus:outline-none leading-relaxed mb-1"
          style={{ focusBorderColor: cs.color } as any}
        />
        <p className="text-right text-[10px] text-stone-400 mb-4">{msg.length}/200</p>
        <div className="flex gap-2">
          <button onClick={onSkip}
            className="flex-1 py-3 rounded-2xl border border-stone-200 text-sm font-bold text-stone-400 active:scale-95 transition-all">
            スキップ
          </button>
          <button onClick={() => onConfirm(msg)}
            className="flex-2 flex-1 py-3 rounded-2xl text-white text-sm font-extrabold active:scale-95 transition-all"
            style={{ background: cs.gradient }}>
            {msg.trim() ? 'お礼を送る 🙏' : 'お礼なしで確定'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────
export default function QADetailPage() {
  const { id }  = useParams<{ id: string }>()
  const router  = useRouter()

  const [question,      setQuestion]      = useState<any>(null)
  const [answers,       setAnswers]       = useState<any[]>([])
  const [userId,        setUserId]        = useState<string | null>(null)
  const [userTrust,     setUserTrust]     = useState<any>(null)
  const [loading,       setLoading]       = useState(true)
  const [newAnswer,     setNewAnswer]     = useState('')
  const [posting,       setPosting]       = useState(false)
  const [ansImageFile,  setAnsImageFile]  = useState<File | null>(null)
  const [ansImagePrev,  setAnsImagePrev]  = useState<string | null>(null)
  const ansFileRef = useRef<HTMLInputElement>(null)
  const [reportTarget,  setReportTarget]  = useState<{ type: 'question'|'answer'; id: string } | null>(null)
  const [selecting,     setSelecting]     = useState<string | null>(null)
  const [thankYouFor,   setThankYouFor]   = useState<string | null>(null) // answerId
  const [myHelpfulIds,  setMyHelpfulIds]  = useState<Set<string>>(new Set())
  const [helpfulLoading, setHelpfulLoading] = useState<string | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const t = await getUserTrust(user.id)
      setUserTrust(t)
    })
  }, [])

  const fetchQuestion = useCallback(async () => {
    const { data } = await createClient()
      .from('qa_questions')
      .select('*, profiles(display_name), user_trust!qa_questions_user_id_fkey(tier), villages(id,name,icon)')
      .eq('id', id).single()
    const normalized = data ? {
      ...data,
      profiles:   Array.isArray(data.profiles)   ? data.profiles[0]   ?? null : data.profiles,
      user_trust: Array.isArray(data.user_trust) ? data.user_trust[0] ?? null : data.user_trust,
      villages:   Array.isArray(data.villages)   ? data.villages[0]   ?? null : data.villages,
    } : null
    setQuestion(normalized)
    await createClient().from('qa_questions').update({ view_count: (data?.view_count ?? 0) + 1 }).eq('id', id)
    setLoading(false)
  }, [id])

  const fetchAnswers = useCallback(async () => {
    const { data } = await createClient()
      .from('qa_answers')
      .select('*, profiles(display_name), user_trust!qa_answers_user_id_fkey(tier), qa_titles(category, level)')
      .eq('question_id', id)
      .order('is_best',       { ascending: false })
      .order('helpful_count', { ascending: false })
      .order('created_at',    { ascending: true })
    setAnswers((data || []).map((a: any) => ({
      ...a,
      profiles:   Array.isArray(a.profiles)   ? a.profiles[0]   ?? null : a.profiles,
      user_trust: Array.isArray(a.user_trust) ? a.user_trust[0] ?? null : a.user_trust,
    })))
  }, [id])

  const fetchMyVotes = useCallback(async (uid: string) => {
    const { data } = await createClient()
      .from('qa_helpful_votes')
      .select('answer_id')
      .eq('user_id', uid)
    setMyHelpfulIds(new Set((data || []).map((v: any) => v.answer_id)))
  }, [])

  useEffect(() => { fetchQuestion() }, [fetchQuestion])
  useEffect(() => { fetchAnswers()  }, [fetchAnswers])
  useEffect(() => { if (userId) fetchMyVotes(userId) }, [userId, fetchMyVotes])

  const tier      = userTrust ? getTierById(userTrust.tier) : getTierById('visitor')
  const canAnswer = tier.canPost

  async function uploadAnsImage(file: File): Promise<string | null> {
    const supabase = createClient()
    const ext  = file.name.split('.').pop() ?? 'jpg'
    const path = `${userId}/${Date.now()}-ans.${ext}`
    const { error } = await supabase.storage.from('qa-images').upload(path, file, { contentType: file.type })
    if (error) return null
    return supabase.storage.from('qa-images').getPublicUrl(path).data.publicUrl
  }

  async function submitAnswer() {
    if (!userId || !newAnswer.trim() || posting) return
    setPosting(true)

    let imageUrl: string | null = null
    if (ansImageFile) {
      imageUrl = await uploadAnsImage(ansImageFile)
    }

    await createClient().from('qa_answers').insert({
      question_id:  id,
      user_id:      userId,
      content:      newAnswer.trim(),
      is_anonymous: false,
      image_url:    imageUrl,
    })
    setNewAnswer('')
    setAnsImageFile(null)
    setAnsImagePrev(null)
    await fetchAnswers()
    await fetchQuestion()
    setPosting(false)
  }

  // ベストアンサー選定 → お礼モーダル表示
  function handleBestAnswerClick(answerId: string) {
    if (!userId || question?.user_id !== userId) return
    setThankYouFor(answerId)
  }

  // お礼モーダル確定
  async function confirmBestAnswer(msg: string) {
    if (!thankYouFor) return
    setSelecting(thankYouFor)
    setThankYouFor(null)
    const supabase = createClient()
    await supabase.from('qa_questions').update({
      best_answer_id: thankYouFor,
      status:         'resolved',
      thank_you_note: msg.trim() || null,
    }).eq('id', id)
    // ベストアンサー選出 → 称号チェック
    const bestAns = answers.find(a => a.id === thankYouFor)
    if (bestAns?.user_id && question?.category) {
      awardQaTitle(supabase, bestAns.user_id, question.category).catch(() => {})
    }
    await fetchQuestion()
    await fetchAnswers()
    setSelecting(null)
  }

  // 「役に立った」トグル
  async function toggleHelpful(answerId: string) {
    if (!userId || helpfulLoading) return
    setHelpfulLoading(answerId)
    const supabase = createClient()
    const alreadyVoted = myHelpfulIds.has(answerId)

    const targetAnswer = answers.find(a => a.id === answerId)
    try {
      if (alreadyVoted) {
        const v = await supabase.from('qa_helpful_votes').delete().eq('answer_id', answerId).eq('user_id', userId)
        if (v.error) throw v.error
        const u = await supabase.from('qa_answers').update({ helpful_count: Math.max(0, (targetAnswer?.helpful_count ?? 1) - 1) }).eq('id', answerId)
        if (u.error) throw u.error
        setMyHelpfulIds(prev => { const n = new Set(prev); n.delete(answerId); return n })
        setAnswers(prev => prev.map(a => a.id === answerId ? { ...a, helpful_count: Math.max(0, a.helpful_count - 1) } : a))
      } else {
        const v = await supabase.from('qa_helpful_votes').insert({ answer_id: answerId, user_id: userId })
        if (v.error) throw v.error
        const u = await supabase.from('qa_answers').update({ helpful_count: (targetAnswer?.helpful_count ?? 0) + 1 }).eq('id', answerId)
        if (u.error) throw u.error
        setMyHelpfulIds(prev => new Set([...prev, answerId]))
        setAnswers(prev => prev.map(a => a.id === answerId ? { ...a, helpful_count: (a.helpful_count ?? 0) + 1 } : a))
        // 称号チェック（いいね追加時のみ）
        if (targetAnswer?.user_id && question?.category) {
          awardQaTitle(supabase, targetAnswer.user_id, question.category).catch(() => {})
        }
      }
    } catch (e) {
      console.error('[qa] toggleHelpful failed', e)
      // 楽観的 UI 更新がない箇所なので state は変更せず
    } finally {
      setHelpfulLoading(null)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-birch">
      <span className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!question) return null

  const cs          = getCategoryStyle(question.category)
  const questionDisplay = question.is_anonymous
    ? getAnonDisplay(question.user_trust?.tier ?? 'resident')
    : (question.profiles?.display_name ?? '住民')
  const isOwner     = userId === question.user_id
  const isResolved  = question.status === 'resolved'
  const needsBest   = isOwner && !isResolved && answers.length > 0

  return (
    <div className="max-w-md mx-auto min-h-screen bg-birch">

      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden" style={{ background: cs.gradient }}>
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}
        />
        <button onClick={() => router.back()}
          className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all z-10"
          style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
          <ArrowLeft size={18} className="text-white" />
        </button>

        {isResolved && (
          <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] font-bold text-white px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <CheckCircle size={11} /> 解決済み
          </div>
        )}

        <div className="px-5 pt-16 pb-6">
          <div className="flex items-center flex-wrap gap-2 mb-3">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white/80 px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)' }}>
              {cs.emoji} {question.category}
            </span>
            {question.villages && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(99,102,241,0.3)', border: '1px solid rgba(99,102,241,0.4)', color: '#e0e7ff' }}>
                🏕️ {question.villages.icon} {question.villages.name}
              </span>
            )}
          </div>
          <h1 className="font-extrabold text-white text-lg leading-snug mb-3 drop-shadow-sm">{question.title}</h1>
          <div className="flex items-center gap-2 text-white/60 text-[10px]">
            <span className="font-medium">{questionDisplay}</span>
            <span>·</span>
            <span>{timeAgo(question.created_at)}</span>
            <span>·</span>
            <span>👁 {question.view_count ?? 0}</span>
          </div>
        </div>
      </div>

      {/* ── 質問オーナーへの「ベストアンサー選んでください」バナー ── */}
      {needsBest && (
        <div className="mx-4 mt-3 flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{ background: `${cs.color}12`, border: `1px solid ${cs.color}30` }}>
          <Trophy size={18} style={{ color: cs.color }} className="flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-extrabold" style={{ color: cs.color }}>
              {answers.length}件の回答が届きました
            </p>
            <p className="text-[10px] text-stone-500 mt-0.5">
              役に立った回答をベストアンサーに選びましょう
            </p>
          </div>
          <span className="text-[10px] font-bold flex-shrink-0" style={{ color: cs.color }}>↓</span>
        </div>
      )}

      {/* ── お礼メッセージ表示（解決済み） ── */}
      {isResolved && question.thank_you_note && (
        <div className="mx-4 mt-3 flex items-start gap-3 px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-100">
          <span className="text-lg flex-shrink-0">🙏</span>
          <div>
            <p className="text-[10px] font-bold text-emerald-600 mb-0.5">質問者からのお礼</p>
            <p className="text-xs text-emerald-800 leading-relaxed">"{question.thank_you_note}"</p>
          </div>
        </div>
      )}

      {/* ── Question content ── */}
      <div className="mx-4 mt-3 bg-white rounded-3xl p-5 shadow-sm border border-stone-100">
        <p className="text-sm text-stone-800 leading-relaxed whitespace-pre-wrap">{question.content}</p>
        {question.image_url && (
          <img
            src={question.image_url}
            alt="添付画像"
            className="mt-3 w-full rounded-2xl object-cover max-h-72 border border-stone-100"
          />
        )}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-50">
          <span className="text-xs text-stone-400">{question.answer_count ?? answers.length} 件の回答</span>
          <button onClick={() => userId && setReportTarget({ type: 'question', id: question.id })}
            className="text-stone-300 hover:text-stone-400 transition-colors">
            <Flag size={13} />
          </button>
        </div>
      </div>

      {/* ── Answers ── */}
      <div className="px-4 pt-4 pb-32 space-y-3">
        <p className="text-xs font-extrabold text-stone-400 uppercase tracking-wider">
          {answers.length} 件の回答
        </p>

        {answers.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-3xl mb-2">💭</p>
            <p className="text-sm font-bold text-stone-600">まだ回答がありません</p>
            <p className="text-xs text-stone-400 mt-1">最初に回答してみましょう</p>
          </div>
        ) : (
          answers.map(ans => {
            const isBest       = ans.is_best
            const isMyAnswer   = ans.user_id === userId
            const ansDisplay   = ans.is_anonymous
              ? getAnonDisplay(ans.user_trust?.tier ?? 'resident')
              : (ans.profiles?.display_name ?? '住民')
            const titleBadge   = ans.qa_titles?.[0]
            const alreadyVoted = myHelpfulIds.has(ans.id)
            const helpfulCount = ans.helpful_count ?? 0

            return (
              <div key={ans.id} className="bg-white rounded-3xl overflow-hidden"
                style={{
                  border: isBest ? `2px solid ${cs.color}` : '1px solid #f5f5f4',
                  boxShadow: isBest ? `0 4px 20px ${cs.color}25` : '0 2px 12px rgba(0,0,0,0.05)',
                }}>

                {/* ベストアンサーバー */}
                {isBest && (
                  <div className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white"
                    style={{ background: cs.gradient }}>
                    <Star size={12} fill="white" /> ベストアンサー
                  </div>
                )}

                <div className="p-4">
                  {/* 回答者ヘッダー */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold text-white flex-shrink-0"
                        style={{ background: cs.gradient }}>
                        {ansDisplay[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-stone-800">{ansDisplay}</span>
                          {ans.user_trust?.tier && <TrustBadge tierId={ans.user_trust.tier} size="xs" />}
                          {titleBadge && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: cs.bg, color: cs.color, border: `1px solid ${cs.border}` }}>
                              {getTitleName(titleBadge.category, titleBadge.level)}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-stone-400 mt-0.5">{timeAgo(ans.created_at)}</p>
                      </div>
                    </div>
                    <button onClick={() => userId && setReportTarget({ type: 'answer', id: ans.id })}
                      className="text-stone-200 hover:text-stone-400 transition-colors flex-shrink-0">
                      <Flag size={12} />
                    </button>
                  </div>

                  {/* 本文 */}
                  <p className="text-sm text-stone-800 leading-relaxed whitespace-pre-wrap mb-3">
                    {ans.content}
                  </p>
                  {ans.image_url && (
                    <img
                      src={ans.image_url}
                      alt="添付画像"
                      className="mb-3 w-full rounded-2xl object-cover max-h-64 border border-stone-100"
                    />
                  )}

                  {/* アクションフッター */}
                  <div className="flex items-center justify-between">

                    {/* 役に立った */}
                    <button
                      onClick={() => !isMyAnswer && toggleHelpful(ans.id)}
                      disabled={!!helpfulLoading || isMyAnswer}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95 disabled:opacity-50"
                      style={alreadyVoted
                        ? { background: `${cs.color}15`, color: cs.color, border: `1px solid ${cs.color}30` }
                        : { background: '#f5f5f4', color: '#a8a29e', border: '1px solid #e7e5e4' }
                      }
                    >
                      {helpfulLoading === ans.id
                        ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                        : <ThumbsUp size={11} fill={alreadyVoted ? cs.color : 'none'} strokeWidth={alreadyVoted ? 0 : 1.8} style={{ color: alreadyVoted ? cs.color : '#a8a29e' }} />
                      }
                      役に立った
                      {helpfulCount > 0 && (
                        <span className="font-extrabold">{helpfulCount}</span>
                      )}
                    </button>

                    {/* ベストアンサーに選ぶ（質問者のみ・未解決・自分の回答以外） */}
                    {isOwner && !isResolved && !isMyAnswer && (
                      <button
                        onClick={() => handleBestAnswerClick(ans.id)}
                        disabled={!!selecting}
                        className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full active:scale-95 transition-all disabled:opacity-50"
                        style={{ background: cs.bg, color: cs.color, border: `1px solid ${cs.border}` }}
                      >
                        {selecting === ans.id
                          ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                          : <Star size={11} />
                        }
                        ベストアンサー
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}

        {/* ── 回答フォーム（実名固定） ── */}
        {!isResolved && (
          canAnswer ? (
            <div className="bg-white rounded-3xl p-4 shadow-sm border border-stone-100 mt-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 rounded-full" style={{ background: cs.gradient }} />
                <p className="text-xs font-bold text-stone-600">回答を投稿する</p>
                <span className="text-[10px] text-stone-400 ml-auto">実名で公開されます</span>
              </div>
              <textarea
                value={newAnswer}
                onChange={e => setNewAnswer(e.target.value.slice(0, 1000))}
                placeholder="誠実なアドバイスが、あなたの信頼を高めます..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-2xl border border-stone-200 text-sm resize-none focus:outline-none leading-relaxed mb-2"
              />
              {/* 画像プレビュー */}
              {ansImagePrev && (
                <div className="relative mb-2">
                  <img src={ansImagePrev} alt="プレビュー" className="w-full max-h-40 object-cover rounded-xl border border-stone-100" />
                  <button
                    onClick={() => { setAnsImageFile(null); setAnsImagePrev(null); if (ansFileRef.current) ansFileRef.current.value = '' }}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
                  >
                    <X size={11} className="text-white" />
                  </button>
                </div>
              )}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => ansFileRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                  style={{ background: `${cs.color}12`, color: cs.color }}
                >
                  <ImagePlus size={13} /> 画像
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-stone-400">{newAnswer.length}/1000</span>
                  <button onClick={submitAnswer} disabled={!newAnswer.trim() || posting}
                    className="w-10 h-10 rounded-2xl flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all"
                    style={{ background: cs.gradient }}>
                    {posting
                      ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Send size={15} className="text-white" />
                    }
                  </button>
                </div>
              </div>
              <input
                ref={ansFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  if (f.size > 5 * 1024 * 1024) return
                  setAnsImageFile(f)
                  setAnsImagePrev(URL.createObjectURL(f))
                }}
              />
            </div>
          ) : (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 text-center">
              <p className="text-xs font-bold text-indigo-600">電話認証すると回答できます</p>
              <p className="text-[10px] text-indigo-400 mt-0.5">マイページから認証 (+30pt)</p>
            </div>
          )
        )}

        {isResolved && (
          <div className="rounded-2xl px-4 py-3 text-center"
            style={{ background: cs.bg, border: `1px solid ${cs.border}` }}>
            <p className="text-xs font-bold" style={{ color: cs.color }}>✅ この質問は解決済みです</p>
          </div>
        )}
      </div>

      {/* ── お礼メッセージモーダル ── */}
      {thankYouFor && (
        <ThankYouModal
          cs={cs}
          onConfirm={confirmBestAnswer}
          onSkip={() => confirmBestAnswer('')}
        />
      )}

      {/* ── 通報モーダル ── */}
      {reportTarget && userId && (
        <ReportModal
          targetType={reportTarget.type}
          targetId={reportTarget.id}
          userId={userId}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  )
}
