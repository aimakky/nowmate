'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { awardPoints } from '@/lib/trust'

// ─── ストレージキー ────────────────────────────────────────────
const KEY_LAST   = 'villia_checkin_last'   // ISO日付文字列 e.g. "2026-04-28"
const KEY_STREAK = 'villia_checkin_streak' // number

// ─── 今日の日付文字列 ─────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10) // "YYYY-MM-DD"
}

// ─── ストリーク数を計算 ───────────────────────────────────────
function calcStreak(last: string | null, prevStreak: number): number {
  if (!last) return 1
  const lastDate = new Date(last)
  const today    = new Date(todayStr())
  const diff     = Math.floor((today.getTime() - lastDate.getTime()) / 86400000)
  if (diff === 0) return prevStreak      // 今日はもうチェックイン済み
  if (diff === 1) return prevStreak + 1  // 連続
  return 1                               // 途切れた
}

// ─── メッセージ ───────────────────────────────────────────────
function streakMessage(streak: number): string {
  if (streak === 1)  return '今日も来てくれてありがとう 🌱'
  if (streak <= 3)   return `${streak}日連続。村があなたを待っていました`
  if (streak <= 7)   return `${streak}日連続。あなたは村の習慣になってきています 🔥`
  if (streak <= 14)  return `${streak}日連続。村の空気が、あなたで少し変わっています 🌿`
  if (streak <= 30)  return `${streak}日連続。ここはもうあなたの居場所です 🏡`
  return `${streak}日連続。村の柱です ✨`
}

// ─── Main Component ───────────────────────────────────────────
export default function DailyCheckIn({ userId }: { userId: string }) {
  const [streak,    setStreak]    = useState(0)
  const [checked,   setChecked]   = useState(false)
  const [animating, setAnimating] = useState(false)
  const [loaded,    setLoaded]    = useState(false)

  useEffect(() => {
    const last    = localStorage.getItem(KEY_LAST)
    const prevStr = Number(localStorage.getItem(KEY_STREAK) ?? '0')
    const today   = todayStr()
    const s       = calcStreak(last, prevStr)

    setStreak(s)
    setChecked(last === today)
    setLoaded(true)

    // まだ今日チェックインしていなければ自動チェックイン
    if (last !== today) {
      localStorage.setItem(KEY_LAST,   today)
      localStorage.setItem(KEY_STREAK, String(s))
      // 7日ストリーク達成時にポイント付与
      if (s % 7 === 0) {
        awardPoints('streak_7days')
      }
    }
  }, [userId])

  if (!loaded || streak === 0) return null

  // 既に今日チェックイン済み、かつストリーク1日目はコンパクト表示しない
  if (checked && streak === 1) return null

  return (
    <div className={`rounded-2xl px-4 py-3 flex items-center gap-3 transition-all ${
      animating ? 'scale-[1.02]' : ''
    }`}
      style={{
        background: streak >= 7
          ? 'linear-gradient(135deg, #1f3526 0%, #2d4d37 100%)'
          : 'linear-gradient(135deg, #f0f7f3 0%, #fdf4ef 100%)',
        border: streak >= 7
          ? '1px solid rgba(74,124,89,0.4)'
          : '1px solid rgba(74,124,89,0.15)',
      }}>

      {/* ストリーク炎 */}
      <div className="flex-shrink-0 text-center">
        <div className="text-2xl leading-none">
          {streak >= 30 ? '✨' : streak >= 14 ? '🏡' : streak >= 7 ? '🌿' : streak >= 3 ? '🔥' : '🌱'}
        </div>
        <div className={`text-[9px] font-extrabold mt-0.5 ${streak >= 7 ? 'text-brand-300' : 'text-brand-600'}`}>
          {streak}日
        </div>
      </div>

      {/* テキスト */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold leading-snug ${streak >= 7 ? 'text-white' : 'text-stone-800'}`}>
          {streakMessage(streak)}
        </p>
        {streak % 7 === 0 && (
          <p className={`text-[10px] mt-0.5 font-semibold ${streak >= 7 ? 'text-brand-300' : 'text-brand-600'}`}>
            🎉 7の倍数 — ポイントボーナス獲得！
          </p>
        )}
      </div>

      {/* 週間ストリーク dots */}
      <div className="flex gap-1 flex-shrink-0">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i}
            className={`w-2 h-2 rounded-full transition-all ${
              i < (streak % 7 === 0 ? 7 : streak % 7)
                ? (streak >= 7 ? 'bg-brand-400' : 'bg-brand-500')
                : (streak >= 7 ? 'bg-white/20' : 'bg-stone-200')
            }`}
          />
        ))}
      </div>
    </div>
  )
}
