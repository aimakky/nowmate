'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft } from 'lucide-react'
import { VILLAGE_TYPE_STYLES } from '@/components/ui/VillageCard'

// 職業別スターター投稿 — 詐称者が答えられない「同業者にしかわかる問い」
const JOB_STARTER_TOPICS: Record<string, { content: string; category: string }> = {
  '看護師':      { content: '【村の最初の問い】\n\n今日の勤務、どうでしたか？\n\n夜勤明けの虚無感、急変対応の後の気持ち、師長との関係、インシデントレポートの苦労……\n同じ看護師にしか伝わらないことを、ここで話してください。\n\n「今日は〇〇がしんどかった」の一言だけでも大丈夫です。', category: '雑談' },
  '医師':        { content: '【村の最初の問い】\n\n今週、一番しんどかったことを話しませんか？\n\n患者対応・当直・研修医指導・論文・キャリアの悩み……\n外では言えないことを、同じ医師だけのここで。', category: '雑談' },
  '薬剤師':      { content: '【村の最初の問い】\n\n今、薬剤師として何が一番気になっていますか？\n\n調剤業務・服薬指導・OTCへの転向・ドラッグストアvs病院……\n職場では言いにくい本音を話しましょう。', category: '雑談' },
  '歯科':        { content: '【村の最初の問い】\n\n歯科の仕事、今どうですか？\n\n患者対応・技工の話・開業か勤務かの悩み……\n同じ業界の人間だからわかること、ここで話しましょう。', category: '雑談' },
  '介護士':      { content: '【村の最初の問い】\n\n今日の体と心、どんな状態ですか？\n\n腰痛・夜勤・利用者さんとの別れ・給与への葛藤……\n「しんどい」だけ書いてもいい。同じ介護士が聞いています。', category: '雑談' },
  '教師':        { content: '【村の最初の問い】\n\n今年一番しんどかった保護者対応か、学級のことを話しませんか？\n\n職員室では言えないこと、担任の重さ、働き方改革と現実のギャップ……\n教師同士だから言える本音を。', category: '雑談' },
  'エンジニア':  { content: '【村の最初の問い】\n\n今、転職・技術・チームのどれで悩んでいますか？\n\n年収と環境のトレードオフ、レガシーコード、バーンアウト……\n技術背景を説明しなくていい、楽な場所にしましょう。', category: '雑談' },
  'デザイナー':  { content: '【村の最初の問い】\n\nクライアントのフィードバック、キャリア、フリーvs会社員……\n今デザイナーとして何を考えていますか？\n同業者だからこそ話せることを。', category: '雑談' },
  '営業':        { content: '【村の最初の問い】\n\n今月のノルマ、どうですか？\n\n詰められた話・理不尽な顧客・インセンティブへの不満……\n営業同士で本音を話しましょう。家族には言えないことでも。', category: '雑談' },
  '経理':        { content: '【村の最初の問い】\n\n決算期・監査・社内調整……今何が一番大変ですか？\n「数字の番人」として感じる孤独や苦労、経理の人間だけで話しましょう。', category: '雑談' },
  'マーケター':  { content: '【村の最初の問い】\n\n施策の成果・上司への説明・代理店との関係……\n今マーケターとして何に悩んでいますか？', category: '雑談' },
  '法律職':      { content: '【村の最初の問い】\n\n案件・事務所・キャリア……今法律職として何を考えていますか？\n守秘義務の範囲で、話せることを話しましょう。', category: '雑談' },
  '公務員':      { content: '【村の最初の問い】\n\n「安定してていいよね」と言われるたびに、どう感じますか？\n\n窓口対応・組織の硬直・転職への迷い……\n公務員同士だから共有できる本音を話しましょう。', category: '雑談' },
  '警察消防':    { content: '【村の最初の問い】\n\n今日の現場、どうでしたか？\n\n外では絶対に言えないことが、この仕事にはある。\n同じ立場の人間だけがいる、ここで話しましょう。', category: '雑談' },
  '建築士':      { content: '【村の最初の問い】\n\n現場・設計・施主……今何が一番大変ですか？\n建築の仕事のリアルを話しましょう。', category: '雑談' },
  '航空交通':    { content: '【村の最初の問い】\n\nシフト・体力・キャリア……今この仕事についてどう感じていますか？\n同じ業界の人間だけで話せる場所です。', category: '雑談' },
  '飲食':        { content: '【村の最初の問い】\n\n今日の営業、どうでしたか？\n\nクレーム・体力の限界・将来への不安……\n飲食の仕事のリアルを、同業者と話しましょう。', category: '雑談' },
  'サービス業':  { content: '【村の最初の問い】\n\n接客で一番しんどいのは、どんなお客さんですか？\n\nクレーム・マニュアルの矛盾・給与への不満……\n同じサービス業の人間だけで話しましょう。', category: '雑談' },
  'クリエイター':{ content: '【村の最初の問い】\n\n制作・案件・収入・孤独……今クリエイターとして何を感じていますか？\n同業者だからわかること、ここで話しましょう。', category: '雑談' },
  '農林水産':    { content: '【村の最初の問い】\n\n天気・収穫・後継者問題……今この仕事についてどう感じていますか？\n同じ業界の人間と話しましょう。', category: '雑談' },
  '製造業':      { content: '【村の最初の問い】\n\n現場・シフト・将来……製造業の仕事のリアルを話しましょう。', category: '雑談' },
  '物流':        { content: '【村の最初の問い】\n\n配送・体力・2024年問題……今物流の仕事でどんなことを考えていますか？', category: '雑談' },
  '不動産':      { content: '【村の最初の問い】\n\n営業・契約・顧客対応……不動産の仕事のリアルを話しましょう。', category: '雑談' },
  'コンサル':    { content: '【村の最初の問い】\n\nプロジェクト・クライアント・激務・転職……\n今コンサルタントとして何を考えていますか？', category: '雑談' },
  '金融':        { content: '【村の最初の問い】\n\n金融規制・ノルマ・テック化の波……今この業界にいてどう感じていますか？\n同業者だけの場所で話しましょう。', category: '雑談' },
  '人事':        { content: '【村の最初の問い】\n\n採用・評価・ハラスメント対応……人事の仕事は誰にも話せないことが多い。\n同じ人事の人間と話しましょう。', category: '雑談' },
  '研究者':      { content: '【村の最初の問い】\n\nポスドク問題・研究費・アカデミアの将来……\n研究者として今何を感じていますか？', category: '雑談' },
  '経営者':      { content: '【村の最初の問い】\n\n今一番の経営課題は何ですか？\n\n資金・採用・売上・孤独……\n経営者同士だから話せることを、ここで話しましょう。', category: '雑談' },
  '転職活動中':  { content: '【村の最初の問い】\n\n今どんな理由で転職を考えていますか？\n\n年収・環境・人間関係・やりたいこと……\n同じく転職活動中の人と、本音で話しましょう。', category: '相談' },
}

