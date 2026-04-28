import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'VILLIA — 知らない誰かに、助けてもらえるSNS',
  description: '匿名で悩みや質問を流すと、民度の高い大人たちが答えてくれる。電話認証必須・Trust Tier制度で民度を設計した、日本唯一の大人コミュニティ。',
  openGraph: {
    title: 'VILLIA — 知らない誰かに、助けてもらえるSNS',
    description: '匿名で質問を流すと、誰かが答えてくれる。民度の高い大人のコミュニティ。',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}

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
            <span className="text-white font-black text-sm">V</span>
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
        <div className="inline-flex items-center gap-2 bg-white border border-stone-200 rounded-full px-3.5 py-1.5 mb-5 shadow-sm">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs font-bold text-stone-700">{userCount.toLocaleString()}人が利用中</span>
        </div>

        <h1 className="text-[2rem] font-black text-stone-900 leading-[1.2] mb-4 tracking-tight">
          知らない誰かに、<br />
          <span className="text-brand-500">助けてもらえた。</span>
        </h1>

        <p className="text-stone-500 text-[14px] leading-relaxed mb-2 max-w-[300px]">
          匿名で悩みや質問を流すと、<br />
          民度の高い大人たちが答えてくれる。
        </p>
        <p className="text-stone-700 text-[13px] font-bold mb-7">
          それだけのSNS。でも、それが全部。
        </p>

        <Link href="/signup"
          className="w-full py-4 bg-brand-500 text-white rounded-2xl font-extrabold text-base text-center shadow-lg shadow-brand-200 active:scale-[0.98] transition-all mb-3">
          無料で始める — 30秒 →
        </Link>
        <Link href="/login"
          className="w-full py-3 border-2 border-stone-200 text-stone-600 rounded-2xl font-semibold text-sm text-center hover:bg-stone-50 active:scale-[0.98] transition-all">
          すでにアカウントがある
        </Link>
        <p className="text-xs text-stone-400 mt-3">無料 · クレジットカード不要 · 18歳以上</p>
      </section>

      {/* ── 体験の流れ（漂流瓶 Q&A）── */}
      <section className="px-4 pb-10">
        <div className="rounded-3xl overflow-hidden"
          style={{ background: 'linear-gradient(180deg,#060d1f 0%,#0a1e3d 100%)', border: '1px solid rgba(100,140,255,0.2)' }}>

          <div className="px-5 pt-6 pb-4 text-center">
            <p className="text-[10px] font-bold text-blue-400/60 uppercase tracking-widest mb-1">🌊 漂流瓶 — 匿名Q&A</p>
            <h2 className="text-base font-extrabold text-white leading-snug">
              こんなことが、ここでは起きる
            </h2>
          </div>

          {/* 体験ストーリー */}
          <div className="px-4 pb-6 space-y-2">
            {[
              {
                role:  'question',
                icon:  '😔',
                text:  '「仕事が嫌で辞めたいけど、次が見つかるか不安で動けない」',
                label: '匿名で質問を流した',
              },
              {
                role:  'answer',
                icon:  '🤝',
                text:  '「同じ状況で辞めました。先に求人見るだけでもだいぶ気持ちが変わりますよ」',
                label: '見知らぬ住民が答えた',
              },
              {
                role:  'answer',
                icon:  '💬',
                text:  '「私は辞めてよかった派。でもまず副業から試したのが良かったかも」',
                label: 'さらに別の住民も',
              },
              {
                role:  'resolve',
                icon:  '✅',
                text:  '「解決しました。ありがとうございます」',
                label: '質問者が解決マークをつけた',
              },
            ].map((item, i) => (
              <div key={i} className={`flex gap-2.5 ${item.role === 'question' ? '' : 'pl-4'}`}>
                <div className="flex-shrink-0 mt-1">
                  {item.role === 'question'
                    ? <div className="w-7 h-7 rounded-full bg-blue-900/60 flex items-center justify-center text-sm">{item.icon}</div>
                    : item.role === 'resolve'
                    ? <div className="w-7 h-7 rounded-full bg-green-900/40 flex items-center justify-center text-sm">{item.icon}</div>
                    : <div className="w-7 h-7 rounded-full bg-indigo-900/60 flex items-center justify-center text-sm">{item.icon}</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold mb-1"
                    style={{ color: item.role === 'resolve' ? '#86efac' : item.role === 'question' ? '#93c5fd' : '#a5b4fc' }}>
                    {item.label}
                  </p>
                  <div className="rounded-xl px-3 py-2"
                    style={item.role === 'question'
                      ? { background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)' }
                      : item.role === 'resolve'
                      ? { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }
                      : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <p className="text-xs text-white/80 leading-relaxed">{item.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 pb-5 text-center">
            <p className="text-[11px] text-blue-300/50">
              匿名で流した質問に、民度の高い住民が本気で答える。<br />それがVILLIAの漂流瓶。
            </p>
          </div>
        </div>
      </section>

      {/* ── 3つの体験 ── */}
      <section className="px-5 pb-10">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center mb-5">VILLIAでできること</p>
        <div className="space-y-3">
          {[
            {
              emoji: '🌊',
              title: '漂流瓶で匿名Q&A',
              desc:  '悩みや質問を匿名で流すと、知らない誰かが答えてくれる。ベストアンサーも選べる。',
              color: '#1d4ed8',
              bg:    '#eff6ff',
              border:'#bfdbfe',
            },
            {
              emoji: '🏕️',
              title: '村コミュニティ',
              desc:  '同じテーマの村に参加して、毎日会う顔なじみを作る。声で話せる通話ルームも。',
              color: '#166534',
              bg:    '#f0fdf4',
              border:'#bbf7d0',
            },
            {
              emoji: '🤝',
              title: '人助けが実績になる',
              desc:  'Q&Aに答えるたびに「助けた人数」がプロフィールに残る。貢献が見える文化。',
              color: '#92400e',
              bg:    '#fffbeb',
              border:'#fde68a',
            },
          ].map(f => (
            <div key={f.title} className="flex items-start gap-4 rounded-2xl px-4 py-4 shadow-sm"
              style={{ background: f.bg, border: `1px solid ${f.border}` }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${f.color}15`, border: `1px solid ${f.color}25` }}>
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
          className="mt-8 w-full py-4 bg-brand-500 text-white rounded-2xl font-extrabold text-base text-center shadow-md shadow-brand-200 active:scale-[0.98] transition-all block">
          無料で始める →
        </Link>
      </section>

      {/* ── ユーザーの声 ── */}
      <section className="bg-stone-50 px-5 py-10">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center mb-2">実際の声</p>
        <h2 className="text-xl font-extrabold text-center text-stone-900 mb-6">「知らない人に助けられた」</h2>
        <div className="space-y-3">
          {[
            {
              text: '漂流瓶で「転職迷ってる」って流したら、3人から返事が来た。みんなちゃんと考えて答えてくれてる感じがした。',
              name: '会社員・28歳',
            },
            {
              text: 'テキストだと伝わらないニュアンスが、声だと一発でわかる。「しんどい」の一言でも、声で言うと全然違う。',
              name: '看護師・34歳',
            },
            {
              text: '人助けカウントが5になったとき、なんか誇らしかった。Xで「いいね」もらうより嬉しいかも。',
              name: 'フリーランス・31歳',
            },
          ].map((v, i) => (
            <div key={i} className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm">
              <p className="text-sm text-stone-700 leading-relaxed mb-3">「{v.text}」</p>
              <p className="text-xs text-stone-400 font-semibold">{v.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 民度の設計 ── */}
      <section className="bg-stone-900 px-5 py-10">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center mb-2">なぜ安心なのか</p>
        <h2 className="text-xl font-extrabold text-center text-white mb-7">民度は、設計で決まる</h2>
        <div className="space-y-3">
          {[
            { emoji: '📱', title: '電話認証が必須',     desc: '捨てアカが存在できない設計。本物の人間だけが入れる。' },
            { emoji: '🏅', title: 'Trust Tier制度',     desc: '活動するほど信頼が上がる。ティアが上がると使える機能が増える。' },
            { emoji: '🔒', title: '匿名・本名不要',     desc: 'ニックネームだけでOK。言いたくないことは言わなくていい。' },
            { emoji: '🤝', title: '人助けが可視化',     desc: 'Q&Aに答えると「助けた人数」が残る。貢献する文化が自然に生まれる。' },
          ].map(t => (
            <div key={t.title} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5">
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
            { emoji: '❓',   text: '悩みや疑問を、匿名で誰かに聞いてみたい' },
            { emoji: '🤝',  text: '誰かの役に立ちたい、でも大げさにしたくない' },
            { emoji: '🌙',  text: '夜中に一人でいるとき、誰かと話したい' },
            { emoji: '💬',  text: 'SNSに疲れた、変な人がいない場所に行きたい' },
            { emoji: '🌱',  text: '居場所がほしい、でも無理せず繋がりたい' },
          ].map(item => (
            <div key={item.text} className="flex items-center gap-3 bg-white border border-stone-100 rounded-2xl px-4 py-3 shadow-sm">
              <span className="text-lg flex-shrink-0">{item.emoji}</span>
              <p className="text-sm text-stone-700 font-medium">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 最終CTA ── */}
      <section className="px-5 pb-12">
        <div className="rounded-3xl p-8 text-center"
          style={{ background: 'linear-gradient(135deg,#1a1a2e 0%,#4f46e5 100%)' }}>
          <p className="text-white/50 text-xs mb-3">電話認証必須 · 18歳以上 · 匿名OK</p>
          <h2 className="text-2xl font-extrabold text-white mb-2">
            知らない誰かに、<br />助けてもらいに行く。
          </h2>
          <p className="text-white/50 text-xs mb-6">民度を設計した、日本唯一の大人コミュニティ</p>
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
            <span className="text-white font-black text-xs">V</span>
          </div>
          <span className="font-bold text-stone-700">VILLIA</span>
        </div>
        <p className="text-xs text-stone-400 mb-3">知らない誰かに、助けてもらえるSNS · 18歳以上</p>
        <div className="flex justify-center gap-5 text-xs text-stone-400">
          <Link href="/terms"   className="hover:text-stone-600 transition">利用規約</Link>
          <Link href="/privacy" className="hover:text-stone-600 transition">プライバシー</Link>
          <Link href="/safety"  className="hover:text-stone-600 transition">Safety Center</Link>
          <Link href="/contact" className="hover:text-stone-600 transition">お問い合わせ</Link>
        </div>
        <p className="text-xs text-stone-300 mt-3">© 2026 VILLIA</p>
      </footer>
    </div>
  )
}
