import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'samee — 転職するか、しないか。同じ経験をした人に聞ける場所。',
  description: '求人紹介なし・エージェントなし。転職を迷っている人が、同じ経験をした人の本音に触れられるキャリア相談コミュニティ。電話認証済みの20歳以上だけが集まる場所。',
  openGraph: {
    title: 'samee — 転職するか、しないか。同じ経験をした人に聞ける場所。',
    description: '求人紹介しない。転職を迷う人のための、本音のキャリア相談コミュニティ。',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}

const SAMPLE_POSTS = [
  {
    village: '🔍 転職を考えてる村',
    text: '今の会社7年目。年収も悪くない。でも毎朝起きるのがしんどい。これって転職する理由になりますか？',
    reactions: 58, replies: 24,
  },
  {
    village: '🔍 転職を考えてる村',
    text: '転職して3ヶ月。正直に言うと、前の会社のほうが楽だった部分もある。でも後悔はしてない。',
    reactions: 71, replies: 31,
  },
  {
    village: '👥 職場の人間関係村',
    text: '上司が原因で転職考えてる。でも上司って次の職場にも絶対いるよなって思うと踏み出せない。',
    reactions: 43, replies: 19,
  },
  {
    village: '💭 将来が不安村',
    text: '30代で転職するのって、実際どうなんだろう。同世代で転職経験ある人の話が聞きたい。',
    reactions: 36, replies: 22,
  },
]

const VOICES = [
  {
    text: 'エージェントに相談したら転職を勧められるのがわかってて、相談できなかった。sameeで初めて「転職しないほうがいいかも」って言ってもらえた。',
    name: '営業・32歳',
    tag: '転職を考えてる村',
  },
  {
    text: '転職した経験者として話せる場所があるのが嬉しい。求人を送りつけてくる系のサービスとは全然違う。',
    name: 'エンジニア・36歳',
    tag: '転職を考えてる村',
  },
  {
    text: '「転職したい」じゃなくて「今のままでいいのか不安」という気持ちをそのまま話せた。ここだけ。',
    name: '看護師・28歳',
    tag: '将来が不安村',
  },
]

