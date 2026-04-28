'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Flag, CheckCircle, Star, Send } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import { getCategoryStyle, getAnonDisplay, getTitleName } from '@/lib/qa'
import TrustBadge from '@/components/ui/TrustBadge'
import { getUserTrust, getTierById } from '@/lib/trust'

// ─── 通報モーダル ─────────────────────────────────────────────
const REPORT_REASONS = [
  '誹謗中傷・侮辱',
  'スパム・宣伝',
  '個人情報の掲載',
  '不適切なコンテンツ',
  'その他',
]

function ReportModal({
  targetType,
  targetId,
  userId,
  onClose,
}: {
  targetType: 'question' | 'answer'
  targetId: string
  userId: string
  onClose: () => void
}) {
  const [reason,     setReason]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done,       setDone]       = useState(false)

  async function submit() {
    if (!reason || submitting) return
    setSubmitting(true)
    await createClient().from('qa_reports').upsert({
      target_type: targetType,
      target_id:   targetId,
      reporter_id: userId,
      reason,
    })
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
            <p className="text-xs text-stone-400 mt-1">ご報告ありがとうございます。確認後に対処します。</p>
          </div>
        ) : (
          <>
            <h3 className="font-extrabold text-stone-900 text-base mb-1">通報する</h3>
            <p className="text-xs text-stone-500 mb-4">通報理由を選んでください</p>
            <div className="space-y-2 mb-5">
              {REPORT_REASONS.map(r => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className="w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-all"
                  style={reason === r
                    ? { borderColor: '#e11d48', background: '#fff1f2', color: '#e11d48' }
                    : { borderColor: '#e7e5e4', color: '#57534e' }
                  }
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-stone-200 text-sm font-bold text-stone-500">
                キャンセル
              </button>
              <button
                onClick={submit}
                disabled={!reason || submitting}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-bold disabled:opacity-40 active:scale-95 transition-all"
              >
                通報する
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────
export default function QADetailPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()

  const [question,   setQuestion]   = useState<any>(null)
  const [answers,    setAnswers]     = useState<any[]>([])
  const [userId,     setUserId]     = useState<string | null>(null)
  const [userTrust,  setUserTrust]  = useState<any>(null)
  const [loading,    setLoading]    = useState(true)
  const [newAnswer,  setNewAnswer]  = useState('')
  const [isAnon,     setIsAnon]     = useState(true)
  const [posting,    setPosting]    = useState(false)
  const [reportTarget, setReportTarget] = useState<{ type: 'question'|'answer'; id: string } | null>(null)
  const [selecting,  setSelecting]  = useState<string | null>(null) // answer id being selected as best

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
    // view_count++
    await createClient().from('qa_questions').update({ view_count: (data?.view_count ?? 0) + 1 }).eq('id', id)
    setLoading(false)
  }, [id])

  const fetchAnswers = useCallback(async () => {
    const { data } = await createClient()
      .from('qa_answers')
      .select('*, profiles(display_name), user_trust!qa_answers_user_id_fkey(tier), qa_titles(category, level)')
      .eq('question_id', id)
      .order('is_best', { ascending: false })
      .order('helpful_count', { ascending: false })
      .order('created_at', { ascending: true })
    setAnswers(data || [])
  }, [id])

  useEffect(() => { fetchQuestion() }, [fetchQuestion])
  useEffect(() => { fetchAnswers()  }, [fetchAnswers])

  const tier = userTrust ? getTierById(userTrust.tier) : getTierById('visitor')
  const canAnswer = tier.canPost

  async function submitAnswer() {
    if (!userId || !newAnswer.trim() || posting) return
    setPosting(true)
    await createClient().from('qa_answers').insert({
      question_id:  id,
      user_id:      userId,
      content:      newAnswer.trim(),
      is_anonymous: isAnon,
    })
    setNewAnswer('')
    await fetchAnswers()
    setPosting(false)
  }

  async function selectBestAnswer(answerId: string) {
    if (!userId || question?.user_id !== userId) return
    setSelecting(answerId)
    await createClient()
      .from('qa_questions')
      .update({ best_answer_id: answerId, status: 'resolved' })
      .eq('id', id)
    await fetchQuestion()
    await fetchAnswers()
    setSelecting(null)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-birch">
      <span className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!question) return null

  const cs = getCategoryStyle(question.category)
  const questionDisplay = question.is_anonymous
    ? getAnonDisplay(question.user_trust?.tier ?? 'resident')
    : (question.profiles?.display_name ?? '住民')
  const isOwner = userId === question.user_id
  const isResolved = question.status === 'resolved'

  return (
    <div className="max-w-md mx-auto min-h-screen bg-birch">

      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden" style={{ background: cs.gradient }}>
        {/* Noise */}
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}
        />
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all z-10"
          style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}
        >
          <ArrowLeft size={18} className="text-white" />
        </button>

        {/* Status */}
        {isResolved && (
          <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] font-bold text-white px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <CheckCircle size={11} /> 解決済み
          </div>
        )}

        <div className="px-5 pt-16 pb-6">
          {/* Category badge + 村バッジ */}
          <div className="flex items-center flex-wrap gap-2 mb-3">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white/80 px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              {cs.emoji} {question.category}
            </span>
            {question.villages && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(99,102,241,0.3)', border: '1px solid rgba(99,102,241,0.4)', color: '#e0e7ff' }}
              >
                🏕️ {question.villages.icon} {question.villages.name}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="font-extrabold text-white text-lg leading-snug mb-3 drop-shadow-sm">
            {question.title}
          </h1>

          {/* Meta */}
          <div className="flex items-center gap-2 text-white/60 text-[10px]">
            <span className="font-medium">{questionDisplay}</span>
            <span>·</span>
            <span>{timeAgo(question.created_at)}</span>
            <span>·</span>
            <span>👁 {question.view_count}</span>
          </div>
        </div>
      </div>

      {/* ── Question content ── */}
      <div className="mx-4 mt-4 bg-white rounded-3xl p-5 shadow-sm border border-stone-100">
        <p className="text-sm text-stone-800 leading-relaxed whitespace-pre-wrap">{question.content}</p>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-50">
          <span className="text-xs text-stone-400">
            {question.answer_count} 件の回答
          </span>
          <button
            onClick={() => userId && setReportTarget({ type: 'question', id: question.id })}
            className="text-stone-300 hover:text-stone-400 transition-colors"
          >
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
            const isBest = ans.is_best
            const ansDisplay = ans.is_anonymous
              ? getAnonDisplay(ans.user_trust?.tier ?? 'resident')
              : (ans.profiles?.display_name ?? '住民')

            // その人の称号（最高位のもの）
            const titleBadge = ans.qa_titles?.[0]

            return (
              <div
                key={ans.id}
                className="bg-white rounded-3xl overflow-hidden"
                style={{
                  border: isBest ? `2px solid ${cs.color}` : '1px solid #f5f5f4',
                  boxShadow: isBest
                    ? `0 4px 20px ${cs.color}25`
                    : '0 2px 12px rgba(0,0,0,0.05)',
                }}
              >
                {/* Best answer bar */}
                {isBest && (
                  <div
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white"
                    style={{ background: cs.gradient }}
                  >
                    <Star size={12} fill="white" /> ベストアンサー
                  </div>
                )}

                <div className="p-4">
                  {/* Answer header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold text-white flex-shrink-0"
                        style={{ background: cs.gradient }}
                      >
                        {ansDisplay[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-stone-800">{ansDisplay}</span>
                          {ans.user_trust?.tier && <TrustBadge tierId={ans.user_trust.tier} size="xs" />}
                          {titleBadge && (
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: cs.bg, color: cs.color, border: `1px solid ${cs.border}` }}
                            >
                              {getTitleName(titleBadge.category, titleBadge.level)}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-stone-400 mt-0.5">{timeAgo(ans.created_at)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => userId && setReportTarget({ type: 'answer', id: ans.id })}
                      className="text-stone-200 hover:text-stone-400 transition-colors flex-shrink-0"
                    >
                      <Flag size={12} />
                    </button>
                  </div>

                  {/* Content */}
                  <p className="text-sm text-stone-800 leading-relaxed whitespace-pre-wrap mb-3">
                    {ans.content}
                  </p>

                  {/* Best answer 選択ボタン（質問者のみ・未解決時） */}
                  {isOwner && !isResolved && ans.user_id !== userId && (
                    <button
                      onClick={() => selectBestAnswer(ans.id)}
                      disabled={!!selecting}
                      className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full active:scale-95 transition-all disabled:opacity-50"
                      style={{ background: cs.bg, color: cs.color, border: `1px solid ${cs.border}` }}
                    >
                      {selecting === ans.id
                        ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                        : <Star size={11} />
                      }
                      ベストアンサーに選ぶ
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}

        {/* ── 回答フォーム ── */}
        {question.status !== 'resolved' && (
          canAnswer ? (
            <div className="bg-white rounded-3xl p-4 shadow-sm border border-stone-100 mt-2">
              <p className="text-xs font-bold text-stone-500 mb-3">回答を投稿する</p>

              {/* 匿名トグル */}
              <div
                className="flex items-center justify-between mb-3 cursor-pointer"
                onClick={() => setIsAnon(v => !v)}
              >
                <span className="text-xs text-stone-500">匿名で回答する</span>
                <div
                  className="w-9 h-5 rounded-full transition-all flex-shrink-0"
                  style={{ background: isAnon ? cs.color : '#d6d3d1' }}
                >
                  <div
                    className="w-4 h-4 bg-white rounded-full mt-0.5 transition-all shadow-sm"
                    style={{ marginLeft: isAnon ? '18px' : '2px' }}
                  />
                </div>
              </div>

              <div className="flex gap-2 items-end">
                <textarea
                  value={newAnswer}
                  onChange={e => setNewAnswer(e.target.value.slice(0, 1000))}
                  placeholder="誠実なアドバイスが、あなたの信頼を高めます..."
                  rows={3}
                  className="flex-1 px-3 py-2.5 rounded-2xl border border-stone-200 text-sm resize-none focus:outline-none leading-relaxed"
                />
                <button
                  onClick={submitAnswer}
                  disabled={!newAnswer.trim() || posting}
                  className="w-11 h-11 rounded-2xl flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all flex-shrink-0"
                  style={{ background: cs.gradient }}
                >
                  {posting
                    ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Send size={15} className="text-white" />
                  }
                </button>
              </div>
              <p className="text-[10px] text-stone-400 mt-1.5 text-right">{newAnswer.length}/1000</p>
            </div>
          ) : (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 text-center">
              <p className="text-xs font-bold text-indigo-600">電話認証すると回答できます</p>
              <p className="text-[10px] text-indigo-400 mt-0.5">マイページから認証 (+30pt)</p>
            </div>
          )
        )}

        {question.status === 'resolved' && (
          <div
            className="rounded-2xl px-4 py-3 text-center"
            style={{ background: cs.bg, border: `1px solid ${cs.border}` }}
          >
            <p className="text-xs font-bold" style={{ color: cs.color }}>
              ✅ この質問は解決済みです
            </p>
          </div>
        )}
      </div>

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
