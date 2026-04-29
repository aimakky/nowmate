'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'

const CATEGORIES = ['All', 'First Week', 'Money', 'Housing', 'Health', 'Transport', 'Language', 'Emergency']

const TIPS = [
  // First Week
  { category: 'First Week', emoji: '🏦', title: 'Opening a bank account', stage: 'new',
    body: 'Japan Post Bank (ゆうちょ) is the easiest for new arrivals — no Japanese required at many branches. Bring your residence card (在留カード) and passport. Some branches have English staff on certain days.' },
  { category: 'First Week', emoji: '📱', title: 'Getting a SIM card', stage: 'new',
    body: 'IIJmio or Rakuten Mobile are expat favorites. You can get one at the airport (more expensive) or at Yodobashi/BIC Camera stores. You need a Japanese address and residence card.' },
  { category: 'First Week', emoji: '🏛️', title: 'Register at your Ward Office (市区役所)', stage: 'new',
    body: 'Do this within 14 days of moving in. You\'ll get your residence card updated and health insurance enrollment. Bring your passport and lease agreement.' },
  { category: 'First Week', emoji: '🗂️', title: 'My Number Card — get it early', stage: 'new',
    body: 'Apply for your My Number card at the ward office. It takes 1–2 months to arrive but you\'ll need it for taxes, banking, and more. The sooner you apply, the better.' },

  // Money
  { category: 'Money', emoji: '💴', title: 'Cash is still king in Japan', stage: 'new',
    body: '7-Eleven ATMs accept international cards and have English menus. Japan is still heavily cash-based — always carry ¥5,000–10,000. Many izakayas and small restaurants are cash only.' },
  { category: 'Money', emoji: '📊', title: 'Filing taxes as a foreign resident', stage: 'settling',
    body: 'If you work for a Japanese company, taxes are usually withheld (year-end adjustment). Freelancers and remote workers must file a tax return (確定申告) each February–March.' },
  { category: 'Money', emoji: '💳', title: 'Getting a credit card', stage: 'settling',
    body: 'Rakuten Card is easiest to get as a foreigner. After 1 year of residence, you have more options. Having a Japanese bank account for 6+ months helps approval.' },

  // Housing
  { category: 'Housing', emoji: '🏠', title: 'Renting as a foreigner — what to expect', stage: 'new',
    body: 'Most landlords require a Japanese guarantor or guarantor company (保証会社). Agencies like Sakura House and Oakhouse specialize in foreigners. Budget for key money (礼金), deposit, and agent fees — often 3–5 months\' rent upfront.' },
  { category: 'Housing', emoji: '🔑', title: 'Share houses are the fastest option', stage: 'new',
    body: 'Oakhouse, Sakura House, and Tokyo Sharehouse have English websites and no guarantor needed. Great for networking and meeting other expats while you get settled.' },
  { category: 'Housing', emoji: '🗑️', title: 'Garbage rules — don\'t get it wrong', stage: 'new',
    body: 'Garbage is separated by type and collected on specific days only. Your ward office gives you a schedule and colored bags. Putting out trash on the wrong day is a serious faux pas.' },

  // Health
  { category: 'Health', emoji: '🏥', title: 'Finding an English-speaking doctor', stage: 'new',
    body: 'Clinic Finder by AMDA and Tokyo Medical & Surgical (in Azabu) are popular with expats. Many large university hospitals have international departments (国際診療部). Always bring your health insurance card.' },
  { category: 'Health', emoji: '💊', title: 'Over-the-counter medication differences', stage: 'new',
    body: 'Japanese OTC meds are often lower dose than Western equivalents. Matsumoto Kiyoshi and Welcia are major drugstore chains. For prescriptions, you\'ll need a doctor\'s visit first.' },
  { category: 'Health', emoji: '🦷', title: 'Dental care in Japan', stage: 'settling',
    body: 'National health insurance covers most basic dental work. Find a dentist near your home — Google Maps works well. Many dentists near international areas speak English.' },

  // Transport
  { category: 'Transport', emoji: '🚃', title: 'IC card — get one immediately', stage: 'new',
    body: 'Suica (Tokyo) or ICOCA (Osaka/Kansai) are rechargeable cards that work on trains, buses, and even at many convenience stores. You can get one at any major train station.' },
  { category: 'Transport', emoji: '🚲', title: 'Cycling in Japan', stage: 'settling',
    body: 'Bicycles must be registered with police (防犯登録). You\'re expected to follow road rules — riding on sidewalks is technically illegal in many areas. Docomo Bike Share is great for exploring.' },
  { category: 'Transport', emoji: '🚗', title: 'Driving in Japan as a foreigner', stage: 'settling',
    body: 'Citizens of countries who signed the Geneva Convention can convert their license. Others need to take the Japanese driving test. An International Driving Permit works for 1 year.' },

  // Language
  { category: 'Language', emoji: '🗣️', title: 'The Japanese you actually need first', stage: 'new',
    body: 'Master these: すみません (excuse me), ありがとうございます (thank you), これをください (I\'ll have this), トイレはどこですか (where is the toilet?). Pointing and Google Translate go a long way for the rest.' },
  { category: 'Language', emoji: '📚', title: 'Best apps for learning Japanese', stage: 'new',
    body: 'Anki (flashcards for kanji/vocab), Bunpro (grammar), and HelloTalk (language exchange) are the expat favorites. 休憩村 is great for practicing with real people nearby!' },
  { category: 'Language', emoji: '✍️', title: 'Learning to read hiragana & katakana', stage: 'new',
    body: 'Hiragana and katakana can be learned in 1–2 weeks with daily practice. Start with hiragana. Knowing katakana helps you read imported food products and menu items.' },

  // Emergency
  { category: 'Emergency', emoji: '🚨', title: 'Emergency numbers in Japan', stage: 'new',
    body: '110 = Police, 119 = Fire/Ambulance. For English assistance: #7119 for medical consultation, or Japan Visitor Hotline: 050-3816-2787 (available 24/7 in English).' },
  { category: 'Emergency', emoji: '🌊', title: 'Earthquake preparedness', stage: 'new',
    body: 'Download the NHK World App and Japan\'s Yurekuru Call for earthquake alerts. Keep a go-bag with water, snacks, and copies of your documents. Know your nearest evacuation point (避難場所).' },
]

