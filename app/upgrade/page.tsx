'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Crown, Zap } from 'lucide-react'

const FEATURES_FREE = [
  'Search & browse profiles',
  'Send 10 Likes per day',
  'Chat with matches',
  'Japan Life Tips',
]

const FEATURES_PREMIUM = [
  'Unlimited Likes',
  'See who liked you',
  'Profile boost — appear higher in search',
  'Read receipts in chat',
  'Premium badge on your profile',
]

export default function UpgradePage() {
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleUpgrade() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else if (data.error === 'Stripe not configured') {
        alert('Payment coming soon. Contact us: business@sameejapan.com')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-[430px] mx-auto">
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <Link href="/mypage" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-black text-sm">N</span>
          </div>
          <span className="font-extrabold text-gray-900 text-lg tracking-tight">Samee</span>
        </Link>
      </header>

      {/* Hero */}
      <section className="px-5 pt-4 pb-6 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
          <Crown size={32} className="text-amber-500" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">Go Premium</h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          Find your people faster. See who already likes you.
        </p>
      </section>

      {/* Plan toggle */}
      <div className="mx-5 mb-6">
        <div className="flex bg-gray-100 rounded-2xl p-1">
          <button
            onClick={() => setPlan('monthly')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
              plan === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setPlan('yearly')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition relative ${
              plan === 'yearly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            Yearly
            <span className="absolute -top-2 -right-1 bg-green-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
              -33%
            </span>
          </button>
        </div>
      </div>

      {/* Price */}
      <div className="mx-5 mb-6 bg-amber-50 border border-amber-100 rounded-3xl p-5 text-center">
        <div className="flex items-end justify-center gap-1 mb-1">
          <span className="text-4xl font-black text-gray-900">
            ¥{plan === 'monthly' ? '980' : '650'}
          </span>
          <span className="text-gray-500 text-sm mb-1.5">/month</span>
        </div>
        {plan === 'yearly' && (
          <p className="text-green-600 text-xs font-semibold">¥7,800/year — save ¥3,960</p>
        )}
        {plan === 'monthly' && (
          <p className="text-gray-400 text-xs">Cancel anytime</p>
        )}
      </div>

      {/* Feature comparison */}
      <div className="px-5 mb-6 space-y-4">
        <div className="border border-gray-100 rounded-2xl p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Free</p>
          <ul className="space-y-2">
            {FEATURES_FREE.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                <Check size={14} className="text-gray-400 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-2 border-amber-400 rounded-2xl p-4 bg-amber-50/50">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-3 flex items-center gap-1">
            <Crown size={12} /> Premium
          </p>
          <ul className="space-y-2">
            {[...FEATURES_FREE, ...FEATURES_PREMIUM].map(f => (
              <li key={f} className={`flex items-center gap-2 text-sm ${FEATURES_PREMIUM.includes(f) ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                <Check size={14} className={FEATURES_PREMIUM.includes(f) ? 'text-amber-500 shrink-0' : 'text-gray-300 shrink-0'} />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pb-10">
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black text-base shadow-lg shadow-amber-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading
            ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <><Zap size={18} />Upgrade to Premium</>
          }
        </button>
        <p className="text-center text-xs text-gray-400 mt-3">
          Secure payment via Stripe. Cancel anytime.
        </p>
      </div>
    </div>
  )
}
