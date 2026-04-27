import Link from 'next/link'
import type { Metadata } from 'next'
import ArticleJsonLd from '@/components/seo/ArticleJsonLd'

export const metadata: Metadata = {
  title: 'Expats in Tokyo — Making Friends & Building Your Life | VILLIA',
  description: 'Moving to Tokyo as a foreigner? This guide covers everything — making friends, finding community, language exchange, and surviving the first months in Tokyo.',
  keywords: ['expats tokyo', 'foreigners tokyo', 'making friends tokyo', 'expat community tokyo', 'new to tokyo foreigner', 'tokyo expat guide'],
  openGraph: {
    title: 'Expats in Tokyo — The Real Survival Guide',
    description: 'Making friends in Tokyo as a foreigner. What nobody tells you, and how VILLIA helps.',
  },
}

const SECTIONS = [
  {
    emoji: '😰',
    title: 'Why making friends in Tokyo is hard',
    content: `Tokyo is one of the most exciting cities in the world — and one of the loneliest for newcomers. Japanese social culture is built around long-term relationships formed in school or work. As a foreigner arriving mid-life, you're outside those systems.\n\nLanguage is only part of the challenge. Even expats who speak Japanese find it hard to break into real friendships. The social rules are different. Group dynamics are different. And the sheer size of the city means you can spend months without meeting a single person you click with.`,
  },
  {
    emoji: '🗺️',
    title: 'Where foreigners actually meet people in Tokyo',
    content: `Shibuya, Shinjuku, and Harajuku are the most international areas. Shimokitazawa has a strong expat-friendly bar and music scene. Nakameguro attracts young creatives from all over the world. Roppongi has the most visible expat nightlife, though the crowd skews toward short-term visitors.\n\nFor daytime connections: international cafés like Good Morning Café, language exchange meetups at Genki Japanese, international running groups, and expat Facebook groups like "Foreigners in Tokyo" are active communities.`,
  },
  {
    emoji: '🗣️',
    title: 'Language exchange in Tokyo',
    content: `Tokyo is the best city in Japan for language exchange. Japanese people learning English — or other languages — are everywhere, and many are actively looking for conversation partners.\n\nApp-based options like VILLIA match you with Japanese speakers who want to practice your language in exchange for Japanese. This creates a natural, low-pressure way to build real friendships rather than transactional language swaps.`,
  },
  {
    emoji: '🏠',
    title: 'Building a life in Tokyo — practical first steps',
    content: `First week priorities:\n• Register at your Ward Office (区役所) within 14 days\n• Get a Suica or Pasmo IC card at any major train station\n• Open a Japan Post Bank account (easiest for foreigners)\n• Get a SIM card (IIJmio or Rakuten Mobile)\n\nJoin your local community on LINE. Every neighborhood has informal groups for residents. Ask at your local convenience store or apartment building notice board.`,
  },
  {
    emoji: '🌟',
    title: 'From tourist to local — the Tokyo journey',
    content: `Most Tokyo expats describe three phases:\n\n1–3 months: Exciting but exhausting. Everything is new. Social energy goes to logistics.\n3–12 months: The "hump." Novelty wears off. Real loneliness can set in. This is when community matters most.\n12+ months: You start to feel like a local. You have your spots, your routines, your people.\n\nVILLIA is built specifically for phase 1 and 2 — connecting you with others at the same stage, and with veterans who remember exactly how you feel right now.`,
  },
]

export default function ExpatsTokyo() {
  return (
    <div className="min-h-screen bg-white flex flex-col max-w-[430px] mx-auto">
      <ArticleJsonLd
        title="Expats in Tokyo — The Real Survival Guide"
        description="Making friends in Tokyo as a foreigner. What nobody tells you, and how VILLIA helps."
        url="https://VILLIAjapan.com/guides/expats-in-tokyo"
      />
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-black text-sm">N</span>
          </div>
          <span className="font-extrabold text-gray-900 text-lg tracking-tight">VILLIA</span>
        </Link>
      </header>

      <section className="px-5 pt-6 pb-8">
        <div className="inline-flex items-center gap-1.5 bg-brand-50 border border-brand-100 text-brand-600 text-xs font-semibold px-3 py-1 rounded-full mb-4">
          📍 Tokyo Guide
        </div>
        <h1 className="text-2xl font-black text-gray-900 leading-tight mb-3">
          Expats in Tokyo:<br />The Real Survival Guide
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          Moving to Tokyo as a foreigner is exciting and lonely at the same time. Here's what actually helps.
        </p>
      </section>

      {/* CTA banner */}
      <div className="mx-5 mb-8 bg-brand-500 rounded-2xl p-4 text-center">
        <p className="text-white font-bold text-sm mb-1">Just arrived in Tokyo?</p>
        <p className="text-brand-100 text-xs mb-3">Meet expats and locals near you on VILLIA</p>
        <Link href="/signup"
          className="inline-block px-6 py-2.5 bg-white text-brand-600 rounded-xl font-bold text-sm active:scale-95 transition-all">
          Find your people →
        </Link>
      </div>

      {/* Content */}
      <div className="px-5 space-y-8 pb-10">
        {SECTIONS.map(s => (
          <div key={s.title}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{s.emoji}</span>
              <h2 className="font-extrabold text-gray-900 text-base">{s.title}</h2>
            </div>
            <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{s.content}</div>
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <section className="bg-gray-50 mx-5 rounded-3xl p-6 mb-10 text-center">
        <div className="text-4xl mb-3">🗼</div>
        <h2 className="font-extrabold text-gray-900 text-lg mb-2">Ready to meet people in Tokyo?</h2>
        <p className="text-gray-500 text-sm mb-5 leading-relaxed">
          Join VILLIA free. Find expats and locals who get what it's like to be new in Japan.
        </p>
        <Link href="/signup"
          className="block w-full py-4 bg-brand-500 text-white rounded-2xl font-bold text-sm text-center shadow-md shadow-brand-200 active:scale-[0.98] transition-all">
          Get Started — It's Free
        </Link>
      </section>

      <div className="px-5 pb-6 flex gap-3 text-xs text-gray-400 justify-center flex-wrap">
        <Link href="/" className="hover:text-gray-600">Home</Link>
        <Link href="/guides/language-exchange-japan" className="hover:text-gray-600">Language Exchange Japan →</Link>
      </div>
    </div>
  )
}
