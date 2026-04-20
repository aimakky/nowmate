'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const ITEMS = [
  { id: 'juminhyo',   emoji: '🏛️', title: 'Register 住民票',        desc: 'At your local city hall within 14 days of arrival', search: 'local+help' },
  { id: 'bank',       emoji: '🏦', title: 'Open a bank account',     desc: 'Japan Post Bank (ゆうちょ) is easiest for newcomers', search: 'local+help' },
  { id: 'insurance',  emoji: '🏥', title: 'Join 国民健康保険',        desc: 'National health insurance — required by law', search: 'local+help' },
  { id: 'sim',        emoji: '📱', title: 'Get a SIM card',          desc: 'IIJmio, Rakuten Mobile, or Mineo work without a bank card', search: 'local+help' },
  { id: 'mynumber',   emoji: '🪪', title: 'Apply for マイナンバーカード', desc: 'Takes ~4 weeks — apply early', search: 'local+help' },
]

const STORAGE_KEY = 'nm_survival_checklist'

export default function SurvivalChecklist() {
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setChecked(new Set(JSON.parse(saved)))
    } catch {}
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
  const total = ITEMS.length
  const allDone = done === total

  if (allDone) return null

  return (
    <div className="mx-4 mb-3 bg-white border border-brand-100 rounded-2xl overflow-hidden shadow-sm">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg">🗺️</span>
          <div className="text-left">
            <div className="font-bold text-gray-800 text-sm">Japan Survival Checklist</div>
            <div className="text-xs text-gray-400">{done}/{total} done</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {ITEMS.map(item => (
              <div
                key={item.id}
                className={`w-2 h-2 rounded-full ${checked.has(item.id) ? 'bg-brand-500' : 'bg-gray-200'}`}
              />
            ))}
          </div>
          <span className="text-gray-400 text-xs">{collapsed ? '▼' : '▲'}</span>
        </div>
      </button>

      {!collapsed && (
        <div className="border-t border-gray-50 divide-y divide-gray-50">
          {ITEMS.map(item => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3">
              <button
                onClick={() => toggle(item.id)}
                className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                  checked.has(item.id)
                    ? 'bg-brand-500 border-brand-500'
                    : 'border-gray-300 hover:border-brand-400'
                }`}
              >
                {checked.has(item.id) && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold flex items-center gap-1.5 ${checked.has(item.id) ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                  <span>{item.emoji}</span> {item.title}
                </div>
                {!checked.has(item.id) && (
                  <div className="text-xs text-gray-400 mt-0.5 leading-snug">{item.desc}</div>
                )}
              </div>
              {!checked.has(item.id) && (
                <Link
                  href="/search"
                  className="text-xs text-brand-500 font-semibold hover:text-brand-600 whitespace-nowrap"
                >
                  Ask →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
