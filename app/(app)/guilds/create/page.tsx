'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft } from 'lucide-react'
import { INDUSTRIES } from '@/lib/guild'

// ── 公開設定 ─────────────────────────────────────────────────────
const VISIBILITY_OPTIONS = [
  { id: 'public',   icon: '🌍', label: '公開',   desc: '誰でも参加できる',               color: '#059669' },
  { id: 'approval', icon: '🔑', label: '承認制', desc: 'リーダーが参加を承認する',         color: '#d97706' },
  { id: 'invite',   icon: '🏰', label: '招待制', desc: 'メンバーの招待のみ（プレミアム）',  color: '#7c3aed' },
] as const

type Visibility = 'public' | 'approval' | 'invite'

export default function CreateGuildPage() {
  const router = useRouter()

  const [step,        setStep]        = useState<'genre' | 'detail'>('genre')
  const [genre,       setGenre]       = useState<typeof INDUSTRIES[0] | null>(null)
  const [name,        setName]        = useState('')
  const [description, setDescription] = useState('')
  const [visibility,  setVisibility]  = useState<Visibility>('public')
  const [creating,    setCreating]    = useState(false)

  async function handleCreate() {
    if (!name.trim() || !genre || creating) return
    setCreating(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase.from('villages').insert({
      name:        name.trim(),
      description: description.trim(),
      type:        genre.id,
      icon:        genre.emoji,
      category:    genre.id,
      host_id:     user.id,
      job_locked:  false,
      comm_style:  'text',
      visibility,
    }).select().single()

    if (data) {
      await supabase.from('village_members').insert({
        village_id: data.id,
        user_id:    user.id,
        role:       'host',
      })
      router.push(`/guilds/${data.id}`)
    }
    setCreating(false)
  }

  // ── STEP 1: ジャンル選択 ────────────────────────────────────────
  if (step === 'genre') {
    return (
      <div className="max-w-md mx-auto min-h-screen" style={{ background: '#0f0f1a' }}>
        <div className="sticky top-0 z-10 px-4 pt-4 pb-3 flex items-center gap-3 border-b border-white/5"
          style={{ background: '#0f0f1a' }}>
          <button onClick={() => router.back()} className="p-1 -ml-1 text-white/50">
            <ArrowLeft size={20} />
          </button>
          <div>
            <p className="font-extrabold text-white text-base">🛡️ ギルドを作る</p>
            <p className="text-[11px] text-white/40">まずゲームジャンルを選んでください</p>
          </div>
        </div>

        <div className="px-4 pt-5 pb-32">
          <div className="grid grid-cols-2 gap-3">
            {INDUSTRIES.map(g => (
              <button
                key={g.id}
                onClick={() => { setGenre(g); setStep('detail') }}
                className="flex flex-col items-start gap-2 p-4 rounded-2xl text-left active:scale-[0.97] transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.08)' }}
              >
                {/* カラーバー */}
                <div className="w-full h-1 rounded-full mb-1" style={{ background: g.gradient }} />
                <span className="text-3xl">{g.emoji}</span>
                <div>
                  <p className="text-sm font-extrabold text-white">{g.id}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── STEP 2: 詳細入力 ────────────────────────────────────────────
  return (
    <div className="max-w-md mx-auto min-h-screen" style={{ background: '#0f0f1a' }}>
      <div className="sticky top-0 z-10 px-4 pt-4 pb-3 flex items-center gap-3 border-b border-white/5"
        style={{ background: '#0f0f1a' }}>
        <button onClick={() => setStep('genre')} className="p-1 -ml-1 text-white/50">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xl">{genre!.emoji}</span>
          <div>
            <p className="font-extrabold text-white text-base leading-tight">{genre!.id}ギルド</p>
            <p className="text-[11px] text-white/40">ギルドの詳細を設定してください</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 pb-32 space-y-5">

        {/* プレビュー */}
        <div className="rounded-3xl overflow-hidden border border-white/10">
          <div className="relative flex items-center justify-center h-24"
            style={{ background: genre!.gradient }}>
            <div className="absolute inset-0 opacity-[0.07]"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
            <span style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }}>
              {genre!.emoji}
            </span>
          </div>
          <div className="px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <p className="font-extrabold text-white text-sm truncate">{name || 'ギルドの名前'}</p>
            <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{description || '説明がここに表示されます'}</p>
          </div>
        </div>

        {/* 名前 */}
        <div>
          <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">
            ギルド名 <span className="text-rose-400">*</span>
          </p>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={`例：${genre!.id}上級者集まれ　毎週${genre!.id}クラン`}
            maxLength={30}
            className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none text-white placeholder-white/25"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.12)' }}
          />
          <p className="text-right text-[10px] text-white/30 mt-1">{name.length}/30</p>
        </div>

        {/* 説明 */}
        <div>
          <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">説明</p>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={`どんなギルドか、どんな人に来てほしいか書いてください`}
            maxLength={100}
            rows={3}
            className="w-full px-4 py-3 rounded-2xl text-sm resize-none focus:outline-none text-white placeholder-white/25"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.12)' }}
          />
          <p className="text-right text-[10px] text-white/30 mt-1">{description.length}/100</p>
        </div>

        {/* 公開設定 */}
        <div>
          <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">公開設定</p>
          <div className="space-y-2">
            {VISIBILITY_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setVisibility(opt.id)}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all active:scale-[0.98]"
                style={visibility === opt.id
                  ? { background: `${opt.color}18`, border: `1.5px solid ${opt.color}60` }
                  : { background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.08)' }
                }
              >
                <span className="text-xl flex-shrink-0">{opt.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-extrabold" style={{ color: visibility === opt.id ? opt.color : '#fff' }}>
                    {opt.label}
                  </p>
                  <p className="text-[10px] text-white/40">{opt.desc}</p>
                </div>
                {visibility === opt.id && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ background: opt.color }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 作成ボタン */}
        <button
          onClick={handleCreate}
          disabled={!name.trim() || creating}
          className="w-full py-4 rounded-2xl font-extrabold text-base text-white disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          style={{
            background: genre!.gradient,
            boxShadow: `0 8px 24px ${genre!.color}44`,
          }}
        >
          {creating
            ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <>{genre!.emoji} ギルドを作る</>
          }
        </button>

      </div>
    </div>
  )
}
