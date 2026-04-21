import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Samee — 住民票. Bank account. Health insurance. We\'ve got you.',
  description: 'Every foreigner in Japan figures this out alone. Samee changes that. Step-by-step Japan survival guide + connect with expats who\'ve been there.',
  openGraph: {
    title: 'Samee — Survive Japan. Together.',
    description: 'The #1 survival kit for foreigners in Japan. Setup guides, real people, real answers.',
  },
}

const STAGES = [
  {
    emoji: '✈️',
    label: 'Just Arrived',
    desc: '0–6 months',
    tip: '"I need a friend who gets it."',
    color: 'bg-blue-50 border-blue-100',
    labelColor: 'text-blue-600',
  },
  {
    emoji: '🏠',
    label: 'Getting Settled',
    desc: '6 months – 2 years',
    tip: '"I want to grow my circle."',
    color: 'bg-green-50 border-green-100',
    labelColor: 'text-green-600',
  },
  {
    emoji: '🗾',
    label: 'Japan Local',
    desc: '2+ years',
    tip: '"I love helping newcomers."',
    color: 'bg-orange-50 border-orange-100',
    labelColor: 'text-orange-600',
  },
]

const FEATURES = [
  { icon: '🧭', title: 'Arrival Stage Matching', desc: 'Connect with foreigners at the same point in their Japan journey — or find an expat mentor who\'s been here years.' },
  { icon: '🌏', title: '30+ Nationalities',      desc: 'Meet people from Brazil, India, the US, Vietnam, and everywhere in between — all living in Japan.' },
  { icon: '🗺️', title: 'Real Japan Answers',     desc: 'A community of expats who\'ve done it all. Get honest answers from people still living it.' },
  { icon: '🔒', title: 'Foreigners Only',        desc: 'Samee is built for foreigners in Japan. Report & block. Chat only after matching. 18+ only.' },
]

const STEPS = [
  { icon: '✏️', title: 'Set Your Stage',     desc: 'Tell us how long you\'ve been in Japan. We match you with people who understand where you are.' },
  { icon: '👀', title: 'Meet Your People',   desc: 'Browse foreigners in your city — filtered by arrival stage, nationality, and what you\'re looking for.' },
  { icon: '❤️', title: 'Like & Match',       desc: 'Like someone. If they like you back — it\'s a match!' },
  { icon: '💬', title: 'Chat & Survive',     desc: 'Get tips, share experiences, make real friends. Build your life in Japan together.' },
]

const TIPS_PREVIEW = [
  { emoji: '🏦', title: 'Opening a bank account', category: 'Money' },
  { emoji: '🏥', title: 'Finding an English-speaking doctor', category: 'Health' },
  { emoji: '🚃', title: 'IC card & transit tips', category: 'Transport' },
  { emoji: '🏠', title: 'How to rent an apartment as a foreigner', category: 'Housing' },
]

const NATIONALITY_PREVIEW = ['🇧🇷','🇳🇵','🇻🇳','🇨🇳','🇵🇭','🇮🇳','🇰🇷','🇲🇲','🇺🇸','🇮🇩','🇹🇭','🇧🇩']

const PURPOSES = [
  { icon: '👫', label: 'Friends',           color: 'bg-blue-50  border-blue-100  text-blue-600' },
  { icon: '🤝', label: 'Expat Support',     color: 'bg-orange-50 border-orange-100 text-orange-600' },
  { icon: '🗣️', label: 'Language Exchange', color: 'bg-purple-50 border-purple-100 text-purple-600' },
  { icon: '💬', label: 'Chat',              color: 'bg-green-50 border-green-100 text-green-600' },
  { icon: '❤️', label: 'Dating',            color: 'bg-rose-50  border-rose-100  text-rose-600' },
]

