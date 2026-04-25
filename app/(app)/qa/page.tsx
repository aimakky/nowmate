'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, MessageSquare, CheckCircle } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import { QA_CATEGORIES, getCategoryStyle, getAnonDisplay } from '@/lib/qa'
import { getUserTrust } from '@/lib/trust'

const STATUS_FILTERS = [
  { id: 'all',      label: 'すべて',   emoji: '📋' },
  { id: 'open',     label: '未解決',   emoji: '🔍' },
  { id: 'resolved', label: '解決済み', emoji: '✅' },
]

type Question = {
  id: string
  user_id: string
  category: string
  title: string
  content: string
  is_anonymous: boolean
  status: string
  answer_count: number
  created_at: string
  profiles: { display_name: string } | null
  user_trust: { tier: string } | null
}

export default function QAPage() {
  const router = useRouter()
  const [questions,    setQuestions]    = useState<Question[]>([])
  const [loading,      setLoading]      = useState(true)
  const [category,     setCategory]     = useState('all')
  const [status,       setStatus]       = useState('all')
  const [userId,       setUserId]       = useState<string | null>(null)
  const [userTrust,    setUserTrust]    = useState<any>(null)

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const t = await getUserTrust(user.id)
      setUserTrust(t)
    })
  }, [])

  const fetchQuestions = useCallback(async () => {
    setLoading(true)
    let q = createClient()
      .from('qa_questions')
      .select('*, profiles(display_name), user_trust!qa_questions_user_id_fkey(tier)')
      .order('created_at', { ascending: false })
      .limit(40)

    if (category !== 'all') q = q.eq('category', category)
    if (status   !== 'all') q = q.eq('status',   status)

    const { data } = await q
    setQuestions((data || []) as Question[])
    setLoading(false)
  }, [category, status])

  useEffect(() => { fetchQuestions() }, [fetchQuestions])

  const canPost = userTrust?.tier && userTrust.tier !== 'visitor'

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9]">

      {/* ── Header ── */}
      <div
        className="relative overflow-hidden px-4 pt-12 pb-5 sticky top-0 z-10"
        style={{ background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)' }}
      >
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: `radial-gradient(1px 1px at 20% 30%, white, transparent), radial-gradient(1px 1px at 75% 20%, white, transparent), radial-gradient(1.5px 1.5px at 55% 65%, white, transparent), radial-gradient(1px 1px at 88% 45%, white, transparent)` }}
        />
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="font-extrabold text-white text-2xl leading-tight mb-0.5">相談広場</h1>
            <p className="text-xs text-white/50">匿名で気軽に相談・回答しよう</p>
          </div>
          <button
            onClick={() => router.push('/qa/create')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold flex-shrink-0 active:scale-95 transition-all"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
          >
            <Plus size={13} /> 質問する
          </button>
        </div>

        {/* Status filter */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setStatus(f.id)}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-all"
              style={status === f.id
                ? { background: '#fff', color: '#18181b', border: '1px solid #fff' }
                : { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)' }
              }
            >
              {f.emoji} {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Category tabs ── */}
      <div className="bg-white border-b border-stone-100 px-4 py-3 flex gap-2 overflow-x-auto scrollbar-none shadow-sm">
        <button
          onClick={() => setCategory('all')}
          className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all"
          style={category === 'all'
            ? { background: '#18181b', color: '#fff', border: '1px solid #18181b' }
            : { background: '#fff', borderColor: '#e7e5e4', color: '#78716c' }
          }
        >
          🌐 すべて
        </button>
        {QA_CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all"
            style={category === c.id
              ? { background: c.color, color: '#fff', border: `1px solid ${c.color}` }
              : { background: '#fff', borderColor: '#e7e5e4', color: '#78716c' }
            }
          >
            {c.emoji} {c.id}
          </button>
        ))}
      </div>

      {/* ── 見習いバナー ── */}
      {userTrust && userTrust.tier === 'visitor' && (
        <div
          onClick={() => router.push('/mypage')}
          className="mx-4 mt-3 bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer active:scale-[0.99] transition-all"
        >
          <span className="text-xl">📱</span>
          <div className="flex-1">
            <p className="text-xs font-bold text-indigo-700">電話認証すると質問・回答できます</p>
            <p className="text-[10px] text-indigo-400">マイページから認証 (+30pt)</p>
          </div>
          <span className="text-indigo-300">›</span>
        </div>
      )}

      {/* ── Question list ── */}
      <div className="px-4 pt-3 pb-32 space-y-3">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-3xl p-4 border border-stone-100 animate-pulse">
              <div className="h-3 bg-stone-100 rounded-full w-1/4 mb-3" />
              <div className="h-4 bg-stone-100 rounded-full w-3/4 mb-2" />
              <div className="h-3 bg-stone-100 rounded-full w-full mb-1" />
              <div className="h-3 bg-stone-100 rounded-full w-2/3" />
            </div>
          ))
        ) : questions.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🔍</p>
            <p className="font-extrabold text-stone-800 text-base mb-1.5">まだ質問がありません</p>
            <p className="text-sm text-stone-400 mb-6">最初の質問をしてみましょう</p>
            <button
              onClick={() => router.push('/qa/create')}
              className="px-6 py-3 rounded-2xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
            >
              ✏️ 質問する
            </button>
          </div>
        ) : (
          questions.map(q => {
            const cs = getCategoryStyle(q.category)
            const displayName = q.is_anonymous
              ? getAnonDisplay(q.user_trust?.tier ?? 'resident')
              : (q.profiles?.display_name ?? '住民')

            return (
              <div
                key={q.id}
                onClick={() => router.push(`/qa/${q.id}`)}
                className="bg-white rounded-3xl overflow-hidden cursor-pointer active:scale-[0.99] hover:shadow-md transition-all"
                style={{ border: '1px solid #f5f5f4', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
              >
                {/* Category accent bar */}
                <div className="h-1" style={{ background: cs.color }} />

                <div className="p-4">
                  {/* Category + status */}
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: cs.bg, color: cs.color, border: `1px solid ${cs.border}` }}
                    >
                      {cs.emoji} {q.category}
                    </span>
                    {q.status === 'resolved' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                        <CheckCircle size={9} /> 解決済み
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-stone-900 text-sm leading-snug mb-1.5 line-clamp-2">
                    {q.title}
                  </h3>

                  {/* Content preview */}
                  <p className="text-xs text-stone-500 leading-relaxed line-clamp-2 mb-3">
                    {q.content}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                        style={{ background: cs.color }}
                      >
                        {displayName[0]}
                      </div>
                      <span className="text-[10px] text-stone-400 font-medium">{displayName}</span>
                      <span className="text-stone-200">·</span>
                      <span className="text-[10px] text-stone-400">{timeAgo(q.created_at)}</span>
                    </div>
                    <div
                      className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: q.answer_count > 0 ? cs.bg : '#fafaf9', color: q.answer_count > 0 ? cs.color : '#a8a29e', border: `1px solid ${q.answer_count > 0 ? cs.border : '#e7e5e4'}` }}
                    >
                      <MessageSquare size={10} /> {q.answer_count} 件の回答
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── FAB ── */}
      <button
        onClick={() => router.push('/qa/create')}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl active:scale-90 transition-all z-30"
        style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}
      >
        <Plus size={22} className="text-white" />
      </button>
    </div>
  )
}
