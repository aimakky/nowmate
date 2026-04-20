'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface FeedbackRow {
  id: string
  message: string
  status: string
  created_at: string
}

interface Top3Item {
  title: string
  votes: number
  impact: string
  effort: string
  description: string
  why: string
}

interface Analysis {
  summary: string
  top3: Top3Item[]
  quick_wins: string[]
  insight: string
}

export default function AdminPage() {
  const [rows, setRows] = useState<FeedbackRow[]>([])
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')
  const [adminSecret, setAdminSecret] = useState('')
  const [authed, setAuthed] = useState(false)

  const counts = {
    pending: rows.filter(r => r.status === 'pending').length,
    planned: rows.filter(r => r.status === 'planned').length,
    implemented: rows.filter(r => r.status === 'implemented').length,
  }

  async function fetchFeedback() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    setRows(data || [])
    setLoading(false)
  }

  useEffect(() => { if (authed) fetchFeedback() }, [authed])

  async function handleAnalyze() {
    setAnalyzing(true)
    setAnalyzeError('')
    const pending = rows.filter(r => r.status === 'pending').map(r => r.message)
    if (!pending.length) { setAnalyzeError('No pending feedback to analyze.'); setAnalyzing(false); return }

    try {
      const res = await fetch('/api/analyze-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminKey: adminSecret, messages: pending }),
      })
      const json = await res.json()
      if (json.error) { setAnalyzeError(json.error); setAnalyzing(false); return }
      setAnalysis(typeof json.analysis === 'string' ? JSON.parse(json.analysis) : json.analysis)
    } catch {
      setAnalyzeError('Analysis failed. Check ANTHROPIC_API_KEY in Vercel env.')
    }
    setAnalyzing(false)
  }

  async function updateStatus(id: string, status: string) {
    const supabase = createClient()
    await supabase.from('feedback').update({ status }).eq('id', id)
    setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }

  const impactColor = (v: string) =>
    v === 'high' ? 'text-red-600 bg-red-50' : v === 'medium' ? 'text-amber-600 bg-amber-50' : 'text-gray-500 bg-gray-100'
  const effortColor = (v: string) =>
    v === 'small' ? 'text-green-600 bg-green-50' : v === 'medium' ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50'

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="text-center mb-6">
            <div className="text-3xl mb-2">🔐</div>
            <div className="font-extrabold text-gray-900 text-lg">nowjp Admin</div>
            <div className="text-xs text-gray-400 mt-1">Feedback & AI Analysis Dashboard</div>
          </div>
          <input
            type="password"
            value={adminSecret}
            onChange={e => setAdminSecret(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && adminSecret && setAuthed(true)}
            placeholder="Admin secret key"
            autoFocus
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 mb-3"
          />
          <button
            onClick={() => adminSecret && setAuthed(true)}
            className="w-full py-3 bg-brand-500 text-white rounded-2xl font-bold text-sm hover:bg-brand-600 transition"
          >
            Enter →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">nowjp Admin</h1>
            <p className="text-sm text-gray-400">{rows.length} total feedbacks</p>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={analyzing || counts.pending === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-2xl font-semibold text-sm hover:bg-brand-600 disabled:opacity-50 transition"
          >
            {analyzing ? '⏳ Analyzing...' : `🤖 Analyze ${counts.pending} pending`}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Pending',     value: counts.pending,     color: 'text-amber-600 bg-amber-50 border-amber-100' },
            { label: 'Planned',     value: counts.planned,     color: 'text-blue-600 bg-blue-50 border-blue-100' },
            { label: 'Implemented', value: counts.implemented, color: 'text-green-600 bg-green-50 border-green-100' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border p-4 text-center ${s.color}`}>
              <div className="text-2xl font-black">{s.value}</div>
              <div className="text-xs font-semibold mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Error */}
        {analyzeError && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-sm text-red-600">{analyzeError}</div>
        )}

        {/* Claude Analysis */}
        {analysis && (
          <div className="bg-white border border-brand-100 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <span className="font-extrabold text-gray-900">Claude Analysis</span>
            </div>
            <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-4 py-3">{analysis.summary}</p>

            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Top 3 to Implement</p>
              <div className="space-y-3">
                {analysis.top3?.map((item, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="font-bold text-sm text-gray-900">#{i+1} {item.title}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${impactColor(item.impact)}`}>{item.impact} impact</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${effortColor(item.effort)}`}>{item.effort} effort</span>
                      <span className="ml-auto text-xs text-gray-400">{item.votes} people</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">{item.description}</p>
                    <p className="text-xs text-brand-500 italic">{item.why}</p>
                  </div>
                ))}
              </div>
            </div>

            {analysis.quick_wins?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Quick Wins</p>
                <ul className="space-y-1">
                  {analysis.quick_wins.map((w, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                      <span className="text-green-500 mt-0.5">✓</span> {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.insight && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-xs font-bold text-amber-700 mb-1">💡 Key Insight</p>
                <p className="text-xs text-amber-700">{analysis.insight}</p>
              </div>
            )}
          </div>
        )}

        {/* Feedback List */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">All Feedback</p>
          {loading ? (
            <div className="text-center py-10 text-gray-400 text-sm">Loading...</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              No feedback yet — the 💡 button is live in the app
            </div>
          ) : (
            rows.map(row => (
              <div key={row.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-gray-800 leading-relaxed">{row.message}</p>
                    <p className="text-xs text-gray-400 mt-1.5">
                      {new Date(row.created_at).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <select
                    value={row.status}
                    onChange={e => updateStatus(row.id, e.target.value)}
                    className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border-0 cursor-pointer focus:outline-none ${
                      row.status === 'implemented' ? 'bg-green-50 text-green-700' :
                      row.status === 'planned'     ? 'bg-blue-50 text-blue-700' :
                      row.status === 'rejected'    ? 'bg-red-50 text-red-500' :
                                                     'bg-amber-50 text-amber-700'
                    }`}
                  >
                    <option value="pending">⏳ Pending</option>
                    <option value="planned">📋 Planned</option>
                    <option value="implemented">✅ Implemented</option>
                    <option value="rejected">✕ Rejected</option>
                  </select>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
