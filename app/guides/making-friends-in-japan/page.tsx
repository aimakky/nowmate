import Link from 'next/link'
import type { Metadata } from 'next'
import ArticleJsonLd from '@/components/seo/ArticleJsonLd'

export const metadata: Metadata = {
  title: 'Making Friends in Japan as a Foreigner — The Honest Guide | 休憩村',
  description: 'Making friends in Japan is genuinely hard for foreigners. This guide covers why it\'s difficult, what actually works, and how to build a real social life in Japan.',
  keywords: ['making friends in japan', 'friends japan foreigner', 'social life japan expat', 'how to make friends japan', 'expat loneliness japan'],
  openGraph: {
    title: 'Making Friends in Japan — The Honest Guide for Foreigners',
    description: 'Why it\'s hard, what actually works, and how to build a real social life in Japan.',
  },
}

const SECTIONS = [
  {
    emoji: '🤔',
    title: 'Why making friends in Japan is actually hard',
    content: `Let's not sugarcoat it: Japan has some of the highest reported loneliness rates among expats of any country. This isn't about Japan being unfriendly — it's about specific cultural and structural barriers.\n\n**The barrier is real, but it's not what you think.** Most people assume the language barrier is the main issue. It's not. Plenty of expats speak decent Japanese and still struggle to make genuine friends. The deeper issue is Japan's social structure: friend groups form early in life (school, first job) and rarely take on new members.\n\nJapanese people aren't cold — they're just careful. Friendship means something serious. An acquaintance who's friendly at work is not necessarily someone who wants to hang out on weekends.\n\n**For expats:** You're an outsider to these established networks. Building your way in takes time, intentionality, and realistic expectations.`,
  },
  {
    emoji: '❌',
    title: 'What doesn\'t work (and why)',
    content: `**Hoping it happens naturally** — In most Western countries, friendships can form spontaneously at bars, parties, or through mutual friends. This works less reliably in Japan. Casual socializing rarely turns into sustained friendship without deliberate effort.\n\n**Relying only on expat events** — "Networking events" and "international mixers" attract a certain type of person but rarely produce deep friendships. They feel transactional because they are.\n\n**Language exchange apps (transactional mode)** — Many language exchange encounters stay exactly that: a transaction. Your Japanese for their English. Without shared purpose beyond the exchange, friendships rarely develop.\n\n**Coworkers as friends** — Japanese work culture keeps professional and personal lives separate. Your colleagues may be kind and collegial at work but rarely cross the threshold into genuine friendship. Exceptions exist, but don't plan around them.`,
  },
  {
    emoji: '✅',
    title: 'What actually works',
    content: `**Shared activity, regularly repeated** — The recipe for friendship anywhere is proximity + repeated interaction + emotional sharing. In Japan, the first two are best achieved through a regular group activity.\n\nSports clubs (soccer, tennis, running), hobby groups (board games, hiking, cooking), music circles — these create the repeated contact that friendship needs to develop. Look for circles (サークル) connected to universities, community centers, or local sports fields.\n\n**Language exchange done right** — Instead of formal practice sessions, find someone to do life with in both languages. Cooking together, watching movies, going to events. The friendship forms around the activity, with language as a side effect.\n\n**Expat mentors and newcomer networks** — Older expats who've been in Japan 5+ years have already solved this problem. Connect with them. They have Japanese friends, established circles, and can introduce you. One introduction from a trusted insider is worth 50 cold approaches.\n\n**International-friendly Japanese people** — They exist in large numbers, and they actively want to meet foreigners. University international departments, global companies, and specifically international spaces in Japan attract this type. They're not representative of all Japanese people — but they're your entry point.`,
  },
  {
    emoji: '📱',
    title: 'Apps and platforms that help',
    content: `**休憩村** — Specifically built for foreigners in Japan to find friends, language partners, and local support. You set your arrival stage (just arrived, settling in, Japan local) and match with people who get where you are. Free.\n\n**Meetup.com** — Still active in Tokyo and Osaka. "International" and "English" meetup groups are your filter. Quality varies wildly but there are genuinely good groups.\n\n**InterNations** — More professional/business oriented. Better for career networking than close friendships. Monthly social events in major cities.\n\n**HelloTalk / Tandem** — For language exchange partners specifically. Works better if you approach it as "let's do things together in both languages" vs. "let's practice grammar."\n\n**Facebook Groups** — "Foreigners in Japan," "Expats in Tokyo/Osaka" etc. are active communities. Post honestly about what you're looking for. People respond.`,
  },
  {
    emoji: '⏳',
    title: 'Realistic timeline',
    content: `Set expectations accurately. Here's what most expats report:\n\n**Month 1–3:** Survival mode. You're figuring out logistics, feeling lonely, meeting people but not yet clicking with anyone. This is normal.\n\n**Month 3–6:** You start having recurring contact with a few people. Acquaintances emerge. You know who you might want to spend more time with.\n\n**Month 6–12:** First real friendships form. If you've been intentional — joining something, showing up regularly — you now have 1–3 genuine friends.\n\n**Year 1–2:** Your social circle stabilizes. You're no longer lonely in the same acute way. New friendships still form but more naturally.\n\n**2+ years:** You have a real community. You're the person newer arrivals turn to for advice.\n\nThe people who move through this timeline fastest are those who join something regular within the first month and show up consistently. The people who struggle longest are those who wait for it to happen naturally.`,
  },
  {
    emoji: '🇯🇵',
    title: 'Building Japanese friendships specifically',
    content: `If you want to build friendships with Japanese people (not just other expats), some additional context:\n\n**Invest in the language** — Even basic Japanese dramatically expands your options. N4–N3 Japanese opens the majority of social situations. You don't need fluency, but some effort signals respect and creates warmth.\n\n**Be consistent** — Japanese friendships often take longer to deepen but tend to be more loyal and sustained once established. Don't interpret slowness as rejection.\n\n**Accept invitations, even when tired** — Japanese social invitations (especially from colleagues or acquaintances) are often tentative. Saying yes, even once, dramatically changes the relationship. "Sou da ne, ikimasho" can open doors.\n\n**Nomikai (飲み会) culture** — Post-work drinking is still a significant social bonding ritual in Japan. You don't have to drink heavily, but showing up and participating is where many Japanese workplace friendships deepen.\n\n**Direct interest in Japan** — Japanese people warm quickly to foreigners who are genuinely curious about Japan, not just passing through. Ask about regional food, local festivals, cultural practices. Curiosity creates connection.`,
  },
]

