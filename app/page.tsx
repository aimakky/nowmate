import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'nowmate — Find your people in Japan',
}

const FEATURES = [
  { icon: '📍', title: 'People Nearby',    desc: 'See who\'s in your area right now — Tokyo, Osaka, wherever you are.' },
  { icon: '🌏', title: 'Any Language',     desc: 'Connect in your own language or practice a new one.' },
  { icon: '🤝', title: 'More Than Dating', desc: 'Friends, language exchange, local tips & real connections.' },
  { icon: '🔒', title: 'Safe Space',       desc: 'Report & block. Chat only after matching. 18+ only.' },
]

const STEPS = [
  { icon: '✏️', title: 'Create Profile',    desc: 'Share your nationality, languages & what you\'re looking for.' },
  { icon: '👀', title: 'Browse Nearby',     desc: 'See foreigners in your city. Filter by purpose, language & more.' },
  { icon: '❤️', title: 'Like & Match',      desc: 'Like someone. If they like you back — it\'s a match!' },
  { icon: '💬', title: 'Chat & Meet',       desc: 'Start chatting. Make plans. Build your life in Japan.' },
]

const PURPOSES = [
  { icon: '👫', label: 'Friends',          color: 'bg-blue-50  border-blue-100  text-blue-600' },
  { icon: '💬', label: 'Chat',             color: 'bg-green-50 border-green-100 text-green-600' },
  { icon: '🗣️', label: 'Language Exchange', color: 'bg-purple-50 border-purple-100 text-purple-600' },
  { icon: '🗺️', label: 'Local Help',       color: 'bg-orange-50 border-orange-100 text-orange-600' },
  { icon: '❤️', label: 'Dating',           color: 'bg-rose-50  border-rose-100  text-rose-600' },
]

// Simulated flag avatars for social proof
const NATIONALITY_PREVIEW = ['🇧🇷','🇳🇵','🇻🇳','🇨🇳','🇵🇭','🇮🇳','🇰🇷','🇲🇲','🇺🇸','🇮🇩','🇹🇭','🇧🇩']

export default function TopPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col max-w-[430px] mx-auto">
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center shadow-sm shadow-brand-200">
            <span className="text-white font-black text-sm">N</span>
          </div>
          <span className="font-extrabold text-gray-900 text-lg tracking-tight">nowmate</span>
        </div>
        <Link href="/login"
          className="text-sm font-semibold text-brand-500 hover:text-brand-600 px-3 py-1.5 rounded-xl hover:bg-brand-50 transition">
          Sign in
        </Link>
      </header>

      {/* ── Hero ── */}
      <section className="px-5 pt-8 pb-10 text-center flex flex-col items-center">
        {/* Social proof avatars (Noah's idea) */}
        <div className="flex -space-x-2 mb-5">
          {NATIONALITY_PREVIEW.slice(0, 8).map((flag, i) => (
            <div key={i}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-100 to-brand-200 border-2 border-white flex items-center justify-center text-sm shadow-sm"
              style={{ zIndex: 10 - i }}>
              {flag}
            </div>
          ))}
          <div className="w-9 h-9 rounded-full bg-brand-500 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
            +{30}
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-100 text-green-600 text-xs font-semibold px-3 py-1 rounded-full mb-5">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          30+ nationalities online
        </div>

        <h1 className="text-[2rem] font-black text-gray-900 leading-[1.15] mb-3">
          Find your people.<br />
          <span className="text-brand-500">Right here in Japan.</span>
        </h1>
        <p className="text-gray-500 text-base leading-relaxed mb-8 max-w-[300px]">
          nowmate connects foreigners in Japan — for friendship, language exchange, local help, and more.
        </p>

        <div className="flex flex-col gap-3 w-full">
          <Link href="/signup"
            className="w-full py-4 bg-brand-500 text-white rounded-2xl font-bold text-base text-center shadow-md shadow-brand-200 hover:bg-brand-600 active:scale-[0.98] transition-all">
            Get Started — It's Free
          </Link>
          <Link href="/login"
            className="w-full py-3.5 border-2 border-brand-200 text-brand-600 rounded-2xl font-semibold text-base text-center hover:bg-brand-50 active:scale-[0.98] transition-all">
            I have an account
          </Link>
        </div>

        <p className="text-xs text-gray-400 mt-4">Free forever · No credit card · 18+ only</p>
      </section>

      {/* ── Purpose Pills ── */}
      <section className="px-5 pb-10">
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

      {/* ── Features ── */}
      <section className="bg-gray-50 px-5 py-10">
        <h2 className="text-xl font-extrabold text-center text-gray-800 mb-5">Why nowmate?</h2>
        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-3xl mb-2.5">{f.icon}</div>
              <div className="font-bold text-gray-800 text-sm mb-1">{f.title}</div>
              <div className="text-xs text-gray-500 leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
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

      {/* ── Nationality showcase ── */}
      <section className="bg-brand-500 px-5 py-10 text-center">
        <p className="text-brand-100 text-sm font-semibold mb-2">People from all over the world</p>
        <h2 className="text-2xl font-extrabold text-white mb-4">30+ Nationalities in nowmate</h2>
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {NATIONALITY_PREVIEW.map((flag, i) => (
            <span key={i} className="text-3xl">{flag}</span>
          ))}
          <span className="text-3xl">🌍</span>
        </div>
        <Link href="/signup"
          className="inline-block px-8 py-3.5 bg-white text-brand-600 rounded-2xl font-bold text-sm shadow-md active:scale-95 transition-all">
          Join nowmate Free →
        </Link>
      </section>

      {/* ── Final CTA ── */}
      <section className="px-5 py-10 text-center">
        <div className="text-4xl mb-3">🤝</div>
        <h2 className="text-2xl font-extrabold text-gray-900 mb-2">You're not alone.</h2>
        <p className="text-gray-500 text-sm mb-6 leading-relaxed">Your crew is nearby. Join now — it takes 2 minutes.</p>
        <Link href="/signup"
          className="inline-block w-full py-4 bg-brand-500 text-white rounded-2xl font-bold text-base text-center shadow-md shadow-brand-200 hover:bg-brand-600 active:scale-[0.98] transition-all">
          Get Started Free
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 px-5 py-6 text-center bg-white">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 h-6 bg-brand-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-xs">N</span>
          </div>
          <span className="font-bold text-gray-700">nowmate</span>
        </div>
        <p className="text-xs text-gray-400 mb-3">For foreigners in Japan · 18+ only · Free forever</p>
        <div className="flex justify-center gap-5 text-xs text-gray-400">
          <Link href="/terms"   className="hover:text-gray-600 transition">Terms</Link>
          <Link href="/privacy" className="hover:text-gray-600 transition">Privacy</Link>
          <Link href="/contact" className="hover:text-gray-600 transition">Contact</Link>
        </div>
        <p className="text-xs text-gray-300 mt-3">© 2024 nowmate</p>
      </footer>
    </div>
  )
}
