'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { AREAS, NATIONALITIES, LANGUAGES, PURPOSES, GENDERS } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'
import type { Purpose, Gender } from '@/types'

const STEPS = [
  { id: 'basic',    title: 'About You',    emoji: '👋', sub: 'Tell us a little about yourself' },
  { id: 'origin',   title: 'Where From?',  emoji: '🌍', sub: 'Nationality & where you live in Japan' },
  { id: 'language', title: 'Languages',    emoji: '🗣️', sub: 'What languages do you speak?' },
  { id: 'purpose',  title: 'Looking For?', emoji: '🎯', sub: 'What brings you to nowmate?' },
  { id: 'profile',  title: 'Your Photo',   emoji: '📷', sub: 'Add a photo to get 3× more likes' },
]

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i < current ? 'bg-brand-500 w-6' :
            i === current ? 'bg-brand-500 w-8' :
            'bg-gray-200 w-4'
          }`}
        />
      ))}
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [nationality, setNationality] = useState('')
  const [area, setArea] = useState('')
  const [spokenLangs, setSpokenLangs] = useState<string[]>([])
  const [learningLangs, setLearningLangs] = useState<string[]>([])
  const [purposes, setPurposes] = useState<Purpose[]>([])
  const [bio, setBio] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
      else router.push('/login')
    })
  }, [router])

  function toggle<T>(arr: T[], val: T, set: (v: T[]) => void) {
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  const canNext = [
    name.trim().length >= 2 && parseInt(age) >= 18 && gender !== '',
    nationality !== '' && area !== '',
    spokenLangs.length > 0,
    purposes.length > 0,
    true,
  ][step]

  async function handleFinish() {
    if (!userId) return
    setLoading(true); setError('')
    const supabase = createClient()

    let avatar_url: string | null = null
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const { data: up, error: upErr } = await supabase.storage
        .from('avatars').upload(`${userId}.${ext}`, avatarFile, { upsert: true })
      if (!upErr && up) {
        avatar_url = supabase.storage.from('avatars').getPublicUrl(up.path).data.publicUrl
      }
    }

    const { error: uErr } = await supabase.from('profiles').upsert({
      id: userId,
      display_name: name.trim(),
      age: parseInt(age),
      gender,
      nationality,
      area,
      spoken_languages: spokenLangs,
      learning_languages: learningLangs,
      purposes,
      bio: bio.trim() || null,
      avatar_url,
      is_online: true,
      is_active: true,
      updated_at: new Date().toISOString(),
    })

    if (uErr) { setError('Something went wrong. Please try again.'); setLoading(false); return }
    router.push('/home')
  }

  const step0Errors = {
    name: name.length > 0 && name.trim().length < 2 ? 'At least 2 characters' : '',
    age:  age && parseInt(age) < 18 ? 'Must be 18 or older' : '',
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
        <StepIndicator current={step} total={STEPS.length} />
      </div>

      {/* Step header */}
      <div className="px-5 pb-5">
        <div className="text-3xl mb-1.5">{STEPS[step].emoji}</div>
        <h1 className="text-2xl font-extrabold text-gray-900">{STEPS[step].title}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{STEPS[step].sub}</p>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 overflow-y-auto">

        {/* STEP 0: Basic */}
        {step === 0 && (
          <div className="space-y-4">
            <Input
              label="Display Name *"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="What should people call you?"
              error={step0Errors.name}
              maxLength={30}
            />
            <Input
              label="Age *"
              type="number"
              value={age}
              onChange={e => setAge(e.target.value)}
              placeholder="18"
              min="18" max="99"
              error={step0Errors.age}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
              <div className="grid grid-cols-3 gap-2">
                {GENDERS.map(g => (
                  <button key={g.value} onClick={() => setGender(g.value as Gender)}
                    className={`py-3 rounded-2xl text-sm font-semibold border-2 transition-all ${
                      gender === g.value
                        ? 'bg-brand-500 text-white border-brand-500 scale-[0.98]'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                    }`}>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: Origin */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nationality *</label>
              <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-1 scrollbar-hide">
                {NATIONALITIES.map(n => (
                  <button key={n.code} onClick={() => setNationality(n.code)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border-2 transition-all text-left ${
                      nationality === n.code
                        ? 'bg-brand-500 text-white border-brand-500'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-brand-300'
                    }`}>
                    <span className="text-lg flex-shrink-0">{n.flag}</span>
                    <span className="truncate text-xs font-medium">{n.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Area in Japan *</label>
              <div className="grid grid-cols-2 gap-1.5">
                {AREAS.map(a => (
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
          </div>
        )}

        {/* STEP 2: Languages */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">I speak *</label>
                {spokenLangs.length > 0 && (
                  <span className="text-xs text-brand-500 font-semibold">{spokenLangs.length} selected</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {LANGUAGES.map(l => (
                  <button key={l} onClick={() => toggle(spokenLangs, l, setSpokenLangs)}
                    className={`py-2.5 px-3 rounded-xl text-xs border-2 transition-all text-left font-medium ${
                      spokenLangs.includes(l)
                        ? 'bg-brand-500 text-white border-brand-500'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-brand-300'
                    }`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">I'm learning <span className="text-gray-400 font-normal">(optional)</span></label>
                {learningLangs.length > 0 && (
                  <span className="text-xs text-purple-500 font-semibold">{learningLangs.length} selected</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {LANGUAGES.map(l => (
                  <button key={l} onClick={() => toggle(learningLangs, l, setLearningLangs)}
                    className={`py-2.5 px-3 rounded-xl text-xs border-2 transition-all text-left font-medium ${
                      learningLangs.includes(l)
                        ? 'bg-purple-500 text-white border-purple-500'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
                    }`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Purpose */}
        {step === 3 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 mb-3">Select all that apply — be honest! 😊</p>
            {PURPOSES.map(p => {
              const selected = purposes.includes(p.value)
              return (
                <button key={p.value} onClick={() => toggle(purposes, p.value, setPurposes)}
                  className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border-2 transition-all text-left ${
                    selected ? 'bg-brand-50 border-brand-400' : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}>
                  <span className="text-2xl flex-shrink-0">{p.icon}</span>
                  <div className="flex-1">
                    <div className={`font-bold text-sm ${selected ? 'text-brand-700' : 'text-gray-800'}`}>{p.value}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {p.value === 'Friend' ? 'Make genuine friends in Japan' :
                       p.value === 'Chat' ? 'Casual online conversation' :
                       p.value === 'Language Exchange' ? 'Practice & teach languages together' :
                       p.value === 'Local Help' ? 'Get & give tips about Japan life' :
                       'Open to a romantic connection'}
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    selected ? 'bg-brand-500 border-brand-500' : 'border-gray-300'
                  }`}>
                    {selected && <span className="text-white text-xs font-bold">✓</span>}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* STEP 4: Photo & Bio */}
        {step === 4 && (
          <div className="space-y-5">
            {/* Photo */}
            <div className="flex flex-col items-center">
              <label className="cursor-pointer group">
                <div className={`w-28 h-28 rounded-3xl overflow-hidden border-2 transition-all ${
                  avatarPreview ? 'border-brand-300' : 'border-dashed border-gray-300 bg-gray-50 group-hover:border-brand-400 group-hover:bg-brand-50'
                }`}>
                  {avatarPreview
                    ? <img src={avatarPreview} className="w-full h-full object-cover" alt="" />
                    : <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                        <span className="text-3xl">📷</span>
                        <span className="text-xs text-gray-400 font-medium">Add photo</span>
                      </div>
                  }
                </div>
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)) }
                  }}
                />
              </label>
              {avatarPreview && (
                <button onClick={() => { setAvatarFile(null); setAvatarPreview(null) }}
                  className="mt-2 text-xs text-red-400 hover:text-red-500">
                  Remove photo
                </button>
              )}
              {!avatarPreview && (
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Profiles with photos get <strong className="text-brand-500">3× more likes</strong>
                </p>
              )}
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                About me <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value.slice(0, 300))}
                rows={4}
                placeholder="Hobbies, what you're looking for, fun facts about yourself..."
                className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 text-sm resize-none focus:outline-none focus:border-brand-400 focus:ring-0 transition leading-relaxed"
              />
              <div className="flex justify-between mt-1">
                <p className="text-xs text-gray-400">A short bio helps others connect with you</p>
                <p className="text-xs text-gray-400">{bio.length}/300</p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-2xl">
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div className="px-5 py-5 border-t border-gray-100 flex gap-3 bg-white">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1">
            ← Back
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button
            onClick={() => setStep(s => s + 1)}
            disabled={!canNext}
            className="flex-1"
            size="lg"
          >
            Continue →
          </Button>
        ) : (
          <Button
            onClick={handleFinish}
            loading={loading}
            className="flex-1"
            size="lg"
          >
            Start Exploring 🎉
          </Button>
        )}
      </div>
    </div>
  )
}
