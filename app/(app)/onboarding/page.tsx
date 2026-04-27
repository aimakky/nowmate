'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { VILLAGE_TYPE_STYLES } from '@/components/ui/VillageCard'

const STEPS = [
  { title: '年齢確認',     emoji: '🔒', sub: '18歳以上の方のみご利用いただけます' },
  { title: 'プロフィール', emoji: '👋', sub: '村での名前を決めましょう' },
  { title: '職業を選ぶ',   emoji: '💼', sub: 'あなたの職業コミュニティに入ります' },
  { title: '村を選ぶ',     emoji: '🏕️', sub: 'まず参加する村を選んでみましょう' },
  { title: '最初の一言',   emoji: '✍️', sub: '職業村での初投稿をしてみよう' },
]

// ── 2段階職業選択：大カテゴリ → 詳細職種 ──────────────────────
const OCCUPATION_CATEGORIES = [
  {
    emoji: '🏥', label: '医療・福祉系', value: '医療・福祉系',
    desc: '看護師・医師・薬剤師・介護士など',
    jobs: [
      { emoji: '🏥', label: '看護師・助産師', value: '看護師' },
      { emoji: '👨‍⚕️', label: '医師',           value: '医師' },
      { emoji: '💊', label: '薬剤師',           value: '薬剤師' },
      { emoji: '🦷', label: '歯科関係',         value: '歯科' },
      { emoji: '🤲', label: '介護・福祉',       value: '介護士' },
    ],
  },
  {
    emoji: '📚', label: '教育・研究系', value: '教育・研究系',
    desc: '教師・講師・研究者など',
    jobs: [
      { emoji: '📚', label: '教師・講師', value: '教師' },
      { emoji: '🔬', label: '研究・学術', value: '研究者' },
    ],
  },
  {
    emoji: '💻', label: 'IT・クリエイター系', value: 'IT・クリエイター系',
    desc: 'エンジニア・デザイナー・クリエイターなど',
    jobs: [
      { emoji: '💻', label: 'エンジニア・開発',         value: 'エンジニア' },
      { emoji: '🎨', label: 'デザイナー',               value: 'デザイナー' },
      { emoji: '🎬', label: 'クリエイター・メディア',   value: 'クリエイター' },
      { emoji: '📣', label: 'マーケティング・PR',       value: 'マーケター' },
    ],
  },
  {
    emoji: '💼', label: 'ビジネス・オフィス系', value: 'ビジネス・オフィス系',
    desc: '営業・経理・人事・法律・金融など',
    jobs: [
      { emoji: '📊', label: '営業・販売',   value: '営業' },
      { emoji: '💰', label: '経理・財務',   value: '経理' },
      { emoji: '⚖️', label: '法律・司法',   value: '法律職' },
      { emoji: '💼', label: 'コンサルタント', value: 'コンサル' },
      { emoji: '🏦', label: '金融・保険',   value: '金融' },
      { emoji: '👤', label: '人事・採用',   value: '人事' },
    ],
  },
  {
    emoji: '🏛️', label: '公共・インフラ系', value: '公共・インフラ系',
    desc: '公務員・警察消防・建築・物流など',
    jobs: [
      { emoji: '🏛️', label: '公務員',           value: '公務員' },
      { emoji: '👮', label: '警察・消防・自衛隊', value: '警察消防' },
      { emoji: '🏗️', label: '建築・土木',         value: '建築士' },
      { emoji: '✈️', label: '航空・交通',          value: '航空交通' },
      { emoji: '📦', label: '物流・運輸',          value: '物流' },
    ],
  },
  {
    emoji: '🛒', label: 'サービス・現場系', value: 'サービス・現場系',
    desc: '飲食・接客・製造・農業など',
    jobs: [
      { emoji: '🍳', label: '飲食・調理',     value: '飲食' },
      { emoji: '🛒', label: 'サービス・接客', value: 'サービス業' },
      { emoji: '🌾', label: '農業・林業・漁業', value: '農林水産' },
      { emoji: '🏭', label: '製造・工場',     value: '製造業' },
      { emoji: '🏠', label: '不動産',         value: '不動産' },
    ],
  },
  {
    emoji: '🌀', label: 'その他・フリー', value: 'その他',
    desc: '経営者・転職中・言いたくないなど',
    jobs: [
      { emoji: '🚀', label: '起業家・経営者',       value: '経営者' },
      { emoji: '🔄', label: '転職・求職中',          value: '転職活動中' },
      { emoji: '❓', label: 'その他・書きたくない',  value: 'その他' },
    ],
  },
]

