import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Moving to Japan Checklist 2026 — Complete Guide for Foreigners | Samee',
  description: 'The complete moving to Japan checklist for 2026. Everything to do before you leave and in your first 30 days: visa, housing, bank account, health insurance, SIM card, and more.',
  keywords: ['moving to japan checklist', 'moving to japan guide 2026', 'japan expat checklist', 'what to do when moving to japan', 'japan relocation guide', 'before moving to japan'],
  openGraph: {
    title: 'Moving to Japan Checklist 2026 — Complete Foreigner Guide',
    description: 'Everything to do before you land and in your first 30 days in Japan. The most complete checklist for foreigners.',
  },
}

const BEFORE_ARRIVE = [
  { done: false, task: 'Confirm your visa type and validity period', note: 'Working holiday, student, work, spouse — each has different rules for banking and insurance.' },
  { done: false, task: 'Book temporary accommodation for first 2 weeks', note: 'Share houses (Sakura House, Tokyo Sharehouse) are best. Hotels work but expensive.' },
  { done: false, task: 'Get international travel insurance', note: 'National health insurance takes a few days to activate. Bridge the gap.' },
  { done: false, task: 'Bring a 3-month supply of any prescription medicine', note: 'Some medications unavailable in Japan. Get the generic name from your doctor.' },
  { done: false, task: 'Download Google Maps Japan offline', note: 'Saves data and works in subway dead zones.' },
  { done: false, task: 'Notify your home bank of Japan travel', note: 'Avoid card blocks. Japan\'s ATMs (7-Eleven, Japan Post) accept most foreign cards.' },
  { done: false, task: 'Get a Wise (international bank) account', note: 'Best rates for sending money home and spending before you open a Japanese bank.' },
  { done: false, task: 'Learn 10 essential Japanese phrases', note: 'すみません (excuse me), ありがとう (thank you), わかりません (I don\'t understand).' },
]

const FIRST_WEEK = [
  { priority: '🔴', task: 'Register at your Ward Office (市区町村役所)', note: 'Required within 14 days. Bring passport + residence card. This unlocks everything else.', link: null },
  { priority: '🔴', task: 'Enroll in National Health Insurance (国民健康保険)', note: 'Same visit as 住民票. Costs ~¥2,000–15,000/month. Covers 70% of medical costs.', link: null },
  { priority: '🔴', task: 'Get a SIM card', note: 'IIJmio, Rakuten Mobile, or Mineo. From ¥880/month. Bring residence card.', link: null },
  { priority: '🟡', task: 'Open Japan Post Bank account (ゆうちょ銀行)', note: 'Easiest bank for newcomers. No job required. Bring residence card + passport.', link: null },
  { priority: '🟡', task: 'Get a Suica or Pasmo IC card', note: 'Works on all trains, buses, and convenience stores. Get it at any major station.', link: null },
  { priority: '🟡', task: 'Find your nearest convenience stores (コンビニ)', note: '7-Eleven, FamilyMart, Lawson — your lifeline. ATMs, printing, payments, food.', link: null },
  { priority: '🟢', task: 'Apply for My Number Card (マイナンバーカード)', note: 'Takes 4–6 weeks. Apply early — needed for tax, banking upgrades, and more.', link: null },
  { priority: '🟢', task: 'Set up a Japanese phone number', note: 'Required for most apps, banking, and job applications.', link: null },
]

const FIRST_MONTH = [
  { task: 'Find permanent housing', note: 'Use Foreigner-friendly agencies: Able, Real Estate Japan. Or stay in share house.' },
  { task: 'Set up utilities (electricity, gas, water)', note: 'Often needs Japanese speaker or Line/web registration. Ask your share house manager.' },
  { task: 'Get a bicycle', note: 'Game-changer outside central Tokyo. Used from ¥3,000 on Mercari or Junk shops.' },
  { task: 'Register with local tax office if freelancing', note: 'Freee.jp has English support for 確定申告 setup.' },
  { task: 'Find an English-speaking doctor near you', note: 'AMDA (0120-56-2009) has multilingual referrals.' },
  { task: 'Connect with other expats in your city', note: 'Use Samee — find people at your exact arrival stage.' },
]

export default function MovingToJapanChecklist() {
  return (
    <div className="min-h-screen bg-white max-w-2xl mx-auto px-5 py-8">
      <Link href="/guides" className="text-sm text-brand-500 hover:text-brand-600 mb-6 inline-block">← All Guides</Link>

      <h1 className="text-3xl font-black text-gray-900 mb-3 leading-tight">
        Moving to Japan Checklist 2026
      </h1>
      <p className="text-gray-500 mb-2">Complete guide for foreigners — before you arrive and your first 30 days.</p>
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-8">
        <span>📅 Updated April 2026</span>
        <span>·</span>
        <span>⏱ 8 min read</span>
        <span>·</span>
        <span>✅ 22 items</span>
      </div>

      {/* Before you arrive */}
      <section className="mb-10">
        <h2 className="text-xl font-extrabold text-gray-900 mb-1">✈️ Before you arrive</h2>
        <p className="text-sm text-gray-400 mb-4">Do these before boarding the plane.</p>
        <div className="space-y-3">
          {BEFORE_ARRIVE.map((item, i) => (
            <div key={i} className="flex gap-3 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-gray-800">{item.task}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.note}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* First week */}
      <section className="mb-10">
        <h2 className="text-xl font-extrabold text-gray-900 mb-1">🗓 First 7 days</h2>
        <p className="text-sm text-gray-400 mb-4">🔴 = urgent (legal requirement) · 🟡 = important · 🟢 = can wait</p>
        <div className="space-y-3">
          {FIRST_WEEK.map((item, i) => (
            <div key={i} className="flex gap-3 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <span className="text-lg flex-shrink-0">{item.priority}</span>
              <div>
                <p className="font-semibold text-sm text-gray-800">{item.task}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.note}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* First month */}
      <section className="mb-10">
        <h2 className="text-xl font-extrabold text-gray-900 mb-1">📅 First 30 days</h2>
        <p className="text-sm text-gray-400 mb-4">Get settled and build your life in Japan.</p>
        <div className="space-y-3">
          {FIRST_MONTH.map((item, i) => (
            <div key={i} className="flex gap-3 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-gray-800">{item.task}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.note}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="bg-brand-50 border border-brand-100 rounded-3xl p-6 text-center">
        <div className="text-3xl mb-3">🤝</div>
        <h3 className="text-lg font-extrabold text-gray-900 mb-2">Don't do this alone.</h3>
        <p className="text-sm text-gray-500 mb-4">Connect with expats who've done every step of this checklist. Get real answers, find friends, and survive Japan together.</p>
        <Link href="/signup"
          className="inline-block px-8 py-3.5 bg-brand-500 text-white rounded-2xl font-bold text-sm shadow-md shadow-brand-200 hover:bg-brand-600 transition">
          Join Samee Free →
        </Link>
      </div>
    </div>
  )
}
