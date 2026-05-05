import Link from 'next/link'
import type { Metadata } from 'next'

// 旧 nowmate (海外移住者向け B2B ピッチ) の遺産ページ。現在の YVOICE
// サービスとは無関係なため Google には index させない。
export const metadata: Metadata = {
  title: 'YVOICE — Legacy Page',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
}

const PAIN_POINTS = [
  { stat: '67%', desc: 'of expat assignments fail due to social isolation, not work performance' },
  { stat: '2.3×', desc: 'higher turnover rate for foreign employees in their first year in Japan' },
  { stat: '¥3.2M', desc: 'average cost to replace one international employee in Japan' },
]

const SOLUTIONS = [
  { emoji: '👥', title: 'Instant Community', desc: 'Employees connect with other expats and locals from day one — before they even arrive.' },
  { emoji: '🗣️', title: 'Language Support', desc: 'Language exchange partners help employees navigate daily life and improve Japanese faster.' },
  { emoji: '🗺️', title: 'Local Life Navigation', desc: 'Real advice on banking, housing, healthcare, and daily life from people who\'ve done it.' },
  { emoji: '📊', title: 'Measurable Wellbeing', desc: 'Track social integration as a retention KPI. Data available for HR reporting.' },
]

const USE_CASES = [
  { icon: '🏢', title: 'Global Companies', desc: 'Onboard foreign hires before their first day. Reduce the "culture shock cliff" that drives early resignations.' },
  { icon: '🎓', title: 'Language Schools', desc: 'Give students a social platform to practice and make friends. Increase completion rates and referrals.' },
  { icon: '🌐', title: 'International Organizations', desc: 'Connect your global community members with local support networks in Japan.' },
  { icon: '🏫', title: 'Universities', desc: 'Support international students beyond campus. Reduce homesickness-driven dropout.' },
]

const PLANS = [
  {
    name: 'Starter',
    price: '¥50,000',
    period: '/month',
    desc: 'For small teams',
    features: ['Up to 20 employee accounts', 'Priority onboarding support', 'Monthly usage report', 'Email support'],
    cta: 'Start Free Trial',
    highlight: false,
  },
  {
    name: 'Business',
    price: '¥150,000',
    period: '/month',
    desc: 'Most popular',
    features: ['Up to 100 employee accounts', 'Dedicated onboarding manager', 'Weekly wellbeing reports', 'Custom welcome message', 'Slack/HR system integration', 'Priority support'],
    cta: 'Contact Sales',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For large organizations',
    features: ['Unlimited accounts', 'White-label option', 'API access', 'Custom analytics dashboard', 'Dedicated CSM', 'SLA guarantee'],
    cta: 'Contact Sales',
    highlight: false,
  },
]

