'use client'

type Props = {
  postCount:      number  // 村への投稿 → 視点
  tweetCount:     number  // タイムライン投稿 → 自己理解
  followingCount: number  // フォロー中 → つながり
  villageCount:   number  // 参加村数 → つながり補助
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
    sub:   '今日の気づきを書いた数',
    color: '#7c3aed',
    bg:    '#f5f3ff',
    border:'#ddd6fe',
    max:   20,
    getValue: (p: Props) => Math.min(p.tweetCount, 20),
    tip:   '自分の考えを言語化するたびに深まる',
  },
]

export default function GrowthPortfolio(props: Props) {
  const total = GROWTH_TYPES.reduce((acc, g) => acc + Math.min(g.getValue(props), g.max), 0)
  const maxTotal = GROWTH_TYPES.reduce((acc, g) => acc + g.max, 0)
  const overallPct = Math.round((total / maxTotal) * 100)

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
          const raw = g.getValue(props)
          const clamped = Math.min(raw, g.max)
          const pct = Math.round((clamped / g.max) * 100)
          return (
            <div key={g.key}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{g.icon}</span>
                  <span className="text-xs font-bold text-stone-700">{g.label}</span>
                  <span className="text-[10px] text-stone-400">{g.sub}</span>
                </div>
                <span className="text-xs font-bold" style={{ color: g.color }}>
                  {raw}
                </span>
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

      {/* Footer hint */}
      <div className="px-4 pb-3.5">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: '#f5f3ff', border: '1px solid #ddd6fe' }}
        >
          <span className="text-xs">✨</span>
          <p className="text-[10px] text-violet-600 font-medium leading-relaxed">
            活動するたびにポートフォリオが育ちます。プレミアムで詳細な成長履歴を確認できます。
          </p>
        </div>
      </div>
    </div>
  )
}
