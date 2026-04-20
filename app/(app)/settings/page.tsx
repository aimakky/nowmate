'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'
import { AREAS, NATIONALITIES, LANGUAGES, PURPOSES, GENDERS, ARRIVAL_STAGES } from '@/lib/constants'
import type { Profile, Purpose, Gender, ArrivalStage } from '@/types'

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Editable fields
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [nationality, setNationality] = useState('')
  const [area, setArea] = useState('')
  const [spokenLangs, setSpokenLangs] = useState<string[]>([])
  const [learningLangs, setLearningLangs] = useState<string[]>([])
  const [purposes, setPurposes] = useState<Purpose[]>([])
  const [bio, setBio] = useState('')
  const [arrivalStage, setArrivalStage] = useState<ArrivalStage | ''>('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!p) return
      setProfile(p)
      setName(p.display_name)
      setAge(String(p.age))
      setGender(p.gender)
      setNationality(p.nationality)
      setArea(p.area)
      setSpokenLangs(p.spoken_languages)
      setLearningLangs(p.learning_languages)
      setPurposes(p.purposes)
      setBio(p.bio || '')
      setArrivalStage(p.arrival_stage || '')
      setAvatarPreview(p.avatar_url)
      setLoading(false)
    }
    load()
  }, [])

  function toggleArr<T>(arr: T[], val: T, set: (v: T[]) => void) {
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    const supabase = createClient()

    let avatar_url = profile.avatar_url
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const { data: uploadData } = await supabase.storage
        .from('avatars')
        .upload(`${profile.id}.${ext}`, avatarFile, { upsert: true })
      if (uploadData) {
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(uploadData.path)
        avatar_url = publicUrl
      }
    }

    await supabase.from('profiles').update({
      display_name: name.trim(),
      age: parseInt(age),
      gender,
      nationality,
      area,
      arrival_stage: arrivalStage || null,
      spoken_languages: spokenLangs,
      learning_languages: learningLangs,
      purposes,
      bio: bio.trim() || null,
      avatar_url,
      updated_at: new Date().toISOString(),
    }).eq('id', profile.id)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleDeleteAccount() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ is_active: false }).eq('id', user.id)
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      <Header title="Edit Profile" showBack />
      <div className="px-5 py-4 space-y-6">

        {/* Avatar */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-3xl overflow-hidden bg-brand-100 border-2 border-brand-200">
            {avatarPreview
              ? <img src={avatarPreview} className="w-full h-full object-cover" alt="" />
              : <div className="w-full h-full flex items-center justify-center text-brand-300 text-3xl">👤</div>
            }
          </div>
          <label className="text-sm text-brand-500 font-semibold cursor-pointer">
            Change Photo
            <input type="file" accept="image/*" className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)) }
              }}
            />
          </label>
        </div>

        <Input label="Display Name" value={name} onChange={e => setName(e.target.value)} />
        <Input label="Age" type="number" value={age} onChange={e => setAge(e.target.value)} min="18" max="99" />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Gender</label>
          <div className="grid grid-cols-3 gap-2">
            {GENDERS.map(g => (
              <button key={g.value} onClick={() => setGender(g.value as Gender)}
                className={`py-2.5 rounded-2xl text-sm font-medium border transition ${gender === g.value ? 'bg-brand-500 text-white border-brand-500' : 'border-gray-200 text-gray-600'}`}>
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nationality</label>
          <select value={nationality} onChange={e => setNationality(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
            {NATIONALITIES.map(n => <option key={n.code} value={n.code}>{n.flag} {n.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">How long in Japan?</label>
          <div className="space-y-2">
            {ARRIVAL_STAGES.map(s => (
              <button key={s.value} onClick={() => setArrivalStage(s.value)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition text-left ${
                  arrivalStage === s.value ? 'bg-brand-50 border-brand-400' : 'border-gray-200'
                }`}>
                <span className="text-xl">{s.emoji}</span>
                <div>
                  <div className={`font-bold text-sm ${arrivalStage === s.value ? 'text-brand-700' : 'text-gray-800'}`}>{s.label}</div>
                  <div className="text-xs text-gray-500">{s.desc}</div>
                </div>
                {arrivalStage === s.value && <span className="ml-auto text-brand-500 font-bold">✓</span>}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Area in Japan</label>
          <select value={area} onChange={e => setArea(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
            {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Languages I speak</label>
          <div className="grid grid-cols-2 gap-1.5">
            {LANGUAGES.map(l => (
              <button key={l} onClick={() => toggleArr(spokenLangs, l, setSpokenLangs)}
                className={`py-2 px-3 rounded-xl text-xs border transition text-left ${spokenLangs.includes(l) ? 'bg-brand-500 text-white border-brand-500' : 'border-gray-200 text-gray-600'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Languages I'm learning</label>
          <div className="grid grid-cols-2 gap-1.5">
            {LANGUAGES.map(l => (
              <button key={l} onClick={() => toggleArr(learningLangs, l, setLearningLangs)}
                className={`py-2 px-3 rounded-xl text-xs border transition text-left ${learningLangs.includes(l) ? 'bg-purple-500 text-white border-purple-500' : 'border-gray-200 text-gray-600'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Looking for</label>
          <div className="space-y-2">
            {PURPOSES.map(p => (
              <button key={p.value} onClick={() => toggleArr(purposes, p.value, setPurposes)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition ${purposes.includes(p.value) ? 'bg-brand-50 border-brand-400 text-brand-700' : 'border-gray-200 text-gray-700'}`}>
                <span>{p.icon}</span>
                <span className="text-sm font-medium">{p.value}</span>
                {purposes.includes(p.value) && <span className="ml-auto text-brand-500">✓</span>}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">About me</label>
          <textarea value={bio} onChange={e => setBio(e.target.value.slice(0, 300))} rows={4}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <p className="text-xs text-gray-400 text-right">{bio.length}/300</p>
        </div>

        <Button fullWidth size="lg" loading={saving} onClick={handleSave}>
          {saved ? '✓ Saved!' : 'Save Changes'}
        </Button>

        <div className="border-t border-gray-100 pt-4">
          {deleteConfirm ? (
            <div className="bg-red-50 rounded-2xl p-4">
              <p className="text-sm text-red-700 mb-3 text-center">Are you sure? This cannot be undone.</p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
                <Button variant="danger" size="sm" className="flex-1" onClick={handleDeleteAccount}>Delete</Button>
              </div>
            </div>
          ) : (
            <button onClick={() => setDeleteConfirm(true)} className="w-full text-center text-xs text-gray-400 hover:text-red-400 py-2">
              Delete Account
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
