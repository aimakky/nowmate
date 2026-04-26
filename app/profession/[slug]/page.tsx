import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

// ── 職業別データ ────────────────────────────────────────────────
const PROFESSION_DATA: Record<string, {
  emoji:       string
  label:       string
  occupation:  string
  tagline:     string
  hero:        string
  pains:       string[]
  posts:       { text: string; replies: number; reactions: number }[]
  voices:      { text: string; name: string }[]
  gradient:    string
}> = {
  nurses: {
    emoji:      '🏥',
    label:      '看護師・医療',
    occupation: '看護師',
    tagline:    '夜勤明けのあの感覚、看護師にしかわからない。',
    hero:       '看護師が、看護師に話せる場所。',
    pains: [
      '患者さんが亡くなった夜、誰にも話せなかった',
      '師長との関係、職場の人には言えない',
      '夜勤明けの虚無感を、家族には理解されない',
      'インシデントの後、一人で抱えていた',
    ],
    posts: [
      { text: '今日また急変があった。処置しながら「間に合わせたい」って必死だった。言語化しないと消化できない。', replies: 14, reactions: 31 },
      { text: '夜勤3連続目。体は動いてるけど心がついてこない。でもここで誰かの声が読めると少し楽になる。', replies: 9, reactions: 24 },
      { text: '転職どうしようか悩んでる看護師います？給与は上がるけど今の患者さんが心配で。', replies: 11, reactions: 17 },
    ],
    voices: [
      { text: '看護師同士だから「あるある」で終わらず、本当に深い話ができる。', name: '看護師・28歳' },
      { text: 'インシデントの後、ここで話を聞いてもらって、ちゃんと次の勤務に出られた。', name: '看護師・34歳' },
    ],
    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #1a3a5c 100%)',
  },
  teachers: {
    emoji:      '📚',
    label:      '教師・教育',
    occupation: '教師',
    tagline:    '保護者対応の帰り道、どこかに吐き出したかった。',
    hero:       '教師が、教師に話せる場所。',
    pains: [
      '保護者からのクレームを、一人で受け止めてきた',
      '学級崩壊の前兆、同僚には言いにくい',
      '働き方改革と現実のギャップに疲弊している',
      '子どもへの向き合い方、正解がわからなくなってきた',
    ],
    posts: [
      { text: '今日また保護者から電話があった。内容は正直理不尽だったけど、それでも謝らないといけない状況がしんどい。', replies: 12, reactions: 28 },
      { text: '担任を持つのが怖くなってきた。やりがいはあるのにな。この気持ち、職員室では言えない。', replies: 8, reactions: 21 },
      { text: '教員2年目。子どもたちは好きだけど、毎日帰りが22時で限界かもしれない。転職考えた人いますか。', replies: 15, reactions: 35 },
    ],
    voices: [
      { text: '職員室では言えないことを、教師同士だから安心して話せる。', name: '小学校教師・31歳' },
      { text: '管理職への不満も、保護者対応の悩みも、ここだと正直に話せた。', name: '中学教師・27歳' },
    ],
    gradient: 'linear-gradient(135deg, #1a2e1a 0%, #2d5a1b 100%)',
  },
  engineers: {
    emoji:      '💻',
    label:      'エンジニア',
    occupation: 'エンジニア',
    tagline:    '技術的負債の話、非エンジニアには説明したくない。',
    hero:       'エンジニアが、エンジニアに話せる場所。',
    pains: [
      '転職どうすべきか、年収と環境どっちを取るか',
      'チームのカオスを、家族に説明するのが面倒',
      '技術選定の葛藤、ビジネス側に理解されない',
      'バーンアウトしそうなのに、誰にも言えていない',
    ],
    posts: [
      { text: '転職活動中。オファー2つきて迷ってる。片方は年収+150万だけど、もう片方はチームが最高に良さそう。', replies: 18, reactions: 42 },
      { text: 'レガシーコードのリファクタ、経営層に価値を説明するのが一番しんどい。', replies: 7, reactions: 19 },
      { text: '最近コードを書くのが楽しくなくなってきた。燃え尽きてるのか、ただ疲れてるのか区別がつかない。', replies: 13, reactions: 38 },
    ],
    voices: [
      { text: '技術的な背景を説明しなくていい楽さがある。同じエンジニアだから話が早い。', name: 'バックエンドエンジニア・33歳' },
      { text: 'キャリアの悩みをここで話したら、具体的なアドバイスをもらえた。', name: 'フリーランスエンジニア・29歳' },
    ],
    gradient: 'linear-gradient(135deg, #0f1a2e 0%, #1a1a4e 100%)',
  },
  caregivers: {
    emoji:      '🏢',
    label:      '介護・福祉',
    occupation: '介護士',
    tagline:    '体がしんどい。でもこの仕事が嫌いじゃないから余計つらい。',
    hero:       '介護士が、介護士に話せる場所。',
    pains: [
      '腰痛と戦いながらも辞めたくない気持ち',
      '利用者さんとの別れが続く夜のしんどさ',
      '給与への不満と、仕事への誇りの葛藤',
      '人手不足の現場、どこまで自分を削ればいいのか',
    ],
    posts: [
      { text: '今日担当の利用者さんが亡くなった。看取りに立ち会えてよかった。だけど何かが抜けた感じ。', replies: 16, reactions: 44 },
      { text: '月給22万でこの仕事続けるのか、ずっと悩んでる。でも離れられない自分もいる。', replies: 11, reactions: 29 },
      { text: '腰が本当に限界。でも職場には言えない。欠員出したくないから。', replies: 9, reactions: 23 },
    ],
    voices: [
      { text: '介護士同士だから、感情をそのまま話せた。理解してもらえる安心感が違う。', name: '介護士・32歳' },
      { text: 'ここで話すと「自分だけじゃないんだ」って思えて、また頑張れる。', name: '介護福祉士・26歳' },
    ],
    gradient: 'linear-gradient(135deg, #2e1a1a 0%, #5c2d1b 100%)',
  },
  officials: {
    emoji:      '🏛️',
    label:      '公務員',
    occupation: '公務員',
    tagline:    '安定してるって言われるけど、中身は違う。',
    hero:       '公務員が、公務員に話せる場所。',
    pains: [
      '「安定してていいね」と言われるたびに複雑な気持ち',
      '変わらない組織への疲弊、外には言えない',
      '副業禁止・転職への制約、将来どうするか',
      '市民対応のストレスを、家族には話せない',
    ],
    posts: [
      { text: '「公務員は楽でいいよね」って友達に言われた。繁忙期の残業と市民対応のストレスが伝わらない。', replies: 14, reactions: 33 },
      { text: '転職考えてる公務員います？スキルが積みにくくて将来が不安になってきた。', replies: 10, reactions: 22 },
      { text: '窓口クレーム対応が続いてる。メンタルがしんどい。', replies: 8, reactions: 19 },
    ],
    voices: [
      { text: '「公務員あるある」を分かち合える場所がなかったから、ここは救いです。', name: '地方公務員・30歳' },
      { text: '転職の悩みを、同じ立場の人と話せるのがありがたい。', name: '国家公務員・28歳' },
    ],
    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #2e2e6e 100%)',
  },
  sales: {
    emoji:      '🏬',
    label:      '営業・販売',
    occupation: '営業',
    tagline:    'ノルマと顧客の板挟み、毎月のこと。',
    hero:       '営業が、営業に話せる場所。',
    pains: [
      'ノルマプレッシャー、家族には心配させたくない',
      '顧客とのトラブル、一人で抱えてきた',
      'インセンティブ制度の不満、同僚には言えない',
      '体育会系の文化と自分のスタイルの摩擦',
    ],
    posts: [
      { text: '今月ノルマ達成できそうにない。しかも上司に詰められてる。誰かにこの状況を聞いてほしくて。', replies: 11, reactions: 26 },
      { text: '大口顧客から急に解約言われた。理由が不明瞭で、引き止めるしかなかった。', replies: 8, reactions: 17 },
      { text: '営業から企画職に転職した人いますか？スキルのギャップが気になって。', replies: 13, reactions: 30 },
    ],
    voices: [
      { text: '営業の泥臭い現場の話を、ちゃんとわかってくれる人と話せた。', name: 'BtoB営業・35歳' },
      { text: 'ノルマのプレッシャーをここで吐き出すだけで、次の日動けた。', name: '不動産営業・29歳' },
    ],
    gradient: 'linear-gradient(135deg, #2e1a0a 0%, #5c3a1b 100%)',
  },
}

