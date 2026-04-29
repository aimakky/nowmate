'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft } from 'lucide-react'
import { INDUSTRIES } from '@/lib/guild'

const VISIBILITY_OPTIONS = [
  { id: 'public',   icon: '🌍', label: '公開',   desc: '誰でも参加できる',                       color: '#059669' },
  { id: 'approval', icon: '🔑', label: '承認制', desc: 'ギルドマスターが参加を承認する',           color: '#d97706' },
  { id: 'invite',   icon: '🏰', label: '招待制', desc: 'メンバーの招待のみ入団可（プレミアム）',    color: '#7c3aed' },
] as const

type Visibility = 'public' | 'approval' | 'invite'

export default function CreateGuildPage() {
  const router = useRouter()

  const [name,        setName]        = useState('')
  const [description, setDescription] = useState('')
  const [genre,       setGenre]       = useState(INDUSTRIES[0].id)
  const [visibility,  setVisibility]  = useState<Visibility>('public')
  const [creating,    setCreating]    = useState(false)

  const selectedGenre = INDUSTRIES.find(g => g.id === genre) ?? INDUSTRIES[0]

  async function handleCreate() {
    if (!name.trim() || creating) return
    setCreating(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase.from('villages').insert({
      name:        name.trim(),
      description: description.trim(),
      type:        'ゲーム',
      icon:        selectedGenre.emoji,
      category:    genre,
      host_id:     user.id,
      job_locked:  false,
      job_type:    null,
      comm_style:  'text',
      visibility:  visibility,
    }).select().single()

    if (data) {
      await supabase.from('village_members').insert({
        village_id: data.id,
        user_id:    user.id,
        role:       'host',
      })
      router.push(`/villages/${data.id}`)
    }
    setCreating(false)
  }

  return (
    <div className="max-w-md mx-auto min-h-screen" style={{ background: '#0f0f1a' }}>

      {/* ── Header ── */}
      <div
        className="sticky top-0 z-10 px-4 pt-4 pb-3 flex items-center gap-3"
        style={{
          background: 'linear-gradient(160deg,#0f0f1a 0%,#1a1035 100%)',
          borderBottom: '1px solid rgba(139,92,246,0.2)',
        }}
      >
        <button onClick={() => router.back()} className="p-1 -ml-1" style={{ color: '#a78bfa' }}>
          <ArrowLeft size={20} />
        </button>
        <p className="font-extrabold text-white text-base">🎮 ギルドを作る</p>
      </div>

      <div className="px-4 pt-5 pb-32 space-y-5">

        {/* ── Live Preview ── */}
        <div
          className="rounded-3xl overflow-hidden shadow-xl"
          style={{ border: '1px solid rgba(139,92,246,0.3)' }}
        >
          <div
            className="relative flex items-center justify-center"
            style={{ background: selectedGenre.gradient, height: 110 }}
          >
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              }}
            />
            <div
              className="absolute top-2 left-2 text-[9px] font-bold text-white/80 px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              🎮 {genre}
            </div>
            <span style={{ fontSize: '2.8rem', filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.3))' }}>
              {selectedGenre.emoji}
            </span>
          </div>
          <div style={{ background: '#1a1035', borderTop: '1px solid rgba(139,92,246,0.2)' }} className="px-4 py-3">
            <p className="font-extrabold text-white text-sm leading-tight truncate">
              {name || 'ギルド名'}
            </p>
            <p className="text-xs mt-1 line-clamp-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {description || 'ギルドの説明がここに表示されます'}
            </p>
          </div>
        </div>

        {/* ── ギルド名 ── */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#a78bfa' }}>
            ギルド名 <span className="text-rose-400">*</span>
          </p>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="例：深夜のAPEX部隊　ゆるゆるRPG同好会"
            maxLength={30}
            className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none text-white placeholder-white/25"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '2px solid rgba(139,92,246,0.35)',
            }}
          />
          <p className="text-right text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {name.length}/30
          </p>
        </div>

        {/* ── ギルドの説明 ── */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#a78bfa' }}>
            ギルドの説明
          </p>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="どんなゲームを遊ぶ仲間を集めたいか。プレイスタイルや活動時間帯など書いておくと仲間が見つかりやすいです。"
            maxLength={100}
            rows={3}
            className="w-full px-4 py-3 rounded-2xl text-sm resize-none focus:outline-none text-white placeholder-white/25"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '2px solid rgba(139,92,246,0.35)',
            }}
          />
          <p className="text-right text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {description.length}/100
          </p>
        </div>

        {/* ── ゲームジャンル ── */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#a78bfa' }}>
            ゲームジャンル
          </p>
          <div className="grid grid-cols-2 gap-2">
            {INDUSTRIES.map(g => {
              const selected = genre === g.id
              return (
                <button
                  key={g.id}
                  onClick={() => setGenre(g.id)}
                  className="flex items-center gap-2.5 p-3 rounded-2xl text-left transition-all active:scale-95"
                  style={
                    selected
                      ? { background: `${g.color}22`, border: `2px solid ${g.color}` }
                      : { background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)' }
                  }
                >
                  <span className="text-xl flex-shrink-0">{g.emoji}</span>
                  <p
                    className="text-xs font-bold truncate"
                    style={{ color: selected ? '#fff' : 'rgba(255,255,255,0.6)' }}
                  >
                    {g.id}
                  </p>
                  {selected && (
                    <span
                      className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: g.color, color: '#fff' }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── ヒントカード ── */}
        <div
          className="rounded-2xl px-4 py-3.5 space-y-2"
          style={{
            background: 'rgba(139,92,246,0.08)',
            border: '1px solid rgba(139,92,246,0.22)',
          }}
        >
          <p className="text-xs font-bold" style={{ color: '#c4b5fd' }}>
            ✍️ 仲間が集まるギルド説明とは
          </p>
          <div className="space-y-1.5">
            {[
              { bad: 'APEXギルドです',         good: '深夜帯にのんびりAPEX。初心者歓迎・煽りなし・通話任意' },
              { bad: 'スプラ好き集まれ！',      good: 'スプラ3でS+帯を目指す仲間募集。週3以上できる方' },
              { bad: 'RPG好き歓迎',            good: 'FFをゆっくり楽しむ社会人ギルド。ネタバレ配慮あり' },
            ].map((ex, i) => (
              <div key={i} className="flex gap-2 text-[10px]">
                <span className="text-rose-400 font-bold flex-shrink-0">×</span>
                <span className="text-stone-400 line-through">{ex.bad}</span>
                <span className="font-medium flex-shrink-0" style={{ color: '#a78bfa' }}>→</span>
                <span className="font-medium" style={{ color: '#c4b5fd' }}>{ex.good}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 公開設定 ── */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#a78bfa' }}>
            公開設定
          </p>
          <p className="text-[10px] mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
            招待制はプレミアムプランで利用できます
          </p>
          <div className="space-y-2">
            {VISIBILITY_OPTIONS.map(opt => {
              const selected = visibility === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => setVisibility(opt.id)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all active:scale-[0.98]"
                  style={
                    selected
                      ? { background: `${opt.color}18`, border: `2px solid ${opt.color}` }
                      : { background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)' }
                  }
                >
                  <span className="text-xl flex-shrink-0">{opt.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-extrabold"
                      style={{ color: selected ? opt.color : '#fff' }}
                    >
                      {opt.label}
                    </p>
                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {opt.desc}
                    </p>
                  </div>
                  {selected && (
                    <span
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: opt.color, color: '#fff' }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Submit ── */}
        <button
          onClick={handleCreate}
          disabled={!name.trim() || creating}
          className="w-full py-4 rounded-2xl font-extrabold text-base text-white disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          style={{
            background: 'linear-gradient(135deg,#8b5cf6 0%,#6d28d9 100%)',
            boxShadow: '0 8px 24px rgba(139,92,246,0.5)',
          }}
        >
          {creating
            ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <>{selectedGenre.emoji} ギルドを作る</>
          }
        </button>

      </div>
    </div>
  )
}