const VILLAGE_TYPES = [
  { id: '雑談',      label: '話して、整理する村',       icon: '🌿', desc: '話すことで気持ちや考えが整理される',   category: 'tonight' },
  { id: '仕事終わり', label: '仕事後を豊かにする村',    icon: '🌙', desc: '一日を振り返り、明日につながる話を',  category: 'work'    },
  { id: '相談',      label: '経験を還元する村',         icon: '🤝', desc: '悩みを持ち込んでいい。経験者が待つ',  category: 'help'    },
  { id: '趣味',      label: '趣味で視点を広げる村',     icon: '🎨', desc: '好きから学べることを語り合う場所',    category: 'think'   },
  { id: '職業',      label: '同じ道を歩む人と話す村',   icon: '💼', desc: '仕事のリアル・キャリアを語り合う',    category: 'work'    },
  { id: '地域',      label: '暮らしをより良くする村',   icon: '📍', desc: '地元のリアルを共に育てていく場所',    category: 'life'    },
  { id: '初参加',    label: '最初の一歩を歓迎する村',   icon: '🌱', desc: 'コミュニティが初めてでも大丈夫',      category: 'start'   },
  { id: '焚き火',    label: '今日を静かに終わらせる村', icon: '🔥', desc: '話してもいい、聞いていてもいい',      category: 'tonight' },
]