const VILLAGE_TYPES = [
  { id: '雑談',      emoji: '🌿', desc: '話して、気持ちを整理する' },
  { id: '仕事終わり', emoji: '🌙', desc: '一日を振り返り、明日につなげる' },
  { id: '相談',      emoji: '🤝', desc: '経験者から知恵をもらう' },
  { id: '趣味',      emoji: '🎨', desc: '好きを通じて視点を広げる' },
  { id: '職業',      emoji: '💼', desc: '同じ仕事だからわかることを語る' },
  { id: '地域',      emoji: '📍', desc: '暮らしをより良くする仲間と' },
  { id: '初参加',    emoji: '🌱', desc: 'はじめての一歩、一緒に踏み出す' },
  { id: '焚き火',    emoji: '🔥', desc: '今日を静かに終わらせる場所' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step,               setStep]               = useState(0)
  const [loading,            setLoading]            = useState(false)
  const [error,              setError]              = useState('')
  const [userId,             setUserId]             = useState<string | null>(null)
  const [ageConfirmed,       setAgeConfirmed]       = useState(false)
  const [name,               setName]               = useState('')
  const [bio,                setBio]                = useState('')
  const [occupation,          setOccupation]          = useState('')
  const [selectedCategory,    setSelectedCategory]    = useState<typeof OCCUPATION_CATEGORIES[0] | null>(null)
  const [selectedTypes,       setSelectedTypes]       = useState<string[]>([])
  const [firstPost,           setFirstPost]           = useState('')
  const [occupationVillageId, setOccupationVillageId] = useState<string | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
      else router.push('/login')
    })
  }, [router])

  // Step 2: カテゴリ選択済みまたはスキップ可（selectedCategoryがあるか、何も選んでない状態）
  const step2Ready = !selectedCategory || occupation.length > 0 || true // スキップ常時可
  const canNext = [
    ageConfirmed,
    name.trim().length >= 2,
    step2Ready,
    true,
    true,
  ][step]

  async function handleNext() {
    // Steps 0, 1, 2: just advance
    if (step < STEPS.length - 2) {
      setStep(s => s + 1)
      return
    }

    // Step 4 (last): post first post and navigate
    if (step === STEPS.length - 1) {
      if (firstPost.trim() && occupationVillageId && userId) {
        setLoading(true)
        const supabase = createClient()
        await supabase.from('village_posts').insert({
          village_id: occupationVillageId,
          user_id:    userId,
          content:    firstPost.trim(),
          category:   '雑談',
        })
        setLoading(false)
      }
      router.push('/villages')
      return
    }

    // Step 3 (second to last): プロフィール作成 → 職業設定 → 村に参加
    if (!userId) return
    setLoading(true)
    setError('')
    const supabase = createClient()

    // プロフィール作成/更新
    const { error: profileErr } = await supabase.from('profiles').upsert({
      id:           userId,
      display_name: name.trim(),
      bio:          bio.trim() || null,
      age:          18,
      gender:       'other',
      nationality:  'JP',
      area:         'Tokyo',
      spoken_languages:  [],
      learning_languages:[],
      purposes:          [],
      is_active:    true,
      updated_at:   new Date().toISOString(),
    })

    if (profileErr) {
      setError('プロフィールの作成に失敗しました。もう一度お試しください。')
      setLoading(false)
      return
    }

    // user_trust の初期レコード作成
    await supabase.from('user_trust').upsert({
      user_id: userId,
      score:   0,
      tier:    'visitor',
      total_helped: 0,
      is_shadow_banned: false,
    }, { onConflict: 'user_id', ignoreDuplicates: true })

    // 職業設定（選択した場合のみ）
    if (occupation && occupation !== 'その他') {
      await supabase.rpc('set_user_occupation', { p_occupation: occupation })
    }

    // 職業村への参加（なければ自動作成）
    if (occupation && occupation !== 'その他') {
      const occEmoji: Record<string, string> = {
        '看護師':'🏥','医師':'👨‍⚕️','薬剤師':'💊','歯科':'🦷','介護士':'🤲',
        '教師':'📚','エンジニア':'💻','デザイナー':'🎨','営業':'📊','経理':'💰',
        'マーケター':'📣','法律職':'⚖️','公務員':'🏛️','警察消防':'👮','建築士':'🏗️',
        '航空交通':'✈️','飲食':'🍳','サービス業':'🛒','クリエイター':'🎬',
        '農林水産':'🌾','製造業':'🏭','物流':'📦','不動産':'🏠','コンサル':'💼',
        '金融':'🏦','人事':'👤','研究者':'🔬','経営者':'🚀','転職活動中':'🔄',
      }
      const starterTopics: Record<string, string> = {
        '看護師':     '【村の最初の問い】\n\n今日の勤務、どうでしたか？\n\n夜勤明けの虚無感、急変対応の後の気持ち、師長との関係、インシデントレポートの苦労……\n同じ看護師にしか伝わらないことを、ここで話してください。\n\n「今日は〇〇がしんどかった」の一言だけでも大丈夫です。',
        '医師':       '【村の最初の問い】\n\n今週、一番しんどかったことを話しませんか？\n\n患者対応・当直・研修医指導・論文・キャリアの悩み……\n外では言えないことを、同じ医師だけのここで。',
        '薬剤師':     '【村の最初の問い】\n\n今、薬剤師として何が一番気になっていますか？\n\n調剤業務・服薬指導・OTCへの転向・ドラッグストアvs病院……\n職場では言いにくい本音を話しましょう。',
        '歯科':       '【村の最初の問い】\n\n歯科の仕事、今どうですか？\n患者対応・技工の話・開業か勤務かの悩み……同じ業界の人間だからわかること、ここで話しましょう。',
        '介護士':     '【村の最初の問い】\n\n今日の体と心、どんな状態ですか？\n\n腰痛・夜勤・利用者さんとの別れ・給与への葛藤……\n「しんどい」だけ書いてもいい。同じ介護士が聞いています。',
        '教師':       '【村の最初の問い】\n\n今年一番しんどかった保護者対応か、学級のことを話しませんか？\n\n職員室では言えないこと、担任の重さ、働き方改革と現実のギャップ……\n教師同士だから言える本音を。',
        'エンジニア': '【村の最初の問い】\n\n今、転職・技術・チームのどれで悩んでいますか？\n\n年収と環境のトレードオフ、レガシーコード、バーンアウト……\n技術背景を説明しなくていい、楽な場所にしましょう。',
        'デザイナー': '【村の最初の問い】\n\nクライアントのフィードバック、キャリア、フリーvs会社員……\n今デザイナーとして何を考えていますか？',
        '営業':       '【村の最初の問い】\n\n今月のノルマ、どうですか？\n\n詰められた話・理不尽な顧客・インセンティブへの不満……\n営業同士で本音を話しましょう。',
        '公務員':     '【村の最初の問い】\n\n「安定してていいよね」と言われるたびに、どう感じますか？\n\n窓口対応・組織の硬直・転職への迷い……\n公務員同士だから共有できる本音を話しましょう。',
        '経営者':     '【村の最初の問い】\n\n今一番の経営課題は何ですか？\n\n資金・採用・売上・孤独……\n経営者同士だから話せることを、ここで話しましょう。',
        '転職活動中': '【村の最初の問い】\n\n今どんな理由で転職を考えていますか？\n同じく転職活動中の人と、本音で話しましょう。',
      }
      const defaultTopic = `【村の最初の問い】\n\n${occupation}として今感じていること、仕事のリアル、悩みを話しましょう。\n同じ職業の人間だけがいる、安心できる場所です。`

      // 既存の職業村を探す
      const { data: existingVillage } = await supabase
        .from('villages')
        .select('id')
        .eq('job_type', occupation)
        .eq('job_locked', true)
        .eq('is_public', true)
        .order('member_count', { ascending: false })
        .limit(1)
        .single()

      let villageId: string

      if (existingVillage) {
        villageId = existingVillage.id
        setOccupationVillageId(existingVillage.id)
      } else {
        // 職業村がなければ自動作成
        const emoji = occEmoji[occupation] ?? '💼'
        const { data: newVillage } = await supabase
          .from('villages')
          .insert({
            name:        `${occupation}村`,
            description: `${occupation}だけが集まる村。仕事のリアルを、同じ職業の人間だけで話せる場所。`,
            type:        '職業',
            icon:        emoji,
            category:    'work',
            host_id:     userId,
            job_locked:  true,
            job_type:    occupation,
          })
          .select()
          .single()

        if (newVillage) {
          villageId = newVillage.id
          setOccupationVillageId(newVillage.id)
          // スターター投稿を自動ピン留め
          const topicContent = starterTopics[occupation] ?? defaultTopic
          const { data: starterPost } = await supabase
            .from('village_posts')
            .insert({ village_id: villageId, user_id: userId, content: topicContent, category: '雑談' })
            .select()
            .single()
          if (starterPost) {
            await supabase.from('villages').update({ pinned_post_id: starterPost.id }).eq('id', villageId)
          }
        } else {
          villageId = ''
        }
      }

      if (villageId) {
        await supabase.from('village_members').upsert({
          village_id: villageId,
          user_id:    userId,
          role:       'member',
        }, { onConflict: 'village_id,user_id', ignoreDuplicates: true })
      }
    }

    // その他の村タイプから参加
    const typesToJoin = selectedTypes.filter(t => t !== '職業').slice(0, 2)
    if (typesToJoin.length > 0) {
      for (const type of typesToJoin) {
        const { data: villages } = await supabase
          .from('villages').select('id').eq('type', type).eq('is_public', true)
          .order('member_count', { ascending: false }).limit(1)
        if (villages?.[0]) {
          await supabase.from('village_members').upsert({
            village_id: villages[0].id,
            user_id:    userId,
            role:       'member',
          }, { onConflict: 'village_id,user_id', ignoreDuplicates: true })
        }
      }
    }

    // 7日間ミッション初期化
    await supabase.rpc('initialize_user_missions', { p_user_id: userId })

    // 職業村が作成/判明したら保存してStep 4（最初の一言）へ
    if (occupation && occupation !== 'その他') {
      // occupationVillageId は上の if-block内で設定済みのはずだが、
      // ここでも既存の村IDを再取得して確実に保存する
      if (!occupationVillageId) {
        const { data: latestV } = await supabase
          .from('villages').select('id').eq('job_type', occupation).eq('job_locked', true)
          .order('member_count', { ascending: false }).limit(1).single()
        if (latestV) setOccupationVillageId(latestV.id)
      }
    }

    setLoading(false)
    setStep(s => s + 1)
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col max-w-md mx-auto">

      {/* ── Progress bar ── */}
      <div className="px-5 pt-8 pb-4">
        <div className="flex gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-1 rounded-full transition-all duration-300"
              style={{ background: i <= step ? '#4f46e5' : '#e7e5e4' }}
            />
          ))}
        </div>
        <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">
          ステップ {step + 1} / {STEPS.length}
        </p>
        <h2 className="font-extrabold text-stone-900 text-2xl mt-1">{STEPS[step].title}</h2>
        <p className="text-stone-400 text-sm mt-0.5">{STEPS[step].sub}</p>
      </div>

      <div className="flex-1 px-5 pb-32 overflow-y-auto">

        {/* ─── STEP 0: 年齢確認 ─── */}
        {step === 0 && (
          <div className="space-y-4 pt-4">
            <div
              className="rounded-3xl p-6 text-center"
              style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)' }}
            >
              <div className="text-5xl mb-4">🔒</div>
              <h3 className="font-extrabold text-white text-lg mb-2">ご利用は18歳以上</h3>
              <p className="text-white/60 text-xs leading-relaxed">
                sameeは18歳以上の方のためのコミュニティです。<br />
                健全な村づくりのため、年齢確認をお願いしています。
              </p>
            </div>

            <div className="bg-white border border-stone-100 rounded-2xl p-4 space-y-3">
              {[
                { icon: '💼', text: '同じ職業の人間だから、深い話ができる' },
                { icon: '🤝', text: '相談に答えるたびに、知恵が増える' },
                { icon: '🏅', text: '活動するほど信頼ティアが上がる' },
                { icon: '🌿', text: '村に参加するたびに、顔見知りができる' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <span className="text-xl">{icon}</span>
                  <span className="text-sm text-stone-700 font-medium">{text}</span>
                </div>
              ))}
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3">
              <p className="text-xs text-indigo-700 leading-relaxed">
                💡 sameeは「使うたびに、何かが増える」コミュニティです。
                時間を消費するSNSとは逆の場所を目指しています。
              </p>
            </div>

            <button
              onClick={() => setAgeConfirmed(v => !v)}
              className="w-full flex items-start gap-3 p-4 bg-white border-2 rounded-2xl transition-all text-left active:scale-[0.99]"
              style={{ borderColor: ageConfirmed ? '#4f46e5' : '#e7e5e4' }}
            >
              <div
                className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                style={{ borderColor: ageConfirmed ? '#4f46e5' : '#d6d3d1', background: ageConfirmed ? '#4f46e5' : '#fff' }}
              >
                {ageConfirmed && <span className="text-white text-[11px] font-bold">✓</span>}
              </div>
              <span className="text-sm text-stone-700 font-medium leading-relaxed">
                私は<span className="font-extrabold text-indigo-600">18歳以上</span>であることを確認しました。
                利用規約とプライバシーポリシーに同意します。
              </span>
            </button>
          </div>
        )}

        {/* ─── STEP 1: プロフィール ─── */}
        {step === 1 && (
          <div className="space-y-4 pt-4">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                ニックネーム <span className="text-rose-400">*</span>
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="例：たろう、ゆきこ、さくら"
                maxLength={20}
                autoFocus
                className="w-full px-4 py-3.5 rounded-2xl border-2 border-stone-200 text-sm focus:outline-none focus:border-indigo-400 bg-white"
              />
              <p className="text-[10px] text-stone-400 mt-1">2〜20文字。後から変更できます。</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                自己紹介 <span className="text-stone-300 normal-case font-normal">（任意）</span>
              </label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value.slice(0, 150))}
                placeholder="好きなことや趣味、一言で自己紹介してみましょう"
                rows={3}
                className="w-full px-4 py-3 rounded-2xl border-2 border-stone-200 text-sm resize-none focus:outline-none focus:border-indigo-400 bg-white leading-relaxed"
              />
              <p className="text-right text-[10px] text-stone-400 mt-1">{bio.length}/150</p>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3">
              <p className="text-xs text-indigo-600 leading-relaxed">
                💡 ニックネームは村の住民に表示されます。本名でなくてOKです。
              </p>
            </div>
          </div>
        )}

        {/* ─── STEP 2: 職業を選ぶ（2段階）─── */}
        {step === 2 && (
          <div className="space-y-3 pt-4">

            {/* なぜ聞くか — 説明バナー */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', border: '1px solid rgba(99,102,241,0.3)' }}>
              <div className="px-4 py-3.5">
                <p className="text-xs font-extrabold text-indigo-300 mb-2">💼 なぜ職業を聞くのか</p>
                <div className="space-y-1.5">
                  {[
                    '同じ職業の人だけが集まる村に自動で入れます',
                    '職業があなたの「盾」。書きやすくなります',
                    'プロフィールには大まかなジャンルしか出ません',
                  ].map(t => (
                    <div key={t} className="flex items-start gap-2">
                      <span className="text-indigo-400 font-bold text-xs mt-0.5">✓</span>
                      <p className="text-[11px] text-indigo-200 leading-relaxed">{t}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stage 1: 大カテゴリ選択 */}
            {!selectedCategory && (
              <>
                <p className="text-[11px] text-stone-500 font-medium px-1">
                  まず大まかなジャンルを選んでください（詳細はその後）
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {OCCUPATION_CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => setSelectedCategory(cat)}
                      className="flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all active:scale-[0.98]"
                      style={{ borderColor: '#e7e5e4', background: '#fff' }}
                    >
                      <span className="text-2xl flex-shrink-0">{cat.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-stone-900">{cat.label}</p>
                        <p className="text-[10px] text-stone-400 mt-0.5">{cat.desc}</p>
                      </div>
                      <span className="text-stone-300 text-base flex-shrink-0">›</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Stage 2: 詳細職種選択 */}
            {selectedCategory && (
              <>
                <button
                  onClick={() => { setSelectedCategory(null); setOccupation('') }}
                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 px-1"
                >
                  ← {selectedCategory.label}を変える
                </button>

                <div
                  className="rounded-2xl px-4 py-3 flex items-center gap-3"
                  style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
                >
                  <span className="text-2xl">{selectedCategory.emoji}</span>
                  <div>
                    <p className="text-sm font-extrabold text-indigo-800">{selectedCategory.label}</p>
                    <p className="text-[10px] text-indigo-500">詳細を選ぶか、このジャンルのままでもOK</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {selectedCategory.jobs.map(job => {
                    const selected = occupation === job.value
                    return (
                      <button
                        key={job.value}
                        onClick={() => setOccupation(prev => prev === job.value ? '' : job.value)}
                        className="flex items-center gap-2.5 p-3 rounded-2xl border-2 text-left transition-all active:scale-95"
                        style={selected
                          ? { borderColor: '#6366f1', background: '#eef2ff' }
                          : { borderColor: '#e7e5e4', background: '#fff' }
                        }
                      >
                        <span className="text-xl flex-shrink-0">{job.emoji}</span>
                        <p className="text-xs font-bold leading-snug"
                          style={{ color: selected ? '#4f46e5' : '#44403c' }}>
                          {job.label}
                        </p>
                      </button>
                    )
                  })}
                </div>

                {/* カテゴリのみで登録 */}
                <button
                  onClick={() => setOccupation(
                    prev => prev === selectedCategory.value ? '' : selectedCategory.value
                  )}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all active:scale-[0.98]"
                  style={occupation === selectedCategory.value
                    ? { borderColor: '#6366f1', background: '#eef2ff' }
                    : { borderColor: '#e7e5e4', background: '#f9f9f8' }
                  }
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{selectedCategory.emoji}</span>
                    <div className="text-left">
                      <p className="text-xs font-bold"
                        style={{ color: occupation === selectedCategory.value ? '#4f46e5' : '#78716c' }}>
                        「{selectedCategory.label}」のままでいい
                      </p>
                      <p className="text-[10px] text-stone-400">詳細は言わなくてOK</p>
                    </div>
                  </div>
                  {occupation === selectedCategory.value && (
                    <span className="text-indigo-500 font-bold text-sm">✓</span>
                  )}
                </button>

                {occupation && occupation !== selectedCategory.value && (
                  <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 flex items-center gap-2">
                    <span className="text-green-500 font-bold text-lg">✓</span>
                    <p className="text-xs text-green-700 font-bold">
                      「{selectedCategory.jobs.find(j => j.value === occupation)?.label ?? occupation}」を選択 +10pt！
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ─── STEP 4: 最初の一言 ─── */}
        {step === 4 && (
          <div className="space-y-4 pt-4">
            <div
              className="rounded-2xl px-4 py-4"
              style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', border: '1px solid rgba(99,102,241,0.3)' }}
            >
              <p className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-widest mb-1">✍️ 最初のひとこと</p>
              <p className="text-sm font-bold text-white leading-relaxed">
                {occupation && occupation !== 'その他'
                  ? `${occupation}村のみんなに一言かけてみよう`
                  : '村のみんなに一言かけてみよう'}
              </p>
              <p className="text-[10px] text-indigo-300/70 mt-1">
                初投稿は「今日どうでした？」だけでも大丈夫です
              </p>
            </div>

            <div>
              <textarea
                value={firstPost}
                onChange={e => setFirstPost(e.target.value.slice(0, 200))}
                placeholder={occupation && occupation !== 'その他'
                  ? `${occupation}として、今どんな状況ですか？`
                  : '村のみんなへ、はじめまして！'}
                rows={4}
                autoFocus
                className="w-full px-4 py-3.5 rounded-2xl border-2 border-stone-200 text-sm resize-none focus:outline-none focus:border-indigo-400 bg-white leading-relaxed"
              />
              <div className="flex items-center justify-between mt-1 px-1">
                <p className="text-[10px] text-stone-400">匿名ではありませんが、同じ職業の人だけが見ます</p>
                <p className="text-[10px] text-stone-400">{firstPost.length}/200</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
              <p className="text-xs text-amber-700 leading-relaxed">
                💡 初投稿した人は、他のメンバーから反応をもらいやすくなります。<br />
                スキップもできますが、まず一言から始めてみましょう。
              </p>
            </div>
          </div>
        )}

        {/* ─── STEP 3: 村を選ぶ ─── */}
        {step === 3 && (
          <div className="space-y-3 pt-4">
            <p className="text-xs text-stone-500 leading-relaxed">
              好きなタイプの村をいくつでも選んでください（スキップもOK）
            </p>
            {occupation && occupation !== 'その他' && (
              <div className="bg-brand-50 border border-brand-200 rounded-2xl px-4 py-3 flex items-center gap-2">
                <span className="text-brand-500 text-base">💼</span>
                <p className="text-xs text-brand-700 font-bold">
                  「{occupation}村」に自動で参加します
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {VILLAGE_TYPES.map(t => {
                const ts = VILLAGE_TYPE_STYLES[t.id] ?? VILLAGE_TYPE_STYLES['雑談']
                const selected = selectedTypes.includes(t.id)
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTypes(prev =>
                      prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id]
                    )}
                    className="flex items-center gap-2.5 p-3 rounded-2xl border-2 text-left transition-all active:scale-95"
                    style={selected
                      ? { borderColor: ts.accent, background: `${ts.accent}12` }
                      : { borderColor: '#e7e5e4', background: '#fff' }
                    }
                  >
                    <span className="text-2xl flex-shrink-0">{t.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: selected ? ts.accent : '#44403c' }}>
                        {t.id}
                      </p>
                      <p className="text-[10px] text-stone-400 truncate">{t.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-stone-100 px-5 py-4 max-w-md mx-auto">
        {error && <p className="text-xs text-red-500 mb-3 text-center">{error}</p>}
        <button
          onClick={handleNext}
          disabled={!canNext || loading}
          className="w-full py-4 rounded-2xl font-extrabold text-white text-base disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', boxShadow: canNext ? '0 8px 24px rgba(99,102,241,0.35)' : 'none' }}
        >
          {loading
            ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : step === STEPS.length - 1
              ? (firstPost.trim() ? '投稿して始める →' : '村を探しに行く →')
              : step === STEPS.length - 2
                ? (occupation && occupation !== 'その他' ? `${selectedCategory?.emoji ?? '💼'} ${occupation}で次へ →` : '次へ →')
                : '次へ →'
          }
        </button>
        {(step === 2 || step === 3) && (
          <button
            onClick={handleNext}
            className="w-full py-2 text-xs text-stone-400 mt-1"
          >
            スキップして後で選ぶ
          </button>
        )}
        {step === 4 && (
          <button
            onClick={() => router.push('/villages')}
            className="w-full py-2 text-xs text-stone-400 mt-1"
          >
            スキップして後で投稿する
          </button>
        )}
      </div>
    </div>
  )
}
