import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'First Week in Japan — Foreigner\'s Survival Guide 2026 | 自由村',
  description: 'What to do in your first 7 days in Japan as a foreigner. From landing at the airport to getting your residence card, SIM, bank account, and health insurance — step by step.',
  keywords: ['first week in japan', 'just arrived japan foreigner', 'first days in japan guide', 'japan arrival guide', 'new to japan first week', 'japan landing checklist'],
  openGraph: {
    title: 'First Week in Japan — What Every Foreigner Must Do',
    description: 'Step-by-step guide for your first 7 days in Japan. Don\'t miss the 14-day residence registration deadline.',
  },
}

const DAYS = [
  {
    day: 'Day 1 — At the airport',
    emoji: '✈️',
    steps: [
      { title: 'Get your Residence Card (在留カード)', note: 'Issued at major airports (Narita, Haneda, Kansai) on arrival for long-stay visas. This is your most important document in Japan.' },
      { title: 'Buy a travel SIM or pocket WiFi', note: 'Available at airport convenience stores. Get data connectivity immediately — you\'ll need maps and translation.' },
      { title: 'Get some cash (¥30,000+)', note: 'Japan is still cash-heavy. 7-Eleven ATMs accept foreign cards 24/7 and have English menus.' },
      { title: 'Get to your accommodation', note: 'Narita Express (N\'EX) or Limousine Bus to Tokyo. IC card not needed on first trip — buy a paper ticket.' },
    ],
  },
  {
    day: 'Day 2–3 — First priority admin',
    emoji: '🏛️',
    steps: [
      { title: 'Register 住民票 at your Ward Office', note: 'Required within 14 days by law. Bring passport + residence card. Takes 30–60 min. This unlocks bank accounts, insurance, and more.' },
      { title: 'Enroll in National Health Insurance', note: 'Do this same visit. You\'re covered immediately. Cost depends on income — typically ¥2,000–15,000/month.' },
      { title: 'Get a proper SIM card', note: 'IIJmio, Rakuten Mobile, or Mineo. Bring residence card. Monthly plans from ¥880. Don\'t overpay for airport SIMs long-term.' },
    ],
  },
  {
    day: 'Day 3–5 — Banking and transit',
    emoji: '🏦',
    steps: [
      { title: 'Open Japan Post Bank (ゆうちょ銀行)', note: 'The easiest bank for new arrivals. Located inside post offices nationwide. Bring residence card + passport. English available.' },
      { title: 'Get a Suica or Pasmo IC card', note: 'Buy at any major station. Load ¥3,000 to start. Works on trains, buses, taxis, and convenience store payments.' },
      { title: 'Find your local convenience stores', note: '7-Eleven, FamilyMart, Lawson — open 24/7. ATMs, hot food, printing, bill payments. Your new best friends.' },
    ],
  },
  {
    day: 'Day 5–7 — Getting comfortable',
    emoji: '🏠',
    steps: [
      { title: 'Apply for My Number Card (マイナンバーカード)', note: 'Takes 4–6 weeks but apply early. Needed for tax filing, better banking, and many official services.' },
      { title: 'Set up LINE (messaging app)', note: 'Essential in Japan — used for work, landlords, friends, and restaurants. Most Japanese don\'t use WhatsApp or iMessage.' },
      { title: 'Find expats in your area', note: 'You\'re not the first foreigner to figure this out. Connect with people who\'ve done it — ask on 自由村.' },
      { title: 'Explore your neighborhood', note: 'Find your closest supermarket (スーパー), 100-yen shop (百均), and drug store (ドラッグストア). These are your daily spots.' },
    ],
  },
]

const EMERGENCY_CONTACTS = [
  { emoji: '🚑', label: 'Ambulance / Fire', number: '119' },
  { emoji: '🚔', label: 'Police', number: '110' },
  { emoji: '🌐', label: 'Foreign Resident Consultation (multilingual)', number: '0570-013-904' },
  { emoji: '🏥', label: 'AMDA Medical (English support)', number: '03-5285-8088' },
]

export default function FirstWeekInJapan() {
  return (
    <div className="min-h-screen bg-white max-w-2xl mx-auto px-5 py-8">
      <Link href="/guides" className="text-sm text-brand-500 hover:text-brand-600 mb-6 inline-block">← All Guides</Link>

      <h1 className="text-3xl font-black text-gray-900 mb-3 leading-tight">
        First Week in Japan
      </h1>
      <p className="text-gray-500 mb-2">Day-by-day guide for your first 7 days as a foreigner in Japan.</p>
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-8">
        <span>📅 Updated April 2026</span>
        <span>·</span>
        <span>⏱ 6 min read</span>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-8">
        <p className="text-sm font-bold text-red-700 mb-1">⚠️ 14-day deadline</p>
        <p className="text-sm text-red-600">You must register your address (住民票) within 14 days of arrival. Missing this is technically illegal and causes problems with banking, insurance, and more.</p>
      </div>

      <div className="space-y-8 mb-10">
        {DAYS.map((section) => (
          <section key={section.day}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">{section.emoji}</span>
              <h2 className="text-lg font-extrabold text-gray-900">{section.day}</h2>
            </div>
            <div className="space-y-3 pl-2 border-l-2 border-brand-200">
              {section.steps.map((step, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm ml-3">
                  <p className="font-semibold text-sm text-gray-800 mb-1">{step.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{step.note}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Emergency contacts */}
      <section className="mb-10">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4">🚨 Save these numbers now</h2>
        <div className="space-y-2">
          {EMERGENCY_CONTACTS.map(c => (
            <a key={c.number} href={`tel:${c.number}`}
              className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3.5 shadow-sm hover:bg-gray-50 transition">
              <span className="text-xl">{c.emoji}</span>
              <div className="flex-1">
                <p className="font-semibold text-sm text-gray-800">{c.label}</p>
              </div>
              <span className="font-bold text-brand-500 font-mono">{c.number}</span>
            </a>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="bg-brand-50 border border-brand-100 rounded-3xl p-6 text-center">
        <div className="text-3xl mb-3">🤝</div>
        <h3 className="text-lg font-extrabold text-gray-900 mb-2">Stuck on something?</h3>
        <p className="text-sm text-gray-500 mb-4">Post a help request on 自由村 — people who've been through your exact situation are ready to help. Free, fast, and real.</p>
        <Link href="/signup"
          className="inline-block px-8 py-3.5 bg-brand-500 text-white rounded-2xl font-bold text-sm shadow-md shadow-brand-200 hover:bg-brand-600 transition">
          Get help on 自由村 →
        </Link>
      </div>
    </div>
  )
}
