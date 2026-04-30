'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import RuleCard from './RuleCard'
import {
  fetchRulesBundle,
  filterByLocation,
  type Rule,
  type RuleCategory,
} from '@/lib/rules'

const CATS: { id: RuleCategory | 'all'; label: string; color: string }[] = [
  { id: 'all',       label: 'すべて',  color: '#c4b5fd' },
  { id: 'critical',  label: '最重要',   color: '#F97316' },
  { id: 'voice',     label: '通話',     color: '#3B82F6' },
  { id: 'community', label: 'コミュニティ', color: '#10B981' },
  { id: 'safety',    label: '安全',     color: '#EF4444' },
  { id: 'system',    label: 'その他',   color: '#94A3B8' },
]

export default function GuideTab() {
  const [rules, setRules] = useState<Rule[] | null>(null)
  const [active, setActive] = useState<RuleCategory | 'all'>('all')
  const [loadErr, setLoadErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetchRulesBundle()
      .then(b => {
        if (!alive) return
        setRules(filterByLocation(b.rules, 'mypage'))
      })
      .catch((e: unknown) => {
        if (!alive) return
        setLoadErr(e instanceof Error ? e.message : 'ルールの取得に失敗しました')
        setRules([])
      })
    return () => { alive = false }
  }, [])

  const visible = useMemo(() => {
    if (!rules) return []
    return active === 'all' ? rules : rules.filter(r => r.category === active)
  }, [rules, active])

  return (
    <div className="px-4 py-4 space-y-4">
      {/* ヘッダー */}
      <div>
        <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: '#c4b5fd' }}>SAFETY GUIDE</p>
        <h2 className="font-extrabold text-xl leading-tight" style={{ color: '#F0EEFF' }}>安心ガイド</h2>
        <p className="text-xs mt-1" style={{ color: 'rgba(240,238,255,0.4)' }}>
          sameeを安心して使うためのルール一覧です。
        </p>
      </div>

      {/* カテゴリタブ */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1">
        {CATS.map(c => {
          const on = active === c.id
          return (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95"
              style={on
                ? { background: hexA(c.color, 0.22), color: c.color, border: `1px solid ${hexA(c.color, 0.45)}` }
                : { background: 'rgba(255,255,255,0.06)', color: 'rgba(240,238,255,0.45)', border: '1px solid rgba(255,255,255,0.08)' }
              }
            >
              {c.label}
            </button>
          )
        })}
      </div>

      {/* リスト */}
      {!rules && !loadErr && (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={24} className="animate-spin" style={{ color: '#8B5CF6' }} />
        </div>
      )}
      {loadErr && (
        <div className="rounded-2xl p-3 text-xs"
          style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', color: '#fecaca' }}>
          {loadErr}
        </div>
      )}
      <div className="space-y-2.5">
        {visible.map(r => <RuleCard key={r.id} rule={r} />)}
        {rules && visible.length === 0 && (
          <p className="text-center py-8 text-xs" style={{ color: 'rgba(240,238,255,0.35)' }}>
            このカテゴリのルールはありません。
          </p>
        )}
      </div>
    </div>
  )
}

function hexA(hex: string, a: number): string {
  const m = hex.replace('#', '').match(/^([0-9a-fA-F]{6})$/)
  if (!m) return `rgba(139,92,246,${a})`
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}
