import Link from 'next/link'
import type { Metadata } from 'next'
import ArticleJsonLd from '@/components/seo/ArticleJsonLd'

export const metadata: Metadata = {
  title: 'Language Exchange in Japan — Find a Partner & Actually Learn | Samee',
  description: 'How to find a language exchange partner in Japan that actually works. Tips for practicing Japanese with native speakers, and how to make real friendships through language exchange.',
  keywords: ['language exchange japan', 'language exchange partner japan', 'practice japanese', 'english japanese exchange', 'language partner tokyo', 'tandem japan'],
  openGraph: {
    title: 'Language Exchange in Japan — The Complete Guide',
    description: 'How to find a language exchange partner in Japan and turn practice sessions into real friendships.',
  },
}

const TIPS = [
  {
    emoji: '🎯',
    title: 'The #1 mistake in language exchange',
    content: `Most language exchanges fail because both people treat it like a class — structured, formal, transactional. You help me with Japanese for 30 minutes, I help you with English for 30 minutes. Then you both go home.\n\nThe exchanges that lead to real friendships happen when you stop timing it and start just... hanging out. Go to a café. Walk around a neighborhood. The language learning happens naturally when you're actually doing something together.`,
  },
  {
    emoji: '🇯🇵',
    title: 'What Japanese people actually want from language exchange',
    content: `Japanese people learning English are often nervous to speak. They've studied grammar for years but rarely have chances to practice with native speakers. They don't need you to be a teacher — they need you to be patient, encouraging, and genuinely interested in them as a person.\n\nAsk about their hobbies, their food preferences, their favorite places. Japanese people open up when they feel you're interested in Japan itself, not just using them as a learning tool.`,
  },
  {
    emoji: '📱',
    title: 'Best ways to find language exchange partners in Japan',
    content: `**Samee** — Best for foreigners already living in Japan. Matches you with locals and expats based on location, language, and purpose. You can filter specifically for language exchange and see who's near you in Tokyo, Osaka, or wherever you are.\n\n**HelloTalk & Tandem** — Good for text-based practice before you're ready to meet in person. Limited for in-person meetups.\n\n**Local meetups** — Search for "language exchange Tokyo" on Meetup.com. Regular events at cafés and bars. Good for meeting multiple people at once.`,
  },
  {
    emoji: '💬',
    title: 'Phrases that help you practice Japanese naturally',
    content: `Starting simple is fine. These work:\n• 日本語で言うと何ですか？ (How do you say that in Japanese?)\n• もう一度言ってください (Please say that again)\n• ゆっくり話してください (Please speak slowly)\n• これは正しいですか？ (Is this correct?)\n\nDon't be afraid to make mistakes. Japanese people are genuinely appreciative when foreigners try to speak Japanese — even imperfect Japanese builds connection.`,
  },
  {
    emoji: '🌸',
    title: 'From language partner to real friend',
    content: `The language exchange is just the door. Once you've met a few times and the awkwardness fades, you're just two people hanging out.\n\nSuggest activities beyond sitting in a café: visit a temple together, try a new restaurant, go to a neighborhood festival (祭り). Shared experiences build friendships faster than structured language sessions.\n\nMany of the strongest cross-cultural friendships in Japan started as language exchanges. The language is just the excuse to start.`,
  },
]

export default function LanguageExchangeJapan() {
  return (
    <div className="min-h-screen bg-white flex flex-col max-w-[430px] mx-auto">
      <ArticleJsonLd
        title="Language Exchange in Japan — Find a Partner & Actually Learn"
        description="How to find a language exchange partner in Japan, what apps work, and how to make it last."
        url="https://sameejapan.com/guides/language-exchange-japan"
      />
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-black text-sm">N</span>
          </div>
          <span className="font-extrabold text-gray-900 text-lg tracking-tight">Samee</span>
        </Link>
      </header>

      <section className="px-5 pt-6 pb-8">
        <div className="inline-flex items-center gap-1.5 bg-purple-50 border border-purple-100 text-purple-600 text-xs font-semibold px-3 py-1 rounded-full mb-4">
          🗣️ Language Exchange Guide
        </div>
        <h1 className="text-2xl font-black text-gray-900 leading-tight mb-3">
          Language Exchange in Japan:<br />How to Make It Actually Work
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          Finding a language partner is easy. Building real friendships through language exchange — that takes a different approach.
        </p>
      </section>

      {/* CTA banner */}
      <div className="mx-5 mb-8 bg-purple-500 rounded-2xl p-4 text-center">
        <p className="text-white font-bold text-sm mb-1">Find a language partner near you</p>
        <p className="text-purple-100 text-xs mb-3">Japanese speakers looking for exactly what you offer</p>
        <Link href="/signup"
          className="inline-block px-6 py-2.5 bg-white text-purple-600 rounded-xl font-bold text-sm active:scale-95 transition-all">
          Join Samee free →
        </Link>
      </div>

      {/* Content */}
      <div className="px-5 space-y-8 pb-10">
        {TIPS.map(t => (
          <div key={t.title}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{t.emoji}</span>
              <h2 className="font-extrabold text-gray-900 text-base">{t.title}</h2>
            </div>
            <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{t.content}</div>
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <section className="bg-purple-50 mx-5 rounded-3xl p-6 mb-10 text-center">
        <div className="text-4xl mb-3">🗣️</div>
        <h2 className="font-extrabold text-gray-900 text-lg mb-2">Ready to find your language partner?</h2>
        <p className="text-gray-500 text-sm mb-5 leading-relaxed">
          Samee matches you with Japanese speakers in your city who want to practice your language in exchange for Japanese.
        </p>
        <Link href="/signup"
          className="block w-full py-4 bg-brand-500 text-white rounded-2xl font-bold text-sm text-center shadow-md shadow-brand-200 active:scale-[0.98] transition-all">
          Get Started — It's Free
        </Link>
      </section>

      <div className="px-5 pb-6 flex gap-3 text-xs text-gray-400 justify-center flex-wrap">
        <Link href="/" className="hover:text-gray-600">Home</Link>
        <Link href="/guides/expats-in-tokyo" className="hover:text-gray-600">← Tokyo Expat Guide</Link>
      </div>
    </div>
  )
}
