'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const ONBOARD_KEY = 'village_onboarding_v1'

const STAGES = [
  {
    id: 'just_arrived',
    emoji: '✈️',
    label: 'Just Arrived',
    sub: '来日したばかり',
    desc: '日本での生活を始めたばかりの方',
    color: '#3b82f6',
    types: ['初参加', '相談', '地域'],
  },
  {
    id: 'getting_settled',
    emoji: '🏠',
    label: 'Getting Settled',
    sub: '慣れてきた',
    desc: '少し慣れてきて、もっと深くつながりたい方',
    color: '#10b981',
    types: ['雑談', '趣味', '仕事終わり'],
  },
  {
    id: 'japan_local',
    emoji: '🗾',
    label: 'Japan Local',
    sub: '日本をよく知っている',
    desc: '日本生活のベテラン。後輩をサポートしたい方',
    color: '#f59e0b',
    types: ['職業', '焚き火', '趣味'],
  },
]

interface SuggestedVillage {
  id: string
  name: string
  icon: string
  type: string
  description: string
  member_count: number
}

export default function VillageOnboarding({ userId }: { userId: string }) {
  const router = useRouter()
  const [visible,  setVisible]  = useState(false)
  const [step,     setStep]     = useState(0)
  const [stage,    setStage]    = useState<typeof STAGES[0] | null>(null)
  const [villages, setVillages] = useState<SuggestedVillage[]>([])
  const [picked,   setPicked]   = useState<string | null>(null)
  const [joining,  setJoining]  = useState(false)
  const [done,     setDone]     = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem(ONBOARD_KEY)) setVisible(true)
  }, [])

  async function loadVillages(s: typeof STAGES[0]) {
    const supabase = createClient()
    const { data } = await supabase
      .from('villages')
      .select('id, name, icon, type, description, member_count')
      .eq('is_public', true)
      .in('type', s.types)
      .order('member_count', { ascending: false })
      .limit(3)
    setVillages((data ?? []) as SuggestedVillage[])
  }

  function selectStage(s: typeof STAGES[0]) {
    setStage(s)
    loadVillages(s)
    setStep(1)
  }

  async function joinAndNext() {
    if (!picked || joining) return
    setJoining(true)
    await createClient().from('village_members').insert({ village_id: picked, user_id: userId }).select()
    setJoining(false)
    setStep(2)
  }

  function finish() {
    localStorage.setItem(ONBOARD_KEY, '1')
    setDone(true)
    setTimeout(() => {
      setVisible(false)
      if (picked) router.push(`/villages/${picked}`)
    }, 600)
  }

  function skip() {
    localStorage.setItem(ONBOARD_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={skip} />

      <div className={`relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl transition-all duration-500 ${done ? 'translate-y-full' : 'translate-y-0'}`}>

        {/* Progress bar */}
        <div className="flex gap-1.5 px-5 pt-4 pb-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex-1 h-1 rounded-full transition-all duration-500"
              style={{ background: i <= step ? (stage?.color ?? '#6366f1') : '#e7e5e4' }} />
          ))}
        </div>

        <button onClick={skip} className="absolute top-4 right-4 text-xs text-stone-400 font-medium">
          スキップ
        </button>

        {/* ── Step 0: Arrival Stage ── */}
        {step === 0 && (
          <div className="px-5 pt-3 pb-8">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Step 1 / 3</p>
            <h2 className="font-extrabold text-stone-900 text-xl mb-0.5">今の状況は？</h2>
            <p className="text-xs text-stone-500 mb-5">What's your stage in Japan?</p>

            <div className="space-y-3">
              {STAGES.map(s => (
                <button key={s.id} onClick={() => selectStage(s)}
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl border-2 text-left active:scale-[0.98] transition-all"
                  style={{ borderColor: '#e7e5e4', background: '#fafaf9' }}>
                  <span className="text-3xl flex-shrink-0">{s.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <p className="font-extrabold text-stone-900 text-sm">{s.label}</p>
                      <p className="text-[10px] text-stone-400">{s.sub}</p>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">{s.desc}</p>
                  </div>
                  <span className="text-stone-300 text-lg flex-shrink-0">›</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 1: Village selection ── */}
        {step === 1 && stage && (
          <div className="px-5 pt-3 pb-8">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Step 2 / 3</p>
            <h2 className="font-extrabold text-stone-900 text-xl mb-0.5">村を1つ選ぼう</h2>
            <p className="text-xs text-stone-500 mb-4">
              {stage.emoji} {stage.label} におすすめの村
            </p>

            <div className="space-y-2 mb-5">
              {villages.length === 0 ? (
                <div className="text-center py-6 text-stone-400 text-xs">読み込み中…</div>
              ) : villages.map(v => (
                <button key={v.id} onClick={() => setPicked(v.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left active:scale-[0.98] transition-all"
                  style={{
                    borderColor: picked === v.id ? stage.color : '#e7e5e4',
                    background: picked === v.id ? `${stage.color}08` : '#fafaf9',
                  }}>
                  <span className="text-2xl flex-shrink-0">{v.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-stone-900 text-sm truncate">{v.name}</p>
                    <p className="text-xs text-stone-500 line-clamp-1 mt-0.5">{v.description}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">👥 {v.member_count}人</p>
                  </div>
                  <div className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                    style={{ borderColor: picked === v.id ? stage.color : '#d6d3d1' }}>
                    {picked === v.id && (
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep(0)}
                className="flex-1 py-3 rounded-2xl border border-stone-200 text-sm font-bold text-stone-500">
                戻る
              </button>
              <button onClick={joinAndNext} disabled={!picked || joining}
                className="flex-2 flex-1 py-3 rounded-2xl text-white text-sm font-bold disabled:opacity-40 active:scale-95 transition-all"
                style={{ background: stage.color, flexGrow: 2 }}>
                {joining
                  ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : '参加する →'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Done ── */}
        {step === 2 && stage && (
          <div className="px-5 pt-3 pb-8 text-center">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Step 3 / 3</p>
            <div className="text-5xl mb-3 mt-2">🎉</div>
            <h2 className="font-extrabold text-stone-900 text-xl mb-1">村に参加しました！</h2>
            <p className="text-xs text-stone-500 mb-6 leading-relaxed">
              最初の一言を投稿してみましょう。<br />
              <span className="text-[10px] text-stone-400">「初参加あいさつ」カテゴリで投稿すると<br />他の住民が歓迎してくれます。</span>
            </p>

            <div className="rounded-2xl p-4 mb-5 text-left"
              style={{ background: `${stage.color}10`, border: `1.5px solid ${stage.color}25` }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: stage.color }}>
                💡 テンプレート（そのまま使ってOK）
              </p>
              <p className="text-xs text-stone-700 leading-relaxed">
                はじめまして！{stage.emoji} {stage.label} です。<br />
                よろしくお願いします 🙏
              </p>
            </div>

            <button onClick={finish}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-sm active:scale-95 transition-all"
              style={{ background: stage.color, boxShadow: `0 6px 20px ${stage.color}40` }}>
              村に行く →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
