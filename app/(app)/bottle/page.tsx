'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { VILLAGE_TYPE_STYLES } from '@/components/ui/VillageCard'
import DriftBottle from '@/components/features/DriftBottle'
import { getUserTrust, getTierById } from '@/lib/trust'
import { Plus, MessageSquare, CheckCircle, ChevronRight, Zap } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import { QA_CATEGORIES, getCategoryStyle, getAnonDisplay } from '@/lib/qa'

// ─── 型 ──────────────────────────────────────────────────────
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
  village_id: string | null
  villages: { id: string; name: string; icon: string } | null
  profiles: { display_name: string } | null
  user_trust: { tier: string } | null
}

// ─── QuestionCard（共通）────────────────────────────────────
function QuestionCard({
  q, onClick, mode,
}: {
  q: Question
  onClick: () => void
  mode: 'browse' | 'answer'
}) {
  const cs = getCategoryStyle(q.category)
  const displayName = q.is_anonymous
    ? getAnonDisplay(q.user_trust?.tier ?? 'resident')
    : (q.profiles?.display_name ?? '住民')

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-3xl overflow-hidden cursor-pointer active:scale-[0.99] transition-all"
      style={{ border: '1px solid #f5f5f4', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
    >
      <div className="h-1" style={{ background: cs.color }} />
      <div className="p-4">
        {/* カテゴリ + ステータス + 村バッジ */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: cs.bg, color: cs.color, border: `1px solid ${cs.border}` }}
          >
            {cs.emoji} {q.category}
          </span>
          {q.villages && (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
              {q.villages.icon} {q.villages.name}
            </span>
          )}
          {q.status === 'resolved' && (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
              <CheckCircle size={9} /> 解決済み
            </span>
          )}
          {mode === 'answer' && q.answer_count === 0 && (
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
              🔥 まだ誰も答えていない
            </span>
          )}
        </div>

        <h3 className="font-bold text-stone-900 text-sm leading-snug mb-1.5 line-clamp-2">
          {q.title}
        </h3>
        <p className="text-xs text-stone-500 leading-relaxed line-clamp-2 mb-3">
          {q.content}
        </p>

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

          {mode === 'answer' ? (
            <span
              className="text-[11px] font-extrabold px-3 py-1 rounded-xl text-white"
              style={{ background: cs.color }}
            >
              答える →
            </span>
          ) : (
            <div
              className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: q.answer_count > 0 ? cs.bg : '#fafaf9',
                color: q.answer_count > 0 ? cs.color : '#a8a29e',
                border: `1px solid ${q.answer_count > 0 ? cs.border : '#e7e5e4'}`,
              }}
            >
              <MessageSquare size={10} /> {q.answer_count} 件の回答
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── ページ ───────────────────────────────────────────────────
export default function BottlePage() {
  const router = useRouter()

  // メインタブ
  const [tab,    setTab]    = useState<'qa' | 'bottle'>('qa')
  // Q&A サブタブ
  const [qaMode, setQaMode] = useState<'open' | 'resolved'>('open')

  // 共通
  const [userId,    setUserId]    = useState<string | null>(null)
  const [userTrust, setUserTrust] = useState<any>(null)
  const [loading,   setLoading]   = useState(true)

  // 漂流瓶
  const [villages, setVillages] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)

  // Q&A（回答受付中）
  const [questions,  setQuestions]  = useState<Question[]>([])
  const [qaLoading,  setQaLoading]  = useState(false)
  const [qaCategory, setQaCategory] = useState('all')

  // Q&A（解決済み）
  const [resolved,        setResolved]        = useState<Question[]>([])
  const [resolvedLoading, setResolvedLoading] = useState(false)
  const [resolvedCategory, setResolvedCategory] = useState('all')

  // ─── 初期化 ────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const [villageRes, trustRes] = await Promise.all([
        supabase
          .from('village_members')
          .select('village_id, villages(id, name, icon, type, description)')
          .eq('user_id', user.id)
          .order('joined_at', { ascending: false }),
        getUserTrust(user.id),
      ])

      const vs = (villageRes.data ?? []).map((m: any) => m.villages).filter(Boolean)
      setVillages(vs)
      if (vs.length === 1) setSelected(vs[0])
      setUserTrust(trustRes)
      setLoading(false)
    }
    init()
  }, [router])

  // ─── 回答受付中 取得 ──────────────────────────────────────
  const fetchQuestions = useCallback(async () => {
    setQaLoading(true)
    let q = createClient()
      .from('qa_questions')
      .select('*, profiles(display_name), user_trust!qa_questions_user_id_fkey(tier), villages(id,name,icon)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(30)
    if (qaCategory !== 'all') q = q.eq('category', qaCategory)
    const { data } = await q
    setQuestions((data || []).map((item: any) => ({
      ...item,
      profiles:   Array.isArray(item.profiles)   ? item.profiles[0]   ?? null : item.profiles,
      user_trust: Array.isArray(item.user_trust) ? item.user_trust[0] ?? null : item.user_trust,
      villages:   Array.isArray(item.villages)   ? item.villages[0]   ?? null : item.villages,
    })) as Question[])
    setQaLoading(false)
  }, [qaCategory])

  // ─── 解決済み 取得 ────────────────────────────────────────
  const fetchResolved = useCallback(async () => {
    setResolvedLoading(true)
    let q = createClient()
      .from('qa_questions')
      .select('*, profiles(display_name), user_trust!qa_questions_user_id_fkey(tier), villages(id,name,icon)')
      .eq('status', 'resolved')
      .order('created_at', { ascending: false })
      .limit(30)
    if (resolvedCategory !== 'all') q = q.eq('category', resolvedCategory)
    const { data } = await q
    setResolved((data || []).map((item: any) => ({
      ...item,
      profiles:   Array.isArray(item.profiles)   ? item.profiles[0]   ?? null : item.profiles,
      user_trust: Array.isArray(item.user_trust) ? item.user_trust[0] ?? null : item.user_trust,
      villages:   Array.isArray(item.villages)   ? item.villages[0]   ?? null : item.villages,
    })) as Question[])
    setResolvedLoading(false)
  }, [resolvedCategory])

  useEffect(() => {
    if (tab === 'qa' && qaMode === 'open')     fetchQuestions()
  }, [tab, qaMode, fetchQuestions])

  useEffect(() => {
    if (tab === 'qa' && qaMode === 'resolved') fetchResolved()
  }, [tab, qaMode, fetchResolved])

  // ─── レンダリング ──────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F0E8]">
      <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const tier = userTrust ? getTierById(userTrust.tier) : getTierById('visitor')
  const canPost = userTrust?.tier && userTrust.tier !== 'visitor'

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F5F0E8]">

      {/* ── ヘッダー ── */}
      <div
        className="relative overflow-hidden px-4 pt-12 pb-0 sticky top-0 z-10"
        style={{ background: 'linear-gradient(160deg, #0c1445 0%, #1a2c6b 60%, #0f3460 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: `radial-gradient(1px 1px at 15% 25%, white, transparent),
              radial-gradient(1px 1px at 65% 12%, white, transparent),
              radial-gradient(1.5px 1.5px at 82% 58%, white, transparent),
              radial-gradient(1px 1px at 38% 72%, white, transparent),
              radial-gradient(1px 1px at 92% 30%, white, transparent)`,
            pointerEvents: 'none',
          }}
        />

        {/* タイトル行 */}
        <div className="flex items-start justify-between gap-3 mb-4 relative">
          <div>
            <p className="text-blue-300/70 text-[10px] font-bold tracking-widest mb-0.5 uppercase">
              {tab === 'qa' ? 'Q＆A村' : 'Drift Bottle'}
            </p>
            <h1 className="font-extrabold text-white text-2xl leading-tight">
              {tab === 'qa' ? '💬 Q＆A村' : '🌊 漂流瓶'}
            </h1>
            <p className="text-blue-200/60 text-[11px] mt-0.5">
              {tab === 'qa'
                ? qaMode === 'open' ? '経験者が答えてくれる相談広場' : '解決した知識を活かそう'
                : '気持ちを匿名で流す・誰かが拾う'}
            </p>
          </div>
          {/* 右上ボタン削除済み */}
        </div>

        {/* ── メインタブ ── */}
        <div className="flex relative">
          {([
            { id: 'qa',     icon: '💬', label: 'Q＆A村' },
            { id: 'bottle', icon: '🌊', label: '漂流瓶' },
          ] as { id: 'qa' | 'bottle'; icon: string; label: string }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-bold transition-all relative"
              style={{ color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.45)' }}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {tab === t.id && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-[3px] rounded-full bg-white" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          質問村タブ
      ══════════════════════════════════════════════ */}
      {tab === 'qa' && (
        <div className="pb-32">

          {/* Q&A サブタブ */}
          <div className="bg-white border-b border-stone-100 shadow-sm">
            <div className="flex items-center px-4 pt-3 gap-2">
              {([
                { id: 'open',     icon: '🔍', label: '回答受付中' },
                { id: 'resolved', icon: '✅', label: '解決済み'   },
              ] as { id: 'open' | 'resolved'; icon: string; label: string }[]).map(m => (
                <button
                  key={m.id}
                  onClick={() => setQaMode(m.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-extrabold transition-all active:scale-95"
                  style={qaMode === m.id
                    ? { background: '#1e40af', color: '#fff' }
                    : { background: '#fafaf9', color: '#78716c', border: '1px solid #e7e5e4' }
                  }
                >
                  <span>{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
              {/* 質問するボタン — FABより確実なタップ領域 */}
              <button
                onClick={() => router.push('/qa/create')}
                className="flex items-center gap-1 px-3 py-2.5 rounded-2xl text-xs font-extrabold text-white flex-shrink-0 active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)' }}
              >
                <Plus size={12} /> 質問する
              </button>
            </div>

            {/* カテゴリフィルター */}
            <div className="px-4 pt-2 pb-3 flex gap-2 overflow-x-auto scrollbar-none">
              <button
                onClick={() => qaMode === 'open' ? setQaCategory('all') : setResolvedCategory('all')}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all"
                style={(qaMode === 'open' ? qaCategory : resolvedCategory) === 'all'
                  ? { background: '#18181b', color: '#fff', border: '1px solid #18181b' }
                  : { background: '#fff', borderColor: '#e7e5e4', color: '#78716c' }
                }
              >
                🌐 すべて
              </button>
              {QA_CATEGORIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => qaMode === 'open' ? setQaCategory(c.id) : setResolvedCategory(c.id)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all"
                  style={(qaMode === 'open' ? qaCategory : resolvedCategory) === c.id
                    ? { background: c.color, color: '#fff', border: `1px solid ${c.color}` }
                    : { background: '#fff', borderColor: '#e7e5e4', color: '#78716c' }
                  }
                >
                  {c.emoji} {c.id}
                </button>
              ))}
            </div>
          </div>

          {/* 見習いバナー */}
          {userTrust?.tier === 'visitor' && (
            <div
              onClick={() => router.push('/mypage')}
              className="mx-4 mt-3 bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer active:scale-[0.99] transition-all"
            >
              <span className="text-xl">📱</span>
              <div className="flex-1">
                <p className="text-xs font-bold text-indigo-700">電話認証すると質問・回答できます</p>
                <p className="text-[10px] text-indigo-400">マイページから認証 (+30pt)</p>
              </div>
              <ChevronRight size={14} className="text-indigo-300" />
            </div>
          )}

          {/* ── 回答受付中 ── */}
          {qaMode === 'open' && (
            <div className="px-4 pt-3 space-y-3">
              {qaLoading ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white rounded-3xl p-4 border border-stone-100 animate-pulse">
                    <div className="h-3 bg-stone-100 rounded-full w-1/4 mb-3" />
                    <div className="h-4 bg-stone-100 rounded-full w-3/4 mb-2" />
                    <div className="h-3 bg-stone-100 rounded-full w-full" />
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
                    style={{ background: 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)' }}
                  >
                    ✏️ 質問する
                  </button>
                </div>
              ) : (
                questions.map(q => (
                  <QuestionCard
                    key={q.id}
                    q={q}
                    mode="browse"
                    onClick={() => router.push(`/qa/${q.id}`)}
                  />
                ))
              )}
            </div>
          )}

          {/* ── 解決済み ── */}
          {qaMode === 'resolved' && (
            <div className="px-4 pt-3 space-y-3">
              {resolvedLoading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-3xl p-4 border border-stone-100 animate-pulse">
                    <div className="h-3 bg-stone-100 rounded-full w-1/4 mb-3" />
                    <div className="h-4 bg-stone-100 rounded-full w-3/4 mb-2" />
                    <div className="h-3 bg-stone-100 rounded-full w-2/3" />
                  </div>
                ))
              ) : resolved.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-5xl mb-4">✅</p>
                  <p className="font-extrabold text-stone-800 text-base mb-1.5">解決済みの質問はまだありません</p>
                  <p className="text-sm text-stone-400">回答受付中の質問に答えてみましょう</p>
                </div>
              ) : (
                resolved.map(q => (
                  <QuestionCard
                    key={q.id}
                    q={q}
                    mode="browse"
                    onClick={() => router.push(`/qa/${q.id}`)}
                  />
                ))
              )}
            </div>
          )}

          {/* FAB（質問する） — z-50でBottomNav(z-40)より前面、bottom安全距離確保 */}
          <button
            onClick={() => router.push('/qa/create')}
            className="fixed right-5 w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl active:scale-90 transition-all z-50"
            style={{
              bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
              background: 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)',
              boxShadow: '0 8px 24px rgba(29,78,216,0.4)',
            }}
          >
            <Plus size={22} className="text-white" />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          漂流瓶タブ
      ══════════════════════════════════════════════ */}
      {tab === 'bottle' && (
        <div className="px-4 pt-4 pb-32 space-y-4">

          {/* キャッチコピー */}
          <div
            className="rounded-2xl px-4 py-4 text-center space-y-1"
            style={{ background: 'linear-gradient(135deg, rgba(12,20,69,0.06) 0%, rgba(29,78,216,0.06) 100%)', border: '1px solid rgba(29,78,216,0.1)' }}
          >
            <p className="text-lg font-extrabold text-stone-800">今の気持ちを、流してみよう</p>
            <p className="text-xs text-stone-400 leading-relaxed">
              答えは求めなくていい。<br />ただ、誰かに受け止めてほしいとき。
            </p>
            <div className="flex items-center justify-center gap-4 pt-2">
              {[
                { icon: '🔒', text: '完全匿名' },
                { icon: '🌊', text: 'どこかへ届く' },
                { icon: '🤲', text: '誰かが拾う' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="text-sm">{s.icon}</span>
                  <span className="text-[10px] font-bold text-stone-500">{s.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 質問村への誘導 */}
          <button
            onClick={() => setTab('qa')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl active:scale-[0.99] transition-all"
            style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.12)' }}
          >
            <span className="text-xl">💬</span>
            <div className="flex-1 text-left">
              <p className="text-xs font-bold text-blue-700">答えが欲しいなら → Q＆A村</p>
              <p className="text-[10px] text-blue-400">カテゴリ別に経験者が回答してくれます</p>
            </div>
            <span className="text-blue-300 text-xs">→</span>
          </button>

          {/* 村に参加していない場合 */}
          {villages.length === 0 && (
            <div className="bg-white rounded-3xl p-6 text-center shadow-sm border border-stone-100">
              <p className="text-3xl mb-3">🌿</p>
              <p className="text-sm font-bold text-stone-700">まず村に参加しよう</p>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                漂流瓶は村の機能です。<br />村に参加してから使えます。
              </p>
              <button
                onClick={() => router.push('/villages')}
                className="mt-4 px-6 py-2.5 rounded-2xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #1e40af, #1d4ed8)' }}
              >
                村を探す →
              </button>
            </div>
          )}

          {/* 村セレクター（2村以上） */}
          {villages.length > 1 && (
            <div>
              <p className="text-xs font-bold text-stone-500 mb-2 px-1">どの村に流しますか？</p>
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                {villages.map((v: any) => {
                  const st = VILLAGE_TYPE_STYLES[v.type] ?? VILLAGE_TYPE_STYLES['雑談']
                  const isSelected = selected?.id === v.id
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelected(v)}
                      className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-2xl border transition-all active:scale-95"
                      style={isSelected
                        ? { background: st.accent, borderColor: st.accent, color: '#fff' }
                        : { background: '#fff', borderColor: '#e7e5e4', color: '#57534e' }
                      }
                    >
                      <span className="text-lg">{v.icon}</span>
                      <span className="text-xs font-bold truncate max-w-[80px]">{v.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* DriftBottle */}
          {villages.length > 0 && (
            selected ? (
              <DriftBottle
                villageId={selected.id}
                villageName={selected.name}
                userId={userId ?? ''}
                style={VILLAGE_TYPE_STYLES[selected.type] ?? VILLAGE_TYPE_STYLES['雑談']}
                isMember={true}
                canPost={tier.canPost}
                canReply={tier.canCreateRoom}
              />
            ) : (
              <div className="bg-white rounded-3xl p-6 text-center shadow-sm border border-stone-100">
                <p className="text-2xl mb-2">👆</p>
                <p className="text-sm font-bold text-stone-600">上から村を選んでください</p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