const TRUST_POINTS = [
  { emoji: '🚫', title: '求人紹介は一切しない',         desc: '転職させることで稼ぐサービスではない。だから「転職しないほうがいい」も言える。' },
  { emoji: '📱', title: '電話認証が必須',               desc: '本物の人間だけが入れる。捨てアカウントが存在できない設計。' },
  { emoji: '🔒', title: '会社名・本名は不要',            desc: '職種だけ選べばOK。職場にバレる心配なく本音が話せる。' },
  { emoji: '🏅', title: '転職経験者が「先輩」になる',   desc: '活動実績が信頼ティアに反映。経験者の言葉に重みがつく仕組み。' },
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

        {/* 差別化バッジ */}
        <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-full px-3 py-1 mb-5">
          <span className="text-xs font-extrabold text-rose-600">🚫 求人紹介なし · エージェントなし</span>
        </div>

        <h1 className="text-[2rem] font-black text-stone-900 leading-[1.2] mb-5 tracking-tight">
          転職するか、しないか。<br />
          <span className="text-brand-500">その答えは、同じ経験を<br />した人だけが知っている。</span>
        </h1>

        <p className="text-stone-500 text-[14px] leading-relaxed mb-7 max-w-[300px]">
          エージェントは転職を勧める。<br />
          友達は心配する。職場には言えない。<br /><br />
          <span className="font-bold text-stone-700">本音で話せる人が、ここにいる。</span>
        </p>

        <Link href="/signup"
          className="w-full py-4 bg-brand-500 text-white rounded-2xl font-extrabold text-base text-center shadow-lg shadow-brand-200 hover:bg-brand-600 active:scale-[0.98] transition-all mb-3">
          無料で相談してみる — 30秒で登録 →
        </Link>
        <Link href="/login"
          className="w-full py-3 border-2 border-stone-200 text-stone-600 rounded-2xl font-semibold text-sm text-center hover:bg-stone-50 active:scale-[0.98] transition-all">
          すでにアカウントがある
        </Link>
        <p className="text-xs text-stone-400 mt-3">無料 · クレジットカード不要 · 20歳以上</p>
      </section>

      {/* ── 他のサービスとの違い ── */}
      <section className="px-5 pb-10">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center mb-5">他のサービスとの違い</p>
        <div className="bg-white border border-stone-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-3 border-b border-stone-100">
            <div className="px-3 py-2.5 text-center" />
            <div className="px-3 py-2.5 text-center border-l border-stone-100">
              <p className="text-[10px] font-bold text-stone-400">他の転職サービス</p>
            </div>
            <div className="px-3 py-2.5 text-center border-l border-stone-100"
              style={{ background: 'rgba(99,102,241,0.05)' }}>
              <p className="text-[10px] font-extrabold text-brand-500">samee</p>
            </div>
          </div>
          {[
            { label: '求人紹介', others: '❌ ある（収益源）', samee: '✅ 一切なし' },
            { label: '話せる相手', others: 'エージェント', samee: '同じ立場の人' },
            { label: '「辞めないほうがいい」', others: '言えない', samee: '✅ 言える' },
            { label: '本音', others: '建前が混ざる', samee: '✅ 本音だけ' },
            { label: '料金', others: '企業が払う', samee: '✅ 無料' },
          ].map((row, i) => (
            <div key={i} className="grid grid-cols-3 border-b border-stone-50 last:border-0">
              <div className="px-3 py-2.5">
                <p className="text-[11px] font-bold text-stone-600">{row.label}</p>
              </div>
              <div className="px-3 py-2.5 border-l border-stone-100 flex items-center justify-center">
                <p className="text-[10px] text-stone-400 text-center leading-tight">{row.others}</p>
              </div>
              <div className="px-3 py-2.5 border-l border-stone-100 flex items-center justify-center"
                style={{ background: 'rgba(99,102,241,0.04)' }}>
                <p className="text-[10px] font-bold text-brand-600 text-center leading-tight">{row.samee}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 今起きていること ── */}
      <section className="bg-stone-50 px-4 py-8">
        <div className="flex items-center gap-2 mb-4 px-1">
          <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
          <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">今、村で起きていること</p>
        </div>
        <div className="space-y-2.5">
          {SAMPLE_POSTS.map((p, i) => (
            <Link key={i} href="/signup"
              className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm flex flex-col gap-2.5 hover:shadow-md transition-all active:scale-[0.99] block">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-brand-50 text-brand-600 border border-brand-100 self-start">{p.village}</span>
              <p className="text-sm text-stone-800 leading-relaxed font-medium">「{p.text}」</p>
              <div className="flex items-center gap-3 text-xs text-stone-400">
                <span>💬 {p.replies}件の返し</span>
                <span>❤️ {p.reactions}共感</span>
                <span className="ml-auto text-[10px] text-brand-500 font-bold">返す →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── なぜsameeか ── */}
      <section className="px-5 py-10">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center mb-2">なぜsameeか</p>
        <h2 className="text-2xl font-extrabold text-center text-stone-900 mb-2">転職の答えは、<br />経験者にしかわからない</h2>
        <p className="text-center text-stone-500 text-sm mb-8 leading-relaxed">
          エージェントは転職させたい。<br />
          会社は辞めさせたくない。<br />
          どちらも「あなたのため」には動いていない。
        </p>
        <div className="space-y-4">
          {[
            {
              emoji: '🔍',
              title: '転職した人の本音が聞ける',
              desc: '「後悔してる？」「年収は上がった？」「前の会社が懐かしい？」。転職経験者が本音で答えてくれる。',
            },
            {
              emoji: '🤝',
              title: '同じ職業・同じ悩みの人がいる',
              desc: '看護師が看護師に、エンジニアがエンジニアに聞く。業界の事情を説明しなくていい楽さがある。',
            },
            {
              emoji: '🚫',
              title: '「転職しろ」とは誰も言わない',
              desc: 'sameeには求人も、スカウトも、エージェントもいない。転職しないという選択肢を、対等に話せる。',
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
          転職経験者に聞いてみる →
        </Link>
      </section>

      {/* ── みんなの声 ── */}
      <section className="bg-stone-50 px-5 py-10">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center mb-2">みんなの声</p>
        <h2 className="text-xl font-extrabold text-center text-stone-900 mb-6">「転職しないほうがいい、と言ってもらえた」</h2>
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
        <h2 className="text-xl font-extrabold text-center text-white mb-7">信頼は、設計で決まる</h2>
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
          無料で相談してみる →
        </Link>
      </section>

      {/* ── こんな人に ── */}
      <section className="px-5 py-10">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center mb-2">こんな人に</p>
        <h2 className="text-xl font-extrabold text-center text-stone-900 mb-6">あなたの話し相手が、ここにいる</h2>
        <div className="space-y-2.5">
          {[
            { emoji: '🔍', text: '転職しようか迷っているが、誰にも相談できない' },
            { emoji: '😮‍💨', text: '毎朝しんどいけど、辞めていいのかわからない' },
            { emoji: '💰', text: '年収を上げたいが、転職リスクが怖い' },
            { emoji: '👥', text: '上司が原因で悩んでいる。次も同じ状況になる？' },
            { emoji: '🔄', text: '転職経験者として、迷っている人の話を聞きたい' },
            { emoji: '💭', text: '転職した・しなかった、正直な話を聞かせてほしい' },
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
          <p className="text-white/60 text-sm mb-2">求人なし · エージェントなし · 本音だけ</p>
          <h2 className="text-2xl font-extrabold text-white mb-2">
            転職するか、しないか。<br />同じ経験をした人に聞こう。
          </h2>
          <p className="text-white/50 text-xs mb-6">電話認証済みの20歳以上だけが集まるキャリア相談コミュニティ</p>
          <Link href="/signup"
            className="w-full py-4 bg-white text-brand-600 rounded-2xl font-extrabold text-base text-center active:scale-[0.98] transition-all block mb-3 shadow-lg">
            無料で相談してみる →
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
            <p className="font-bold text-stone-800 text-sm">samee for Business</p>
            <p className="text-xs text-stone-500">離職防止・社員エンゲージメント設計 →</p>
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
        <p className="text-xs text-stone-400 mb-3">求人紹介しない、転職を迷う人のキャリア相談コミュニティ · 20歳以上</p>
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
