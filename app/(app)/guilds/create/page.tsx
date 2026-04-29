'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft } from 'lucide-react'

// ── 集いジャンル一覧 ─────────────────────────────────────────────
const CIRCLE_GENRES = [
  { id: '読書',         emoji: '📖', color: '#8b5cf6', gradient: 'linear-gradient(135deg,#a78bfa,#8b5cf6)', desc: '本・小説・ビジネス書' },
  { id: '映画・アニメ', emoji: '🎬', color: '#ec4899', gradient: 'linear-gradient(135deg,#f472b6,#ec4899)', desc: '映画鑑賞・アニメ・ドラマ' },
  { id: '音楽',         emoji: '🎵', color: '#f97316', gradient: 'linear-gradient(135deg,#fb923c,#f97316)', desc: 'バンド・DTM・音楽好き' },
  { id: '料理・グルメ', emoji: '🍳', color: '#ef4444', gradient: 'linear-gradient(135deg,#f87171,#ef4444)', desc: 'レシピ・外食・グルメ' },
  { id: 'スポーツ',     emoji: '🏃', color: '#10b981', gradient: 'linear-gradient(135deg,#34d399,#10b981)', desc: 'スポーツ・筋トレ・ランニング' },
  { id: '旅行',         emoji: '✈️', color: '#0ea5e9', gradient: 'linear-gradient(135deg,#38bdf8,#0ea5e9)', desc: '国内外の旅行・旅先情報' },
  { id: '仕事・副業',   emoji: '💼', color: '#6366f1', gradient: 'linear-gradient(135deg,#818cf8,#6366f1)', desc: 'キャリア・副業・転職' },
  { id: '勉強・資格',   emoji: '📚', color: '#0891b2', gradient: 'linear-gradient(135deg,#22d3ee,#0891b2)', desc: '資格・英語・学習習慣' },
  { id: '育児・家族',   emoji: '👨‍👩‍👧', color: '#f59e0b', gradient: 'linear-gradient(135deg,#fbbf24,#f59e0b)', desc: '子育て・家族・ライフスタイル' },
  { id: '健康・美容',   emoji: '💪', color: '#84cc16', gradient: 'linear-gradient(135deg,#a3e635,#84cc16)', desc: 'ダイエット・美容・メンタル' },
  { id: '地域・ご近所', emoji: '📍', color: '#64748b', gradient: 'linear-gradient(135deg,#94a3b8,#64748b)', desc: '地元・地域コミュニティ' },
  { id: '雑談・なんでも',emoji: '☕', color: '#78716c', gradient: 'linear-gradient(135deg,#a8a29e,#78716c)', desc: 'テーマなし・なんでもOK' },
]

// ── 公開設定 ─────────────────────────────────────────────────────
const VISIBILITY_OPTIONS = [
  { id: 'public',   icon: '🌍', label: '公開',   desc: '誰でも参加できる',               color: '#059669' },
  { id: 'approval', icon: '🔑', label: '承認制', desc: 'リーダーが参加を承認する',         color: '#d97706' },
  { id: 'invite',   icon: '🏰', label: '招待制', desc: 'メンバーの招待のみ（プレミアム）',  color: '#7c3aed' },
] as const

type Visibility = 'public' | 'approval' | 'invite'

export default function CreateCirclePage() {
  const router = useRouter()

  const [step,        setStep]        = useState<'genre' | 'detail'>('genre')
  const [genre,       setGenre]       = useState<typeof CIRCLE_GENRES[0] | null>(null)
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
      <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9]">
        <div className="sticky top-0 z-10 bg-white border-b border-stone-100 px-4 pt-4 pb-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1 text-stone-500">
            <ArrowLeft size={20} />
          </button>
          <div>
            <p className="font-extrabold text-stone-900 text-base">✨ 集いを作る</p>
            <p className="text-[11px] text-stone-400">まずジャンルを選んでください</p>
          </div>
        </div>

        <div className="px-4 pt-5 pb-32">
          <div className="grid grid-cols-2 gap-3">
            {CIRCLE_GENRES.map(g => (
              <button
                key={g.id}
                onClick={() => { setGenre(g); setStep('detail') }}
                className="flex flex-col items-start gap-2 p-4 rounded-2xl bg-white border-2 border-stone-100 text-left active:scale-[0.97] transition-all shadow-sm hover:border-stone-200"
              >
                {/* カラーバー */}
                <div className="w-full h-1 rounded-full mb-1" style={{ background: g.gradient }} />
                <span className="text-3xl">{g.emoji}</span>
                <div>
                  <p className="text-sm font-extrabold text-stone-800">{g.id}</p>
                  <p className="text-[10px] text-stone-400 mt-0.5 leading-relaxed">{g.desc}</p>
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
    <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9]">
      <div className="sticky top-0 z-10 bg-white border-b border-stone-100 px-4 pt-4 pb-3 flex items-center gap-3">
        <button onClick={() => setStep('genre')} className="p-1 -ml-1 text-stone-500">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xl">{genre!.emoji}</span>
          <div>
            <p className="font-extrabold text-stone-900 text-base leading-tight">{genre!.id}の集い</p>
            <p className="text-[11px] text-stone-400">集いの詳細を設定してください</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 pb-32 space-y-5">

        {/* プレビュー */}
        <div className="rounded-3xl overflow-hidden shadow-sm border border-stone-100">
          <div className="relative flex items-center justify-center h-24"
            style={{ background: genre!.gradient }}>
            <div className="absolute inset-0 opacity-[0.07]"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
            <span style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.2))' }}>
              {genre!.emoji}
            </span>
          </div>
          <div className="bg-white px-4 py-3">
            <p className="font-extrabold text-stone-900 text-sm truncate">{name || '集いの名前'}</p>
            <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">{description || '説明がここに表示されます'}</p>
          </div>
        </div>

        {/* 名前 */}
        <div>
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
            集いの名前 <span className="text-rose-400">*</span>
          </p>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={`例：${genre!.id}好き集まれ　週1読書クラブ`}
            maxLength={30}
            className="w-full px-4 py-3 rounded-2xl border-2 border-stone-200 text-sm focus:outline-none focus:border-stone-400 bg-white"
          />
          <p className="text-right text-[10px] text-stone-400 mt-1">{name.length}/30</p>
        </div>

        {/* 説明 */}
        <div>
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">説明</p>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={`どんな人に来てほしいか、どんなことを話す集いかを書いてください。`}
            maxLength={100}
            rows={3}
            className="w-full px-4 py-3 rounded-2xl border-2 border-stone-200 text-sm resize-none focus:outline-none focus:border-stone-400 bg-white"
          />
          <p className="text-right text-[10px] text-stone-400 mt-1">{description.length}/100</p>
        </div>

        {/* 公開設定 */}
        <div>
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">公開設定</p>
          <div className="space-y-2">
            {VISIBILITY_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setVisibility(opt.id)}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all active:scale-[0.98]"
                style={visibility === opt.id
                  ? { background: `${opt.color}10`, borderColor: opt.color }
                  : { background: '#fff', borderColor: '#e7e5e4' }
                }
              >
                <span className="text-xl flex-shrink-0">{opt.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-extrabold" style={{ color: visibility === opt.id ? opt.color : '#1c1917' }}>
                    {opt.label}
                  </p>
                  <p className="text-[10px] text-stone-400">{opt.desc}</p>
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
            : <>{genre!.emoji} 集いを作る</>
          }
        </button>

      </div>
    </div>
  )
}
