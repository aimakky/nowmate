import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'samee — 仕事終わり、ここに来ていい。',
  description: '職場にも家族にも言えないことが、社会人になるほど増えていく。sameeは、電話認証済みの大人だけが集まる、仕事終わりのための居場所です。',
  openGraph: {
    title: 'samee — 仕事終わり、ここに来ていい。',
    description: '変な絡み方をしてくる人がいない。書いたら、ちゃんと返ってくる。大人のための居場所。',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}

const VOICES = [
  {
    text: '「今日の会議、意味わからんかった」って書いたら、5分で3人から返ってきた。しかもちゃんと読んでくれてた。',
    name: '会社員・29歳',
    tag: '仕事のリアル村',
  },
  {
    text: '変な絡み方をしてくる人が一人もいない。ここ、なんか大人だなって感じた。',
    name: 'OL・32歳',
    tag: '仕事終わり村',
  },
  {
    text: '社会人になってから深く話せる友達が減った。sameeにはそういう話ができる人がいた。',
    name: '経営者・38歳',
    tag: '考えを深める村',
  },
]

const FLOW = [
  {
    emoji: '🌙',
    title: '仕事終わりに開く',
    desc:  '電車でも、帰ってご飯食べながらでも。今日のことを一言書いてみる。',
  },
  {
    emoji: '💬',
    title: 'ちゃんと返ってくる',
    desc:  '電話認証済みの大人だけが集まってるから、変な絡み方をしてくる人がいない。',
  },
  {
    emoji: '🏕️',
    title: '自分の居場所になる',
    desc:  '村に参加するたびに、顔見知りができる。仕事終わりに「ただいま」と思える場所。',
  },
]

const PREVIEW_POSTS = [
  { emoji: '💼', village: '仕事のリアル村', text: '上司に詰められた日って、誰かに話したいけど誰にも言えないんだよな', replies: 4, reactions: 9 },
  { emoji: '🌙', village: '仕事終わり村',  text: '帰り道、急に泣きそうになった。理由もわからなかった。', replies: 7, reactions: 14 },
  { emoji: '🧠', village: '考える村',      text: '30代になって、自分が何者かよくわからなくなってきた', replies: 3, reactions: 6 },
  { emoji: '🤝', village: '助け合う村',    text: '副業を始めたいんだけど、何から動けばいいかわからない人いる？', replies: 5, reactions: 8 },
]

const TRUST_POINTS = [
  { emoji: '📱', title: '電話認証が必須',         desc: '本物の人間だけが入れる。捨てアカウントが存在できない設計。' },
  { emoji: '🏅', title: '信頼ティア制度',          desc: '活動するほど信頼度が上がる。「この人は本物だ」がわかる。' },
  { emoji: '🏕️', title: '村という閉じた空間',      desc: '広すぎない。顔見知りができる。居場所になる。' },
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

        <h1 className="text-[2.2rem] font-black text-stone-900 leading-[1.15] mb-4 tracking-tight">
          仕事終わり、<br />
          <span className="text-brand-500">ここに来ていい。</span>
        </h1>

        <p className="text-stone-500 text-[15px] leading-relaxed mb-2 max-w-[290px]">
          職場にも家族にも言えないことが、<br />
          社会人になるほど増えていく。
        </p>
        <p className="text-stone-500 text-[15px] leading-relaxed mb-7 max-w-[290px]">
          sameeは、そういう夜のための場所です。
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

      {/* ── 実際の声（プレビュー） ── */}
      <section className="px-4 pb-10">
        <div className="flex items-center gap-2 mb-4 px-1">
          <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
          <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">今夜の村で起きていること</p>
        </div>
        <div className="space-y-2.5">
          {PREVIEW_POSTS.map((p, i) => (
            <Link key={i} href="/signup"
              className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm flex flex-col gap-2.5 hover:shadow-md transition-all active:scale-[0.99] block">
              <div className="flex items-center gap-2">
                <span className="text-base">{p.emoji}</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-stone-50 text-stone-600 border border-stone-100">{p.village}</span>
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
        <Link href="/signup"
          className="mt-4 flex items-center justify-center gap-1.5 text-sm font-bold text-brand-500 py-2">
          もっと見る →
        </Link>
      </section>

      {/* ── 使い方 ── */}
      <section className="bg-stone-50 px-5 py-10">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center mb-2">使い方</p>
        <h2 className="text-2xl font-extrabold text-center text-stone-900 mb-8">疲れたまま来ていい</h2>
        <div className="space-y-6">
          {FLOW.map((f, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white border border-stone-100 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0">
                <span className="text-xl">{f.emoji}</span>
              </div>
              <div className="pt-1.5">
                <p className="font-extrabold text-stone-900 text-sm mb-1">{i + 1}. {f.title}</p>
                <p className="text-xs text-stone-500 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <Link href="/signup"
          className="mt-8 w-full py-4 bg-brand-500 text-white rounded-2xl font-extrabold text-base text-center shadow-md shadow-brand-200 hover:bg-brand-600 active:scale-[0.98] transition-all block">
          無料で始める →
        </Link>
      </section>

      {/* ── 実際の声 ── */}
      <section className="px-5 py-10">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center mb-2">みんなの声</p>
        <h2 className="text-xl font-extrabold text-center text-stone-900 mb-6">「ここ、なんか優しい」</h2>
        <div className="space-y-3">
          {VOICES.map((v, i) => (
            <div key={i} className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm">
              <p className="text-sm text-stone-700 leading-relaxed mb-3">「{v.text}」</p>
              <div className="flex items-center justify-between">
                <p className="text-xs text-stone-400 font-semibold">{v.name}</p>
                <span className="text-[10px] bg-stone-50 text-stone-500 border border-stone-100 px-2 py-0.5 rounded-full">{v.tag}</span>
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

      {/* ── ターゲット ── */}
      <section className="px-5 py-10">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center mb-2">こんな人に</p>
        <h2 className="text-xl font-extrabold text-center text-stone-900 mb-6">あなたのための場所</h2>
        <div className="space-y-2.5">
          {[
            { emoji: '💼', text: '職場の悩みを誰かに話したい会社員・OL' },
            { emoji: '🧠', text: '深い話ができる相手が社会人になって減った人' },
            { emoji: '🌙', text: '仕事終わりの21〜23時、一人でいる人' },
            { emoji: '📵', text: 'Xに書けないことを、どこかに書きたい人' },
            { emoji: '🏢', text: '経営の悩みや考えを誰かと整理したい経営者' },
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
          <h2 className="text-2xl font-extrabold text-white mb-2">仕事終わり、<br />ここに来ていい。</h2>
          <p className="text-white/50 text-xs mb-6">電話認証済みの大人だけが集まる場所</p>
          <Link href="/signup"
            className="w-full py-4 bg-white text-brand-600 rounded-2xl font-extrabold text-base text-center active:scale-[0.98] transition-all block mb-3 shadow-lg">
            無料で始める →
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
            <p className="text-xs text-stone-500">社員の well-being を設計する →</p>
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
        <p className="text-xs text-stone-400 mb-3">仕事終わりの、大人の、居場所 · 18歳以上</p>
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
