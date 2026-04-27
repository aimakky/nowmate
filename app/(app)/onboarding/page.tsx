'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { VILLAGE_TYPE_STYLES } from '@/components/ui/VillageCard'
import CulturalCharter, { markCharterShown } from '@/components/features/CulturalCharter'

const STEPS = [
  { title: '年齢確認',         emoji: '🔒', sub: '20歳以上の方のみご利用いただけます' },
  { title: 'プロフィール',     emoji: '👋', sub: '村での名前を決めましょう' },
  { title: '今、話したいこと', emoji: '💬', sub: '今どんなことを話したいですか？' },
  { title: '村を選ぶ',         emoji: '🏕️', sub: 'まず参加する村を選んでみましょう' },
  { title: '最初の一言',       emoji: '✍️', sub: '村での初投稿をしてみよう' },
]

const CONCERN_OPTIONS = [
  {
    emoji: '😮‍💨',
    label: 'しんどい・つかれた',
    desc: '今日もつらかった',
    villageId: 'ea3f9306-030a-4e49-b678-025655ee8b79',
    value: 'shindoi',
  },
  {
    emoji: '💭',
    label: '将来が不安',
    desc: 'キャリア・お金・これから',
    villageId: '9b81f39c-6b32-4a19-bd4e-a3211d0f0c51',
    value: 'fuan',
  },
  {
    emoji: '👥',
    label: '人間関係で悩んでる',
    desc: '誰かとうまくいってない',
    villageId: '5ab27f32-1ee8-4d88-b99a-00c7ba8e9d7d',
    value: 'ningenkankei',
  },
  {
    emoji: '🔍',
    label: '何かを変えたい',
    desc: '今のままじゃない気がする',
    villageId: '6d9a61b0-800d-419e-bd41-6aba7a4c41a0',
    value: 'kaetai',
  },
  {
    emoji: '🌙',
    label: 'ただ聞いてほしい',
    desc: '言葉にするだけでいい',
    villageId: '97064a96-6646-452e-b9f2-2aa9d2ff3113',
    value: 'kiite',
  },
  {
    emoji: '✨',
    label: 'まだわからない',
    desc: 'とりあえず入ってみる',
    villageId: null,
    value: 'unknown',
  },
]