export default function CommunityPage() {
  const [activeCategory, setActiveCategory] = useState('All')

  const filtered = activeCategory === 'All' ? TIPS : TIPS.filter(t => t.category === activeCategory)

  return (
    <div className="max-w-md mx-auto pb-24">
      <Header title="Japan Life Tips" />

      <div className="px-4 pt-3 pb-2">
        <p className="text-sm text-gray-500">Real advice from expats who've been there.</p>
      </div>

      {/* Category filter */}
      <div className="px-4 pb-3 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 w-max">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${
                activeCategory === cat
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="px-4 space-y-3">
        {filtered.map((tip, i) => (
          <TipCard key={i} tip={tip} />
        ))}
      </div>
    </div>
  )
}

function TipCard({ tip }: { tip: typeof TIPS[0] }) {
  const [open, setOpen] = useState(false)
  const stageColors: Record<string, string> = {
    new:      'bg-blue-100 text-blue-700',
    settling: 'bg-green-100 text-green-700',
    local:    'bg-orange-100 text-orange-700',
  }
  const stageLabels: Record<string, string> = {
    new: 'New Arrival', settling: 'Settling In', local: 'Local',
  }

  return (
    <button
      onClick={() => setOpen(o => !o)}
      className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-4"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{tip.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-800 text-sm">{tip.title}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${stageColors[tip.stage]}`}>
              {stageLabels[tip.stage]}
            </span>
          </div>
          <span className="text-xs text-brand-500 font-semibold">{tip.category}</span>
          {open && (
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">{tip.body}</p>
          )}
        </div>
        <span className={`text-gray-400 text-sm flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
      </div>
    </button>
  )
}
