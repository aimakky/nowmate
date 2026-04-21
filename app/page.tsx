import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Samee — Find people to hang with in Japan. Tonight.',
  description: 'The foreigner-only community in Japan. Post what you\'re up to, find who\'s free, meet your people. Drinks, food, sightseeing & more.',
  openGraph: {
    title: 'Samee — Find people to hang with in Japan.',
    description: 'Post what you\'re up to. Find who\'s free. Meet your people.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}

const ACTIVITIES = [
  { tag: 'Drinks',      emoji: '🍻', text: 'Anyone up for drinks in Shibuya tonight?',    flag: '🇧🇷', name: 'Carlos',  time: '2min ago',  joins: 3 },
  { tag: 'Food',        emoji: '🍜', text: 'Looking for ramen buddy in Shinjuku!',         flag: '🇮🇳', name: 'Priya',   time: '5min ago',  joins: 2 },
  { tag: 'Sightseeing', emoji: '🗺️', text: 'Exploring Asakusa this afternoon — join me?', flag: '🇫🇷', name: 'Sophie',  time: '12min ago', joins: 4 },
  { tag: 'Coffee',      emoji: '☕', text: 'First time in Tokyo, want a coffee?',          flag: '🇺🇸', name: 'Jake',    time: '18min ago', joins: 1 },
]

const TAGS = [
  { emoji: '🍻', label: 'Drinks' },
  { emoji: '🍜', label: 'Food' },
  { emoji: '☕', label: 'Coffee' },
  { emoji: '🗺️', label: 'Sightseeing' },
  { emoji: '🎌', label: 'Culture' },
  { emoji: '💬', label: 'Talk' },
  { emoji: '🆘', label: 'Help' },
]

const STAGES = [
  { emoji: '✈️', label: 'Just Arrived',    desc: '0–6 months',   tip: 'Find your first friends in Japan', color: 'bg-blue-50 border-blue-100',   labelColor: 'text-blue-700' },
  { emoji: '🏠', label: 'Getting Settled', desc: '6mo – 2 years', tip: 'Grow your circle, explore more',  color: 'bg-green-50 border-green-100', labelColor: 'text-green-700' },
  { emoji: '🗾', label: 'Japan Local',     desc: '2+ years',     tip: 'Help newcomers, stay connected',   color: 'bg-orange-50 border-orange-100', labelColor: 'text-orange-700' },
]

const STEPS = [
  { emoji: '✍️', title: 'Post what you\'re up to', desc: 'Drinks, food, sightseeing, coffee — tell people what you\'re doing right now.' },
  { emoji: '🙋', title: 'Others join in',           desc: 'Foreigners nearby see your post and tap "I\'m in!" — instant group chat.' },
  { emoji: '💬', title: 'Meet up & connect',        desc: 'Chat in the group, plan the meetup, make real friends in Japan.' },
]

const TESTIMONIALS = [
  { text: 'Met 3 people for drinks in Shibuya within an hour of posting. This app is insane.', name: 'Carlos', flag: '🇧🇷', stage: 'Just Arrived · Tokyo' },
  { text: 'Finally someone built this. Every expat in Japan needs Samee.', name: 'Priya', flag: '🇮🇳', stage: 'Getting Settled · Osaka' },
  { text: 'Posted "anyone for ramen?" and had 5 people join in 10 minutes.', name: 'Tom', flag: '🇬🇧', stage: 'Japan Local · Tokyo' },
]

const NATIONALITY_PREVIEW = ['🇧🇷','🇳🇵','🇻🇳','🇨🇳','🇵🇭','🇮🇳','🇰🇷','🇲🇲','🇺🇸','🇮🇩','🇹🇭','🇧🇩','🇫🇷','🇩🇪','🇬🇧']

const SUPPORTED_COUNTRIES_LP = [
  { flag: '🇯🇵', name: 'Japan',       status: 'Live 🟢' },
  { flag: '🇰🇷', name: 'Korea',       status: 'Live 🟢' },
  { flag: '🇨🇳', name: 'China',       status: 'Live 🟢' },
  { flag: '🇻🇳', name: 'Vietnam',     status: 'Live 🟢' },
  { flag: '🇧🇷', name: 'Brazil',      status: 'Live 🟢' },
  { flag: '🇵🇭', name: 'Philippines', status: 'Live 🟢' },
  { flag: '🇺🇸', name: 'USA',         status: 'Live 🟢' },
  { flag: '🇩🇪', name: 'Germany',     status: 'Live 🟢' },
  { flag: '🇦🇺', name: 'Australia',   status: 'Live 🟢' },
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
      <header className="flex items-center justify-between px-5 pt-5 pb-3 sticky top-0 bg-[#FAFAF9]/95 backdrop-blur z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center shadow-sm shadow-brand-200">
            <span className="text-white font-black text-sm">S</span>
          </div>
          <span className="font-extrabold text-stone-900 text-lg tracking-tight">Samee</span>
        </div>
        <Link href="/login"
          className="text-sm font-bold text-brand-500 px-4 py-1.5 rounded-xl border border-brand-200 hover:bg-brand-50 transition">
          Sign in
        </Link>
      </header>

      {/* Hero */}
      <section className="px-5 pt-6 pb-8 text-center flex flex-col items-center">

        {/* Live badge */}
        <div className="inline-flex items-center gap-2 bg-white border border-stone-200 rounded-full px-3.5 py-1.5 mb-5 shadow-sm">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs font-bold text-stone-700">{userCount}+ foreigners in Japan</span>
        </div>

        <h1 className="text-[2.1rem] font-black text-stone-900 leading-[1.1] mb-4 tracking-tight">
          Find people to hang<br />
          with in Japan.<br />
          <span className="text-brand-500">Tonight. 🍻</span>
        </h1>

        <p className="text-stone-500 text-base leading-relaxed mb-6 max-w-[280px]">
          Post what you're up to. Find who's free. Meet your people — right now.
        </p>

        <Link href="/signup"
          className="w-full py-4 bg-brand-500 text-white rounded-2xl font-extrabold text-base text-center shadow-lg shadow-brand-200 hover:bg-brand-600 active:scale-[0.98] transition-all mb-3">
          Join free — takes 30 seconds →
        </Link>
        <Link href="/login"
          className="w-full py-3 border-2 border-stone-200 text-stone-600 rounded-2xl font-semibold text-sm text-center hover:bg-stone-50 active:scale-[0.98] transition-all">
          Already have an account
        </Link>
        <p className="text-xs text-stone-400 mt-3">Free forever · No credit card · Foreigners only</p>
      </section>

      {/* Live Activity Feed Preview */}
      <section className="px-4 pb-10">
        <div className="flex items-center gap-2 mb-4 px-1">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">Happening right now</p>
        </div>
        <div className="space-y-2.5">
          {ACTIVITIES.map((a, i) => (
            <Link key={i} href="/signup"
              className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm flex flex-col gap-2.5 hover:shadow-md transition-all active:scale-[0.99] block">
              <div className="flex items-center gap-2">
                <span className="text-xl">{a.emoji}</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-100">{a.tag}</span>
                <span className="text-xs text-stone-400 ml-auto">{a.time}</span>
              </div>
              <p className="text-sm font-semibold text-stone-800 leading-snug">{a.text}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{a.flag}</span>
                  <span className="text-xs text-stone-500">{a.name}</span>
                  <span className="text-xs text-stone-300">·</span>
                  <span className="text-xs text-stone-400">👥 {a.joins} joined</span>
                </div>
                <span className="text-xs font-bold px-3 py-1.5 bg-brand-500 text-white rounded-xl">I'm in!</span>
              </div>
            </Link>
          ))}
        </div>
        <Link href="/signup"
          className="mt-4 flex items-center justify-center gap-1.5 text-sm font-bold text-brand-500 hover:text-brand-600 py-2">
          See all posts →
        </Link>
      </section>

      {/* Activity tags */}
      <section className="bg-stone-50 px-5 py-8">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center mb-4">What do you want to do?</p>
        <div className="flex flex-wrap justify-center gap-2">
          {TAGS.map(t => (
            <Link key={t.label} href="/signup"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white rounded-full border border-stone-200 text-sm font-semibold text-stone-700 hover:border-brand-300 hover:text-brand-600 transition-all shadow-sm active:scale-95">
              {t.emoji} {t.label}
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-5 py-10">
        <h2 className="text-2xl font-extrabold text-center text-stone-900 mb-2">How it works</h2>
        <p className="text-sm text-center text-stone-400 mb-8">From zero friends to plans in under 5 minutes</p>
        <div className="space-y-5">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="w-12 h-12 bg-brand-500 rounded-2xl flex items-center justify-center shadow-md shadow-brand-200 flex-shrink-0">
                <span className="text-xl">{s.emoji}</span>
              </div>
              <div className="pt-1.5">
                <p className="font-extrabold text-stone-900 text-sm mb-0.5">{i + 1}. {s.title}</p>
                <p className="text-xs text-stone-500 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <Link href="/signup"
          className="mt-8 w-full py-4 bg-brand-500 text-white rounded-2xl font-extrabold text-base text-center shadow-md shadow-brand-200 hover:bg-brand-600 active:scale-[0.98] transition-all block">
          Try it now — it's free
        </Link>
      </section>

      {/* Arrival Stage */}
      <section className="bg-stone-50 px-5 py-8">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center mb-4">Where are you in your Japan journey?</p>
        <div className="space-y-2.5">
          {STAGES.map(s => (
            <Link key={s.label} href="/signup"
              className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl border ${s.color} hover:opacity-80 active:scale-[0.98] transition-all`}>
              <span className="text-2xl">{s.emoji}</span>
              <div className="flex-1">
                <p className={`font-extrabold text-sm ${s.labelColor}`}>{s.label}</p>
                <p className="text-xs text-stone-500">{s.desc}</p>
              </div>
              <p className="text-xs text-stone-400 text-right max-w-[100px] leading-tight">{s.tip}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-5 py-10">
        <h2 className="text-2xl font-extrabold text-center text-stone-900 mb-2">Real stories</h2>
        <p className="text-sm text-center text-stone-400 mb-6">From foreigners who found their people</p>
        <div className="space-y-3">
          {TESTIMONIALS.map(t => (
            <div key={t.name} className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm">
              <div className="flex gap-1 mb-2">
                {[...Array(5)].map((_, i) => <span key={i} className="text-amber-400 text-xs">★</span>)}
              </div>
              <p className="text-sm text-stone-700 leading-relaxed mb-2.5">"{t.text}"</p>
              <p className="text-xs text-stone-400 font-semibold">{t.flag} {t.name} · {t.stage}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Nationality showcase */}
      <section className="bg-brand-500 px-5 py-10 text-center">
        <p className="text-brand-200 text-xs font-bold uppercase tracking-widest mb-2">A global community in Japan</p>
        <h2 className="text-2xl font-extrabold text-white mb-5">30+ Nationalities</h2>
        <div className="flex flex-wrap justify-center gap-2.5 mb-6">
          {NATIONALITY_PREVIEW.map((flag, i) => (
            <span key={i} className="text-3xl drop-shadow">{flag}</span>
          ))}
          <span className="text-3xl">🌍</span>
        </div>
        <Link href="/signup"
          className="inline-block px-8 py-3.5 bg-white text-brand-600 rounded-2xl font-extrabold text-sm shadow-md active:scale-95 transition-all">
          Find your people →
        </Link>
      </section>

      {/* Supported Countries */}
      <section className="px-5 py-10">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center mb-2">Now available in</p>
        <h2 className="text-2xl font-extrabold text-center text-stone-900 mb-6">9 Countries 🌍</h2>
        <div className="grid grid-cols-3 gap-2.5">
          {SUPPORTED_COUNTRIES_LP.map(c => (
            <div key={c.name} className="bg-white border border-stone-100 rounded-2xl px-3 py-3 flex flex-col items-center gap-1.5 shadow-sm">
              <span className="text-3xl">{c.flag}</span>
              <p className="font-bold text-stone-800 text-xs">{c.name}</p>
              <p className="text-[10px] text-emerald-600 font-semibold">{c.status}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-center text-stone-400 mt-4">More countries coming soon →</p>
      </section>

      {/* I'm free now feature highlight */}
      <section className="px-5 py-10">
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 text-center">
          <div className="text-4xl mb-3">🙋</div>
          <h3 className="font-extrabold text-stone-900 text-xl mb-2">I'm free now</h3>
          <p className="text-sm text-stone-600 leading-relaxed mb-4">
            One tap to let the community know you're free for an hour. See who else is available near you — right now.
          </p>
          <Link href="/signup"
            className="inline-block px-6 py-3 bg-emerald-500 text-white rounded-2xl font-bold text-sm shadow-md active:scale-95 transition-all">
            Try it free →
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 pb-10 text-center">
        <div className="bg-stone-900 rounded-3xl p-8">
          <div className="text-4xl mb-4">🌏</div>
          <h2 className="text-2xl font-extrabold text-white mb-2">Your people are out there.</h2>
          <p className="text-stone-400 text-sm mb-6 leading-relaxed">
            Thousands of foreigners in Japan — all looking for the same thing. Let's find each other.
          </p>
          <Link href="/signup"
            className="w-full py-4 bg-brand-500 text-white rounded-2xl font-extrabold text-base text-center shadow-lg shadow-brand-900/20 hover:bg-brand-400 active:scale-[0.98] transition-all block mb-3">
            Join Samee free →
          </Link>
          <p className="text-xs text-stone-500">30 seconds to sign up · Forever free</p>
        </div>
      </section>

      {/* B2B */}
      <section className="px-5 pb-6">
        <Link href="/for-business"
          className="flex items-center gap-3 bg-white border border-stone-200 rounded-2xl px-4 py-3.5 hover:bg-stone-50 active:scale-[0.98] transition-all shadow-sm">
          <span className="text-2xl">🏢</span>
          <div className="flex-1">
            <p className="font-bold text-stone-800 text-sm">Samee for Business</p>
            <p className="text-xs text-stone-500">Improve expat employee retention →</p>
          </div>
          <span className="text-stone-400 text-sm">→</span>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-100 px-5 py-6 text-center bg-[#FAFAF9]">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 h-6 bg-brand-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-xs">S</span>
          </div>
          <span className="font-bold text-stone-700">Samee</span>
        </div>
        <p className="text-xs text-stone-400 mb-3">The foreigner community in Japan · 18+ only · Free forever</p>
        <div className="flex justify-center gap-5 text-xs text-stone-400">
          <Link href="/terms"   className="hover:text-stone-600 transition">Terms</Link>
          <Link href="/privacy" className="hover:text-stone-600 transition">Privacy</Link>
          <Link href="/guides"  className="hover:text-stone-600 transition">Guides</Link>
        </div>
        <p className="text-xs text-stone-300 mt-3">© 2026 Samee</p>
      </footer>
    </div>
  )
}
