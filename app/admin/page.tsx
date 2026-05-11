'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────
interface FeedbackRow {
  id: string
  message: string
  status: string
  created_at: string
}

interface ReportRow {
  report_id: string
  reporter_name: string | null
  reported_id: string
  reported_name: string | null
  reason: string
  description: string | null
  reported_at: string
  report_count: number
  is_shadow_banned: boolean
  shadow_ban_until: string | null
  tier: string
  score: number
  priority_score?: number   // 自動計算優先度（高いほど要対応）
}

// ─── 優先度スコア計算 ─────────────────────────────────────────
// 理由の重み付け
const REASON_WEIGHT: Record<string, number> = {
  '誹謗中傷・人格攻撃':     30,
  '嫌がらせ・ストーキング':  30,
  '連絡先・個人情報の要求':  25,
  '差別的・不適切な発言':    20,
  '勧誘・営業・スパム':      15,
  'その他':                  5,
}

function calcPriority(row: ReportRow): number {
  const reasonPts  = REASON_WEIGHT[row.reason] ?? 5
  const countPts   = Math.min(row.report_count * 10, 50)   // 通報数（最大50pt）
  const tierPts    = row.tier === 'visitor' ? 10 : 0        // 新規ユーザーはリスク高
  const descPts    = row.description ? 5 : 0               // 詳細記載あり
  return reasonPts + countPts + tierPts + descPts
}

function PriorityBadge({ score }: { score: number }) {
  if (score >= 60) return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300 font-extrabold animate-pulse">
      🚨 緊急
    </span>
  )
  if (score >= 35) return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-bold">
      ⚠️ 要確認
    </span>
  )
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200 font-medium">
      通常
    </span>
  )
}

interface ReportedUser {
  user_id: string
  display_name: string | null
  avatar_url: string | null
  report_count: number
  is_shadow_banned: boolean
  shadow_ban_until: string | null
  tier: string
  score: number
  last_active_at: string | null
}

interface FlaggedPost {
  post_id: string
  author_name: string | null
  author_id: string
  village_name: string | null
  content: string
  created_at: string
}

interface Analysis {
  summary: string
  top3: { title: string; votes: number; impact: string; effort: string; description: string; why: string }[]
  quick_wins: string[]
  insight: string
}

type Tab = 'reports' | 'users' | 'posts' | 'feedback'

