'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { VILLAGE_TYPE_STYLES } from '@/components/ui/VillageCard'

const STEPS = [
  { title: '年齢確認',     emoji: '🔒', sub: '18歳以上の方のみご利用いただけます' },
  { title: 'プロフィール', emoji: '👋', sub: '村での名前を決めましょう' },
  { title: '村を選ぶ',     emoji: '🏕️', sub: 'まず参加する村を選んでみましょう' },
]

const VILLAGE_TYPES = [
  { id: '雑談',     emoji: '🌿', desc: '気軽に話せる' },
  { id: '仕事終わり', emoji: '🌙', desc: '仕事後にほっとひと息' },
  { id: '相談',     emoji: '🤝', desc: 'なんでも相談OK' },
  { id: '趣味',     emoji: '🎨', desc: '好きを語り合う' },
  { id: '職業',     emoji: '💼', desc: '同じ仕事の仲間と' },
  { id: '地域',     emoji: '📍', desc: '地元でつながる' },
  { id: '初参加',   emoji: '🌱', desc: '初めての方大歓迎' },
  { id: '焚き火',   emoji: '🔥', desc: '夜に話しやすい' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step,         setStep]         = useState(0)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [userId,       setUserId]       = useState<string | null>(null)
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [name,         setName]         = useState('')
  const [bio,          setBio]          = useState('')
  const [selectedTypes,setSelectedTypes]= useState<string[]>([])

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
      else router.push('/login')
    })
  }, [router])

  const canNext = [
    ageConfirmed,
    name.trim().length >= 2,
    true, // 村選択は任意
  ][step]

  async function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
      return
    }
    // 最終ステップ：プロフィール作成 → 村に参加
    if (!userId) return
    setLoading(true)
    setError('')
    const supabase = createClient()

    // プロフィール作成/更新
    const { error: profileErr } = await supabase.from('profiles').upsert({
      id:           userId,
      display_name: name.trim(),
      bio:          bio.trim() || null,
      age:          18, // 年齢確認済み
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

    // user_trust の初期レコード作成（まだなければ）
    await supabase.from('user_trust').upsert({
      user_id: userId,
      score:   0,
      tier:    'visitor',
      total_helped: 0,
      is_shadow_banned: false,
    }, { onConflict: 'user_id', ignoreDuplicates: true })

    // 選択した村タイプから最初の村を探して参加
    if (selectedTypes.length > 0) {
      for (const type of selectedTypes.slice(0, 3)) {
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
                { icon: '🏕️', text: '村コミュニティで気軽に話せる' },
                { icon: '🤝', text: '相談広場で悩みを相談・解決できる' },
                { icon: '✏️', text: 'タイムラインでつぶやける' },
                { icon: '🎙️', text: '通話で声で話せる（住民以上）' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <span className="text-xl">{icon}</span>
                  <span className="text-sm text-stone-700 font-medium">{text}</span>
                </div>
              ))}
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

        {/* ─── STEP 2: 村を選ぶ ─── */}
        {step === 2 && (
          <div className="space-y-3 pt-4">
            <p className="text-xs text-stone-500 leading-relaxed">
              好きなタイプの村をいくつでも選んでください（スキップもOK）
            </p>
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
              : selectedTypes.length > 0 ? `${selectedTypes.length}つの村に参加して始める →` : '村を探しに行く →'
          }
        </button>
        {step === 2 && (
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
