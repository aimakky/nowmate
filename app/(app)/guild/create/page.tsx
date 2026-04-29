'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Mic } from 'lucide-react'
import { INDUSTRIES } from '@/lib/guild'

// ── 募集レベル ──────────────────────────────────────────────────
const LEVELS = [
  { id: 'any',     emoji: '🤝', label: 'レベル不問',  desc: '誰でもOK' },
  { id: 'casual',  emoji: '😊', label: '初心者歓迎',  desc: 'のんびりプレイ' },
  { id: 'mid',     emoji: '⚡', label: '中級者向け',  desc: 'ある程度慣れてる人' },
  { id: 'high',    emoji: '🏆', label: '上級者向け',  desc: 'ガチ勢・競技志向' },
]

// ── プレイスタイル ───────────────────────────────────────────────
const STYLES = [
  { id: 'casual',  emoji: '🌿', label: 'カジュアル',   desc: '勝敗より楽しさ重視' },
  { id: 'ranked',  emoji: '🎯', label: 'ランク戦',     desc: 'ランクを上げたい' },
  { id: 'strat',   emoji: '🧠', label: '攻略重視',     desc: '戦略・研究派' },
  { id: 'fun',     emoji: '🎉', label: 'ワイワイ',     desc: '通話しながら盛り上がろう' },
]

// ── 募集人数 ─────────────────────────────────────────────────────
const SLOTS = [
  { id: '1', label: 'あと1人', emoji: '1️⃣' },
  { id: '2', label: 'あと2人', emoji: '2️⃣' },
  { id: '3', label: 'あと3人', emoji: '3️⃣' },
  { id: 'any', label: '何人でもOK', emoji: '♾️' },
]

