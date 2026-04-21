import Link from 'next/link'
import type { Metadata } from 'next'
import ArticleJsonLd from '@/components/seo/ArticleJsonLd'

export const metadata: Metadata = {
  title: 'New to Japan — Survival Guide for Foreigners | Samee',
  description: 'Just moved to Japan? This survival guide covers everything you need in your first weeks: residence card, bank account, phone, health insurance, and making friends.',
  keywords: ['new to japan', 'just moved to japan', 'japan survival guide', 'foreigner japan first steps', 'moving to japan checklist', 'japan expat guide'],
  openGraph: {
    title: 'New to Japan — Your First-Week Survival Guide',
    description: 'Everything you need to know in your first weeks in Japan. From residence card to making friends.',
  },
}

const SECTIONS = [
  {
    emoji: '📋',
    title: 'Week 1 checklist — the non-negotiables',
    content: `These must be done within 14 days of arrival. Do them in this order:\n\n1. **Register at your Ward Office (市区町村役所)** — Bring your passport and residence card. You'll get your My Number card application started here. This unlocks everything else.\n\n2. **Get National Health Insurance (国民健康保険)** — Also at the ward office. Costs roughly ¥2,000–15,000/month depending on income. Covers 70% of medical costs immediately.\n\n3. **Open a bank account** — Japan Post Bank (ゆうちょ銀行) is the easiest for new arrivals with no job yet. Bring residence card + passport.\n\n4. **Get a SIM card** — IIJmio, Mineo, or Rakuten Mobile are popular. Bring residence card + credit card. Data-only plans from ¥880/month.`,
  },
  {
    emoji: '🏠',
    title: 'Housing reality check',
    content: `Japan's rental system is famously difficult for foreigners. Here's what you're actually dealing with:\n\n**The problems:** Key money (礼金, non-refundable gift to landlord), guarantor requirements, and agents who won't rent to foreigners without a Japanese co-signer.\n\n**The workarounds:**\n- **Share houses** (Tokyo Sharehouse, Sakura House, Oak House) — no key money, no guarantor, move in fast. From ¥40,000/month all-in.\n- **Foreigner-friendly agencies** — Able, Minimini, and Real Estate Japan have English support and know which landlords accept foreigners.\n- **UR Housing** — Government housing, no key money, no guarantor. Slightly suburban but legitimate.\n\nBudget for initial move-in: 4–6x monthly rent (deposit + key money + agent fee + first month).`,
  },
  {
    emoji: '💰',
    title: 'Money and banking in Japan',
    content: `Japan is still largely a cash society. This surprises most new arrivals.\n\n**ATMs:** 7-Eleven ATMs accept foreign cards 24/7. Japan Post and Lawson ATMs also work. Convenience store ATMs charge ¥110–220 per withdrawal.\n\n**Sending money home:** Wise (formerly TransferWise) has the best rates. Register with your residence card. For amounts under ¥100,000, it's fast and cheap.\n\n**Getting paid:** You'll need a Japanese bank account for salary. Once you have a job offer, banks become easier — some employers provide introduction letters.\n\n**Credit cards:** Not universally accepted. Always carry cash. Markets, small restaurants, and shrines are cash-only. Budget ¥30,000–50,000 cash as your emergency fund.`,
  },
  {
    emoji: '🚃',
    title: 'Getting around Japan',
    content: `Japan's public transit is world-class — and complicated. The learning curve is steep for the first month, then becomes second nature.\n\n**IC Cards:** Get a Suica or Pasmo card immediately. Load it at any station. Works on almost all trains, buses, and convenience store payments nationwide.\n\n**Navigation:** Google Maps works perfectly for transit in Japan. Set language to English. Yahoo! Japan Transit is also excellent.\n\n**Bicycle:** In most Japanese cities outside Tokyo center, a bicycle is life-changing. Used bikes from ¥3,000–10,000 at local shops or Mercari.\n\n**Driving:** International driving permits are valid for 1 year from your home country license. Japan drives on the left. Parking is paid and scarce in cities — driving is for suburbs and rural areas.`,
  },
  {
    emoji: '🏥',
    title: 'Healthcare for foreigners',
    content: `National Health Insurance covers you from the moment you register — use it.\n\n**Finding English-speaking doctors:** AMDA International Medical Information Center (0120-56-2009) has multilingual support. Japan Healthcare Info maintains an English clinic database.\n\n**Prescription medicine:** Some common Western medications are not available in Japan or require different brand names. Bring a 3-month supply of any critical medication and the generic name (not brand name) to find Japanese equivalents.\n\n**Mental health:** Access to English-speaking therapists has improved significantly. TELL Lifeline (03-5774-0992) provides English counseling. Tokyo English Lifeline also offers crisis support.\n\n**Dental:** Covered by national health insurance. Routine checkups and cleaning are affordable (¥1,500–3,000 per visit).`,
  },
  {
    emoji: '👥',
    title: 'Making friends — the real talk',
    content: `Making friends in Japan as a foreigner is genuinely hard. Here's what actually works:\n\n**What doesn't work:** Hoping it happens naturally. Waiting for Japanese colleagues to invite you. Assuming your coworkers will become close friends.\n\n**What works:**\n- **Language exchange** — Find a Japanese person who wants to learn your language. You meet regularly, you both benefit, friendships form naturally.\n- **Hobby groups** — Sports teams, hiking clubs, cooking classes. Shared activity removes the awkwardness of "we're just meeting because we're both foreigners."\n- **Expat communities** — Other foreigners understand what you're going through. Build this network first, then expand.\n- **Samee** — Match with people at the same arrival stage as you, or find locals who specifically want to meet foreigners.\n\nPlan to invest 3–6 months before you feel like you have a real social circle. That's normal.`,
  },
]

