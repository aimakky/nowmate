import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Japan Expat Survival Guide 2026 — Everything You Need to Know | nowjp',
  description: 'The complete Japan expat survival guide for 2026. Banking, housing, healthcare, taxes, language, making friends — everything foreigners need to live well in Japan.',
  keywords: ['japan expat survival guide', 'living in japan as a foreigner', 'japan expat guide 2026', 'foreigner living japan tips', 'expat japan life', 'japan foreigner guide'],
  openGraph: {
    title: 'Japan Expat Survival Guide 2026',
    description: 'Everything you need to live, work, and thrive in Japan as a foreigner. Banking, housing, healthcare, taxes, and more.',
  },
}

const SECTIONS = [
  {
    emoji: '🏦',
    title: 'Banking in Japan',
    id: 'banking',
    content: [
      { q: 'Which bank is easiest to open as a foreigner?', a: 'Japan Post Bank (ゆうちょ銀行) is the most accessible for new arrivals — no employer letter required, English support available, located in every post office. Once you\'ve been in Japan 6+ months, Rakuten Bank (online) and PayPay Bank are popular for their English apps.' },
      { q: 'What documents do I need?', a: 'Residence card + passport. Some banks also ask for a Japanese phone number. Most require proof of address (a utility bill or 住民票 copy).' },
      { q: 'How do I send money home?', a: 'Wise (formerly TransferWise) has the best exchange rates. Register with your residence card. For amounts under ¥1 million, it\'s typically 0.4–0.8% fee. Japan Post\'s international transfers are slower and more expensive.' },
    ],
  },
  {
    emoji: '🏠',
    title: 'Housing',
    id: 'housing',
    content: [
      { q: 'Why is renting as a foreigner so hard?', a: 'Traditional Japanese landlords require a Japanese guarantor (保証人), prefer Japanese tenants, and sometimes outright reject foreigners. Key money (礼金) is an additional non-refundable "gift" on top of deposit.' },
      { q: 'What are the workarounds?', a: 'Share houses (Sakura House, Tokyo Sharehouse, Oak House) have no key money, no guarantor, and accept foreigners easily. Foreigner-friendly agencies like Able, Real Estate Japan, and REMAX also help. UR Housing (government apartments) requires no guarantor.' },
      { q: 'How much does renting cost?', a: 'In Tokyo, a 1R apartment (one room, ~20m²) costs ¥70,000–120,000/month in central areas. Suburbs are significantly cheaper. Initial costs: deposit (1–2 months), key money (0–2 months), agency fee (1 month). Budget 4–6x monthly rent to move in.' },
    ],
  },
  {
    emoji: '🏥',
    title: 'Healthcare',
    id: 'healthcare',
    content: [
      { q: 'How does Japanese health insurance work?', a: 'National Health Insurance (国民健康保険) covers 70% of all medical costs for everyone registered in Japan. Monthly cost: ~¥2,000–15,000 depending on income. Sign up at your ward office on the same day you register your address.' },
      { q: 'How do I find an English-speaking doctor?', a: 'AMDA International Medical Information Center (0120-56-2009) provides multilingual referrals. Japan Healthcare Info (jhi.jp) has an English clinic database. Major urban hospitals often have international departments.' },
      { q: 'What about mental health?', a: 'TELL Lifeline (03-5774-0992) offers English-language crisis support and counseling referrals. Tokyo English Lifeline is another option. English-speaking therapists have become more available in major cities.' },
    ],
  },
  {
    emoji: '💼',
    title: 'Working and taxes',
    id: 'work',
    content: [
      { q: 'Do I need to file taxes in Japan?', a: 'If you\'re a company employee, your employer handles withholding tax (源泉徴収). If you\'re freelancing, self-employed, or earned from multiple sources, you must file 確定申告 (tax return) by March 15 each year. Freee.jp has English support.' },
      { q: 'What is 年末調整?', a: 'Year-end tax adjustment done by your employer in November/December. You submit a form with dependent information. Most full-time employees don\'t need to file separately if they only have one employer.' },
      { q: 'Can I work on a tourist visa or working holiday?', a: 'Tourist visa: no work allowed. Working holiday visa: up to 28 hours/week in specified industries. Check your visa category carefully — working without authorization can result in deportation.' },
    ],
  },
  {
    emoji: '🗣️',
    title: 'Language',
    id: 'language',
    content: [
      { q: 'Can I survive in Japan without Japanese?', a: 'Yes, especially in Tokyo, Osaka, and other major cities. English signage has improved dramatically. However, daily life (bills, ward office, landlords) is significantly easier with basic Japanese.' },
      { q: 'What Japanese should I learn first?', a: 'Hiragana and Katakana (2 weeks of study) unlock menus, signs, and app interfaces. Basic phrases: すみません (excuse me), ありがとうございます (thank you), わかりません (I don\'t understand), ～はどこですか (where is ～?).' },
      { q: 'Best ways to learn Japanese in Japan?', a: 'Language exchange partners (HelloTalk, nowjp\'s language exchange feature), community centers offer cheap Japanese classes, JLPT study groups on Meetup. Immersion works — set your phone to Japanese.' },
    ],
  },
  {
    emoji: '👥',
    title: 'Making friends and community',
    id: 'community',
    content: [
      { q: 'Why is making friends in Japan hard?', a: 'Japanese social culture is group-based — friend groups form in school and workplaces and rarely expand. As a foreigner, you\'re outside these existing circles. It takes intentional effort.' },
      { q: 'Where do expats actually make friends?', a: 'Language exchanges, international community events, sports clubs (futsal, running, volleyball leagues welcome foreigners), shared housing, and expat apps like nowjp. The expat community in Japan is larger and more welcoming than it appears from the outside.' },
      { q: 'How do I meet locals (not just other expats)?', a: 'Japanese conversation partners via Hello Talk or language schools, volunteering, joining a Japanese sports team or hobby circle (サークル). Being in Japan 1+ years and speaking basic Japanese opens up a completely different social world.' },
    ],
  },
]