export default function CreateGameRoomPage() {
  const router = useRouter()

  const [title,    setTitle]    = useState('')
  const [genre,    setGenre]    = useState(INDUSTRIES[0].id)
  const [level,    setLevel]    = useState('any')
  const [style,    setStyle]    = useState('casual')
  const [slots,    setSlots]    = useState('any')
  const [creating, setCreating] = useState(false)

  const selectedGenre = INDUSTRIES.find(g => g.id === genre) ?? INDUSTRIES[0]
  const selectedLevel = LEVELS.find(l => l.id === level)!
  const selectedStyle = STYLES.find(s => s.id === style)!
  const selectedSlots = SLOTS.find(s => s.id === slots)!

  async function handleCreate() {
    if (!title.trim() || creating) return
    setCreating(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const description = `【${selectedLevel.label}】【${selectedStyle.label}】${selectedSlots.label}`

    const { data } = await supabase.from('villages').insert({
      name:        title.trim(),
      description,
      type:        'ゲーム村',
      icon:        selectedGenre.emoji,
      category:    genre,
      host_id:     user.id,
      job_locked:  false,
      job_type:    null,
      comm_style:  'voice',
      visibility:  'public',
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
        <div>
          <p className="font-extrabold text-white text-base leading-tight">🎮 ゲーム村を作る</p>
          <p className="text-[10px]" style={{ color: 'rgba(167,139,250,0.6)' }}>即時通話ルーム</p>
        </div>
      </div>

      <div className="px-4 pt-5 pb-32 space-y-5">

        {/* ── プレビューカード ── */}
        <div
          className="rounded-3xl overflow-hidden"
          style={{ border: '1px solid rgba(139,92,246,0.3)' }}
        >
          <div
            className="relative flex items-center gap-4 px-4 py-4"
            style={{ background: selectedGenre.gradient }}
          >
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}
            />
            {/* アイコン */}
            <div
              className="relative flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
              style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              {selectedGenre.emoji}
              {/* LIVE dot */}
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white">
                <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-white text-sm truncate leading-snug">
                {title || 'ルームのタイトル'}
              </p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="text-[10px] font-bold text-white/80 bg-black/20 rounded-full px-2 py-0.5">
                  {selectedLevel.emoji} {selectedLevel.label}
                </span>
                <span className="text-[10px] font-bold text-white/80 bg-black/20 rounded-full px-2 py-0.5">
                  {selectedStyle.emoji} {selectedStyle.label}
                </span>
                <span className="text-[10px] font-bold text-white/80 bg-black/20 rounded-full px-2 py-0.5">
                  🎙️ 通話
                </span>
              </div>
            </div>
            <div className="flex-shrink-0 flex items-center gap-1 bg-black/25 rounded-full px-2.5 py-1">
              <Mic size={11} className="text-white/80" />
              <span className="text-[10px] font-bold text-white">{selectedSlots.label}</span>
            </div>
          </div>
        </div>

        {/* ── ルームタイトル ── */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#a78bfa' }}>
            ルームのタイトル <span className="text-rose-400">*</span>
          </p>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="例：深夜APEXやろう！　ランク上げたい人来て"
            maxLength={40}
            className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none text-white placeholder-white/25"
            style={{ background: 'rgba(255,255,255,0.07)', border: '2px solid rgba(139,92,246,0.35)' }}
          />
          <p className="text-right text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{title.length}/40</p>
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
                  style={selected
                    ? { background: `${g.color}22`, border: `2px solid ${g.color}` }
                    : { background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)' }
                  }
                >
                  <span className="text-lg flex-shrink-0">{g.emoji}</span>
                  <p className="text-xs font-bold truncate" style={{ color: selected ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                    {g.id}
                  </p>
                  {selected && (
                    <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: g.color, color: '#fff' }}>✓</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── 募集対象：レベル ── */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#a78bfa' }}>
            募集対象 — レベル
          </p>
          <div className="grid grid-cols-2 gap-2">
            {LEVELS.map(l => {
              const selected = level === l.id
              return (
                <button
                  key={l.id}
                  onClick={() => setLevel(l.id)}
                  className="flex items-center gap-2.5 p-3 rounded-2xl text-left transition-all active:scale-95"
                  style={selected
                    ? { background: 'rgba(139,92,246,0.2)', border: '2px solid #8b5cf6' }
                    : { background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)' }
                  }
                >
                  <span className="text-xl flex-shrink-0">{l.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold" style={{ color: selected ? '#c4b5fd' : 'rgba(255,255,255,0.6)' }}>
                      {l.label}
                    </p>
                    <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{l.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── 募集対象：スタイル ── */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#a78bfa' }}>
            募集対象 — プレイスタイル
          </p>
          <div className="grid grid-cols-2 gap-2">
            {STYLES.map(s => {
              const selected = style === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  className="flex items-center gap-2.5 p-3 rounded-2xl text-left transition-all active:scale-95"
                  style={selected
                    ? { background: 'rgba(139,92,246,0.2)', border: '2px solid #8b5cf6' }
                    : { background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)' }
                  }
                >
                  <span className="text-xl flex-shrink-0">{s.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold" style={{ color: selected ? '#c4b5fd' : 'rgba(255,255,255,0.6)' }}>
                      {s.label}
                    </p>
                    <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── 募集人数 ── */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#a78bfa' }}>
            募集人数
          </p>
          <div className="grid grid-cols-4 gap-2">
            {SLOTS.map(s => {
              const selected = slots === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => setSlots(s.id)}
                  className="flex flex-col items-center gap-1 p-3 rounded-2xl transition-all active:scale-95"
                  style={selected
                    ? { background: 'rgba(139,92,246,0.2)', border: '2px solid #8b5cf6' }
                    : { background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)' }
                  }
                >
                  <span className="text-xl">{s.emoji}</span>
                  <p className="text-[9px] font-bold text-center leading-tight"
                    style={{ color: selected ? '#c4b5fd' : 'rgba(255,255,255,0.55)' }}>
                    {s.label}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Submit ── */}
        <button
          onClick={handleCreate}
          disabled={!title.trim() || creating}
          className="w-full py-4 rounded-2xl font-extrabold text-base text-white disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          style={{
            background: 'linear-gradient(135deg,#8b5cf6 0%,#6d28d9 100%)',
            boxShadow: '0 8px 24px rgba(139,92,246,0.5)',
          }}
        >
          {creating
            ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <><Mic size={18} /> ゲーム村を立てる</>
          }
        </button>

      </div>
    </div>
  )
}
