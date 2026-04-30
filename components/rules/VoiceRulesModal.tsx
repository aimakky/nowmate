'use client'

import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import RuleCard from './RuleCard'
import {
  fetchRulesBundle,
  pickVoiceModalRules,
  setVoiceRulesAck,
  type Rule,
} from '@/lib/rules'

interface Props {
  /** 「理解して通話開始」を押したら呼ばれる */
  onAcknowledged: () => void
  onClose: () => void
}

export default function VoiceRulesModal({ onAcknowledged, onClose }: Props) {
  const [rules, setRules]     = useState<Rule[] | null>(null)
  const [version, setVersion] = useState<number>(1)

  useEffect(() => {
    let alive = true
    fetchRulesBundle().then(b => {
      if (!alive) return
      setRules(pickVoiceModalRules(b.rules, 5))
      setVersion(b.bundleVersion)
    })
    return () => { alive = false }
  }, [])

  function ack() {
    setVoiceRulesAck(version)
    onAcknowledged()
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[88vh]"
        style={{
          background: 'rgba(20,18,40,0.98)',
          border: '1px solid rgba(139,92,246,0.28)',
          boxShadow: '0 -8px 40px rgba(139,92,246,0.25)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="px-5 pt-5 pb-3 flex-shrink-0 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: '#7DD3FC' }}>VOICE GUIDE</p>
            <h2 className="font-extrabold text-lg leading-tight" style={{ color: '#F0EEFF' }}>
              通話を始める前に
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(240,238,255,0.6)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* カード群 */}
        <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-2.5">
          {!rules && (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={24} className="animate-spin" style={{ color: '#3B82F6' }} />
            </div>
          )}
          {rules?.map(r => <RuleCard key={r.id} rule={r} compact />)}
        </div>

        {/* フッター */}
        <div className="px-5 pt-3 pb-5 flex-shrink-0" style={{ borderTop: '1px solid rgba(139,92,246,0.15)' }}>
          <button
            onClick={ack}
            disabled={!rules}
            className="w-full py-3 rounded-2xl font-bold text-sm transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg,#3B82F6 0%,#1E40AF 100%)',
              color: '#fff',
              boxShadow: '0 6px 20px rgba(59,130,246,0.35)',
              opacity: rules ? 1 : 0.5,
            }}
          >
            理解して通話開始
          </button>
        </div>
      </div>
    </div>
  )
}