const JOB_TYPE_OPTIONS = [
  { emoji: '🏥', label: '看護師・医療',     value: '看護師' },
  { emoji: '👨‍⚕️', label: '医師',            value: '医師' },
  { emoji: '💊', label: '薬剤師',            value: '薬剤師' },
  { emoji: '🏥', label: '介護・福祉',        value: '介護士' },
  { emoji: '📚', label: '教師・講師',        value: '教師' },
  { emoji: '💻', label: 'エンジニア',        value: 'エンジニア' },
  { emoji: '🎨', label: 'デザイナー',        value: 'デザイナー' },
  { emoji: '📊', label: '営業・販売',        value: '営業' },
  { emoji: '🏛️', label: '公務員',            value: '公務員' },
  { emoji: '⚖️', label: '法律・司法',        value: '法律職' },
  { emoji: '💼', label: 'コンサル・経営',    value: 'コンサル' },
  { emoji: '🏦', label: '金融・保険',        value: '金融' },
  { emoji: '🎬', label: 'クリエイター',      value: 'クリエイター' },
  { emoji: '🚀', label: '起業家・CEO',       value: '経営者' },
  { emoji: '🔄', label: '転職・求職中',      value: '転職活動中' },
]

export default function CreateVillagePage() {
  const router = useRouter()
  const [name,        setName]        = useState('')
  const [description, setDescription] = useState('')
  const [type,        setType]        = useState('雑談')
  const [jobLocked,   setJobLocked]   = useState(false)
  const [jobType,     setJobType]     = useState('')
  const [commStyle,   setCommStyle]   = useState<'text' | 'voice'>('text')
  const [visibility,  setVisibility]  = useState<'public'|'approval'|'invite'>('public')
  const [creating,    setCreating]    = useState(false)

  const selectedType  = VILLAGE_TYPES.find(t => t.id === type)!
  const selectedStyle = VILLAGE_TYPE_STYLES[type] ?? VILLAGE_TYPE_STYLES['雑談']

  async function handleCreate() {
    if (!name.trim() || creating) return
    if (jobLocked && !jobType) return
    setCreating(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase.from('villages').insert({
      name:        name.trim(),
      description: description.trim(),
      type:        jobLocked ? '職業' : type,
      icon:        jobLocked ? '💼' : selectedType.icon,
      category:    jobLocked ? 'work' : selectedType.category,
      host_id:     user.id,
      job_locked:  jobLocked,
      job_type:    jobLocked ? jobType : null,
      comm_style:  commStyle,
      visibility:  visibility,
    }).select().single()

    if (data) {
      // Auto-join as host
      await supabase.from('village_members').insert({
        village_id: data.id,
        user_id:    user.id,
        role:       'host',
      })

      // 職業限定村のみ：スターター投稿を自動生成してピン留め
      if (jobLocked && jobType && JOB_STARTER_TOPICS[jobType]) {
        const topic = JOB_STARTER_TOPICS[jobType]
        const { data: starterPost } = await supabase
          .from('village_posts')
          .insert({
            village_id: data.id,
            user_id:    user.id,
            content:    topic.content,
            category:   topic.category,
          })
          .select()
          .single()

        if (starterPost) {
          await supabase
            .from('villages')
            .update({ pinned_post_id: starterPost.id })
            .eq('id', data.id)
        }
      }

      router.push(`/villages/${data.id}`)
    }
    setCreating(false)
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-birch">

      {/* ── Header ── */}
      <div className="bg-white border-b border-stone-100 px-4 pt-4 pb-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-stone-500">
          <ArrowLeft size={20} />
        </button>
        <p className="font-extrabold text-stone-900">村を作る</p>
      </div>

      <div className="px-4 pt-5 pb-32 space-y-5">

        {/* ── Live Preview ── */}
        <div className="rounded-3xl overflow-hidden shadow-md border border-white">
          {/* Gradient banner */}
          <div
            className="relative flex items-center justify-center"
            style={{ background: selectedStyle.gradient, height: 120 }}
          >
            {/* Noise */}
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}
            />
            <div
              className="absolute top-2 left-2 text-[9px] font-bold text-white/80 px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              🌱 芽吹いた村
            </div>
            <div
              className="absolute top-8 left-2 text-[9px] font-bold text-white/80 px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              {commStyle === 'text' ? '💬 チャット村' : '🎙️ 通話村'}
            </div>
            <span style={{ fontSize: '2.8rem', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.25))' }}>
              {selectedType.icon}
            </span>
          </div>
          {/* Info */}
          <div className="bg-white px-4 py-3">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="font-extrabold text-stone-900 text-sm leading-tight">
                {name || '村の名前'}
              </p>
              <span className={`flex-shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full border ${selectedStyle.badgeBg}`}>
                {selectedStyle.label}
              </span>
            </div>
            <p className="text-xs text-stone-400 line-clamp-2">
              {description || '村の説明がここに表示されます'}
            </p>
          </div>
        </div>

        {/* ── Village Name ── */}
        <div>
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
            村の名前 <span className="text-rose-400">*</span>
          </p>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="例：夜の焚き火　仕事帰りの縁側"
            maxLength={30}
            className="w-full px-4 py-3 rounded-2xl border-2 border-stone-200 text-sm focus:outline-none focus:border-brand-400 bg-white"
          />
          <p className="text-right text-[10px] text-stone-400 mt-1">{name.length}/30</p>
        </div>

        {/* ── Description ── */}
        <div>
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
            村の説明
          </p>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="この村でどんなことが増えてほしいか書いてください。どんな話をする場所か、来てほしい人のイメージなど。"
            maxLength={100}
            rows={3}
            className="w-full px-4 py-3 rounded-2xl border-2 border-stone-200 text-sm resize-none focus:outline-none focus:border-brand-400 bg-white"
          />
          <p className="text-right text-[10px] text-stone-400 mt-1">{description.length}/100</p>
        </div>

        {/* ── 職業限定トグル ── */}
        <div>
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">
            職業限定村にする
          </p>
          <button
            onClick={() => { setJobLocked(v => !v); if (!jobLocked) setType('職業') }}
            className="w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left"
            style={{ borderColor: jobLocked ? '#6366f1' : '#e7e5e4', background: jobLocked ? '#eef2ff' : '#fff' }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">💼</span>
              <div>
                <p className="text-sm font-extrabold" style={{ color: jobLocked ? '#4f46e5' : '#1c1917' }}>
                  職業限定村
                </p>
                <p className="text-[10px] text-stone-400 mt-0.5">同じ職業の人だけが入れる村を作る</p>
              </div>
            </div>
            <div
              className="w-10 h-6 rounded-full relative transition-all flex-shrink-0"
              style={{ background: jobLocked ? '#6366f1' : '#d6d3d1' }}
            >
              <div
                className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                style={{ left: jobLocked ? '18px' : '2px' }}
              />
            </div>
          </button>

          {jobLocked && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">対象の職業</p>
              <div className="grid grid-cols-2 gap-2">
                {JOB_TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setJobType(opt.value)}
                    className="flex items-center gap-2 p-3 rounded-2xl border-2 text-left transition-all active:scale-95"
                    style={jobType === opt.value
                      ? { borderColor: '#6366f1', background: '#eef2ff' }
                      : { borderColor: '#e7e5e4', background: '#fff' }
                    }
                  >
                    <span className="text-lg flex-shrink-0">{opt.emoji}</span>
                    <p className="text-xs font-bold truncate" style={{ color: jobType === opt.value ? '#4f46e5' : '#44403c' }}>
                      {opt.label}
                    </p>
                  </button>
                ))}
              </div>
              {!jobType && (
                <p className="text-xs text-rose-500 font-bold px-1">職業を選択してください</p>
              )}
            </div>
          )}
        </div>

        {/* ── Village Type ── */}
        {!jobLocked && (
        <div>
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">
            村のタイプ
          </p>
          <div className="grid grid-cols-2 gap-2">
            {VILLAGE_TYPES.map(t => {
              const ts = VILLAGE_TYPE_STYLES[t.id] ?? VILLAGE_TYPE_STYLES['雑談']
              const selected = type === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className="flex items-center gap-2.5 p-3 rounded-2xl border-2 text-left transition-all active:scale-95"
                  style={
                    selected
                      ? { borderColor: ts.accent, background: `${ts.accent}12` }
                      : { borderColor: '#e7e5e4', background: '#fff' }
                  }
                >
                  <span className="text-xl flex-shrink-0">{t.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: selected ? ts.accent : '#44403c' }}>
                      {t.label}
                    </p>
                    <p className="text-[10px] text-stone-400 truncate">{t.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
        )}

        {/* ── コミュニケーションスタイル ── */}
        <div>
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">
            村のスタイル
          </p>
          <p className="text-[10px] text-stone-400 mb-3">通話村はチャットも使えます</p>
          <div className="grid grid-cols-2 gap-3">
            {([
              {
                id: 'text', icon: '💬', label: 'チャット村',
                desc: '文章で深く語り合う村\nテキスト投稿・返信中心',
                color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe',
              },
              {
                id: 'voice', icon: '🎙️', label: '通話村',
                desc: '声で話し合える村\n通話 ＋ チャット両方使える',
                color: '#ea580c', bg: '#fff7ed', border: '#fed7aa',
              },
            ] as { id: 'text' | 'voice'; icon: string; label: string; desc: string; color: string; bg: string; border: string }[]).map(opt => (
              <button
                key={opt.id}
                onClick={() => setCommStyle(opt.id)}
                className="flex flex-col items-start gap-2 p-4 rounded-2xl border-2 text-left transition-all active:scale-95"
                style={commStyle === opt.id
                  ? { borderColor: opt.color, background: opt.bg }
                  : { borderColor: '#e7e5e4', background: '#fff' }
                }
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{opt.icon}</span>
                  <p className="text-xs font-extrabold leading-tight" style={{ color: commStyle === opt.id ? opt.color : '#44403c' }}>
                    {opt.label}
                  </p>
                </div>
                <p className="text-[10px] text-stone-400 leading-relaxed whitespace-pre-line">{opt.desc}</p>
                {commStyle === opt.id && (
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: opt.color, color: '#fff' }}
                  >
                    ✓ 選択中
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── 村の哲学ヒント ── */}
        <div
          className="rounded-2xl px-4 py-3.5 space-y-2"
          style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', border: '1px solid #ddd6fe' }}
        >
          <p className="text-xs font-bold text-violet-700">✍️ 良い村の説明文とは</p>
          <div className="space-y-1.5">
            {[
              { bad: '趣味の村です',              good: '趣味を通じて視点を広げ、人生に活かせることを語り合う村' },
              { bad: '何でも話していい村',         good: '話しながら気持ちや考えが整理される、静かな場所' },
              { bad: 'ゲーム好き集まれ！',         good: 'ゲームから仕事・人間関係・思考に活かせることを語り合う' },
            ].map((ex, i) => (
              <div key={i} className="flex gap-2 text-[10px]">
                <span className="text-rose-400 font-bold flex-shrink-0">×</span>
                <span className="text-stone-400 line-through">{ex.bad}</span>
                <span className="text-violet-500 font-medium flex-shrink-0">→</span>
                <span className="text-violet-700 font-medium">{ex.good}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-violet-500 pt-1">
            🌿 村長になると、あなたが場の空気を作ります。来てほしい人に向けた言葉を書いてください。
          </p>
        </div>

        {/* ── 公開設定 ── */}
        <div>
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">公開設定</p>
          <p className="text-[10px] text-stone-400 mb-3">招待制はプレミアムプランで利用できます</p>
          <div className="space-y-2">
            {([
              { id: 'public',   icon: '🌍', label: '公開',   desc: '誰でも参加できる',           color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
              { id: 'approval', icon: '🔑', label: '承認制', desc: '村長が参加を承認する',         color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
              { id: 'invite',   icon: '🏰', label: '招待制', desc: '既存メンバーの招待のみ入村可（プレミアム）', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
            ] as { id: 'public'|'approval'|'invite'; icon: string; label: string; desc: string; color: string; bg: string; border: string }[]).map(opt => (
              <button
                key={opt.id}
                onClick={() => setVisibility(opt.id)}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all active:scale-[0.98]"
                style={visibility === opt.id
                  ? { borderColor: opt.color, background: opt.bg }
                  : { borderColor: '#e7e5e4', background: '#fff' }}
              >
                <span className="text-xl flex-shrink-0">{opt.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-extrabold" style={{ color: visibility === opt.id ? opt.color : '#1c1917' }}>{opt.label}</p>
                  <p className="text-[10px] text-stone-400">{opt.desc}</p>
                </div>
                {visibility === opt.id && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: opt.color, color: '#fff' }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Submit ── */}
        <button
          onClick={handleCreate}
          disabled={!name.trim() || creating || (jobLocked && !jobType)}
          className="w-full py-4 rounded-2xl font-extrabold text-base text-white disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          style={{
            background: jobLocked ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : selectedStyle.gradient,
            boxShadow: jobLocked ? '0 8px 24px rgba(99,102,241,0.4)' : `0 8px 24px ${selectedStyle.accent}40`,
          }}
        >
          {creating
            ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : jobLocked ? <>💼 {jobType}限定村を作る</> : <>{selectedType.icon} 村を作る</>}
        </button>
      </div>
    </div>
  )
}
