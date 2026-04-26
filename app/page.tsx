import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'samee — あなたの職業で、本音が話せる。',
  description: '看護師には看護師の、教師には教師の、エンジニアにはエンジニアの、仕事終わりがある。電話認証済みの同じ職業の人たちだけが集まるコミュニティ。',
  openGraph: {
    title: 'samee — あなたの職業で、本音が話せる。',
    description: '職場では言えないことを、同じ職業の人間だけで話せる。',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}

const OCCUPATIONS = [
  { emoji: '🏥', job: '看護師', text: '患者さんが亡くなった夜、帰り道に誰かに話したくて。家族には言えない。', replies: 11, reactions: 24 },
  { emoji: '📚', job: '教師',   text: '今日また保護者からクレームが来た。同僚には言えないし、友達は理解してくれない。', replies: 8, reactions: 19 },
  { emoji: '💻', job: 'エンジニア', text: '転職するか迷ってる。年収は上がるけど、今のチームが好きで。', replies: 6, reactions: 15 },
  { emoji: '🏢', job: '介護士', text: '体がしんどい。でもこの仕事が嫌いじゃないから余計つらい。', replies: 9, reactions: 21 },
]

const PROFESSIONS = [
  { emoji: '🏥', label: '看護師・医療',  slug: 'nurses',    count: '347人' },
  { emoji: '📚', label: '教師・教育',    slug: 'teachers',  count: '218人' },
  { emoji: '💻', label: 'エンジニア',    slug: 'engineers', count: '523人' },
  { emoji: '🏢', label: '介護・福祉',    slug: 'caregivers', count: '189人' },
  { emoji: '👮', label: '公務員',        slug: 'officials', count: '156人' },
  { emoji: '🏬', label: '営業・販売',    slug: 'sales',     count: '298人' },
]

const VOICES = [
  {
    text: '同じ看護師の人たちだから、「わかる」が積み上がっていく。外では言えないことが言えた。',
    name: '看護師・31歳',
    tag: '看護師村',
  },
  {
    text: '教員同士で愚痴ってる感じじゃなくて、ちゃんと「一緒に考える」雰囲気がある。',
    name: '中学教師・28歳',
    tag: '教師村',
  },
  {
    text: 'エンジニアの転職談義ができる場所。技術的な話も生活の話も、全部ここで完結してる。',
    name: 'ITエンジニア・34歳',
    tag: 'エンジニア村',
  },
]

const TRUST_POINTS = [
  { emoji: '📱', title: '電話認証が必須',          desc: '本物の人間だけが入れる。捨てアカウントが存在できない設計。' },
  { emoji: '💼', title: '職業で村が分かれている',   desc: '同じ職業の人だけが集まる村。話が「通じる」から深くなる。' },
  { emoji: '🏅', title: '信頼ティア制度',           desc: '活動するほど信頼度が上がる。「この人は本物だ」がわかる。' },
  { emoji: '🔕', title: 'マウント・説教は設計で消す', desc: '荒らしには信頼ティアが機能しない。自然淘汰される。' },
]