type Params = { slug: string }

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const data = PROFESSION_DATA[params.slug]
  if (!data) return { title: 'samee' }
  return {
    title: `samee — ${data.hero}`,
    description: `${data.tagline} ${data.label}専用のコミュニティで、同じ職業の人間とだけ話せる。電話認証済み・民度設計済み。`,
    openGraph: {
      title: `samee — ${data.hero}`,
      description: data.tagline,
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
  }
}

export default async function ProfessionPage({ params }: { params: Params }) {
  const data = PROFESSION_DATA[params.slug]
  if (!data) notFound()

  const supabase = createClient()
  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('occupation', data.occupation)
  const profCount = Math.max(count ?? 0, 1)

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col max-w-[430px] mx-auto">

      {/* ── ヘッダー ── */}
      <header className="flex items-center justify-between px-5 pt-5 pb-3 sticky top-0 bg-[#FAFAF9]/95 backdrop-blur z-10 border-b border-stone-100/60">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center shadow-sm shadow-brand-200">
            <span className="text-white font-black text-sm">S</span>
          </div>
          <span className="font-extrabold text-stone-900 text-lg tracking-tight">samee</span>
        </Link>
        <Link href="/login"
          className="text-sm font-bold text-brand-500 px-4 py-1.5 rounded-xl border border-brand-200 hover:bg-brand-50 transition">
          ログイン
        </Link>
      </header>

      {/* ── ヒーロー ── */}
      <section
        className="px-5 pt-10 pb-12 text-center flex flex-col items-center"
        style={{ background: data.gradient }}
      >
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3.5 py-1.5 mb-6">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs font-bold text-white">{profCount.toLocaleString()}人の{data.label}が利用中</span>
        </div>

        <span className="text-5xl mb-4">{data.emoji}</span>

        <h1 className="text-[1.9rem] font-black text-white leading-[1.2] mb-4 tracking-tight">
          {data.hero}
        </h1>

        <p className="text-white/70 text-[14px] leading-relaxed mb-8 max-w-[280px]">
          {data.tagline}
        </p>

        <Link href="/signup"
          className="w-full py-4 bg-white text-brand-600 rounded-2xl font-extrabold text-base text-center shadow-lg active:scale-[0.98] transition-all mb-3">
          {data.label}村に無料で入る →
        </Link>
        <p className="text-xs text-white/40">30秒で登録 · 完全無料 · 18歳以上</p>
      </section>

      {/* ── あるある ── */}
      <section className="px-5 py-10">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center mb-2">あなただけが知ってる</p>
        <h2 className="text-xl font-extrabold text-center text-stone-900 mb-6">
          {data.label}にしかわからない、あの感覚
        </h2>
        <div className="space-y-2.5">
          {data.pains.map((pain, i) => (
            <div key={i} className="flex items-center gap-3 bg-white border border-stone-100 rounded-2xl px-4 py-3.5 shadow-sm">
              <span className="text-base flex-shrink-0">{data.emoji}</span>
              <p className="text-sm text-stone-700 font-medium leading-snug">{pain}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 bg-brand-50 border border-brand-100 rounded-2xl px-4 py-3.5 text-center">
          <p className="text-sm font-bold text-brand-700">
            そのすべてを、同じ職業の人間に話せる場所がsameeです。
          </p>
        </div>
      </section>

      {/* ── 今夜の投稿プレビュー ── */}
      <section className="bg-stone-50 px-4 py-8">
        <div className="flex items-center gap-2 mb-4 px-1">
          <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
          <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">今夜の{data.label}村</p>
        </div>
        <div className="space-y-2.5">
          {data.posts.map((p, i) => (
            <Link key={i} href="/signup"
              className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm flex flex-col gap-2.5 hover:shadow-md transition-all active:scale-[0.99] block">
              <div className="flex items-center gap-2">
                <span className="text-base">{data.emoji}</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-brand-50 text-brand-600 border border-brand-100">{data.label}村</span>
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

      {/* ── みんなの声 ── */}
      <section className="px-5 py-10">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center mb-2">みんなの声</p>
        <h2 className="text-xl font-extrabold text-center text-stone-900 mb-6">「{data.label}だから話せた」</h2>
        <div className="space-y-3">
          {data.voices.map((v, i) => (
            <div key={i} className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm">
              <p className="text-sm text-stone-700 leading-relaxed mb-3">「{v.text}」</p>
              <p className="text-xs text-stone-400 font-semibold">{v.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 安心設計 ── */}
      <section className="bg-stone-900 px-5 py-10">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center mb-2">なぜ安心なのか</p>
        <h2 className="text-xl font-extrabold text-center text-white mb-7">民度は、設計で決まる</h2>
        <div className="space-y-3">
          {[
            { emoji: '📱', title: '電話認証が必須', desc: '本物の人間だけが入れる。捨てアカウントが存在できない設計。' },
            { emoji: '💼', title: `${data.label}専用の村`, desc: `同じ${data.label}の人だけが集まる村。話が「通じる」から深くなる。` },
            { emoji: '🏅', title: '信頼ティア制度', desc: '活動するほど信頼度が上がる。「この人は本物だ」がわかる。' },
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5">
              <span className="text-xl flex-shrink-0 mt-0.5">{t.emoji}</span>
              <div>
                <p className="font-bold text-white text-sm mb-0.5">{t.title}</p>
                <p className="text-xs text-stone-400 leading-relaxed">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 最終CTA ── */}
      <section className="px-5 py-12">
        <div className="rounded-3xl p-8 text-center" style={{ background: data.gradient }}>
          <span className="text-4xl block mb-3">{data.emoji}</span>
          <h2 className="text-2xl font-extrabold text-white mb-2">
            {data.label}村に、入ってみる。
          </h2>
          <p className="text-white/50 text-xs mb-6">同じ職業の人間だけが集まる。電話認証済み。</p>
          <Link href="/signup"
            className="w-full py-4 bg-white text-brand-600 rounded-2xl font-extrabold text-base text-center active:scale-[0.98] transition-all block mb-3 shadow-lg">
            無料で始める →
          </Link>
          <p className="text-xs text-white/30">30秒で登録 · 永久無料 · 18歳以上</p>
        </div>
      </section>

      {/* ── 他の職業を見る ── */}
      <section className="px-5 pb-10">
        <p className="text-xs font-bold text-stone-500 uppercase tracking-widest text-center mb-4">他の職業を見る</p>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(PROFESSION_DATA)
            .filter(([slug]) => slug !== params.slug)
            .slice(0, 6)
            .map(([slug, pd]) => (
            <Link key={slug} href={`/profession/${slug}`}
              className="flex flex-col items-center gap-1.5 bg-white border border-stone-100 rounded-2xl py-3 px-2 shadow-sm hover:shadow-md transition-all active:scale-95">
              <span className="text-2xl">{pd.emoji}</span>
              <p className="text-[10px] font-bold text-stone-700 text-center leading-snug">{pd.label}</p>
            </Link>
          ))}
        </div>
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
          <Link href="/"        className="hover:text-stone-600 transition">トップへ</Link>
        </div>
        <p className="text-xs text-stone-300 mt-3">© 2026 samee</p>
      </footer>
    </div>
  )
}
