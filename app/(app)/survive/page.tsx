'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import { createClient } from '@/lib/supabase/client'
import type { ArrivalStage } from '@/types'

const CHECKLIST = [
  { id: 'juminhyo',  emoji: '🏛️', title: 'Register 住民票',           desc: 'City hall within 14 days of arrival. Bring passport + lease.' },
  { id: 'bank',      emoji: '🏦', title: 'Open a bank account',        desc: 'Japan Post Bank (ゆうちょ) is easiest. Bring residence card.' },
  { id: 'insurance', emoji: '🏥', title: 'Join 国民健康保険',           desc: 'Required by law. Sign up at city hall same day as 住民票.' },
  { id: 'sim',       emoji: '📱', title: 'Get a SIM card',             desc: 'IIJmio or Rakuten Mobile. No Japanese bank needed at first.' },
  { id: 'mynumber',  emoji: '🪪', title: 'Apply for マイナンバーカード', desc: 'Takes ~4 weeks. Apply early — you\'ll need it for everything.' },
]

const TIMELINE: Record<string, { period: string; icon: string; tasks: { emoji: string; text: string }[] }[]> = {
  new: [
    { period: 'Week 1', icon: '🚨', tasks: [
      { emoji: '🏛️', text: 'Register 住民票 at city hall' },
      { emoji: '📱', text: 'Get a SIM card' },
      { emoji: '🏦', text: 'Open Japan Post Bank account' },
    ]},
    { period: 'Week 2', icon: '📋', tasks: [
      { emoji: '🏥', text: 'Enroll in 国民健康保険' },
      { emoji: '🪪', text: 'Apply for マイナンバーカード' },
      { emoji: '🔑', text: 'Confirm lease & get keys sorted' },
    ]},
    { period: 'Month 1', icon: '🏠', tasks: [
      { emoji: '💳', text: 'Set up direct debit for utilities' },
      { emoji: '🚃', text: 'Get a Suica / PASMO IC card' },
      { emoji: '👥', text: 'Find your local expat community' },
    ]},
  ],
  settling: [
    { period: 'Month 2–3', icon: '📈', tasks: [
      { emoji: '💴', text: 'Understand your pay slip (給与明細)' },
      { emoji: '🏠', text: 'Check lease renewal terms' },
      { emoji: '🗣️', text: 'Start Japanese lessons (or language exchange)' },
    ]},
    { period: 'Month 4–6', icon: '🌱', tasks: [
      { emoji: '💳', text: 'Apply for Rakuten Card (easiest credit card)' },
      { emoji: '📊', text: 'Understand 確定申告 if freelancing' },
      { emoji: '🏥', text: 'Find an English-speaking doctor' },
    ]},
  ],
  local: [
    { period: 'Year 1+', icon: '🗾', tasks: [
      { emoji: '📝', text: 'Check visa renewal dates' },
      { emoji: '🏡', text: 'Consider long-term housing options' },
      { emoji: '🤝', text: 'Help newcomers — pay it forward' },
    ]},
  ],
}

const EMERGENCY = [
  { emoji: '🚑', label: 'Ambulance / Fire', number: '119' },
  { emoji: '🚔', label: 'Police',           number: '110' },
  { emoji: '🌐', label: 'Foreign Resident Consultation', number: '0570-013-904' },
  { emoji: '🏥', label: 'AMDA Multilingual Medical', number: '03-5285-8088' },
]

const STORAGE_KEY = 'nm_survival_checklist'

export default function SurvivePage() {
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [stage, setStage] = useState<ArrivalStage | null>(null)
  const [tab, setTab] = useState<'checklist' | 'timeline' | 'emergency'>('checklist')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setChecked(new Set(JSON.parse(saved)))
    } catch {}

    async function fetchStage() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('arrival_stage').eq('id', user.id).single()
      if (data) setStage(data.arrival_stage)
    }
    fetchStage()
  }, [])

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])) } catch {}
      return next
    })
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
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-3">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {([
            { id: 'checklist', label: '✅ Checklist' },
            { id: 'timeline',  label: '📅 Timeline' },
            { id: 'emergency', label: '🚨 Emergency' },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                tab === t.id
                  ? 'bg-white text-brand-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
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
            <div
              key={item.id}
              className={`bg-white rounded-2xl border p-4 flex gap-3 items-start transition-all ${
                checked.has(item.id) ? 'border-brand-100 opacity-60' : 'border-gray-100 shadow-sm'
              }`}
            >
              <button
                onClick={() => toggle(item.id)}
                className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5 transition-all ${
                  checked.has(item.id) ? 'bg-brand-500 border-brand-500' : 'border-gray-300 hover:border-brand-400'
                }`}
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
                {!checked.has(item.id) && (
                  <p className="text-xs text-gray-400 mt-0.5 leading-snug">{item.desc}</p>
                )}
              </div>
              {!checked.has(item.id) && (
                <Link href="/home" className="text-xs text-brand-500 font-semibold whitespace-nowrap hover:text-brand-600">
                  Find help →
                </Link>
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
                    <Link href="/home" className="ml-auto text-xs text-brand-500 font-semibold whitespace-nowrap">
                      Ask →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <p className="text-xs text-center text-gray-400 pt-1">Based on your Arrival Stage · <Link href="/settings" className="text-brand-400">Change stage</Link></p>
        </div>
      )}

      {/* Emergency Tab */}
      {tab === 'emergency' && (
        <div className="px-4 space-y-3 pb-6">
          <p className="text-xs text-gray-400 text-center pb-1">Tap a number to call</p>
          {EMERGENCY.map(e => (
            <a
              key={e.number}
              href={`tel:${e.number}`}
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
              <span className="font-bold">Tip:</span> Save these numbers in your phone before you need them. The Foreign Resident line has support in English, Chinese, Spanish, Portuguese, and more.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
