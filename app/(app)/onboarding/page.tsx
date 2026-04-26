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
]

const OCCUPATION_LIST = [
  { emoji: '🏥', label: '看護師・助産師',    value: '看護師' },
  { emoji: '👨‍⚕️', label: '医師',             value: '医師' },
  { emoji: '💊', label: '薬剤師',             value: '薬剤師' },
  { emoji: '🦷', label: '歯科関係',           value: '歯科' },
  { emoji: '🏥', label: '介護・福祉',         value: '介護士' },
  { emoji: '📚', label: '教師・講師',         value: '教師' },
  { emoji: '💻', label: 'エンジニア・開発',   value: 'エンジニア' },
  { emoji: '🎨', label: 'デザイナー',         value: 'デザイナー' },
  { emoji: '📊', label: '営業・販売',         value: '営業' },
  { emoji: '💰', label: '経理・財務',         value: '経理' },
  { emoji: '📣', label: 'マーケティング・PR', value: 'マーケター' },
  { emoji: '⚖️', label: '法律・司法',         value: '法律職' },
  { emoji: '🏛️', label: '公務員',             value: '公務員' },
  { emoji: '👮', label: '警察・消防・自衛隊', value: '警察消防' },
  { emoji: '🏗️', label: '建築・土木',         value: '建築士' },
  { emoji: '✈️', label: '航空・交通',         value: '航空交通' },
  { emoji: '🍳', label: '飲食・調理',         value: '飲食' },
  { emoji: '🛒', label: 'サービス・接客',     value: 'サービス業' },
  { emoji: '🎬', label: 'クリエイター・メディア', value: 'クリエイター' },
  { emoji: '🌾', label: '農業・林業・漁業',   value: '農林水産' },
  { emoji: '🏭', label: '製造・工場',         value: '製造業' },
  { emoji: '📦', label: '物流・運輸',         value: '物流' },
  { emoji: '🏠', label: '不動産',             value: '不動産' },
  { emoji: '💼', label: 'コンサルタント',     value: 'コンサル' },
  { emoji: '🏦', label: '金融・保険',         value: '金融' },
  { emoji: '👤', label: '人事・採用',         value: '人事' },
  { emoji: '🎓', label: '研究・学術',         value: '研究者' },
  { emoji: '🚀', label: '起業家・経営者',     value: '経営者' },
  { emoji: '🔄', label: '転職・求職中',       value: '転職活動中' },
  { emoji: '❓', label: 'その他・書きたくない', value: 'その他' },
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
  const [step,          setStep]          = useState(0)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const [userId,        setUserId]        = useState<string | null>(null)
  const [ageConfirmed,  setAgeConfirmed]  = useState(false)
  const [name,          setName]          = useState('')
  const [bio,           setBio]           = useState('')
  const [occupation,    setOccupation]    = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
      else router.push('/login')
    })
  }, [router])

  const canNext = [
    ageConfirmed,
    name.trim().length >= 2,
    true, // 職業は任意
    true, // 村選択は任意
  ][step]

  async function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
      return
    }
    // 最終ステップ：プロフィール作成 → 職業設定 → 村に参加
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

    // 選択した村タイプから最初の村を探して参加
    const typesToJoin = occupation && occupation !== 'その他'
      ? ['職業', ...selectedTypes.filter(t => t !== '職業')].slice(0, 3)
      : selectedTypes.slice(0, 3)

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

    router.push('/villages')
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

        {/* ─── STEP 2: 職業を選ぶ ─── */}
        {step === 2 && (
          <div className="space-y-3 pt-4">
            <div
              className="rounded-2xl px-4 py-3 mb-2"
              style={{ background: 'linear-gradient(135deg, #ede9fe 0%, #e0e7ff 100%)', border: '1px solid #c7d2fe' }}
            >
              <p className="text-xs font-bold text-indigo-700 mb-0.5">💼 職業別コミュニティに入れます</p>
              <p className="text-[11px] text-indigo-600 leading-relaxed">
                選んだ職業の村が自動で表示されます。あとから変更できます。
                スキップも可能です（設定で後から選べます）。
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {OCCUPATION_LIST.map(occ => {
                const selected = occupation === occ.value
                return (
                  <button
                    key={occ.value}
                    onClick={() => setOccupation(prev => prev === occ.value ? '' : occ.value)}
                    className="flex items-center gap-2.5 p-3 rounded-2xl border-2 text-left transition-all active:scale-95"
                    style={selected
                      ? { borderColor: '#6366f1', background: '#eef2ff' }
                      : { borderColor: '#e7e5e4', background: '#fff' }
                    }
                  >
                    <span className="text-xl flex-shrink-0">{occ.emoji}</span>
                    <p className="text-xs font-bold leading-snug" style={{ color: selected ? '#4f46e5' : '#44403c' }}>
                      {occ.label}
                    </p>
                  </button>
                )
              })}
            </div>
            {occupation && (
              <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 flex items-center gap-2">
                <span className="text-green-500 font-bold text-lg">✓</span>
                <p className="text-xs text-green-700 font-bold">
                  「{OCCUPATION_LIST.find(o => o.value === occupation)?.label}」を選択しました。+10pt獲得！
                </p>
              </div>
            )}
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
            : step < STEPS.length - 1
              ? '次へ →'
              : occupation
                ? `${occupation}村に入って始める →`
                : selectedTypes.length > 0 ? `${selectedTypes.length}つの村に参加して始める →` : '村を探しに行く →'
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
      </div>
    </div>
  )
}