// ─── ヘルパー ─────────────────────────────────────────────────
function fmt(s: string) {
  return new Date(s).toLocaleString('ja-JP', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function BanBadge({ isBanned, until }: { isBanned: boolean; until: string | null }) {
  if (!isBanned) return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">正常</span>
  if (!until)    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 font-bold">永久BAN</span>
  const days = Math.ceil((new Date(until).getTime() - Date.now()) / 86400000)
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-bold">BAN残{days}日</span>
}

// ─── メインページ ──────────────────────────────────────────────
export default function AdminPage() {
  const [authed,       setAuthed]       = useState(false)
  const [adminSecret,  setAdminSecret]  = useState('')
  const [tab,          setTab]          = useState<Tab>('reports')

  // Feedback
  const [feedbacks,    setFeedbacks]    = useState<FeedbackRow[]>([])
  const [feedLoading,  setFeedLoading]  = useState(false)
  const [analysis,     setAnalysis]     = useState<Analysis | null>(null)
  const [analyzing,    setAnalyzing]    = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')

  // Reports
  const [reports,      setReports]      = useState<ReportRow[]>([])
  const [repLoading,   setRepLoading]   = useState(false)

  // Reported users
  const [repUsers,     setRepUsers]     = useState<ReportedUser[]>([])
  const [userLoading,  setUserLoading]  = useState(false)
  const [banningId,    setBanningId]    = useState<string | null>(null)

  // Flagged posts
  const [flagged,      setFlagged]      = useState<FlaggedPost[]>([])
  const [postLoading,  setPostLoading]  = useState(false)
  const [deletingId,   setDeletingId]   = useState<string | null>(null)

  // ── データ取得 ───────────────────────────────────────────────
  const fetchFeedbacks = useCallback(async () => {
    setFeedLoading(true)
    const { data } = await createClient().from('feedback').select('*').order('created_at', { ascending: false }).limit(100)
    setFeedbacks(data || [])
    setFeedLoading(false)
  }, [])

  const fetchReports = useCallback(async () => {
    setRepLoading(true)
    const { data } = await createClient().rpc('admin_get_reports')
    setReports((data || []) as ReportRow[])
    setRepLoading(false)
  }, [])

  const fetchReportedUsers = useCallback(async () => {
    setUserLoading(true)
    const { data } = await createClient().rpc('admin_get_reported_users')
    setRepUsers((data || []) as ReportedUser[])
    setUserLoading(false)
  }, [])

  const fetchFlagged = useCallback(async () => {
    setPostLoading(true)
    const { data } = await createClient().rpc('admin_get_flagged_posts')
    setFlagged((data || []) as FlaggedPost[])
    setPostLoading(false)
  }, [])

  useEffect(() => {
    if (!authed) return
    fetchReports()
    fetchReportedUsers()
    fetchFlagged()
    fetchFeedbacks()
  }, [authed, fetchReports, fetchReportedUsers, fetchFlagged, fetchFeedbacks])

  // ── アクション ───────────────────────────────────────────────
  async function banUser(userId: string, days: number) {
    setBanningId(userId)
    await createClient().rpc('admin_ban_user', { p_user_id: userId, p_days: days })
    await fetchReportedUsers()
    setBanningId(null)
  }

  async function unbanUser(userId: string) {
    setBanningId(userId)
    await createClient().rpc('admin_unban_user', { p_user_id: userId })
    await fetchReportedUsers()
    setBanningId(null)
  }

  async function deletePost(postId: string) {
    setDeletingId(postId)
    await createClient().rpc('admin_delete_post', { p_post_id: postId })
    setFlagged(prev => prev.filter(p => p.post_id !== postId))
    setDeletingId(null)
  }

  async function updateFeedbackStatus(id: string, status: string) {
    await createClient().from('feedback').update({ status }).eq('id', id)
    setFeedbacks(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }

  async function handleAnalyze() {
    setAnalyzing(true); setAnalyzeError('')
    const pending = feedbacks.filter(r => r.status === 'pending').map(r => r.message)
    if (!pending.length) { setAnalyzeError('Pending feedbackがありません'); setAnalyzing(false); return }
    try {
      const res  = await fetch('/api/analyze-feedback', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminKey: adminSecret, messages: pending }),
      })
      const json = await res.json()
      if (json.error) { setAnalyzeError(json.error); setAnalyzing(false); return }
      setAnalysis(typeof json.analysis === 'string' ? JSON.parse(json.analysis) : json.analysis)
    } catch { setAnalyzeError('Analysis failed') }
    setAnalyzing(false)
  }

  // ── ログイン画面 ─────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white/5 backdrop-blur border border-white/10 rounded-3xl p-6 shadow-2xl">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🛡️</div>
            <div className="font-extrabold text-white text-xl">自由村 運営管理</div>
            <div className="text-xs text-white/40 mt-1">Moderation Dashboard</div>
          </div>
          <input
            type="password"
            value={adminSecret}
            onChange={e => setAdminSecret(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && adminSecret && setAuthed(true)}
            placeholder="管理者パスワード"
            autoFocus
            className="w-full px-4 py-3 rounded-2xl bg-white/10 text-white placeholder-white/30 border border-white/20 text-sm focus:outline-none focus:border-brand-400 mb-3"
          />
          <button
            onClick={() => adminSecret && setAuthed(true)}
            className="w-full py-3 rounded-2xl font-bold text-sm text-white transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' }}
          >
            ログイン →
          </button>
        </div>
      </div>
    )
  }

  const reportCount = reports.length
  const bannedCount = repUsers.filter(u => u.is_shadow_banned).length
  const pendingRepUsers = repUsers.filter(u => !u.is_shadow_banned && u.report_count >= 3).length
  const feedPending = feedbacks.filter(r => r.status === 'pending').length

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: 'reports', label: '🚨 通報一覧',   badge: reportCount },
    { id: 'users',   label: '🛡️ ユーザー管理', badge: pendingRepUsers || undefined },
    { id: 'posts',   label: '🔍 投稿監視',   badge: flagged.length || undefined },
    { id: 'feedback',label: '💡 フィードバック', badge: feedPending || undefined },
  ]

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-white">🛡️ 自由村 運営管理</h1>
            <p className="text-xs text-white/40 mt-0.5">Moderation Dashboard</p>
          </div>
          <div className="flex gap-3 text-center">
            <div>
              <div className="text-lg font-black text-red-400">{reportCount}</div>
              <div className="text-[10px] text-white/40">通報</div>
            </div>
            <div>
              <div className="text-lg font-black text-orange-400">{bannedCount}</div>
              <div className="text-[10px] text-white/40">BAN中</div>
            </div>
            <div>
              <div className="text-lg font-black text-amber-400">{flagged.length}</div>
              <div className="text-[10px] text-white/40">要確認</div>
            </div>
          </div>
        </div>

        {/* サブページ導線 */}
        <Link
          href="/admin/profiles"
          className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-4 py-3 hover:bg-white/10 transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className="text-2xl">👥</div>
            <div>
              <div className="text-sm font-bold text-white">ユーザー一覧</div>
              <div className="text-[10px] text-white/40 mt-0.5">
                public.profiles をブラウズ（is_active = true のみ）
              </div>
            </div>
          </div>
          <div className="text-white/40 text-lg">→</div>
        </Link>

        {/* タブ */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                tab === t.id
                  ? 'bg-brand-500 text-white'
                  : 'bg-white/10 text-white/60 hover:bg-white/15'
              }`}
            >
              {t.label}
              {t.badge ? (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                  tab === t.id ? 'bg-white/20 text-white' : 'bg-red-500 text-white'
                }`}>{t.badge}</span>
              ) : null}
            </button>
          ))}
        </div>

        {/* ── 通報一覧タブ ─────────────────────────────────────── */}
        {tab === 'reports' && (
          <div className="space-y-2">
            {repLoading ? (
              <LoadingRows />
            ) : reports.length === 0 ? (
              <EmptyState emoji="🎉" text="通報はまだありません" />
            ) : (
              [...reports]
                .sort((a, b) => calcPriority(b) - calcPriority(a))  // 優先度降順
                .map(r => {
                  const priority = calcPriority(r)
                  return (
                    <div key={r.report_id}
                      className="bg-white/5 border rounded-2xl p-4 transition-all"
                      style={{ borderColor: priority >= 60 ? 'rgba(239,68,68,0.4)' : priority >= 35 ? 'rgba(249,115,22,0.3)' : 'rgba(255,255,255,0.1)' }}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <PriorityBadge score={priority} />
                            <span className="font-bold text-sm text-white">{r.reported_name ?? '不明'}</span>
                            <BanBadge isBanned={r.is_shadow_banned} until={r.shadow_ban_until} />
                            <span className="text-[10px] text-white/40">通報{r.report_count}件</span>
                          </div>
                          <p className="text-xs text-red-400 font-bold mt-0.5">{r.reason}</p>
                          {r.description && (
                            <p className="text-xs text-white/50 mt-1 leading-relaxed">{r.description}</p>
                          )}
                        </div>
                        <span className="text-[10px] text-white/30 flex-shrink-0">{fmt(r.reported_at)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-white/30">通報者: {r.reporter_name ?? '匿名'} · 優先度スコア: {priority}pt</p>
                        {!r.is_shadow_banned && (
                          <div className="flex gap-1.5">
                            {[7, 30, 0].map(d => (
                              <button key={d} onClick={() => banUser(r.reported_id, d)}
                                className="text-[10px] px-2 py-1 rounded-lg bg-red-900/50 text-red-300 border border-red-800 font-bold hover:bg-red-800/70 transition active:scale-95">
                                {d === 0 ? '永久BAN' : `${d}日BAN`}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
            )}
          </div>
        )}

        {/* ── ユーザー管理タブ ──────────────────────────────────── */}
        {tab === 'users' && (
          <div className="space-y-2">
            {userLoading ? (
              <LoadingRows />
            ) : repUsers.length === 0 ? (
              <EmptyState emoji="✅" text="通報されたユーザーはいません" />
            ) : (
              repUsers.map(u => (
                <div key={u.user_id}
                  className={`border rounded-2xl p-4 ${
                    u.is_shadow_banned
                      ? 'bg-red-950/30 border-red-900/50'
                      : u.report_count >= 3
                        ? 'bg-orange-950/30 border-orange-900/50'
                        : 'bg-white/5 border-white/10'
                  }`}>
                  <div className="flex items-center gap-3 mb-3">
                    {/* アバター */}
                    <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-base font-bold text-white/60 flex-shrink-0">
                      {u.display_name?.[0] ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white truncate">{u.display_name ?? '不明'}</span>
                        <BanBadge isBanned={u.is_shadow_banned} until={u.shadow_ban_until} />
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] text-white/40">{u.tier} · {u.score}pt</span>
                        <span className={`text-[10px] font-bold ${u.report_count >= 5 ? 'text-red-400' : u.report_count >= 3 ? 'text-orange-400' : 'text-white/40'}`}>
                          🚨 通報{u.report_count}件
                        </span>
                        {u.last_active_at && (
                          <span className="text-[10px] text-white/30">{fmt(u.last_active_at)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* アクションボタン */}
                  <div className="flex gap-2 flex-wrap">
                    {u.is_shadow_banned ? (
                      <button
                        onClick={() => unbanUser(u.user_id)}
                        disabled={banningId === u.user_id}
                        className="flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-900/50 text-emerald-300 border border-emerald-800 disabled:opacity-40 active:scale-95 transition-all"
                      >
                        {banningId === u.user_id ? '処理中...' : '✓ BAN解除'}
                      </button>
                    ) : (
                      <>
                        {[7, 30, 0].map(d => (
                          <button key={d}
                            onClick={() => banUser(u.user_id, d)}
                            disabled={banningId === u.user_id}
                            className="flex-1 py-2 rounded-xl text-xs font-bold bg-red-950/50 text-red-300 border border-red-900 disabled:opacity-40 active:scale-95 transition-all"
                          >
                            {banningId === u.user_id ? '...' : d === 0 ? '永久BAN' : `${d}日BAN`}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── 投稿監視タブ ──────────────────────────────────────── */}
        {tab === 'posts' && (
          <div className="space-y-2">
            {postLoading ? (
              <LoadingRows />
            ) : flagged.length === 0 ? (
              <EmptyState emoji="🧹" text="AutoModフラグ付き投稿はありません" />
            ) : (
              flagged.map(p => (
                <div key={p.post_id} className="bg-white/5 border border-amber-900/40 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-amber-300">{p.author_name ?? '不明'}</span>
                        <span className="text-[10px] text-white/40">📍 {p.village_name ?? '不明村'}</span>
                      </div>
                      <p className="text-xs text-white/70 mt-1 leading-relaxed whitespace-pre-wrap">{p.content}</p>
                    </div>
                    <span className="text-[10px] text-white/30 flex-shrink-0">{fmt(p.created_at)}</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => deletePost(p.post_id)}
                      disabled={deletingId === p.post_id}
                      className="flex-1 py-2 rounded-xl text-xs font-bold bg-red-950/50 text-red-300 border border-red-900 disabled:opacity-40 active:scale-95 transition-all"
                    >
                      {deletingId === p.post_id ? '削除中...' : '🗑️ 投稿を削除'}
                    </button>
                    <button
                      onClick={async () => {
                        await createClient().from('village_posts').update({ automod_flagged: false }).eq('id', p.post_id)
                        setFlagged(prev => prev.filter(x => x.post_id !== p.post_id))
                      }}
                      className="flex-1 py-2 rounded-xl text-xs font-bold bg-white/10 text-white/60 border border-white/10 active:scale-95 transition-all"
                    >
                      ✓ 問題なし
                    </button>
                    <button
                      onClick={() => banUser(p.author_id, 7)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold bg-orange-950/50 text-orange-300 border border-orange-900 active:scale-95 transition-all"
                    >
                      7日BAN
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── フィードバックタブ ─────────────────────────────────── */}
        {tab === 'feedback' && (
          <div className="space-y-4">
            {/* AI分析ボタン */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/60">
                Pending: <span className="text-amber-400 font-bold">{feedPending}件</span>
              </p>
              <button
                onClick={handleAnalyze}
                disabled={analyzing || feedPending === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-40 active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' }}
              >
                {analyzing ? '⏳ 分析中...' : `🤖 AI分析 (${feedPending}件)`}
              </button>
            </div>

            {analyzeError && (
              <div className="bg-red-950/40 border border-red-900/50 rounded-2xl p-3 text-xs text-red-400">{analyzeError}</div>
            )}

            {analysis && (
              <div className="bg-white/5 border border-brand-900/50 rounded-2xl p-5 space-y-4">
                <p className="text-xs font-bold text-brand-400 uppercase tracking-wider">🤖 Claude分析結果</p>
                <p className="text-sm text-white/70 bg-white/5 rounded-xl px-4 py-3">{analysis.summary}</p>
                <div className="space-y-2">
                  {analysis.top3?.map((item, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-sm text-white">#{i+1} {item.title}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          item.impact === 'high' ? 'bg-red-900/50 text-red-300' :
                          item.impact === 'medium' ? 'bg-amber-900/50 text-amber-300' :
                          'bg-white/10 text-white/50'
                        }`}>{item.impact}</span>
                      </div>
                      <p className="text-xs text-white/50">{item.description}</p>
                    </div>
                  ))}
                </div>
                {analysis.insight && (
                  <div className="bg-amber-950/30 border border-amber-900/40 rounded-xl p-3">
                    <p className="text-xs font-bold text-amber-400 mb-1">💡 Key Insight</p>
                    <p className="text-xs text-amber-300/80">{analysis.insight}</p>
                  </div>
                )}
              </div>
            )}

            {feedLoading ? <LoadingRows /> : feedbacks.length === 0 ? (
              <EmptyState emoji="💭" text="フィードバックはまだありません" />
            ) : (
              feedbacks.map(row => (
                <div key={row.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-white/80 leading-relaxed">{row.message}</p>
                      <p className="text-[10px] text-white/30 mt-1.5">{fmt(row.created_at)}</p>
                    </div>
                    <select
                      value={row.status}
                      onChange={e => updateFeedbackStatus(row.id, e.target.value)}
                      className={`text-[10px] font-bold px-2 py-1.5 rounded-xl border-0 cursor-pointer focus:outline-none ${
                        row.status === 'implemented' ? 'bg-emerald-900/50 text-emerald-300' :
                        row.status === 'planned'     ? 'bg-blue-900/50 text-blue-300' :
                        row.status === 'rejected'    ? 'bg-red-900/50 text-red-300' :
                                                       'bg-amber-900/50 text-amber-300'
                      }`}
                    >
                      <option value="pending">⏳ Pending</option>
                      <option value="planned">📋 Planned</option>
                      <option value="implemented">✅ Done</option>
                      <option value="rejected">✕ Reject</option>
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  )
}

// ─── 小コンポーネント ─────────────────────────────────────────
function LoadingRows() {
  return (
    <div className="space-y-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 animate-pulse">
          <div className="h-3 bg-white/10 rounded w-1/3 mb-2" />
          <div className="h-3 bg-white/5 rounded w-2/3" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="text-center py-16">
      <div className="text-4xl mb-3">{emoji}</div>
      <p className="text-sm text-white/40 font-medium">{text}</p>
    </div>
  )
}