const VILLAGE_TYPES = [
  { id: '雑談',       emoji: '🌿', desc: '話して、気持ちを整理する' },
  { id: '仕事終わり', emoji: '🌙', desc: '一日を振り返り、明日につなげる' },
  { id: '相談',       emoji: '🤝', desc: '経験者から知恵をもらう' },
  { id: '趣味',       emoji: '🎨', desc: '好きを通じて視点を広げる' },
  { id: '地域',       emoji: '📍', desc: '暮らしをより良くする仲間と' },
  { id: '初参加',     emoji: '🌱', desc: 'はじめての一歩、一緒に踏み出す' },
  { id: '焚き火',     emoji: '🔥', desc: '今日を静かに終わらせる場所' },
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
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [firstPost,    setFirstPost]    = useState('')
  const [wantToTalk,   setWantToTalk]   = useState<typeof CONCERN_OPTIONS[0] | null>(null)
  const [showCharter,  setShowCharter]  = useState(false)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
      else router.push('/login')
    })
  }, [router])

  const canNext = [
    ageConfirmed,            // step 0: 年齢確認
    name.trim().length >= 2, // step 1: プロフィール
    true,                    // step 2: 今何を話したい（スキップ可）
    true,                    // step 3: 村を選ぶ（スキップ可）
    true,                    // step 4: 最初の一言（スキップ可）
  ][step]

  async function handleNext() {
    // Steps 0, 1, 2: advance without DB work
    if (step < STEPS.length - 2) {
      setStep(s => s + 1)
      return
    }

    // Step 4 (last): post first post and navigate
    if (step === STEPS.length - 1) {
      if (firstPost.trim() && wantToTalk?.villageId && userId) {
        setLoading(true)
        const supabase = createClient()
        await supabase.from('village_posts').insert({
          village_id: wantToTalk.villageId,
          user_id:    userId,
          content:    firstPost.trim(),
          category:   '雑談',
        })
        setLoading(false)
      }
      router.push('/villages')
      return
    }

    // Step 3 (second to last): プロフィール作成 → 村に参加
    if (!userId) return
    setLoading(true)
    setError('')
    const supabase = createClient()

    // プロフィール作成/更新
    const { error: profileErr } = await supabase.from('profiles').upsert({
      id:                userId,
      display_name:      name.trim(),
      bio:               bio.trim() || null,
      age:               18,
      gender:            'other',
      nationality:       'JP',
      area:              'Tokyo',
      spoken_languages:  [],
      learning_languages:[],
      purposes:          [],
      is_active:         true,
      updated_at:        new Date().toISOString(),
    })

    if (profileErr) {
      setError('プロフィールの作成に失敗しました。もう一度お試しください。')
      setLoading(false)
      return
    }

    // user_trust の初期レコード作成
    await supabase.from('user_trust').upsert({
      user_id:          userId,
      score:            0,
      tier:             'visitor',
      total_helped:     0,
      is_shadow_banned: false,
    }, { onConflict: 'user_id', ignoreDuplicates: true })

    // 「今何を話したい？」で選んだテーマ村に参加
    if (wantToTalk?.villageId) {
      await supabase.from('village_members').upsert({
        village_id: wantToTalk.villageId,
        user_id:    userId,
        role:       'member',
      }, { onConflict: 'village_id,user_id', ignoreDuplicates: true })
    }

    // その他の村タイプから参加（最大2つ）
    const typesToJoin = selectedTypes.slice(0, 2)
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

    // 7日間ミッション初期化
    await supabase.rpc('initialize_user_missions', { p_user_id: userId })

    setLoading(false)
    // Charterを表示してから次のステップへ
    setShowCharter(true)
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
              <h3 className="font-extrabold text-white text-lg mb-2">ご利用は20歳以上</h3>
              <p className="text-white/60 text-xs leading-relaxed">
                sameeは20歳以上の方のためのコミュニティです。<br />
                健全な場づくりのため、年齢確認をお願いしています。
              </p>
            </div>

            <div className="bg-white border border-stone-100 rounded-2xl p-4 space-y-3">
              {[
                { icon: '🎙️', text: '声で話せる通話コミュニティ' },
                { icon: '💬', text: '本音で話せる大人が集まる場所' },
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
                私は<span className="font-extrabold text-indigo-600">20歳以上</span>であることを確認しました。
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

        {/* ─── STEP 2: 今、話したいこと ─── */}
        {step === 2 && (
          <div className="space-y-3 pt-4">
            <div
              className="rounded-2xl px-4 py-4"
              style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', border: '1px solid rgba(99,102,241,0.3)' }}
            >
              <p className="text-xs font-extrabold text-indigo-300 uppercase tracking-widest mb-1.5">💬 今日ここに来た理由</p>
              <p className="text-sm font-bold text-white leading-relaxed">
                今、一番話したいことを選んでください
              </p>
              <p className="text-[11px] text-indigo-300/70 mt-1">
                選んだテーマの村に自動で参加します。あとで変えられます。
              </p>
            </div>

            <div className="space-y-2">
              {CONCERN_OPTIONS.map(opt => {
                const selected = wantToTalk?.value === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => setWantToTalk(prev => prev?.value === opt.value ? null : opt)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all active:scale-[0.98]"
                    style={selected
                      ? { borderColor: '#6366f1', background: '#eef2ff' }
                      : { borderColor: '#e7e5e4', background: '#fff' }
                    }
                  >
                    <span className="text-2xl flex-shrink-0">{opt.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-extrabold" style={{ color: selected ? '#4f46e5' : '#1c1917' }}>
                        {opt.label}
                      </p>
                      <p className="text-[11px] text-stone-400">{opt.desc}</p>
                    </div>
                    {selected && <span className="text-indigo-500 font-bold text-base flex-shrink-0">✓</span>}
                  </button>
                )
              })}
            </div>

            <p className="text-center text-[11px] text-stone-400 pt-1">
              スキップして後で選ぶこともできます
            </p>
          </div>
        )}

        {/* ─── STEP 3: 村を選ぶ ─── */}
        {step === 3 && (
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

        {/* ─── STEP 4: 最初の一言 ─── */}
        {step === 4 && (
          <div className="space-y-4 pt-4">
            <div
              className="rounded-2xl px-4 py-4"
              style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', border: '1px solid rgba(99,102,241,0.3)' }}
            >
              <p className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-widest mb-1">✍️ 最初のひとこと</p>
              <p className="text-sm font-bold text-white leading-relaxed">
                {wantToTalk && wantToTalk.value !== 'unknown'
                  ? `${wantToTalk.emoji} みんなに一言かけてみよう`
                  : '村のみんなに一言かけてみよう'}
              </p>
              <p className="text-[10px] text-indigo-300/70 mt-1">
                「今日どうでした？」だけでも大丈夫です
              </p>
            </div>

            <div>
              <textarea
                value={firstPost}
                onChange={e => setFirstPost(e.target.value.slice(0, 200))}
                placeholder={wantToTalk && wantToTalk.value !== 'unknown'
                  ? `${wantToTalk.label}について、一言どうぞ`
                  : '村のみんなへ、はじめまして！'}
                rows={4}
                autoFocus
                className="w-full px-4 py-3.5 rounded-2xl border-2 border-stone-200 text-sm resize-none focus:outline-none focus:border-indigo-400 bg-white leading-relaxed"
              />
              <div className="flex items-center justify-between mt-1 px-1">
                <p className="text-[10px] text-stone-400">村の中だけで見えます</p>
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
              : step === 2
                ? (wantToTalk ? `${wantToTalk.emoji} ${wantToTalk.label}で次へ →` : '次へ →')
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

      {/* ── Cultural Charter（オンボーディング初回） ── */}
      {showCharter && (
        <CulturalCharter
          isReminder={false}
          onAgree={() => {
            markCharterShown()
            setShowCharter(false)
            setStep(s => s + 1)
          }}
          onClose={() => {
            // 閉じても次に進む（強制はしない）
            markCharterShown()
            setShowCharter(false)
            setStep(s => s + 1)
          }}
        />
      )}
    </div>
  )
}
