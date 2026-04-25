'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Camera, Check, Trash2 } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const [profile,        setProfile]        = useState<any>(null)
  const [loading,        setLoading]        = useState(true)
  const [saving,         setSaving]         = useState(false)
  const [saved,          setSaved]          = useState(false)
  const [name,           setName]           = useState('')
  const [bio,            setBio]            = useState('')
  const [avatarFile,     setAvatarFile]     = useState<File | null>(null)
  const [avatarPreview,  setAvatarPreview]  = useState<string | null>(null)
  const [deleteConfirm,  setDeleteConfirm]  = useState(false)
  const [deleting,       setDeleting]       = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!p) { router.push('/onboarding'); return }
      setProfile(p)
      setName(p.display_name ?? '')
      setBio(p.bio ?? '')
      setAvatarPreview(p.avatar_url)
      setLoading(false)
    }
    load()
  }, [router])

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
      bio: bio.trim() || null,
      avatar_url,
      updated_at: new Date().toISOString(),
    }).eq('id', profile.id)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ is_active: false }).eq('id', user.id)
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-[#FAFAF9]">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9]">

      {/* ── Header ── */}
      <div className="bg-white border-b border-stone-100 px-4 pt-4 pb-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-stone-500">
          <ArrowLeft size={20} />
        </button>
        <p className="font-extrabold text-stone-900">プロフィールを編集</p>
      </div>

      <div className="px-4 pt-5 pb-32 space-y-5">

        {/* ── アイコン ── */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-white shadow-lg bg-stone-100">
              {avatarPreview
                ? <img src={avatarPreview} className="w-full h-full object-cover" alt="" />
                : <div className="w-full h-full flex items-center justify-center text-stone-300 text-4xl">🙂</div>
              }
            </div>
            <label
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer shadow-md"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
            >
              <Camera size={14} className="text-white" />
              <input type="file" accept="image/*" className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)) }
                }}
              />
            </label>
          </div>
          <p className="text-xs text-stone-400">タップして写真を変更</p>
        </div>

        {/* ── ニックネーム ── */}
        <div>
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
            ニックネーム <span className="text-rose-400">*</span>
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="村でのあなたの名前"
            maxLength={20}
            className="w-full px-4 py-3 rounded-2xl border-2 border-stone-200 text-sm focus:outline-none focus:border-indigo-400 bg-white"
          />
          <p className="text-right text-[10px] text-stone-400 mt-1">{name.length}/20</p>
        </div>

        {/* ── 自己紹介 ── */}
        <div>
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
            自己紹介
          </label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value.slice(0, 200))}
            placeholder="どんな人か教えてください（任意）"
            rows={4}
            className="w-full px-4 py-3 rounded-2xl border-2 border-stone-200 text-sm resize-none focus:outline-none focus:border-indigo-400 bg-white leading-relaxed"
          />
          <p className="text-right text-[10px] text-stone-400 mt-1">{bio.length}/200</p>
        </div>

        {/* ── 保存ボタン ── */}
        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="w-full py-4 rounded-2xl font-bold text-white text-sm disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          style={{ background: saved ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
        >
          {saving
            ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : saved
              ? <><Check size={16} /> 保存しました</>
              : '変更を保存する'
          }
        </button>

        {/* ── アカウント削除 ── */}
        <div className="border-t border-stone-100 pt-4">
          {deleteConfirm ? (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
              <p className="text-sm text-red-700 font-bold mb-1 text-center">本当に削除しますか？</p>
              <p className="text-xs text-red-400 mb-3 text-center">この操作は取り消せません。</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm font-bold text-stone-500"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold disabled:opacity-40"
                >
                  {deleting ? '削除中…' : '削除する'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-stone-400 hover:text-red-400 transition-colors"
            >
              <Trash2 size={12} /> アカウントを削除する
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
