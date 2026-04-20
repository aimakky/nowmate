import Link from 'next/link'
import type { Metadata } from 'next'
import ArticleJsonLd from '@/components/seo/ArticleJsonLd'

export const metadata: Metadata = {
  title: 'Expats in Osaka — Making Friends & Community Guide | nowjp',
  description: 'Living in Osaka as a foreigner? This guide covers making friends, finding expat community, language exchange, and building your life in Japan\'s most welcoming city.',
  keywords: ['expats osaka', 'foreigners osaka', 'making friends osaka', 'expat community osaka', 'osaka expat guide', 'kansai expat'],
  openGraph: {
    title: 'Expats in Osaka — The Real Guide to Making Friends',
    description: 'Osaka is Japan\'s most welcoming city for foreigners. Here\'s how to make the most of it.',
  },
}

const SECTIONS = [
  {
    emoji: '😄',
    title: 'Why Osaka is different from Tokyo for expats',
    content: `Osaka has a reputation — earned — for being warmer, louder, and more open than Tokyo. Osakans (Osaka people) are famous for talking to strangers, making jokes, and not standing on ceremony.\n\nFor foreigners, this makes a real difference. Random conversations happen more easily. Bar strangers become friends. The social barrier that Tokyo newcomers often describe is lower here.\n\nThat said, building deep friendships still takes time and effort. The Osaka friendliness is real but it doesn't replace intentional community building.`,
  },
  {
    emoji: '🏙️',
    title: 'Where expats actually hang out in Osaka',
    content: `Namba and Shinsaibashi are the most international areas — every nationality passes through. Amerikamura (American Village) has a strong youth and street culture scene.\n\nNamba Parks area and Tennoji have growing expat residential communities. Umeda/Kitashinchi is the business expat hub. Minami (South Osaka) is where the nightlife and casual social scene is strongest.\n\nFor daytime community: Osaka International Community Center in Nakanoshima runs free events. Osaka YMCA has international exchange programs.`,
  },
  {
    emoji: '🍜',
    title: 'Food as social currency in Osaka',
    content: `Osaka calls itself "tenka no daidokoro" (the nation's kitchen) and takes food seriously. This is actually great for making friends.\n\nSuggesting takoyaki in Dotonbori, going to a standing sushi bar in Kuromon Market, or exploring Shinsekai together are all natural friend-making activities that Osakans love.\n\nFood-based socializing is less formal than drinking-based Tokyo socializing, which makes it more accessible for foreigners who don't drink heavily.`,
  },
  {
    emoji: '🗣️',
    title: 'Language exchange in Osaka — what\'s different',
    content: `Osaka people speak with a distinct accent and use Kansai-ben (Kansai dialect). Standard Japanese textbooks won't prepare you for everyday Osaka conversation. This can be frustrating — or an adventure, depending on your attitude.\n\nThe good news: Osaka language partners are often eager to share their dialect as a source of pride. Learning even a few Kansai expressions ("めっちゃ" for "very", "なんでやねん" as a friendly retort) opens doors immediately.\n\nnowjp lets you find language exchange partners specifically in Osaka who can teach you real, local Japanese.`,
  },
  {
    emoji: '🚃',
    title: 'Practical Osaka for new expats',
    content: `IC card: ICOCA works across all Kansai transport (Osaka, Kyoto, Kobe, Nara). Get one at Osaka/Shin-Osaka station.\n\nWard Office: Register within 14 days. Osaka-shi (Osaka City) has ward offices in each of the 24 wards — find your nearest one.\n\nHealthcare: JCHO Osaka Hospital and Osaka City University Hospital have international departments. For English-speaking clinics, Intermedical and Osaka Ekimae Clinic are expat favorites.\n\nHousing: Osaka is significantly cheaper than Tokyo. Studio apartments in Namba/Shinsaibashi area from ¥55,000/month. Share houses widely available.`,
  },
]

export default function ExpatsOsaka() {
  return (
    <div className="min-h-screen bg-white flex flex-col max-w-[430px] mx-auto">
      <ArticleJsonLd
        title="Expats in Osaka — Making Friends & Community Guide"
        description="Osaka is Japan's most welcoming city for foreigners. Here's how to make the most of it."
        url="https://nowjpjapan.com/guides/expats-in-osaka"
      />
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-black text-sm">N</span>
          </div>
          <span className="font-extrabold text-gray-900 text-lg tracking-tight">nowjp</span>
        </Link>
      </header>

      <section className="px-5 pt-6 pb-8">
        <div className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-100 text-orange-600 text-xs font-semibold px-3 py-1 rounded-full mb-4">
          🏯 Osaka Guide
        </div>
        <h1 className="text-2xl font-black text-gray-900 leading-tight mb-3">
          Expats in Osaka:<br />Japan's Most Welcoming City
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          Osaka is warmer, louder, and more open than Tokyo. Here's how to make the most of it as a foreigner.
        </p>
      </section>

      <div className="mx-5 mb-8 bg-orange-500 rounded-2xl p-4 text-center">
        <p className="text-white font-bold text-sm mb-1">Find your Osaka crew</p>
        <p className="text-orange-100 text-xs mb-3">Meet expats and locals in Osaka on nowjp</p>
        <Link href="/signup" className="inline-block px-6 py-2.5 bg-white text-orange-600 rounded-xl font-bold text-sm active:scale-95 transition-all">
          Join free →
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

      <section className="bg-orange-50 mx-5 rounded-3xl p-6 mb-10 text-center">
        <div className="text-4xl mb-3">🏯</div>
        <h2 className="font-extrabold text-gray-900 text-lg mb-2">Ready to meet people in Osaka?</h2>
        <p className="text-gray-500 text-sm mb-5 leading-relaxed">Join nowjp free and connect with expats and locals in Osaka.</p>
        <Link href="/signup" className="block w-full py-4 bg-brand-500 text-white rounded-2xl font-bold text-sm text-center shadow-md shadow-brand-200 active:scale-[0.98] transition-all">
          Get Started — It's Free
        </Link>
      </section>

      <div className="px-5 pb-6 flex gap-3 text-xs text-gray-400 justify-center flex-wrap">
        <Link href="/guides/expats-in-tokyo" className="hover:text-gray-600">Tokyo Guide</Link>
        <Link href="/guides/expats-in-fukuoka" className="hover:text-gray-600">Fukuoka Guide →</Link>
      </div>
    </div>
  )
}
