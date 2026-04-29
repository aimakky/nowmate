'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { awardPoints } from '@/lib/trust'

// ─── ストレージキー ────────────────────────────────────────────
const KEY_LAST   = 'villia_checkin_last'   // ISO日付文字列 e.g. "2026-04-28"
const KEY_STREAK = 'villia_checkin_streak' // number

// ─── 今日の日付文字列 ─────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10)
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
  const [streak,      setStreak]      = useState(0)
  const [checked,     setChecked]     = useState(false)
  const [loaded,      setLoaded]      = useState(false)
  const [freezeCount, setFreezeCount] = useState(0)
  const [freezeUsed,  setFreezeUsed]  = useState(false)   // この起動で凍結が自動適用されたか
  const [showFreeze,  setShowFreeze]  = useState(false)   // 凍結数バッジを一瞬見せる

  useEffect(() => {
    async function init() {
      const last    = localStorage.getItem(KEY_LAST)
      const prevStr = Number(localStorage.getItem(KEY_STREAK) ?? '0')
      const today   = todayStr()

      // ── Supabase から凍結数を取得 ─────────────────────────
      let freezes = 0
      if (userId) {
        const { data } = await createClient()
          .from('user_trust')
          .select('streak_freezes')
          .eq('user_id', userId)
          .maybeSingle()
        freezes = data?.streak_freezes ?? 0
      }
      setFreezeCount(freezes)

      // ── ストリーク計算 ─────────────────────────────────────
      const diff = last
        ? Math.floor((new Date(today).getTime() - new Date(last).getTime()) / 86400000)
        : 0

      let s = prevStr
      let usedFreeze = false

      if (!last || diff === 0) {
        s = prevStr || 1                   // 今日初回 or 既チェックイン
      } else if (diff === 1) {
        s = prevStr + 1                    // 連続
      } else if (diff === 2 && freezes > 0) {
        // 1日だけ飛ばした → 凍結自動適用でストリーク維持
        s = prevStr
        usedFreeze = true
        setFreezeUsed(true)
        // DB 側の凍結カウントをデクリメント
        await createClient()
          .from('user_trust')
          .update({ streak_freezes: freezes - 1 })
          .eq('user_id', userId)
        setFreezeCount(freezes - 1)
      } else {
        s = 1                              // ストリーク切れ
      }

      setStreak(s)
      setChecked(last === today)
      setLoaded(true)

      // ── 今日まだチェックインしていない場合は記録 ─────────
      if (last !== today) {
        localStorage.setItem(KEY_LAST,   today)
        localStorage.setItem(KEY_STREAK, String(s))

        // 7の倍数でポイント＋凍結アイテム付与
        if (s % 7 === 0 && !usedFreeze && userId) {
          awardPoints('streak_7days')
          await createClient().rpc('increment_streak_freezes', { p_user_id: userId })
          setFreezeCount(fc => Math.min(fc + 1, 5))
          setShowFreeze(true)
          setTimeout(() => setShowFreeze(false), 3000)
        }
      }
    }
    init()
  }, [userId])

  if (!loaded || streak === 0) return null
  if (checked && streak === 1 && !freezeUsed) return null

  return (
    <div className={`rounded-2xl px-4 py-3 flex items-center gap-3 transition-all`}
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
        {freezeUsed ? (
          <p className="text-xs font-bold leading-snug text-cyan-300">
            🧊 凍結アイテムを使ってストリーク({streak}日)を守りました！
          </p>
        ) : (
          <p className={`text-xs font-bold leading-snug ${streak >= 7 ? 'text-white' : 'text-stone-800'}`}>
            {streakMessage(streak)}
          </p>
        )}
        {showFreeze && (
          <p className={`text-[10px] mt-0.5 font-semibold ${streak >= 7 ? 'text-cyan-300' : 'text-cyan-600'}`}>
            🧊 ストリーク凍結アイテム獲得！（残り{freezeCount}個）
          </p>
        )}
        {!showFreeze && streak % 7 === 0 && !freezeUsed && (
          <p className={`text-[10px] mt-0.5 font-semibold ${streak >= 7 ? 'text-brand-300' : 'text-brand-600'}`}>
            🎉 7の倍数 — ポイントボーナス獲得！
          </p>
        )}
      </div>

      {/* 右側: 週間dots + 凍結バッジ */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        {/* 週間ストリーク dots */}
        <div className="flex gap-1">
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
        {/* 凍結残数 */}
        {freezeCount > 0 && (
          <div className={`flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
            streak >= 7 ? 'bg-white/15 text-cyan-300' : 'bg-cyan-50 text-cyan-600 border border-cyan-100'
          }`}>
            🧊 ×{freezeCount}
          </div>
        )}
      </div>
    </div>
  )
}
