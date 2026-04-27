import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'VILLIA — 声で話せる、大人のコミュニティ',
  description: '電話認証済みの20歳以上だけが集まる、民度の高い通話コミュニティ。悩みを話す、ただ雑談する、夜話す。同じ気持ちの人と声で繋がれる場所。',
  openGraph: {
    title: 'VILLIA — 声で話せる、大人のコミュニティ',
    description: '民度の高い大人の通話コミュニティ。電話認証必須・信頼ティア制度で、質の高い会話が生まれる場所。',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}

const SAMPLE_ROOMS = [
  { category: '💭 悩み',  title: '最近なんか元気ない、話聞いてほしい',       speakers: 2, listeners: 5 },
  { category: '💬 雑談',  title: '仕事終わり、ただしゃべりたい',               speakers: 3, listeners: 8 },
  { category: '🤝 相談',  title: '人間関係でモヤモヤしてる、聞いてほしい',    speakers: 2, listeners: 4 },
  { category: '🌙 夜話',  title: '眠れない夜、誰かと話したい',                 speakers: 1, listeners: 11 },
]

const VOICES = [
  {
    text: 'テキストだと伝わらないニュアンスが、声だと一発でわかる。「しんどい」の一言でも、声で言うと全然違う。',
    name: '会社員・29歳',
  },
  {
    text: '知らない人と話すのが怖かったけど、みんな大人だし変な人がいない。電話認証があるからかな。',
    name: '看護師・34歳',
  },
  {
    text: '夜中に一人でモヤモヤしてるとき、VILLIAに繋いで話したら気持ちが楽になった。',
    name: 'フリーランス・31歳',
  },
]

const TRUST_POINTS = [
  { emoji: '📱', title: '電話認証が必須',       desc: '本物の人間だけが入れる。捨てアカウントが存在できない設計。' },
  { emoji: '🏅', title: '信頼ティア制度',        desc: '活動するほど信頼が高まる。ティアが上がると見えるものが増える。' },
  { emoji: '🔒', title: '本名・会社名は不要',    desc: 'ニックネームだけでOK。言いたくないことは言わなくていい。' },
  { emoji: '👑', title: '20歳以上限定',          desc: '大人だけのコミュニティ。民度は設計で決まる。' },
]

