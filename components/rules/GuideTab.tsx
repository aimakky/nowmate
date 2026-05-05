'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, ShieldCheck, BadgeCheck, Flag, MicOff } from 'lucide-react'
import RuleCard from './RuleCard'
import {
  fetchRulesBundle,
  filterByLocation,
  type Rule,
  type RuleCategory,
} from '@/lib/rules'

// 旧パレットは critical=オレンジ + safety=赤 で警告色が連続していた。
// 重要警告は critical のみ赤系に集約し、それ以外は青/緑/紫/グレーへ分散。
const CATS: { id: RuleCategory | 'all'; label: string; color: string }[] = [
  { id: 'all',       label: 'すべて',  color: '#c4b5fd' },
  { id: 'critical',  label: '最重要',   color: '#EF4444' },
  { id: 'voice',     label: '通話',     color: '#3B82F6' },
  { id: 'community', label: 'コミュニティ', color: '#10B981' },
  { id: 'safety',    label: '安全',     color: '#8B5CF6' },
  { id: 'system',    label: 'その他',   color: '#94A3B8' },
]

// rule.color は DB に保存されているがカテゴリと不整合な場合がある（多くが赤系）。
// レンダリング側で category ベースに上書きして全体の色トーンを揃える。
const CAT_ACCENT: Record<string, string> = {
  critical:  '#EF4444',
  voice:     '#3B82F6',
  community: '#10B981',
  safety:    '#8B5CF6',
  system:    '#94A3B8',
}

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

      {/* sameeの安心ポイント — 上部の集約カード */}
      <div
        className="rounded-2xl p-4 space-y-2"
        style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.10) 0%, rgba(59,130,246,0.08) 100%)',
          border: '1px solid rgba(139,92,246,0.28)',
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={14} style={{ color: '#c4b5fd' }} />
          <p className="text-[11px] font-extrabold tracking-wider" style={{ color: '#c4b5fd' }}>sameeの安心ポイント</p>
        </div>
        {[
          { Icon: BadgeCheck, color: '#10B981', text: '20歳以上限定の大人コミュニティ' },
          { Icon: ShieldCheck, color: '#3B82F6', text: '本人確認で通話・DMをより安全に' },
          { Icon: Flag,        color: '#F59E0B', text: '通報・ブロックで荒らしに対応' },
          { Icon: MicOff,      color: '#EF4444', text: '録音・録画は禁止（規約違反）' },
        ].map(({ Icon, color, text }) => (
          <div key={text} className="flex items-center gap-2.5">
            <Icon size={13} style={{ color, flexShrink: 0 }} strokeWidth={2.4} />
            <span className="text-xs leading-relaxed" style={{ color: 'rgba(240,238,255,0.78)' }}>{text}</span>
          </div>
        ))}
      </div>

      {/* カテゴリタブ — 末尾に右余白を入れてスクロール末尾の見切れを防ぐ */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 pl-4 pr-6 pb-1">
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
        {visible.map(r => {
          // DB の rule.color は赤系に偏っているため、category ベースの色で上書き
          const accent = CAT_ACCENT[r.category as string] ?? r.color
          return <RuleCard key={r.id} rule={{ ...r, color: accent }} />
        })}
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