export default async function TopPage() {
  const supabase = createClient()
  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
  const userCount = Math.max(count ?? 0, 1)

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col max-w-[430px] mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center shadow-sm shadow-brand-200">
            <span className="text-white font-black text-sm">N</span>
          </div>
          <span className="font-extrabold text-gray-900 text-lg tracking-tight">Samee</span>
        </div>
        <Link href="/login"
          className="text-sm font-semibold text-brand-500 hover:text-brand-600 px-3 py-1.5 rounded-xl hover:bg-brand-50 transition">
          Sign in
        </Link>
      </header>

      {/* Hero */}
      <section className="px-5 pt-8 pb-10 text-center flex flex-col items-center">
        <div className="flex -space-x-2 mb-5">
          {NATIONALITY_PREVIEW.slice(0, 8).map((flag, i) => (
            <div key={i}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-100 to-brand-200 border-2 border-white flex items-center justify-center text-sm shadow-sm"
              style={{ zIndex: 10 - i }}>
              {flag}
            </div>
          ))}
          <div className="w-9 h-9 rounded-full bg-brand-500 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
            +30
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-100 text-green-600 text-xs font-semibold px-3 py-1 rounded-full mb-5">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          {userCount}+ people already joined
        </div>

        <h1 className="text-[2rem] font-black text-gray-900 leading-[1.15] mb-3">
          住民票. 保険. 銀行口座.<br />
          <span className="text-brand-500">全部一人でやった？</span>
        </h1>
        <p className="text-gray-500 text-base leading-relaxed mb-5 max-w-[300px]">
          Samee walks you through every step — and connects you with people who've already done it.
        </p>

        <div className="w-full bg-brand-50 border border-brand-100 rounded-2xl px-4 py-4 mb-5 text-left space-y-2.5">
          <div className="flex items-start gap-2.5 text-sm text-gray-700">
            <span className="text-brand-500 font-bold mt-0.5">✓</span>
            <span><span className="font-semibold">Step-by-step setup guide</span> — 住民票, bank, SIM, insurance, all in one place</span>
          </div>
          <div className="flex items-start gap-2.5 text-sm text-gray-700">
            <span className="text-brand-500 font-bold mt-0.5">✓</span>
            <span><span className="font-semibold">Find foreigners who've done it</span> — connect with expats who've navigated every step</span>
          </div>
          <div className="flex items-start gap-2.5 text-sm text-gray-700">
            <span className="text-brand-500 font-bold mt-0.5">✓</span>
            <span><span className="font-semibold">🚨 SOS Help</span> — stuck at the hospital or city hall? Get help in seconds</span>
          </div>
        </div>

        {/* Testimonials */}
        <div className="w-full space-y-2 mb-6">
          {[
            { text: 'Got my bank account sorted in 3 days. The checklist is a lifesaver.', name: 'Priya', country: '🇮🇳', stage: 'Just Arrived' },
            { text: 'Found my best friend in Tokyo through this app. Worth every minute.', name: 'Carlos', country: '🇧🇷', stage: 'Getting Settled' },
            { text: 'The only Japan guide written by people who actually live here.', name: 'Tom', country: '🇬🇧', stage: 'Japan Local' },
          ].map(t => (
            <div key={t.name} className="bg-white border border-gray-100 rounded-2xl px-4 py-3 text-left shadow-sm">
              <p className="text-xs text-gray-600 leading-relaxed mb-1.5">"{t.text}"</p>
              <p className="text-[11px] text-gray-400 font-semibold">{t.country} {t.name} · {t.stage}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 w-full">
          <Link href="/signup"
            className="w-full py-4 bg-brand-500 text-white rounded-2xl font-bold text-base text-center shadow-md shadow-brand-200 hover:bg-brand-600 active:scale-[0.98] transition-all">
            Start my Japan setup — Free →
          </Link>
          <Link href="/login"
            className="w-full py-3.5 border-2 border-brand-200 text-brand-600 rounded-2xl font-semibold text-base text-center hover:bg-brand-50 active:scale-[0.98] transition-all">
            I already have an account
          </Link>
        </div>

        <p className="text-xs text-gray-400 mt-4">Free forever · No credit card · 18+ only</p>
      </section>

      {/* Arrival Stage Journey */}
      <section className="px-5 pb-10">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest text-center mb-4">Where are you in your Japan journey?</p>
        <div className="space-y-2.5">
          {STAGES.map(s => (
            <Link key={s.label} href="/signup"
              className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl border ${s.color} hover:opacity-80 active:scale-[0.98] transition-all`}>
              <span className="text-2xl">{s.emoji}</span>
              <div className="flex-1">
                <div className={`font-bold text-sm ${s.labelColor}`}>{s.label}</div>
                <div className="text-xs text-gray-500">{s.desc}</div>
              </div>
              <div className="text-xs text-gray-400 italic text-right max-w-[110px] leading-tight">{s.tip}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Purpose Pills */}
      <section className="bg-stone-50 px-5 py-8">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest text-center mb-3">What are you looking for?</p>
        <div className="flex flex-wrap justify-center gap-2">
          {PURPOSES.map(p => (
            <Link key={p.label} href="/signup"
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold border ${p.color} hover:opacity-80 active:scale-95 transition-all`}>
              <span>{p.icon}</span> {p.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Japan Life Tips Preview */}
      <section className="px-5 py-10">
        <h2 className="text-xl font-extrabold text-center text-gray-800 mb-1">🗺️ Japan Life Tips</h2>
        <p className="text-sm text-center text-gray-400 mb-5">Real advice from people living it</p>
        <div className="grid grid-cols-2 gap-2.5">
          {TIPS_PREVIEW.map(t => (
            <Link key={t.title} href="/signup"
              className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm hover:shadow-md transition-shadow active:scale-[0.98]">
              <div className="text-2xl mb-2">{t.emoji}</div>
              <div className="text-xs font-semibold text-brand-500 mb-1">{t.category}</div>
              <div className="font-bold text-gray-800 text-xs leading-snug">{t.title}</div>
            </Link>
          ))}
        </div>
        <Link href="/signup"
          className="mt-4 flex items-center justify-center gap-1 text-sm text-brand-500 font-semibold hover:text-brand-600">
          See all tips →
        </Link>
      </section>

      {/* Features */}
      <section className="bg-stone-50 px-5 py-10">
        <h2 className="text-xl font-extrabold text-center text-stone-900 mb-5">Your expat survival kit</h2>
        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-3xl mb-2.5">{f.icon}</div>
              <div className="font-bold text-gray-800 text-sm mb-1">{f.title}</div>
              <div className="text-xs text-gray-500 leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-5 py-10">
        <h2 className="text-xl font-extrabold text-center text-gray-800 mb-6">How It Works</h2>
        <div className="space-y-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-brand-500 rounded-2xl flex items-center justify-center shadow-sm shadow-brand-200">
                <span className="text-lg">{s.icon}</span>
              </div>
              <div className="pt-1">
                <div className="font-bold text-gray-800 text-sm">{i + 1}. {s.title}</div>
                <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Nationality showcase */}
      <section className="bg-brand-500 px-5 py-10 text-center">
        <p className="text-brand-100 text-sm font-semibold mb-2">People from all over the world</p>
        <h2 className="text-2xl font-extrabold text-white mb-4">30+ Nationalities in Samee</h2>
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {NATIONALITY_PREVIEW.map((flag, i) => (
            <span key={i} className="text-3xl">{flag}</span>
          ))}
          <span className="text-3xl">🌍</span>
        </div>
        <Link href="/signup"
          className="inline-block px-8 py-3.5 bg-white text-brand-600 rounded-2xl font-bold text-sm shadow-md active:scale-95 transition-all">
          Join Samee Free →
        </Link>
      </section>

      {/* Final CTA */}
      <section className="px-5 py-10 text-center">
        <div className="text-4xl mb-3">🤝</div>
        <h2 className="text-2xl font-extrabold text-gray-900 mb-2">You're not alone.</h2>
        <p className="text-gray-500 text-sm mb-6 leading-relaxed">Your people are nearby. Join now — it takes 2 minutes.</p>
        <Link href="/signup"
          className="inline-block w-full py-4 bg-brand-500 text-white rounded-2xl font-bold text-base text-center shadow-md shadow-brand-200 hover:bg-brand-600 active:scale-[0.98] transition-all">
          Get Started Free
        </Link>
      </section>

      {/* B2B Banner */}
      <section className="px-5 py-6 border-t border-gray-100">
        <Link href="/for-business"
          className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 hover:bg-gray-100 active:scale-[0.98] transition-all">
          <span className="text-2xl">🏢</span>
          <div className="flex-1">
            <div className="font-bold text-gray-800 text-sm">Samee for Business</div>
            <div className="text-xs text-gray-500">Improve expat employee retention →</div>
          </div>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-100 px-5 py-6 text-center bg-[#FAFAF9]">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 h-6 bg-brand-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-xs">N</span>
          </div>
          <span className="font-bold text-gray-700">Samee</span>
        </div>
        <p className="text-xs text-gray-400 mb-3">Your expat survival kit in Japan · 18+ only · Free forever</p>
        <div className="flex justify-center gap-5 text-xs text-gray-400">
          <Link href="/terms"   className="hover:text-gray-600 transition">Terms</Link>
          <Link href="/privacy" className="hover:text-gray-600 transition">Privacy</Link>
          <Link href="/contact" className="hover:text-gray-600 transition">Contact</Link>
        </div>
        <p className="text-xs text-gray-300 mt-3">© 2026 Samee</p>
      </footer>
    </div>
  )
}