export default async function TopPage() {
  const supabase = createClient()
  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
  const userCount = Math.max(count ?? 0, 1)

  return (
    <div className="min-h-screen bg-birch flex flex-col max-w-[430px] mx-auto">

      {/* ── ヘッダー ── */}
      <header className="flex items-center justify-between px-5 pt-5 pb-3 sticky top-0 bg-birch/95 backdrop-blur z-10 border-b border-stone-100/60">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center shadow-sm shadow-brand-200">
            <span className="text-white font-black text-sm">S</span>
          </div>
          <span className="font-extrabold text-stone-900 text-lg tracking-tight">VILLIA</span>
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

        {/* ライブバッジ */}
        <div className="inline-flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-full px-3 py-1 mb-5">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs font-extrabold text-red-600">今すぐ話せる通話ルームがあります</span>
        </div>

        <h1 className="text-[2rem] font-black text-stone-900 leading-[1.2] mb-5 tracking-tight">
          声で話せる、<br />
          <span className="text-brand-500">大人のコミュニティ。</span>
        </h1>

        <p className="text-stone-500 text-[14px] leading-relaxed mb-7 max-w-[300px]">
          テキストじゃ伝わらない。<br />
          SNSは疲れた。誰かと話したい。<br /><br />
          <span className="font-bold text-stone-700">ここには、同じ気持ちの人がいる。</span>
        </p>

        <Link href="/signup"
          className="w-full py-4 bg-brand-500 text-white rounded-2xl font-extrabold text-base text-center shadow-lg shadow-brand-200 hover:bg-brand-600 active:scale-[0.98] transition-all mb-3">
          無料で始める — 30秒で登録 →
        </Link>
        <Link href="/login"
          className="w-full py-3 border-2 border-stone-200 text-stone-600 rounded-2xl font-semibold text-sm text-center hover:bg-stone-50 active:scale-[0.98] transition-all">
          すでにアカウントがある
        </Link>
        <p className="text-xs text-stone-400 mt-3">無料 · クレジットカード不要 · 20歳以上</p>
      </section>

      {/* ── 今開かれている通話 ── */}
      <section className="bg-stone-50 px-4 py-8">
        <div className="flex items-center gap-2 mb-4 px-1">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">今、話されていること</p>
        </div>
        <div className="space-y-2.5">
          {SAMPLE_ROOMS.map((r, i) => (
            <Link key={i} href="/signup"
              className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm flex flex-col gap-2 hover:shadow-md transition-all active:scale-[0.99] block">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-brand-50 text-brand-600 border border-brand-100">{r.category}</span>
                <div className="flex items-center gap-1 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold text-red-600">LIVE</span>
                </div>
              </div>
              <p className="text-sm text-stone-800 leading-relaxed font-bold">「{r.title}」</p>
              <div className="flex items-center gap-3 text-xs text-stone-400">
                <span>🎙️ {r.speakers}人が話中</span>
                <span>👂 {r.listeners}人が聴いてる</span>
                <span className="ml-auto text-[10px] text-brand-500 font-bold">参加する →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── なぜvoiceか ── */}
      <section className="px-5 py-10">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center mb-2">なぜ声なのか</p>
        <h2 className="text-2xl font-extrabold text-center text-stone-900 mb-2">テキストで伝わらないことが、<br />声なら伝わる</h2>
        <p className="text-center text-stone-500 text-sm mb-8 leading-relaxed">
          「しんどい」の一言でも、<br />
          声のトーンで全部わかる。<br />
          それだけで楽になることがある。
        </p>
        <div className="space-y-4">
          {[
            {
              emoji: '🎙️',
              title: '今すぐ誰かと話せる',
              desc: 'テキストを打つより早い。「話したい」と思ったら、ルームに入るだけ。',
            },
            {
              emoji: '🌙',
              title: '夜中でも話せる人がいる',
              desc: '一人でモヤモヤしてる夜、同じ気持ちの人がここにいる。',
            },
            {
              emoji: '🤝',
              title: '聴いてくれる人がいる',
              desc: '話すだけでもいい。答えがなくていい。声で聴いてもらうだけで違う。',
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
          話しに行く →
        </Link>
      </section>

      {/* ── みんなの声 ── */}
      <section className="bg-stone-50 px-5 py-10">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center mb-2">みんなの声</p>
        <h2 className="text-xl font-extrabold text-center text-stone-900 mb-6">「声で話したら、楽になった」</h2>
        <div className="space-y-3">
          {VOICES.map((v, i) => (
            <div key={i} className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm">
              <p className="text-sm text-stone-700 leading-relaxed mb-3">「{v.text}」</p>
              <p className="text-xs text-stone-400 font-semibold">{v.name}</p>
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
          無料で始める →
        </Link>
      </section>

      {/* ── こんな人に ── */}
      <section className="px-5 py-10">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center mb-2">こんな人に</p>
        <h2 className="text-xl font-extrabold text-center text-stone-900 mb-6">あなたの話し相手が、ここにいる</h2>
        <div className="space-y-2.5">
          {[
            { emoji: '😮‍💨', text: '今日しんどかった、誰かに話を聞いてほしい' },
            { emoji: '🌙', text: '夜中に一人でいるとき、誰かと話したい' },
            { emoji: '💭', text: '何かモヤモヤしてる、うまく言葉にできない' },
            { emoji: '🤝', text: '相談に乗ってほしい、答えよりも共感がほしい' },
            { emoji: '😂', text: 'ただ笑いたい、他愛ない話がしたい' },
            { emoji: '💬', text: 'SNSに疲れた、リアルな声で話したい' },
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
          <p className="text-white/60 text-sm mb-2">電話認証必須 · 20歳以上 · 声で話せる</p>
          <h2 className="text-2xl font-extrabold text-white mb-2">
            今すぐ、誰かと話そう。
          </h2>
          <p className="text-white/50 text-xs mb-6">民度の高い大人の通話コミュニティ</p>
          <Link href="/signup"
            className="w-full py-4 bg-white text-brand-600 rounded-2xl font-extrabold text-base text-center active:scale-[0.98] transition-all block mb-3 shadow-lg">
            無料で始める →
          </Link>
          <p className="text-xs text-white/30">30秒で登録 · 永久無料 · 20歳以上</p>
        </div>
      </section>

      {/* ── B2B ── */}
      <section className="px-5 pb-6">
        <Link href="/for-business"
          className="flex items-center gap-3 bg-white border border-stone-200 rounded-2xl px-4 py-3.5 hover:bg-stone-50 active:scale-[0.98] transition-all shadow-sm">
          <span className="text-2xl">🏢</span>
          <div className="flex-1">
            <p className="font-bold text-stone-800 text-sm">VILLIA for Business</p>
            <p className="text-xs text-stone-500">社内コミュニティ・エンゲージメント設計 →</p>
          </div>
          <span className="text-stone-400 text-sm">→</span>
        </Link>
      </section>

      {/* ── フッター ── */}
      <footer className="border-t border-stone-100 px-5 py-6 text-center bg-birch">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 h-6 bg-brand-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-xs">S</span>
          </div>
          <span className="font-bold text-stone-700">VILLIA</span>
        </div>
        <p className="text-xs text-stone-400 mb-3">声で話せる、民度の高い大人のコミュニティ · 20歳以上</p>
        <div className="flex justify-center gap-5 text-xs text-stone-400">
          <Link href="/terms"   className="hover:text-stone-600 transition">利用規約</Link>
          <Link href="/privacy" className="hover:text-stone-600 transition">プライバシー</Link>
          <Link href="/contact" className="hover:text-stone-600 transition">お問い合わせ</Link>
        </div>
        <p className="text-xs text-stone-300 mt-3">© 2026 VILLIA</p>
      </footer>
    </div>
  )
}