export default function JapanExpatSurvivalGuide() {
  return (
    <div className="min-h-screen bg-white max-w-2xl mx-auto px-5 py-8">
      <Link href="/guides" className="text-sm text-brand-500 hover:text-brand-600 mb-6 inline-block">← All Guides</Link>

      <h1 className="text-3xl font-black text-gray-900 mb-3 leading-tight">
        Japan Expat Survival Guide 2026
      </h1>
      <p className="text-gray-500 mb-2">Everything foreigners need to live, work, and thrive in Japan — banking, housing, healthcare, language, and community.</p>
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-8">
        <span>📅 Updated April 2026</span>
        <span>·</span>
        <span>⏱ 12 min read</span>
      </div>

      {/* Jump links */}
      <div className="flex flex-wrap gap-2 mb-8">
        {SECTIONS.map(s => (
          <a key={s.id} href={`#${s.id}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-50 border border-brand-100 text-brand-600 text-xs font-semibold rounded-full hover:bg-brand-100 transition">
            {s.emoji} {s.title}
          </a>
        ))}
      </div>

      <div className="space-y-10">
        {SECTIONS.map(section => (
          <section key={section.id} id={section.id}>
            <h2 className="text-xl font-extrabold text-gray-900 mb-5">
              {section.emoji} {section.title}
            </h2>
            <div className="space-y-4">
              {section.content.map((item, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <p className="font-bold text-sm text-gray-900 mb-2">Q: {item.q}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="bg-brand-50 border border-brand-100 rounded-3xl p-6 text-center mt-10">
        <div className="text-3xl mb-3">🗾</div>
        <h3 className="text-lg font-extrabold text-gray-900 mb-2">Get real answers from real expats.</h3>
        <p className="text-sm text-gray-500 mb-4">Join nowjp and connect with foreigners who've navigated everything in this guide — and are ready to help you do the same.</p>
        <Link href="/signup"
          className="inline-block px-8 py-3.5 bg-brand-500 text-white rounded-2xl font-bold text-sm shadow-md shadow-brand-200 hover:bg-brand-600 transition">
          Join nowjp Free →
        </Link>
      </div>
    </div>
  )
}
