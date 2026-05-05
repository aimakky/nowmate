'use client'

import { useState } from 'react'

type Props = {
  postCount:      number
  tweetCount:     number
  followingCount: number
  villageCount:   number
  displayName?:   string
}

const GROWTH_TYPES = [
  {
    key:   'perspective',
    icon:  '🔭',
    label: '視点',
    sub:   '出した考えの数',
    color: '#6366f1',
    bg:    '#eef2ff',
    border:'#c7d2fe',
    max:   50,
    getValue: (p: Props) => p.postCount,
    tip:   '村で考えを出すたびに増える',
  },
  {
    key:   'wisdom',
    icon:  '💡',
    label: '知恵',
    sub:   '気づきを書いた数',
    color: '#d97706',
    bg:    '#fffbeb',
    border:'#fde68a',
    max:   30,
    getValue: (p: Props) => p.tweetCount,
    tip:   'タイムラインに投稿するたびに増える',
  },
  {
    key:   'connection',
    icon:  '🌐',
    label: 'つながり',
    sub:   '学んでいる人 + 参加村',
    color: '#0891b2',
    bg:    '#ecfeff',
    border:'#a5f3fc',
    max:   20,
    getValue: (p: Props) => p.followingCount + p.villageCount,
    tip:   '村に参加・人をフォローするたびに増える',
  },
  {
    key:   'self',
    icon:  '🪞',
    label: '自己理解',
    sub:   '気づきを言語化した数',
    color: '#7c3aed',
    bg:    '#f5f3ff',
    border:'#ddd6fe',
    max:   20,
    getValue: (p: Props) => Math.min(p.tweetCount, 20),
    tip:   '自分の考えを言語化するたびに深まる',
  },
]

export default function GrowthPortfolio(props: Props) {
  const [copied, setCopied] = useState(false)
  const [showCard, setShowCard] = useState(false)

  const total      = GROWTH_TYPES.reduce((acc, g) => acc + Math.min(g.getValue(props), g.max), 0)
  const maxTotal   = GROWTH_TYPES.reduce((acc, g) => acc + g.max, 0)
  const overallPct = Math.round((total / maxTotal) * 100)

  // シェアテキスト生成
  function buildShareText() {
    const lines = GROWTH_TYPES.map(g => `${g.icon} ${g.label} +${g.getValue(props)}`)
    return [
      `YVOICE で積み上げた成長レポート 📊`,
      lines.join('  '),
      `総合成長度 ${overallPct}%`,
      `「使うたびに、何かが増える」`,
      `#YVOICE #ワイボ nowmatejapan.com`,
    ].join('\n')
  }

  async function handleShare() {
    const text = buildShareText()
    if (navigator.share) {
      await navigator.share({ text })
    } else {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  function openXShare() {
    const text = buildShareText()
    const url  = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  return (
    <div className="bg-white border border-stone-100 rounded-2xl overflow-hidden shadow-sm">

      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-stone-50 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-base">📊</span>
            <p className="text-xs font-bold text-stone-700">成長ポートフォリオ</p>
          </div>
          <p className="text-[10px] text-stone-400">使うたびに、何かが増える</p>
        </div>
        <div className="text-right">
          <p className="font-extrabold text-stone-900 text-lg leading-none">{overallPct}%</p>
          <p className="text-[10px] text-stone-400">成長度</p>
        </div>
      </div>

      {/* Growth bars */}
      <div className="px-4 py-3 space-y-3">
        {GROWTH_TYPES.map(g => {
          const raw     = g.getValue(props)
          const clamped = Math.min(raw, g.max)
          const pct     = Math.round((clamped / g.max) * 100)
          return (
            <div key={g.key}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{g.icon}</span>
                  <span className="text-xs font-bold text-stone-700">{g.label}</span>
                  <span className="text-[10px] text-stone-400">{g.sub}</span>
                </div>
                <span className="text-xs font-bold" style={{ color: g.color }}>+{raw}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: g.bg, border: `1px solid ${g.border}` }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: g.color }}
                />
              </div>
              {pct === 0 && (
                <p className="text-[10px] text-stone-400 mt-0.5">{g.tip}</p>
              )}
            </div>
          )
        })}
      </div>

      {/* ── シェアカード ── */}
      {showCard && (
        <div className="mx-4 mb-3 rounded-2xl overflow-hidden border border-violet-200"
          style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #4f46e5 100%)' }}>
          {/* カード本体（スクショ用） */}
          <div className="p-4">
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-2">
              自由村 成長レポート
            </p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {GROWTH_TYPES.map(g => (
                <div key={g.key}
                  className="rounded-xl px-3 py-2"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <p className="text-white/60 text-[10px] mb-0.5">{g.icon} {g.label}</p>
                  <p className="text-white font-extrabold text-xl leading-none">+{g.getValue(props)}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/50 text-[10px]">「使うたびに、何かが増える」</p>
                <p className="text-white/30 text-[9px]">nowmatejapan.com</p>
              </div>
              <div className="text-right">
                <p className="text-white font-extrabold text-2xl leading-none">{overallPct}%</p>
                <p className="text-white/50 text-[10px]">総合成長度</p>
              </div>
            </div>
          </div>
          {/* シェアボタン群 */}
          <div className="flex gap-2 px-4 pb-4">
            <button
              onClick={openXShare}
              className="flex-1 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              𝕏 でシェア
            </button>
            <button
              onClick={handleShare}
              className="flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
              style={{ background: 'rgba(255,255,255,0.9)', color: '#4f46e5' }}
            >
              {copied ? '✓ コピー済み' : '📋 テキストコピー'}
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 pb-3.5 flex items-center gap-2">
        <div
          className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: '#f5f3ff', border: '1px solid #ddd6fe' }}
        >
          <span className="text-xs">✨</span>
          <p className="text-[10px] text-violet-600 font-medium leading-relaxed">
            活動するたびに育ちます。プレミアムで詳細履歴を確認。
          </p>
        </div>
        <button
          onClick={() => setShowCard(v => !v)}
          className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl text-[11px] font-bold transition-all active:scale-95"
          style={showCard
            ? { background: '#4f46e5', color: '#fff' }
            : { background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe' }
          }
        >
          {showCard ? '✕' : '📤 シェア'}
        </button>
      </div>
    </div>
  )
}