export default async function TopPage() {
  const supabase = createClient()
  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
  const userCount = Math.max(count ?? 0, 1)

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col max-w-[430px] mx-auto">

      {/* ── ヘッダー ── */}
      <header className="flex items-center justify-between px-5 pt-5 pb-3 sticky top-0 bg-[#FAFAF9]/95 backdrop-blur z-10 border-b border-stone-100/60">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center shadow-sm shadow-brand-200">
            <span className="text-white font-black text-sm">S</span>
          </div>
          <span className="font-extrabold text-stone-900 text-lg tracking-tight">samee</span>
        </div>
        <Link href="/login"
          className="text-sm font-bold text-brand-500 px-4 py-1.5 rounded-xl border border-brand-200 hover:bg-brand-50 transition">
          ログイン
        </Link>
      </header>

      {/* ── ヒーロー ── */}
      <section className="px-5 pt-8 pb-10 text-center flex flex-col items-center">

        {/* 参加者バッジ */}
        <div className="inline-flex items-center gap-2 bg-white border border-stone-200 rounded-full px-3.5 py-1.5 mb-6 shadow-sm">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs font-bold text-stone-700">{userCount.toLocaleString()}人が利用中</span>
        </div>

        <h1 className="text-[2.1rem] font-black text-stone-900 leading-[1.15] mb-5 tracking-tight">
          あなたの職業で、<br />
          <span className="text-brand-500">本音が話せる。</span>
        </h1>

        <p className="text-stone-500 text-[15px] leading-relaxed mb-1 max-w-[300px]">
          看護師には看護師の、<br />
          教師には教師の、
        </p>
        <p className="text-stone-500 text-[15px] leading-relaxed mb-2 max-w-[300px]">
          エンジニアにはエンジニアの、
        </p>
        <p className="text-stone-700 font-bold text-[15px] leading-relaxed mb-7 max-w-[300px]">
          仕事終わりがある。
        </p>

        <Link href="/signup"
          className="w-full py-4 bg-brand-500 text-white rounded-2xl font-extrabold text-base text-center shadow-lg shadow-brand-200 hover:bg-brand-600 active:scale-[0.98] transition-all mb-3">
          無料で始める — 30秒で登録 →
        </Link>
        <Link href="/login"
          className="w-full py-3 border-2 border-stone-200 text-stone-600 rounded-2xl font-semibold text-sm text-center hover:bg-stone-50 active:scale-[0.98] transition-all">
          すでにアカウントがある
        </Link>
        <p className="text-xs text-stone-400 mt-3">無料 · クレジットカード不要 · 18歳以上</p>
      </section>

      {/* ── 職業別コミュニティ一覧 ── */}
      <section className="px-4 pb-10">
        <div className="flex items-center gap-2 mb-4 px-1">
          <span className="text-sm">💼</span>
          <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">職業別コミュニティ</p>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {PROFESSIONS.map((p) => (
            <Link key={p.slug} href="/signup"
              className="bg-white border border-stone-100 rounded-2xl p-3.5 shadow-sm hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-2.5">
              <span className="text-2xl flex-shrink-0">{p.emoji}</span>
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-stone-800 truncate">{p.label}</p>
                <p className="text-[10px] text-brand-500 font-bold">{p.count}</p>
              </div>
            </Link>
          ))}
        </div>
        <Link href="/signup"
          className="flex items-center justify-center gap-1.5 text-sm font-bold text-brand-500 py-2">
          他の職業を見る →
        </Link>
      </section>

      {/* ── 今夜の村の声 ── */}
      <section className="bg-stone-50 px-4 py-8">
        <div className="flex items-center gap-2 mb-4 px-1">
          <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
          <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">今夜の村で起きていること</p>
        </div>
        <div className="space-y-2.5">
          {OCCUPATIONS.map((p, i) => (
            <Link key={i} href="/signup"
              className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm flex flex-col gap-2.5 hover:shadow-md transition-all active:scale-[0.99] block">
              <div className="flex items-center gap-2">
                <span className="text-base">{p.emoji}</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-brand-50 text-brand-600 border border-brand-100">{p.job}村</span>
              </div>
              <p className="text-sm text-stone-800 leading-relaxed font-medium">「{p.text}」</p>
              <div className="flex items-center gap-3 text-xs text-stone-400">
                <span>💬 {p.replies}件の返し</span>
                <span>💡 {p.reactions}共感</span>
                <span className="ml-auto text-[10px] text-brand-500 font-bold">返す →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── なぜ職業別か ── */}
      <section className="px-5 py-10">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center mb-2">なぜ職業別なのか</p>
        <h2 className="text-2xl font-extrabold text-center text-stone-900 mb-2">「わかる」が違う</h2>
        <p className="text-center text-stone-500 text-sm mb-8 leading-relaxed">
          同じ職業の人間にしか、<br />伝わらないことがある。
        </p>
        <div className="space-y-4">
          {[
            {
              emoji: '🏥',
              title: '看護師が、看護師に話す',
              desc: '夜勤明けの辛さ。患者の死。師長との関係。同じ経験がある人間にしか伝わらない感覚がある。',
            },
            {
              emoji: '📚',
              title: '教師が、教師に話す',
              desc: '保護者対応。学級崩壊。働き方改革の実態。教師同士だから共有できる解像度がある。',
            },
            {
              emoji: '💻',
              title: 'エンジニアが、エンジニアに話す',
              desc: '転職・技術選定・チームのカオス。技術的背景を説明しなくていい、楽さがある。',
            },
          ].map((f, i) => (
            <div key={i} className="flex items-start gap-4 bg-white border border-stone-100 rounded-2xl px-4 py-4 shadow-sm">
              <div className="w-11 h-11 bg-brand-50 border border-brand-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <span className="text-xl">{f.emoji}</span>
              </div>
              <div>
                <p className="font-extrabold text-stone-900 text-sm mb-1">{f.title}</p>
                <p className="text-xs text-stone-500 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <Link href="/signup"
          className="mt-8 w-full py-4 bg-brand-500 text-white rounded-2xl font-extrabold text-base text-center shadow-md shadow-brand-200 hover:bg-brand-600 active:scale-[0.98] transition-all block">
          自分の職業村に入る →
        </Link>
      </section>

      {/* ── みんなの声 ── */}
      <section className="bg-stone-50 px-5 py-10">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center mb-2">みんなの声</p>
        <h2 className="text-xl font-extrabold text-center text-stone-900 mb-6">「同職の人間だから深くなる」</h2>
        <div className="space-y-3">
          {VOICES.map((v, i) => (
            <div key={i} className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm">
              <p className="text-sm text-stone-700 leading-relaxed mb-3">「{v.text}」</p>
              <div className="flex items-center justify-between">
                <p className="text-xs text-stone-400 font-semibold">{v.name}</p>
                <span className="text-[10px] bg-brand-50 text-brand-600 border border-brand-100 px-2 py-0.5 rounded-full font-bold">{v.tag}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 安心の設計 ── */}
      <section className="bg-stone-900 px-5 py-10">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center mb-2">なぜ安心なのか</p>
        <h2 className="text-xl font-extrabold text-center text-white mb-7">民度は、設計で決まる</h2>
        <div className="space-y-3">
          {TRUST_POINTS.map((t, i) => (
            <div key={i} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5">
              <span className="text-xl flex-shrink-0 mt-0.5">{t.emoji}</span>
              <div>
                <p className="font-bold text-white text-sm mb-0.5">{t.title}</p>
                <p className="text-xs text-stone-400 leading-relaxed">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <Link href="/signup"
          className="mt-8 w-full py-4 bg-brand-500 text-white rounded-2xl font-extrabold text-base text-center shadow-lg active:scale-[0.98] transition-all block">
          今夜、来てみる →
        </Link>
      </section>

      {/* ── こんな人に ── */}
      <section className="px-5 py-10">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center mb-2">こんな人に</p>
        <h2 className="text-xl font-extrabold text-center text-stone-900 mb-6">あなたのための場所</h2>
        <div className="space-y-2.5">
          {[
            { emoji: '💼', text: '職場の悩みを、同じ職業の人間に話したい' },
            { emoji: '🌙', text: '仕事終わりの夜、一人でいる時間がある' },
            { emoji: '📵', text: 'Xや職場グループには書けないことがある' },
            { emoji: '🧠', text: 'キャリア・転職・仕事観を深く話せる人がほしい' },
            { emoji: '🤝', text: '自分の経験を、同じ業界の後輩に還元したい' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 bg-white border border-stone-100 rounded-2xl px-4 py-3 shadow-sm">
              <span className="text-lg flex-shrink-0">{item.emoji}</span>
              <p className="text-sm text-stone-700 font-medium">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 最終CTA ── */}
      <section className="px-5 pb-12">
        <div className="rounded-3xl p-8 text-center"
          style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #4f46e5 100%)' }}>
          <p className="text-white/60 text-sm mb-2">今夜から始められます</p>
          <h2 className="text-2xl font-extrabold text-white mb-2">
            あなたの職業で、<br />本音が話せる。
          </h2>
          <p className="text-white/50 text-xs mb-6">電話認証済みの同じ職業の人たちだけが集まる場所</p>
          <Link href="/signup"
            className="w-full py-4 bg-white text-brand-600 rounded-2xl font-extrabold text-base text-center active:scale-[0.98] transition-all block mb-3 shadow-lg">
            自分の職業村に入る →
          </Link>
          <p className="text-xs text-white/30">30秒で登録 · 永久無料 · 18歳以上</p>
        </div>
      </section>

      {/* ── B2B ── */}
      <section className="px-5 pb-6">
        <Link href="/for-business"
          className="flex items-center gap-3 bg-white border border-stone-200 rounded-2xl px-4 py-3.5 hover:bg-stone-50 active:scale-[0.98] transition-all shadow-sm">
          <span className="text-2xl">🏢</span>
          <div className="flex-1">
            <p className="font-bold text-stone-800 text-sm">samee for Business</p>
            <p className="text-xs text-stone-500">社員コミュニティ・ウェルビーイング設計 →</p>
          </div>
          <span className="text-stone-400 text-sm">→</span>
        </Link>
      </section>

      {/* ── フッター ── */}
      <footer className="border-t border-stone-100 px-5 py-6 text-center bg-[#FAFAF9]">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 h-6 bg-brand-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-xs">S</span>
          </div>
          <span className="font-bold text-stone-700">samee</span>
        </div>
        <p className="text-xs text-stone-400 mb-3">あなたの職業で、本音が話せる · 18歳以上</p>
        <div className="flex justify-center gap-5 text-xs text-stone-400">
          <Link href="/terms"   className="hover:text-stone-600 transition">利用規約</Link>
          <Link href="/privacy" className="hover:text-stone-600 transition">プライバシー</Link>
          <Link href="/contact" className="hover:text-stone-600 transition">お問い合わせ</Link>
        </div>
        <p className="text-xs text-stone-300 mt-3">© 2026 samee</p>
      </footer>
    </div>
  )
}
