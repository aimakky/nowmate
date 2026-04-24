'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft } from 'lucide-react'
import { VILLAGE_TYPE_STYLES } from '@/components/ui/VillageCard'

const VILLAGE_TYPES = [
  { id: '雑談',     label: '落ち着いた雑談村',   icon: '🌿', desc: '気軽に話せる雰囲気' },
  { id: '仕事終わり', label: '仕事終わりの村',    icon: '🌙', desc: '仕事の後にほっとひと息' },
  { id: '相談',     label: '相談の村',           icon: '🤝', desc: 'なんでも相談できる場所' },
  { id: '趣味',     label: '趣味の村',           icon: '🎨', desc: '好きを語れる村' },
  { id: '職業',     label: '職業別の村',         icon: '💼', desc: '同じ仕事の仲間と' },
  { id: '地域',     label: '地域別の村',         icon: '📍', desc: '地元で繋がろう' },
  { id: '初参加',   label: '初参加歓迎の村',     icon: '🌱', desc: '初めての人も大歓迎' },
  { id: '焚き火',   label: '夜の焚き火村',       icon: '🔥', desc: '夜に話しやすい場所' },
]

export default function CreateVillagePage() {
  const router = useRouter()
  const [name,        setName]        = useState('')
  const [description, setDescription] = useState('')
  const [type,        setType]        = useState('雑談')
  const [creating,    setCreating]    = useState(false)

  const selectedType  = VILLAGE_TYPES.find(t => t.id === type)!
  const selectedStyle = VILLAGE_TYPE_STYLES[type] ?? VILLAGE_TYPE_STYLES['雑談']

  async function handleCreate() {
    if (!name.trim() || creating) return
    setCreating(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase.from('villages').insert({
      name:        name.trim(),
      description: description.trim(),
      type,
      icon:    selectedType.icon,
      host_id: user.id,
    }).select().single()

    if (data) {
      // Auto-join as host
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
    <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9]">

      {/* ── Header ── */}
      <div className="bg-white border-b border-stone-100 px-4 pt-4 pb-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-stone-500">
          <ArrowLeft size={20} />
        </button>
        <p className="font-extrabold text-stone-900">村を作る</p>
      </div>

      <div className="px-4 pt-5 pb-32 space-y-5">

        {/* ── Live Preview ── */}
        <div className="rounded-3xl overflow-hidden shadow-md border border-white">
          {/* Gradient banner */}
          <div
            className="relative flex items-center justify-center"
            style={{ background: selectedStyle.gradient, height: 120 }}
          >
            {/* Noise */}
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}
            />
            <div
              className="absolute top-2 left-2 text-[9px] font-bold text-white/80 px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              🌱 芽吹いた村
            </div>
            <span style={{ fontSize: '2.8rem', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.25))' }}>
              {selectedType.icon}
            </span>
          </div>
          {/* Info */}
          <div className="bg-white px-4 py-3">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="font-extrabold text-stone-900 text-sm leading-tight">
                {name || '村の名前'}
              </p>
              <span className={`flex-shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full border ${selectedStyle.badgeBg}`}>
                {selectedStyle.label}
              </span>
            </div>
            <p className="text-xs text-stone-400 line-clamp-2">
              {description || '村の説明がここに表示されます'}
            </p>
          </div>
        </div>

        {/* ── Village Name ── */}
        <div>
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
            村の名前 <span className="text-rose-400">*</span>
          </p>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="例：夜の焚き火　仕事帰りの縁側"
            maxLength={30}
            className="w-full px-4 py-3 rounded-2xl border-2 border-stone-200 text-sm focus:outline-none focus:border-brand-400 bg-white"
          />
          <p className="text-right text-[10px] text-stone-400 mt-1">{name.length}/30</p>
        </div>

        {/* ── Description ── */}
        <div>
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
            村の説明
          </p>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="どんな村か教えてください。誰に来てほしいか、どんな話をするかなど。"
            maxLength={100}
            rows={3}
            className="w-full px-4 py-3 rounded-2xl border-2 border-stone-200 text-sm resize-none focus:outline-none focus:border-brand-400 bg-white"
          />
          <p className="text-right text-[10px] text-stone-400 mt-1">{description.length}/100</p>
        </div>

        {/* ── Village Type ── */}
        <div>
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">
            村のタイプ
          </p>
          <div className="grid grid-cols-2 gap-2">
            {VILLAGE_TYPES.map(t => {
              const ts = VILLAGE_TYPE_STYLES[t.id] ?? VILLAGE_TYPE_STYLES['雑談']
              const selected = type === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className="flex items-center gap-2.5 p-3 rounded-2xl border-2 text-left transition-all active:scale-95"
                  style={
                    selected
                      ? { borderColor: ts.accent, background: `${ts.accent}12` }
                      : { borderColor: '#e7e5e4', background: '#fff' }
                  }
                >
                  <span className="text-xl flex-shrink-0">{t.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: selected ? ts.accent : '#44403c' }}>
                      {t.label}
                    </p>
                    <p className="text-[10px] text-stone-400 truncate">{t.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Note ── */}
        <div className="bg-stone-50 border border-stone-100 rounded-2xl px-4 py-3">
          <p className="text-xs text-stone-500 leading-relaxed">
            🌿 村を作ると、あなたが村長になります。<br />
            安心して話せる村を一緒に育てていきましょう。<br />
            不適切な投稿があった場合は通報機能をご利用ください。
          </p>
        </div>

        {/* ── Submit ── */}
        <button
          onClick={handleCreate}
          disabled={!name.trim() || creating}
          className="w-full py-4 rounded-2xl font-extrabold text-base text-white disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          style={{
            background: selectedStyle.gradient,
            boxShadow: `0 8px 24px ${selectedStyle.accent}40`,
          }}
        >
          {creating
            ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <>{selectedType.icon} 村を作る</>}
        </button>
      </div>
    </div>
  )
}
