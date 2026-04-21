'use client'

import Link from 'next/link'

interface PremiumModalProps {
  onClose: () => void
  reason?: 'join_limit' | 'post_limit'
}

export default function PremiumModal({ onClose, reason = 'join_limit' }: PremiumModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 text-xl font-bold">×</button>

        {/* Icon */}
        <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-200">
          <span className="text-2xl">⚡</span>
        </div>

        <h2 className="text-xl font-extrabold text-stone-900 text-center mb-1">
          {reason === 'join_limit' ? 'Group limit reached' : 'Post limit reached'}
        </h2>
        <p className="text-sm text-stone-500 text-center mb-5 leading-relaxed">
          {reason === 'join_limit'
            ? 'Free accounts can join up to 3 groups. Upgrade to join unlimited groups and never miss out.'
            : 'Free accounts can post 3 times per day. Upgrade for unlimited posts.'}
        </p>

        {/* What you get */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-5 space-y-2">
          {[
            'Unlimited group joins',
            'Unlimited daily posts',
            'See who viewed your post',
            'Priority in the feed',
            'Premium badge on profile',
          ].map(f => (
            <div key={f} className="flex items-center gap-2.5">
              <span className="text-amber-500 font-bold text-sm">✓</span>
              <span className="text-sm text-stone-700 font-medium">{f}</span>
            </div>
          ))}
        </div>

        {/* Price */}
        <div className="text-center mb-4">
          <span className="text-3xl font-black text-stone-900">¥980</span>
          <span className="text-stone-400 text-sm"> / month</span>
          <p className="text-xs text-stone-400 mt-0.5">Cancel anytime</p>
        </div>

        <Link href="/upgrade"
          className="w-full py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-2xl font-extrabold text-base text-center shadow-lg shadow-amber-200 hover:opacity-90 active:scale-[0.98] transition-all block">
          Upgrade to Premium →
        </Link>
        <button onClick={onClose}
          className="w-full py-3 mt-2 text-stone-400 text-sm font-semibold hover:text-stone-600 transition">
          Maybe later
        </button>
      </div>
    </div>
  )
}
