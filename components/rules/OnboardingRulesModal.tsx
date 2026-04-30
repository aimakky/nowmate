'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, Loader2 } from 'lucide-react'
import RuleCard from './RuleCard'
import {
  fetchRulesBundle,
  filterByLocation,
  recordAgreement,
  type Rule,
} from '@/lib/rules'

interface Props {
  userId: string
  /** 同意完了後に呼ばれる */
  onAgreed: () => void
}

export default function OnboardingRulesModal({ userId, onAgreed }: Props) {
  const [rules, setRules]     = useState<Rule[] | null>(null)
  const [version, setVersion] = useState<number>(1)
  const [scrolledEnd, setEnd] = useState(false)
  const [submitting, setSub]  = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    fetchRulesBundle().then(b => {
      if (!alive) return
      setRules(filterByLocation(b.rules, 'onboarding'))
      setVersion(b.bundleVersion)
    })
    return () => { alive = false }
  }, [])

  const sorted = useMemo(() => {
    if (!rules) return []
    // critical を最上部固定（既に importance 順だが念のため）
    const crit = rules.filter(r => r.category === 'critical')
    const rest = rules.filter(r => r.category !== 'critical')
    return [...crit, ...rest]
  }, [rules])

  function onScroll() {
    const el = scrollRef.current
    if (!el) return
    const reached = el.scrollTop + el.clientHeight >= el.scrollHeight - 24
    if (reached && !scrolledEnd) setEnd(true)
  }

  async function agree() {
    if (!scrolledEnd || submitting) return
    setSub(true)
    try {
      await recordAgreement(userId, version)
      onAgreed()
    } finally {
      setSub(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ background: 'rgba(8,8,18,0.96)', backdropFilter: 'blur(8px)' }}
    >
      {/* ヘッダー */}
      <div className="px-5 pt-6 pb-3 flex-shrink-0">
        <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: '#c4b5fd' }}>SAFETY GUIDE</p>
        <h2 className="font-extrabold text-2xl leading-tight" style={{ color: '#F0EEFF' }}>安心ガイド</h2>
        <p className="text-xs mt-1" style={{ color: 'rgba(240,238,255,0.45)' }}>
          sameeを安心して使うための約束です。最後まで読んでから始めましょう。
        </p>
      </div>

      {/* スクロール領域 */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto px-5 pb-4 space-y-3"
      >
        {!rules && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={28} className="animate-spin" style={{ color: '#8B5CF6' }} />
          </div>
        )}
        {sorted.map(r => <RuleCard key={r.id} rule={r} />)}
        {sorted.length > 0 && (
          <div className="text-center py-4 text-xs" style={{ color: 'rgba(240,238,255,0.35)' }}>
            これでルールはすべてです。
          </div>
        )}
      </div>

      {/* フッター */}
      <div
        className="px-5 pt-3 pb-6 flex-shrink-0"
        style={{
          background: 'linear-gradient(to top, rgba(8,8,18,1) 60%, rgba(8,8,18,0))',
          borderTop: '1px solid rgba(139,92,246,0.18)',
        }}
      >
        {!scrolledEnd && rules && (
          <div className="text-center mb-3 flex items-center justify-center gap-1.5 text-xs" style={{ color: 'rgba(240,238,255,0.55)' }}>
            <ArrowDown size={12} /> 最後までスクロールしてください
          </div>
        )}
        <button
          onClick={agree}
          disabled={!scrolledEnd || submitting}
          className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.98]"
          style={{
            background: scrolledEnd
              ? 'linear-gradient(135deg,#8B5CF6 0%,#7B3FE4 100%)'
              : 'rgba(139,92,246,0.25)',
            color: '#fff',
            boxShadow: scrolledEnd ? '0 8px 24px rgba(139,92,246,0.35)' : 'none',
            opacity: scrolledEnd ? 1 : 0.6,
            cursor: scrolledEnd ? 'pointer' : 'not-allowed',
          }}
        >
          {submitting ? '保存中…' : '同意して開始'}
        </button>
      </div>
    </div>
  )
}