export default function NewToJapan() {
  return (
    <div className="min-h-screen bg-white flex flex-col max-w-[430px] mx-auto">
      <ArticleJsonLd
        title="New to Japan: Your Survival Guide"
        description="Everything you need to know in your first weeks in Japan. From the ward office to making your first friend."
        url="https://sameejapan.com/guides/new-to-japan"
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
        <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold px-3 py-1 rounded-full mb-4">
          ✈️ New Arrival Guide
        </div>
        <h1 className="text-2xl font-black text-gray-900 leading-tight mb-3">
          New to Japan:<br />Your Survival Guide
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          Everything you need to know in your first weeks. From the ward office to making your first friend.
        </p>
      </section>

      <div className="mx-5 mb-8 bg-brand-500 rounded-2xl p-4 text-center">
        <p className="text-white font-bold text-sm mb-1">You just landed. We've got you.</p>
        <p className="text-blue-100 text-xs mb-3">Find friends at the same stage as you on Samee</p>
        <Link href="/signup" className="inline-block px-6 py-2.5 bg-white text-brand-600 rounded-xl font-bold text-sm active:scale-95 transition-all">
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

      <section className="bg-blue-50 mx-5 rounded-3xl p-6 mb-10 text-center">
        <div className="text-4xl mb-3">✈️</div>
        <h2 className="font-extrabold text-gray-900 text-lg mb-2">Find your people in Japan</h2>
        <p className="text-gray-500 text-sm mb-5 leading-relaxed">Join Samee free. Match with other new arrivals and locals who get it.</p>
        <Link href="/signup" className="block w-full py-4 bg-brand-500 text-white rounded-2xl font-bold text-sm text-center shadow-md shadow-brand-200 active:scale-[0.98] transition-all">
          Get Started — It's Free
        </Link>
      </section>

      <div className="px-5 pb-6 flex gap-3 text-xs text-gray-400 justify-center flex-wrap">
        <Link href="/guides/expats-in-tokyo" className="hover:text-gray-600">Tokyo Guide →</Link>
        <Link href="/guides/expats-in-osaka" className="hover:text-gray-600">Osaka Guide →</Link>
        <Link href="/guides/language-exchange-japan" className="hover:text-gray-600">Language Exchange →</Link>
      </div>
    </div>
  )
}
