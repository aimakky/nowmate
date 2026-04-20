'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import { createClient } from '@/lib/supabase/client'
import { getNationalityFlag } from '@/lib/utils'
import { AREAS } from '@/lib/constants'
import type { ArrivalStage, HelpRequest } from '@/types'

const CHECKLIST = [
  { id: 'juminhyo',  emoji: '🏛️', title: 'Register 住民票',            category: 'Housing',   desc: 'City hall within 14 days of arrival. Bring passport + lease.' },
  { id: 'bank',      emoji: '🏦', title: 'Open a bank account',         category: 'Banking',   desc: 'Japan Post Bank (ゆうちょ) is easiest. Bring residence card.' },
  { id: 'insurance', emoji: '🏥', title: 'Join 国民健康保険',            category: 'Medical',   desc: 'Required by law. Sign up at city hall same day as 住民票.' },
  { id: 'sim',       emoji: '📱', title: 'Get a SIM card',              category: 'Transport', desc: 'IIJmio or Rakuten Mobile. No Japanese bank needed at first.' },
  { id: 'mynumber',  emoji: '🪪', title: 'Apply for マイナンバーカード',  category: 'Visa',      desc: 'Takes ~4 weeks. Apply early — you\'ll need it for everything.' },
]

const TIMELINE: Record<string, { period: string; icon: string; tasks: { emoji: string; text: string; category: string }[] }[]> = {
  new: [
    { period: 'Week 1', icon: '🚨', tasks: [
      { emoji: '🏛️', text: 'Register 住民票 at city hall', category: 'Housing' },
      { emoji: '📱', text: 'Get a SIM card', category: 'Transport' },
      { emoji: '🏦', text: 'Open Japan Post Bank account', category: 'Banking' },
    ]},
    { period: 'Week 2', icon: '📋', tasks: [
      { emoji: '🏥', text: 'Enroll in 国民健康保険', category: 'Medical' },
      { emoji: '🪪', text: 'Apply for マイナンバーカード', category: 'Visa' },
      { emoji: '🔑', text: 'Confirm lease & get keys sorted', category: 'Housing' },
    ]},
    { period: 'Month 1', icon: '🏠', tasks: [
      { emoji: '💳', text: 'Set up direct debit for utilities', category: 'Banking' },
      { emoji: '🚃', text: 'Get a Suica / PASMO IC card', category: 'Transport' },
      { emoji: '👥', text: 'Find your local expat community', category: 'Jobs' },
    ]},
  ],
  settling: [
    { period: 'Month 2–3', icon: '📈', tasks: [
      { emoji: '💴', text: 'Understand your pay slip (給与明細)', category: 'Tax' },
      { emoji: '🏠', text: 'Check lease renewal terms', category: 'Housing' },
      { emoji: '🗣️', text: 'Start Japanese lessons or language exchange', category: 'Japanese' },
    ]},
    { period: 'Month 4–6', icon: '🌱', tasks: [
      { emoji: '💳', text: 'Apply for Rakuten Card (easiest credit card)', category: 'Banking' },
      { emoji: '📊', text: 'Understand 確定申告 if freelancing', category: 'Tax' },
      { emoji: '🏥', text: 'Find an English-speaking doctor', category: 'Medical' },
    ]},
  ],
  local: [
    { period: 'Year 1+', icon: '🗾', tasks: [
      { emoji: '📝', text: 'Check visa renewal dates', category: 'Visa' },
      { emoji: '🏡', text: 'Consider long-term housing options', category: 'Housing' },
      { emoji: '🤝', text: 'Help newcomers — pay it forward', category: 'Jobs' },
    ]},
  ],
}

const HELPER_CATEGORIES = [
  { value: 'Banking', emoji: '🏦' }, { value: 'Housing', emoji: '🏠' },
  { value: 'Medical', emoji: '🏥' }, { value: 'Visa', emoji: '🛂' },
  { value: 'Japanese', emoji: '🗣️' }, { value: 'Tax', emoji: '📊' },
  { value: 'Transport', emoji: '🚃' }, { value: 'Jobs', emoji: '💼' },
]

const EMERGENCY = [
  { emoji: '🚑', label: 'Ambulance / Fire', number: '119' },
  { emoji: '🚔', label: 'Police', number: '110' },
  { emoji: '🌐', label: 'Foreign Resident Consultation', number: '0570-013-904' },
  { emoji: '🏥', label: 'AMDA Multilingual Medical', number: '03-5285-8088' },
]

const STORAGE_KEY = 'nm_survival_checklist'

