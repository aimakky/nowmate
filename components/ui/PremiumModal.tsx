'use client'

import Link from 'next/link'

interface PremiumModalProps {
  onClose: () => void
  reason?: 'join_limit' | 'post_limit'
}

const REASON_CONFIG = {
  join_limit: {
    title: '村への参加上限に達しました',
    desc:  '無料プランでは3つの村まで参加できます。プレミアムにアップグレードすると無制限で参加できます。',
  },
  post_limit: {
    title: '本日の投稿上限に達しました',
    desc:  '無料プランでは1日3回まで投稿できます。プレミアムにアップグレードすると無制限で投稿できます。',
  },
}

const BENEFITS = [
  { icon: '🏘️', label: '村への参加が無制限になる' },
  { icon: '📝', label: '1日の投稿数が無制限になる' },
  { icon: '👀', label: '自分の投稿を見た人がわかる' },
  { icon: '🔝', label: 'フィードで優先表示される' },
  { icon: '⚡', label: 'プロフィールにプレミアムバッジ' },
  { icon: '✨', label: '村の柱になると輝くバッジエフェクト' },
]

export default function PremiumModal({ onClose, reason = 'join_limit' }: PremiumModalProps) {
  const cfg = REASON_CONFIG[reason]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 text-xl font-bold"
        >
          ×
        </button>

        {/* Icon */}
        <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-200">
          <span className="text-2xl">⚡</span>
        </div>

        <h2 className="text-xl font-extrabold text-stone-900 text-center mb-1">
          {cfg.title}
        </h2>
        <p className="text-sm text-stone-500 text-center mb-5 leading-relaxed">
          {cfg.desc}
        </p>

        {/* Benefits */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-5 space-y-2.5">
          {BENEFITS.map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-2.5">
              <span className="text-base w-6 text-center flex-shrink-0">{icon}</span>
              <span className="text-sm text-stone-700 font-medium">{label}</span>
            </div>
          ))}
        </div>

        {/* Price */}
        <div className="text-center mb-4">
          <span className="text-3xl font-black text-stone-900">¥980</span>
          <span className="text-stone-400 text-sm"> / 月</span>
          <p className="text-xs text-stone-400 mt-0.5">いつでもキャンセルできます</p>
        </div>

        <Link
          href="/upgrade"
          className="w-full py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-2xl font-extrabold text-base text-center shadow-lg shadow-amber-200 hover:opacity-90 active:scale-[0.98] transition-all block"
        >
          プレミアムにアップグレード →
        </Link>
        <button
          onClick={onClose}
          className="w-full py-3 mt-2 text-stone-400 text-sm font-semibold hover:text-stone-600 transition"
        >
          あとで
        </button>
      </div>
    </div>
  )
}
