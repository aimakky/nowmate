import Link from 'next/link'
import type { Metadata } from 'next'
import ArticleJsonLd from '@/components/seo/ArticleJsonLd'

export const metadata: Metadata = {
  title: 'Expats in Fukuoka — Small City, Big Community | 休憩村',
  description: 'Fukuoka is Japan\'s most livable city for foreigners. Smaller, cheaper, and friendlier than Tokyo. This guide covers making friends, community, and expat life in Fukuoka.',
  keywords: ['expats fukuoka', 'foreigners fukuoka', 'expat community fukuoka', 'fukuoka expat guide', 'living in fukuoka foreigner'],
}

const SECTIONS = [
  {
    emoji: '🌟',
    title: 'Why expats love Fukuoka',
    content: `Fukuoka consistently ranks as Japan's most livable city — and expats agree. It's compact enough to feel like a community, international enough to never feel isolated, and cheap enough to actually enjoy life.\n\nRents are 30-40% cheaper than Tokyo. The food scene (hakata ramen, mentaiko, motsunabe) is world-class. The airport is inside the city. And the pace of life is genuinely different — more relaxed, more human.`,
  },
  {
    emoji: '🤝',
    title: 'The expat scene in Fukuoka',
    content: `Fukuoka has a tight-knit expat community — small enough that you'll keep running into the same people, which is actually a feature. New arrivals get absorbed into existing networks faster here than in Tokyo.\n\nTenjin and Daimyo are the social hubs. International bars like What The Dickens and Kelt's are known expat gathering spots. Fukuoka Foreign Residents Association runs regular events.`,
  },
  {
    emoji: '🎓',
    title: 'Kyushu University and the student expat scene',
    content: `Kyushu University has a significant international student population, making Fukuoka unusually young and globally connected for a Japanese city outside Tokyo/Osaka.\n\nIto Campus (engineering/sciences) and Hakozaki Campus have active international student circles. Even non-students can join many university-connected language exchange and culture events.`,
  },
  {
    emoji: '🏠',
    title: 'Practical Fukuoka for new arrivals',
    content: `Housing: Studio apartments from ¥40,000/month in walking distance of Tenjin. Far cheaper than Tokyo or Osaka.\n\nTransport: Fukuoka subway is simple — just 3 lines. IC card (Hayakaken or Suica) works everywhere. The city is also very cycling-friendly.\n\nWard Office: Register in Fukuoka-shi at your local ward office. Fukuoka City has an excellent international support center (Fukuoka City International Foundation) with English support staff.`,
  },
]

export default function ExpatsFukuoka() {
  return (
    <div className="min-h-screen bg-white flex flex-col max-w-[430px] mx-auto">
      <ArticleJsonLd
        title="Expats in Fukuoka — Small City, Big Community"
        description="Fukuoka is Japan's most livable city for foreigners. Cheaper, friendlier, and more connected than you'd expect."
        url="https://休憩村japan.com/guides/expats-in-fukuoka"
      />
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-black text-sm">N</span>
          </div>
          <span className="font-extrabold text-gray-900 text-lg tracking-tight">休憩村</span>
        </Link>
      </header>

      <section className="px-5 pt-6 pb-8">
        <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-100 text-green-600 text-xs font-semibold px-3 py-1 rounded-full mb-4">
          🌿 Fukuoka Guide
        </div>
        <h1 className="text-2xl font-black text-gray-900 leading-tight mb-3">
          Expats in Fukuoka:<br />Small City, Big Community
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          Japan's most livable city for foreigners. Cheaper, friendlier, and more connected than you'd expect.
        </p>
      </section>

      <div className="mx-5 mb-8 bg-green-600 rounded-2xl p-4 text-center">
        <p className="text-white font-bold text-sm mb-1">Find your Fukuoka community</p>
        <p className="text-green-100 text-xs mb-3">Connect with expats and locals in Fukuoka</p>
        <Link href="/signup" className="inline-block px-6 py-2.5 bg-white text-green-700 rounded-xl font-bold text-sm active:scale-95 transition-all">
          Join 休憩村 free →
        </Link>
      </div>

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

      <section className="bg-green-50 mx-5 rounded-3xl p-6 mb-10 text-center">
        <div className="text-4xl mb-3">🌿</div>
        <h2 className="font-extrabold text-gray-900 text-lg mb-2">Meet people in Fukuoka</h2>
        <p className="text-gray-500 text-sm mb-5 leading-relaxed">Join 休憩村 free. Find your Fukuoka crew.</p>
        <Link href="/signup" className="block w-full py-4 bg-brand-500 text-white rounded-2xl font-bold text-sm text-center shadow-md shadow-brand-200 active:scale-[0.98] transition-all">
          Get Started — It's Free
        </Link>
      </section>

      <div className="px-5 pb-6 flex gap-3 text-xs text-gray-400 justify-center flex-wrap">
        <Link href="/guides/expats-in-osaka" className="hover:text-gray-600">← Osaka Guide</Link>
        <Link href="/guides/expats-in-tokyo" className="hover:text-gray-600">Tokyo Guide</Link>
      </div>
    </div>
  )
}