export default function SurvivePage() {
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [stage, setStage] = useState<ArrivalStage | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentArea, setCurrentArea] = useState<string>('')
  const [tab, setTab] = useState<'checklist' | 'timeline' | 'help' | 'emergency'>('checklist')

  // Help Board state
  const [requests, setRequests] = useState<HelpRequest[]>([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [showPostForm, setShowPostForm] = useState(false)
  const [postCategory, setPostCategory] = useState('')
  const [postMessage, setPostMessage] = useState('')
  const [postArea, setPostArea] = useState('')
  const [posting, setPosting] = useState(false)
  const [offeringId, setOfferingId] = useState<string | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showPremiumCTA, setShowPremiumCTA] = useState(false)
  const [pendingHelpReq, setPendingHelpReq] = useState<HelpRequest | null>(null)

  // Pre-fill category from checklist
  const [prefillCategory, setPrefillCategory] = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setChecked(new Set(JSON.parse(saved)))
    } catch {}

    async function fetchUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)
      const { data } = await supabase.from('profiles').select('arrival_stage, area').eq('id', user.id).single()
      if (data) {
        setStage(data.arrival_stage)
        setCurrentArea(data.area || '')
        setPostArea(data.area || '')
      }
    }
    fetchUser()
  }, [])

  const fetchRequests = useCallback(async () => {
    setLoadingRequests(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('help_requests')
      .select('*, profiles(display_name, nationality, avatar_url, arrival_stage, is_mentor)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(30)
    setRequests(data || [])
    setLoadingRequests(false)
  }, [])

  useEffect(() => {
    if (tab === 'help') fetchRequests()
  }, [tab, fetchRequests])

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])) } catch {}
      return next
    })
  }

  function openPostForm(category?: string) {
    if (category) setPrefillCategory(category)
    setPostCategory(category || '')
    setShowPostForm(true)
    setTab('help')
  }

  async function handlePost() {
    if (!currentUserId || !postCategory || !postMessage.trim()) return
    setPosting(true)
    const supabase = createClient()
    await supabase.from('help_requests').insert({
      user_id: currentUserId,
      category: postCategory,
      message: postMessage.trim(),
      area: postArea || currentArea,
    })
    setPostMessage('')
    setShowPostForm(false)
    setPosting(false)
    await fetchRequests()
  }

  function handleOfferHelp(request: HelpRequest) {
    if (!currentUserId || currentUserId === request.user_id) return
    setPendingHelpReq(request)
    setShowPremiumCTA(true)
  }

  async function confirmOfferHelp() {
    if (!pendingHelpReq || !currentUserId) return
    setOfferingId(pendingHelpReq.id)
    const supabase = createClient()
    await supabase.from('likes').upsert({ from_user_id: currentUserId, to_user_id: pendingHelpReq.user_id })
    setOfferingId(null)
    setShowPremiumCTA(false)
    setPendingHelpReq(null)
  }

  async function handleResolve(id: string) {
    const supabase = createClient()
    await supabase.from('help_requests').update({ status: 'resolved' }).eq('id', id)
    setRequests(prev => prev.filter(r => r.id !== id))
  }

  const done = checked.size
  const total = CHECKLIST.length
  const pct = Math.round((done / total) * 100)
  const timeline = stage ? (TIMELINE[stage] ?? TIMELINE.new) : TIMELINE.new

  return (
    <div className="max-w-md mx-auto">
      <Header title="Survive Japan" />

      {/* Progress Bar */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-gray-500">Setup progress</span>
          <span className="text-xs font-bold text-brand-500">{done}/{total} done</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-3">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {([
            { id: 'checklist', label: '✅ Setup' },
            { id: 'timeline',  label: '📅 Plan' },
            { id: 'help',      label: '🤝 Help' },
            { id: 'emergency', label: '🚨 SOS' },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 text-[11px] font-semibold rounded-lg transition-all ${
                tab === t.id ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Checklist Tab */}
      {tab === 'checklist' && (
        <div className="px-4 space-y-2.5 pb-6">
          {CHECKLIST.map(item => (
            <div key={item.id} className={`bg-white rounded-2xl border p-4 flex gap-3 items-start transition-all ${checked.has(item.id) ? 'border-brand-100 opacity-60' : 'border-gray-100 shadow-sm'}`}>
              <button
                onClick={() => toggle(item.id)}
                className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5 transition-all ${checked.has(item.id) ? 'bg-brand-500 border-brand-500' : 'border-gray-300 hover:border-brand-400'}`}
              >
                {checked.has(item.id) && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <div className="flex-1">
                <div className={`font-bold text-sm flex items-center gap-1.5 ${checked.has(item.id) ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                  {item.emoji} {item.title}
                </div>
                {!checked.has(item.id) && <p className="text-xs text-gray-400 mt-0.5 leading-snug">{item.desc}</p>}
              </div>
              {!checked.has(item.id) && (
                <button
                  onClick={() => openPostForm(item.category)}
                  className="text-xs text-brand-500 font-semibold whitespace-nowrap hover:text-brand-600"
                >
                  Ask →
                </button>
              )}
            </div>
          ))}
          {done === total && (
            <div className="bg-brand-50 border border-brand-100 rounded-2xl p-5 text-center">
              <div className="text-3xl mb-2">🎉</div>
              <div className="font-bold text-brand-700">You're all set up!</div>
              <p className="text-xs text-brand-500 mt-1">Now go explore Japan 🗾</p>
            </div>
          )}
          {done > 0 && (
            <button
              onClick={() => setShowShareModal(true)}
              className="w-full py-3 border-2 border-brand-200 text-brand-600 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-brand-50 transition"
            >
              📊 Share my Japan setup score
            </button>
          )}
        </div>
      )}

      {/* Timeline Tab */}
      {tab === 'timeline' && (
        <div className="px-4 space-y-4 pb-6">
          {timeline.map(block => (
            <div key={block.period} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                <span className="text-lg">{block.icon}</span>
                <span className="font-bold text-sm text-gray-700">{block.period}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {block.tasks.map((task, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-base">{task.emoji}</span>
                    <span className="text-sm text-gray-700">{task.text}</span>
                    <button onClick={() => openPostForm(task.category)} className="ml-auto text-xs text-brand-500 font-semibold whitespace-nowrap">
                      Ask →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <p className="text-xs text-center text-gray-400 pt-1">
            Based on your Arrival Stage · <Link href="/settings" className="text-brand-400">Change stage</Link>
          </p>
        </div>
      )}

      {/* Help Board Tab */}
      {tab === 'help' && (
        <div className="px-4 pb-6 space-y-3">

          {/* Post Form */}
          {showPostForm ? (
            <div className="bg-white border border-brand-100 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="font-bold text-sm text-gray-800">🙋 Ask for help</div>

              <div>
                <p className="text-xs text-gray-500 mb-1.5">Category</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {HELPER_CATEGORIES.map(c => (
                    <button
                      key={c.value}
                      onClick={() => setPostCategory(c.value)}
                      className={`flex flex-col items-center gap-0.5 py-2 rounded-xl border text-xs transition ${
                        postCategory === c.value ? 'bg-brand-500 text-white border-brand-500' : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      <span>{c.emoji}</span>
                      <span className="text-[10px]">{c.value}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1.5">Area</p>
                <select
                  value={postArea}
                  onChange={e => setPostArea(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                >
                  <option value="">Select area...</option>
                  {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1.5">What do you need help with?</p>
                <textarea
                  value={postMessage}
                  onChange={e => setPostMessage(e.target.value.slice(0, 200))}
                  placeholder="e.g. I just arrived and need to open a bank account. Not sure which one is easiest for foreigners..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                <p className="text-xs text-gray-400 text-right">{postMessage.length}/200</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowPostForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePost}
                  disabled={!postCategory || !postMessage.trim() || posting}
                  className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {posting ? 'Posting...' : 'Post Request'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowPostForm(true)}
              className="w-full py-3 bg-brand-500 text-white rounded-2xl font-semibold text-sm shadow-sm"
            >
              🙋 Ask for help with something
            </button>
          )}

          {/* Requests Feed */}
          {loadingRequests ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
                  <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-2">🤝</div>
              <p className="font-bold text-gray-600">No open requests yet</p>
              <p className="text-xs text-gray-400 mt-1">Be the first to ask for help!</p>
            </div>
          ) : (
            requests.map(req => {
              const isOwn = req.user_id === currentUserId
              const catInfo = HELPER_CATEGORIES.find(c => c.value === req.category)
              const flag = req.profiles ? getNationalityFlag(req.profiles.nationality || '') : ''
              return (
                <div key={req.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{catInfo?.emoji}</span>
                    <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">{req.category}</span>
                    <span className="text-xs text-gray-400">{req.area}</span>
                    {isOwn && <span className="ml-auto text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Your request</span>}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{req.message}</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-gray-400">
                      {flag} {req.profiles?.display_name} · {new Date(req.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    </span>
                    {isOwn ? (
                      <button
                        onClick={() => handleResolve(req.id)}
                        className="text-xs text-emerald-600 font-semibold hover:text-emerald-700"
                      >
                        ✓ Mark resolved
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOfferHelp(req)}
                        disabled={offeringId === req.id}
                        className="flex items-center gap-1 text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-xl font-semibold hover:bg-emerald-600 disabled:opacity-50 transition"
                      >
                        🤝 {offeringId === req.id ? 'Sending...' : 'Offer Help'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Premium CTA Modal */}
      {showPremiumCTA && pendingHelpReq && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6" onClick={() => setShowPremiumCTA(false)}>
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🤝</div>
              <h3 className="font-extrabold text-gray-900 text-lg">Help {pendingHelpReq.profiles?.display_name}</h3>
              <p className="text-sm text-gray-500 mt-1">with their {pendingHelpReq.category} question</p>
            </div>
            <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 mb-4 space-y-2">
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-brand-500 font-bold mt-0.5">★</span>
                <span><span className="font-semibold">Premium Helper Badge</span> — get recognized as a Japan Local mentor</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-brand-500 font-bold mt-0.5">★</span>
                <span><span className="font-semibold">Priority in search results</span> — newcomers find you first</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-brand-500 font-bold mt-0.5">★</span>
                <span><span className="font-semibold">Unlimited matches</span> — no daily like limit</span>
              </div>
            </div>
            <Link
              href="/premium"
              className="block w-full py-3.5 bg-brand-500 text-white rounded-2xl font-bold text-sm text-center mb-2 hover:bg-brand-600 transition"
            >
              Go Premium — ¥980/month
            </Link>
            <button
              onClick={confirmOfferHelp}
              disabled={offeringId === pendingHelpReq.id}
              className="w-full py-3 border-2 border-gray-200 text-gray-600 rounded-2xl font-semibold text-sm hover:bg-gray-50 transition disabled:opacity-50"
            >
              {offeringId === pendingHelpReq.id ? 'Sending...' : 'Help for free →'}
            </button>
          </div>
        </div>
      )}

      {/* Share Score Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6" onClick={() => setShowShareModal(false)}>
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="font-extrabold text-gray-900">📊 My Japan Setup Score</div>
              <button onClick={() => setShowShareModal(false)} className="text-gray-400 text-xl leading-none">×</button>
            </div>
            {/* Share card preview */}
            <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl p-5 mb-4 text-white">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="font-black text-xs">N</span>
                </div>
                <span className="font-bold text-sm">nowjp</span>
              </div>
              <div className="text-4xl font-black mb-1">{pct}%</div>
              <div className="text-sm font-semibold text-brand-100 mb-3">Japan survival setup complete</div>
              <div className="flex gap-1 mb-3">
                {CHECKLIST.map(item => (
                  <div
                    key={item.id}
                    className={`flex-1 h-1.5 rounded-full ${checked.has(item.id) ? 'bg-white' : 'bg-white/30'}`}
                  />
                ))}
              </div>
              <div className="text-xs text-brand-200">{done}/{total} tasks done · getnowjp.com</div>
            </div>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I'm ${pct}% set up in Japan! 🗾 ${done}/${total} survival tasks done with nowjp\n\ngetnowjp.com #JapanLife #ExpatInJapan`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3.5 bg-black text-white rounded-2xl font-bold text-sm text-center mb-2 hover:bg-gray-900 transition"
            >
              Share on X (Twitter)
            </a>
            <button
              onClick={() => setShowShareModal(false)}
              className="w-full py-3 border-2 border-gray-200 text-gray-500 rounded-2xl font-semibold text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Emergency Tab */}
      {tab === 'emergency' && (
        <div className="px-4 space-y-3 pb-6">
          <p className="text-xs text-gray-400 text-center pb-1">Tap a number to call</p>
          {EMERGENCY.map(e => (
            <a key={e.number} href={`tel:${e.number}`}
              className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl px-4 py-4 shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-all"
            >
              <span className="text-2xl">{e.emoji}</span>
              <div className="flex-1">
                <div className="font-bold text-sm text-gray-800">{e.label}</div>
                <div className="text-xs text-gray-400">{e.number}</div>
              </div>
              <span className="text-brand-500 font-bold text-sm">{e.number}</span>
            </a>
          ))}
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mt-2">
            <p className="text-xs text-amber-700 leading-relaxed">
              <span className="font-bold">Tip:</span> Save these numbers before you need them. The Foreign Resident line supports English, Chinese, Spanish, Portuguese and more.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