export default function ForBusinessPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col max-w-[430px] mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-black text-sm">N</span>
          </div>
          <span className="font-extrabold text-gray-900 text-lg tracking-tight">自由村</span>
        </Link>
        <Link href="/login" className="text-sm font-semibold text-brand-500 px-3 py-1.5 rounded-xl hover:bg-brand-50 transition">
          Sign in
        </Link>
      </header>

      {/* Hero */}
      <section className="px-5 pt-8 pb-10 text-center">
        <div className="inline-flex items-center gap-1.5 bg-brand-50 border border-brand-100 text-brand-600 text-xs font-semibold px-3 py-1 rounded-full mb-5">
          🏢 自由村 for Business
        </div>
        <h1 className="text-[1.9rem] font-black text-gray-900 leading-[1.15] mb-3">
          Your international staff<br />
          <span className="text-brand-500">deserve to belong.</span>
        </h1>
        <p className="text-gray-500 text-base leading-relaxed mb-8 max-w-[300px] mx-auto">
          Foreign employees who build real connections in Japan stay longer, perform better, and become your best brand ambassadors.
        </p>
        <a href="mailto:business@自由村japan.com"
          className="inline-block w-full py-4 bg-brand-500 text-white rounded-2xl font-bold text-base text-center shadow-md shadow-brand-200 hover:bg-brand-600 active:scale-[0.98] transition-all">
          Book a Free Demo
        </a>
        <p className="text-xs text-gray-400 mt-3">No commitment · Response within 24h · Japanese & English</p>
      </section>

      {/* Pain Points */}
      <section className="bg-gray-900 px-5 py-10">
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest text-center mb-6">The cost of expat isolation</p>
        <div className="space-y-4">
          {PAIN_POINTS.map((p, i) => (
            <div key={i} className="flex items-start gap-4 bg-gray-800 rounded-2xl px-4 py-4">
              <div className="text-brand-400 font-black text-2xl flex-shrink-0 min-w-[64px] text-center">{p.stat}</div>
              <p className="text-gray-300 text-sm leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Solutions */}
      <section className="px-5 py-10">
        <h2 className="text-xl font-extrabold text-center text-gray-800 mb-2">How 自由村 helps</h2>
        <p className="text-sm text-center text-gray-400 mb-6">A social layer that works from day one</p>
        <div className="grid grid-cols-2 gap-3">
          {SOLUTIONS.map(s => (
            <div key={s.title} className="bg-brand-50 rounded-2xl p-4 border border-brand-100">
              <div className="text-3xl mb-2">{s.emoji}</div>
              <div className="font-bold text-gray-800 text-sm mb-1">{s.title}</div>
              <div className="text-xs text-gray-500 leading-relaxed">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Use Cases */}
      <section className="bg-gray-50 px-5 py-10">
        <h2 className="text-xl font-extrabold text-center text-gray-800 mb-6">Who we work with</h2>
        <div className="space-y-3">
          {USE_CASES.map(u => (
            <div key={u.title} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-start gap-4">
              <span className="text-3xl flex-shrink-0">{u.icon}</span>
              <div>
                <div className="font-bold text-gray-800 text-sm">{u.title}</div>
                <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{u.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="px-5 py-10">
        <h2 className="text-xl font-extrabold text-center text-gray-800 mb-2">Simple pricing</h2>
        <p className="text-sm text-center text-gray-400 mb-6">First 30 days free, no credit card required</p>
        <div className="space-y-4">
          {PLANS.map(p => (
            <div key={p.name} className={`rounded-2xl border-2 p-5 ${p.highlight ? 'border-brand-400 bg-brand-50' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className={`font-black text-lg ${p.highlight ? 'text-brand-700' : 'text-gray-900'}`}>{p.name}</div>
                  <div className="text-xs text-gray-400">{p.desc}</div>
                </div>
                <div className="text-right">
                  <span className="font-black text-xl text-gray-900">{p.price}</span>
                  <span className="text-xs text-gray-400">{p.period}</span>
                </div>
              </div>
              <ul className="space-y-1.5 mb-4">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="text-brand-500 font-bold">✓</span> {f}
                  </li>
                ))}
              </ul>
              <a href="mailto:business@自由村japan.com"
                className={`block w-full py-3 rounded-2xl text-sm font-bold text-center transition active:scale-95 ${
                  p.highlight
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-200 hover:bg-brand-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
                {p.cta}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-500 px-5 py-10 text-center">
        <div className="text-4xl mb-3">🤝</div>
        <h2 className="text-2xl font-extrabold text-white mb-2">Let's talk</h2>
        <p className="text-brand-100 text-sm mb-6 leading-relaxed">
          We'll show you how 自由村 works and build a custom plan for your organization.
        </p>
        <a href="mailto:business@自由村japan.com"
          className="inline-block px-8 py-3.5 bg-white text-brand-600 rounded-2xl font-bold text-sm shadow-md active:scale-95 transition-all">
          business@自由村japan.com
        </a>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-5 py-6 text-center bg-white">
        <Link href="/" className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 h-6 bg-brand-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-xs">N</span>
          </div>
          <span className="font-bold text-gray-700">自由村</span>
        </Link>
        <p className="text-xs text-gray-400 mb-3">自由村 Japan · business@自由村japan.com</p>
        <div className="flex justify-center gap-5 text-xs text-gray-400">
          <Link href="/" className="hover:text-gray-600">For Users</Link>
          <Link href="/terms" className="hover:text-gray-600">Terms</Link>
          <Link href="/privacy" className="hover:text-gray-600">Privacy</Link>
          <Link href="/contact" className="hover:text-gray-600">Contact</Link>
        </div>
      </footer>
    </div>
  )
}