export default function MakingFriendsJapan() {
  return (
    <div className="min-h-screen bg-white flex flex-col max-w-[430px] mx-auto">
      <ArticleJsonLd
        title="Making Friends in Japan as a Foreigner — The Honest Guide"
        description="Why making friends in Japan is hard, what actually works, and how to build a real social life."
        url="https://休憩村japan.com/guides/making-friends-in-japan"
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
        <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold px-3 py-1 rounded-full mb-4">
          👥 Friend Guide
        </div>
        <h1 className="text-2xl font-black text-gray-900 leading-tight mb-3">
          Making Friends in Japan:<br />The Honest Guide
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          Why it's hard, what actually works, and how long it really takes.
        </p>
      </section>

      <div className="mx-5 mb-8 bg-brand-500 rounded-2xl p-4 text-center">
        <p className="text-white font-bold text-sm mb-1">Skip the hard part</p>
        <p className="text-blue-100 text-xs mb-3">Find friends at your arrival stage on 休憩村</p>
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

      <section className="bg-rose-50 mx-5 rounded-3xl p-6 mb-10 text-center">
        <div className="text-4xl mb-3">👥</div>
        <h2 className="font-extrabold text-gray-900 text-lg mb-2">Find your people today</h2>
        <p className="text-gray-500 text-sm mb-5 leading-relaxed">休憩村 matches you with expats and locals in Japan. Free, no weird vibes.</p>
        <Link href="/signup" className="block w-full py-4 bg-brand-500 text-white rounded-2xl font-bold text-sm text-center shadow-md shadow-brand-200 active:scale-[0.98] transition-all">
          Get Started — It's Free
        </Link>
      </section>

      <div className="px-5 pb-6 flex gap-3 text-xs text-gray-400 justify-center flex-wrap">
        <Link href="/guides/new-to-japan" className="hover:text-gray-600">← New to Japan</Link>
        <Link href="/guides/language-exchange-japan" className="hover:text-gray-600">Language Exchange →</Link>
      </div>
    </div>
  )
}
