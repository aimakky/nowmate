'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AREAS, GENDERS, ARRIVAL_STAGES } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'
import type { Gender, ArrivalStage } from '@/types'

const STEPS = [
  { title: 'Your Japan Journey', emoji: '✈️', sub: 'How long have you been in Japan?' },
  { title: 'Your People',        emoji: '👥', sub: 'People who get where you are' },
  { title: 'About You',          emoji: '👋', sub: 'Just the basics — you can add more later' },
]

const STAGE_MESSAGES: Record<string, { headline: string; sub: string; emoji: string }> = {
  new:      { headline: 'Just arrived? You\'re not alone.', sub: 'Hundreds of newcomers like you are navigating Japan right now.', emoji: '✈️' },
  settling: { headline: 'Building your life in Japan.', sub: 'Connect with expats who\'ve been through exactly what you\'re going through.', emoji: '🏠' },
  local:    { headline: 'You\'re a Japan veteran.', sub: 'Share your hard-earned knowledge and help newcomers land on their feet.', emoji: '🗾' },
}

export default function OnboardingPage() {
  const router = useRouter()
  const [confirmed, setConfirmed] = useState(false)
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [stageCount, setStageCount] = useState<number>(0)

  const [arrivalStage, setArrivalStage] = useState<ArrivalStage | ''>('')
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [area, setArea] = useState('Tokyo')

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
      else router.push('/login')
    })
  }, [router])

  async function fetchStageCount(stage: ArrivalStage) {
    const supabase = createClient()
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('arrival_stage', stage)
      .eq('is_active', true)
    setStageCount(Math.max(count ?? 0, 12))
  }

  const canNext = [
    arrivalStage !== '',
    true,
    name.trim().length >= 2 && parseInt(age) >= 18 && gender !== '',
  ][step]

  async function handleNext() {
    if (step === 0 && arrivalStage) {
      fetchStageCount(arrivalStage as ArrivalStage)
    }
    setStep(s => s + 1)
  }

  async function handleFinish() {
    if (!userId) return
    setLoading(true); setError('')
    const { error: uErr } = await createClient().from('profiles').upsert({
      id: userId,
      display_name: name.trim(),
      age: parseInt(age),
      gender,
      area,
      arrival_stage: arrivalStage || null,
      nationality: '',
      spoken_languages: [],
      learning_languages: [],
      purposes: ['Friend'],
      bio: null,
      avatar_url: null,
      is_online: true,
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    if (uErr) { setError('Something went wrong. Please try again.'); setLoading(false); return }

    // Welcome bot messages
    fetch('/api/welcome-bot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) })

    // Claim invite reward if ref exists
    const inviteRef = localStorage.getItem('nm_invite_ref')
    if (inviteRef) {
      fetch('/api/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inviteeId: userId, inviterSameeId: inviteRef }) })
      localStorage.removeItem('nm_invite_ref')
    }

    router.push('/home')
  }

  // Pre-screen: confirm foreigner status
  if (!confirmed) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex flex-col items-center justify-center max-w-md mx-auto px-5 text-center">
        <div className="text-5xl mb-4">🌏</div>
        <h1 className="text-2xl font-extrabold text-stone-900 mb-2">Samee is for foreigners in Japan</h1>
        <p className="text-sm text-stone-500 leading-relaxed mb-8">
          This app is built exclusively for non-Japanese people living in or visiting Japan.
          It's a space to connect with others who understand what it's like to navigate Japan as an outsider.
        </p>
        <button
          onClick={() => setConfirmed(true)}
          className="w-full h-12 bg-brand-500 text-white rounded-2xl font-bold text-sm mb-3 shadow-md shadow-brand-200 active:scale-[0.98] transition-all"
        >
          Yes, I'm a foreigner in Japan →
        </button>
        <button
          onClick={() => router.push('/')}
          className="w-full h-12 border-2 border-stone-200 text-stone-500 rounded-2xl font-semibold text-sm"
        >
          No, I'm Japanese
        </button>
        <p className="text-xs text-stone-400 mt-4">18+ only · Free forever</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto">
      {/* Top bar */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-xs">N</span>
            </div>
            <span className="font-bold text-gray-700 text-sm">Samee</span>
          </div>
          <span className="text-xs text-gray-400 font-medium">{step + 1} / {STEPS.length}</span>
        </div>
        {/* Progress bar */}
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= step ? 'bg-brand-500' : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>

      {/* Step header */}
      <div className="px-5 pb-6">
        <div className="text-3xl mb-1.5">{STEPS[step].emoji}</div>
        <h1 className="text-2xl font-extrabold text-gray-900">{STEPS[step].title}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{STEPS[step].sub}</p>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 overflow-y-auto">

        {/* STEP 0: Arrival Stage */}
        {step === 0 && (
          <div className="space-y-3">
            {ARRIVAL_STAGES.map(s => (
              <button key={s.value} onClick={() => setArrivalStage(s.value)}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border-2 transition-all text-left ${
                  arrivalStage === s.value
                    ? 'bg-brand-50 border-brand-400 shadow-sm'
                    : 'bg-white border-gray-200 hover:border-brand-300'
                }`}>
                <span className="text-3xl">{s.emoji}</span>
                <div className="flex-1">
                  <div className={`font-bold text-base ${arrivalStage === s.value ? 'text-brand-700' : 'text-gray-800'}`}>{s.label}</div>
                  <div className="text-sm text-gray-500">{s.desc}</div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  arrivalStage === s.value ? 'bg-brand-500 border-brand-500' : 'border-gray-300'
                }`}>
                  {arrivalStage === s.value && <span className="text-white text-xs font-bold">✓</span>}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* STEP 1: People preview */}
        {step === 1 && arrivalStage && (
          <div className="space-y-4">
            <div className="bg-brand-50 border border-brand-100 rounded-2xl p-5 text-center">
              <div className="text-5xl mb-3">{STAGE_MESSAGES[arrivalStage]?.emoji}</div>
              <h2 className="text-xl font-extrabold text-gray-900 mb-2">{STAGE_MESSAGES[arrivalStage]?.headline}</h2>
              <p className="text-sm text-gray-500 leading-relaxed">{STAGE_MESSAGES[arrivalStage]?.sub}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-center">
              <div className="text-3xl font-black text-brand-500 mb-1">{stageCount}+</div>
              <div className="text-sm text-gray-600 font-semibold">people at your stage in Samee</div>
              <div className="flex justify-center -space-x-2 mt-3">
                {['🇧🇷','🇺🇸','🇮🇳','🇫🇷','🇩🇪'].map((flag, i) => (
                  <div key={i}
                    className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-100 to-brand-200 border-2 border-white flex items-center justify-center text-sm"
                    style={{ zIndex: 10 - i }}>
                    {flag}
                  </div>
                ))}
                <div className="w-9 h-9 rounded-full bg-brand-500 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">
                  +more
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { icon: '💬', text: 'Chat after matching — no random messages' },
                { icon: '🤝', text: 'Real help from people who\'ve been there' },
                { icon: '🔒', text: 'Safe, verified 18+ community' },
              ].map(item => (
                <div key={item.text} className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-gray-100">
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-sm text-gray-700 font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Basic info */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Display Name *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="What should people call you?"
                maxLength={30}
                className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 text-sm focus:outline-none focus:border-brand-400 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Age *</label>
              <input
                type="number" min="18" max="99"
                value={age}
                onChange={e => setAge(e.target.value)}
                placeholder="18"
                className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 text-sm focus:outline-none focus:border-brand-400 transition"
              />
              {age && parseInt(age) < 18 && <p className="text-xs text-red-500 mt-1">Must be 18 or older</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Gender *</label>
              <div className="grid grid-cols-3 gap-2">
                {GENDERS.map(g => (
                  <button key={g.value} onClick={() => setGender(g.value as Gender)}
                    className={`py-3 rounded-2xl text-sm font-semibold border-2 transition-all ${
                      gender === g.value
                        ? 'bg-brand-500 text-white border-brand-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                    }`}>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Area in Japan</label>
              <div className="grid grid-cols-2 gap-1.5">
                {AREAS.slice(0, 8).map(a => (
                  <button key={a} onClick={() => setArea(a)}
                    className={`py-2.5 px-3 rounded-xl text-sm border-2 transition-all font-medium ${
                      area === a
                        ? 'bg-brand-500 text-white border-brand-500'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-brand-300'
                    }`}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-2xl">{error}</p>}
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div className="px-5 py-5 border-t border-gray-100 flex gap-3 bg-white">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)}
            className="flex-1 py-3.5 border-2 border-gray-200 text-gray-600 rounded-2xl font-semibold text-sm">
            ← Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            onClick={handleNext}
            disabled={!canNext}
            className="flex-1 py-3.5 bg-brand-500 text-white rounded-2xl font-bold text-sm disabled:opacity-40 active:scale-[0.98] transition-all shadow-md shadow-brand-200">
            {step === 1 ? 'Set up my profile →' : 'Continue →'}
          </button>
        ) : (
          <button
            onClick={handleFinish}
            disabled={!canNext || loading}
            className="flex-1 py-3.5 bg-brand-500 text-white rounded-2xl font-bold text-sm disabled:opacity-40 active:scale-[0.98] transition-all shadow-md shadow-brand-200 flex items-center justify-center gap-2">
            {loading
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : 'Start Exploring 🎉'
            }
          </button>
        )}
      </div>
    </div>
  )
}
