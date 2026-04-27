import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'samee — 職場では言えないことを、話せる場所。',
  description: '仕事を持つ日本人が、職場の外では言えないことを話せるコミュニティ。仕事に誇りがなくても、転職を考えていても、ただしんどくても。電話認証済みの大人だけが集まる場所。',
  openGraph: {
    title: 'samee — 職場では言えないことを、話せる場所。',
    description: '働く日本人が、仕事の本音を話せる唯一の場所。',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}

const THEME_POSTS = [
  {
    village: '😮‍💨 仕事がしんどい村',
    text: '有給申請したら「なんで？」って聞かれた。理由を言わなきゃいけないの、普通なの？',
    reactions: 34, replies: 12,
  },
  {
    village: '🔍 転職を考えてる村',
    text: '今の会社5年目。転職したい気持ちはあるけど、踏み出せない。みんなどうやって決断したんだろう。',
    reactions: 27, replies: 18,
  },
  {
    village: '👥 職場の人間関係村',
    text: '上司と合わなすぎる。でも仕事自体は嫌いじゃない。この状況どうすればいいんだろう。',
    reactions: 41, replies: 9,
  },
  {
    village: '🌙 ただ聞いてほしい村',
    text: '今日仕事でミスした。誰かに言いたかっただけ。',
    reactions: 89, replies: 31,
  },
]

const THEME_VILLAGES = [
  { emoji: '😮‍💨', label: '仕事がしんどい',   desc: '疲れた、しんどいをそのまま言える' },
  { emoji: '🔍', label: '転職を考えてる',     desc: '転職リアルを語り合う' },
  { emoji: '👥', label: '職場の人間関係',     desc: '上司・同僚・職場の空気' },
  { emoji: '💭', label: '将来が不安',         desc: 'キャリア・お金・老後まで' },
  { emoji: '🌙', label: 'ただ聞いてほしい',   desc: '言葉にするだけでいい夜に' },
]

const VOICES = [
  {
    text: '転職しようか迷ってることを、職場の人にも友達にも言えなかった。ここで初めて正直に話せた気がする。',
    name: '会社員・29歳',
    tag: '転職を考えてる村',
  },
  {
    text: 'しんどいって言うと「頑張れ」って返ってくるのが嫌だった。ここは「そうだよね」って返してくれる。',
    name: '看護師・31歳',
    tag: '仕事がしんどい村',
  },
  {
    text: '上司の愚痴を友達に話すと引かれる気がして言えなかった。同じ立場の人がいるだけで救われた。',
    name: '営業・34歳',
    tag: '職場の人間関係村',
  },
]

const TRUST_POINTS = [
  { emoji: '📱', title: '電話認証が必須',            desc: '本物の人間だけが入れる。捨てアカウントが存在できない設計。' },
  { emoji: '🔒', title: '職場・本名は一切不要',       desc: '職種だけ選べばOK。会社名も本名も出さない。匿名だから本音が出る。' },
  { emoji: '🏅', title: '信頼ティア制度',             desc: '活動するほど信頼度が上がる。「この人は本物だ」がわかる。' },
  { emoji: '🔕', title: 'マウント・説教は設計で消す', desc: '荒らしには信頼ティアが機能しない。自然淘汰される仕組み。' },
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
          職場では言えないことを、<br />
          <span className="text-brand-500">話せる場所。</span>
        </h1>

        <p className="text-stone-500 text-[15px] leading-relaxed mb-2 max-w-[300px]">
          仕事に誇りがなくてもいい。<br />
          転職を考えていてもいい。<br />
          ただしんどくてもいい。
        </p>
        <p className="text-stone-700 font-bold text-[15px] leading-relaxed mb-7 max-w-[300px]">
          働く日本人の、本音の居場所。
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

      {/* ── 悩みテーマ村 ── */}
      <section className="px-4 pb-10">
        <div className="flex items-center gap-2 mb-4 px-1">
          <span className="text-sm">🔥</span>
          <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">話せる村、あります</p>
        </div>
        <div className="space-y-2">
          {THEME_VILLAGES.map((v, i) => (
            <Link key={i} href="/signup"
              className="bg-white border border-stone-100 rounded-2xl px-4 py-3.5 shadow-sm hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-3">
              <span className="text-2xl flex-shrink-0">{v.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold text-stone-800">{v.label}</p>
                <p className="text-[11px] text-stone-400">{v.desc}</p>
              </div>
              <span className="text-brand-500 text-sm font-bold flex-shrink-0">入る →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 今夜の声 ── */}
      <section className="bg-stone-50 px-4 py-8">
        <div className="flex items-center gap-2 mb-4 px-1">
          <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
          <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">今夜、村で起きていること</p>
        </div>
        <div className="space-y-2.5">
          {THEME_POSTS.map((p, i) => (
            <Link key={i} href="/signup"
              className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm flex flex-col gap-2.5 hover:shadow-md transition-all active:scale-[0.99] block">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-brand-50 text-brand-600 border border-brand-100">{p.village}</span>
              </div>
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
        <h2 className="text-2xl font-extrabold text-center text-stone-900 mb-2">「誰にも言えない」に、場所がある</h2>
        <p className="text-center text-stone-500 text-sm mb-8 leading-relaxed">
          友達には引かれる。職場の人には言えない。<br />Xには書きたくない。
        </p>
        <div className="space-y-4">
          {[
            {
              emoji: '🙊',
              title: '職場の人には絶対言えないこと',
              desc: '同僚への不満、上司への怒り、会社を辞めたい気持ち。sameeには職場の人はいない。だから言える。',
            },
            {
              emoji: '😮‍💨',
              title: '友達には「重い」こと',
              desc: '仕事の悩みを友達に話すのって気を遣う。sameeのユーザーは同じ立場の働く大人。「重い」がない。',
            },
            {
              emoji: '📵',
              title: 'Xやインスタには出せないこと',
              desc: '鍵垢でも怖い。でも誰かに言いたい。電話認証済みの閉じた場所だから、本音が出せる。',
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
          今夜、話しに行く →
        </Link>
      </section>

      {/* ── みんなの声 ── */}
      <section className="bg-stone-50 px-5 py-10">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center mb-2">みんなの声</p>
        <h2 className="text-xl font-extrabold text-center text-stone-900 mb-6">「ここで初めて正直に話せた」</h2>
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
        <h2 className="text-xl font-extrabold text-center text-stone-900 mb-6">あなたの居場所が、ある</h2>
        <div className="space-y-2.5">
          {[
            { emoji: '😮‍💨', text: '仕事がしんどいけど、誰にも言えない' },
            { emoji: '🔍', text: '転職を考えているが、相談できる人がいない' },
            { emoji: '👥', text: '職場の人間関係に悩んでいる' },
            { emoji: '💭', text: 'キャリアや将来が不安で眠れない夜がある' },
            { emoji: '🌙', text: 'ただ聞いてもらいたい、それだけの夜がある' },
            { emoji: '📵', text: 'XやSNSには書けないことを、どこかで言いたい' },
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
            職場では言えないことを、<br />話せる場所。
          </h2>
          <p className="text-white/50 text-xs mb-6">電話認証済みの大人だけが集まる、本音の居場所</p>
          <Link href="/signup"
            className="w-full py-4 bg-white text-brand-600 rounded-2xl font-extrabold text-base text-center active:scale-[0.98] transition-all block mb-3 shadow-lg">
            今夜、話しに行く →
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
        <p className="text-xs text-stone-400 mb-3">職場では言えないことを、話せる場所 · 18歳以上</p>
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
