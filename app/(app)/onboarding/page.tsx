'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AREAS, GENDERS, ARRIVAL_STAGES } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'
import type { Gender, ArrivalStage } from '@/types'

const STEPS = [
  { title: 'Your Japan Journey', emoji: '✈️', sub: 'How long have you been in Japan?' },
  { title: 'About You',          emoji: '👋', sub: 'Just the basics — you can add more later' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

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

  const canNext = [
    arrivalStage !== '',
    name.trim().length >= 2 && parseInt(age) >= 18 && gender !== '',
  ][step]

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
    router.push('/home')
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
            <span className="font-bold text-gray-700 text-sm">nowmate</span>
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

        {/* STEP 1: Basic info */}
        {step === 1 && (
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
            onClick={() => setStep(s => s + 1)}
            disabled={!canNext}
            className="flex-1 py-3.5 bg-brand-500 text-white rounded-2xl font-bold text-sm disabled:opacity-40 active:scale-[0.98] transition-all shadow-md shadow-brand-200">
            Continue →
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
