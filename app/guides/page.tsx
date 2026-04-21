import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Japan Expat Guides — Survival, Friends & City Life | Samee',
  description: 'Free guides for foreigners living in Japan. Covering new arrivals, making friends, language exchange, Tokyo, Osaka, Fukuoka, and more.',
  keywords: ['japan expat guide', 'foreigner japan guide', 'living in japan', 'expat japan tips', 'japan survival guide'],
}

const GUIDES = [
  {
    href: '/guides/new-to-japan',
    emoji: '✈️',
    title: 'New to Japan',
    subtitle: 'Your first-week survival guide',
    desc: 'Residence card, bank account, health insurance, housing — everything you need in week one.',
    tag: 'Start Here',
    tagColor: 'bg-blue-100 text-blue-700',
    border: 'border-blue-100',
  },
  {
    href: '/guides/making-friends-in-japan',
    emoji: '👥',
    title: 'Making Friends in Japan',
    subtitle: 'The honest guide for foreigners',
    desc: 'Why it\'s hard, what actually works, and how to build a real social life in Japan.',
    tag: 'Most Read',
    tagColor: 'bg-rose-100 text-rose-700',
    border: 'border-rose-100',
  },
  {
    href: '/guides/language-exchange-japan',
    emoji: '🗣️',
    title: 'Language Exchange in Japan',
    subtitle: 'Find Japanese speakers & partners',
    desc: 'How to find a language exchange partner, what apps work, and how to make it last.',
    tag: 'Popular',
    tagColor: 'bg-purple-100 text-purple-700',
    border: 'border-purple-100',
  },
  {
    href: '/guides/expats-in-tokyo',
    emoji: '🗼',
    title: 'Expats in Tokyo',
    subtitle: 'The world\'s most complex city',
    desc: 'Neighborhoods, community, hidden networks, and making real friends in the city that has everything.',
    tag: 'City Guide',
    tagColor: 'bg-gray-100 text-gray-600',
    border: 'border-gray-100',
  },
  {
    href: '/guides/expats-in-osaka',
    emoji: '🏯',
    title: 'Expats in Osaka',
    subtitle: 'Japan\'s most welcoming city',
    desc: 'Osaka is warmer, louder, and more open than Tokyo. Here\'s how to make the most of it.',
    tag: 'City Guide',
    tagColor: 'bg-orange-100 text-orange-600',
    border: 'border-orange-100',
  },
  {
    href: '/guides/expats-in-fukuoka',
    emoji: '🌿',
    title: 'Expats in Fukuoka',
    subtitle: 'Small city, big community',
    desc: 'Japan\'s most livable city for foreigners. Cheaper, friendlier, and more connected than you\'d expect.',
    tag: 'City Guide',
    tagColor: 'bg-green-100 text-green-700',
    border: 'border-green-100',
  },
]

export default function GuidesIndex() {
  return (
    <div className="min-h-screen bg-white flex flex-col max-w-[430px] mx-auto">
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-black text-sm">N</span>
          </div>
          <span className="font-extrabold text-gray-900 text-lg tracking-tight">Samee</span>
        </Link>
      </header>

      <section className="px-5 pt-6 pb-6">
        <h1 className="text-2xl font-black text-gray-900 leading-tight mb-2">
          Japan Expat Guides
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          Real, practical guides for foreigners living in Japan. No fluff.
        </p>
      </section>

      <div className="px-5 space-y-3 pb-10">
        {GUIDES.map(g => (
          <Link key={g.href} href={g.href}
            className={`block rounded-2xl border ${g.border} bg-white p-4 hover:shadow-sm transition-shadow active:scale-[0.99]`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">{g.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-extrabold text-gray-900 text-sm">{g.title}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${g.tagColor}`}>{g.tag}</span>
                </div>
                <p className="text-xs text-gray-400 mb-1">{g.subtitle}</p>
                <p className="text-xs text-gray-600 leading-relaxed">{g.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <section className="bg-brand-50 mx-5 rounded-3xl p-6 mb-10 text-center">
        <div className="text-4xl mb-3">🤝</div>
        <h2 className="font-extrabold text-gray-900 text-lg mb-2">Ready to meet people?</h2>
        <p className="text-gray-500 text-sm mb-5 leading-relaxed">Guides are great. Real friends are better. Join Samee free.</p>
        <Link href="/signup" className="block w-full py-4 bg-brand-500 text-white rounded-2xl font-bold text-sm text-center shadow-md shadow-brand-200 active:scale-[0.98] transition-all">
          Get Started — It's Free
        </Link>
      </section>
    </div>
  )
}
