'use client'

import { useMemo } from 'react'
import { getNextTier, TIER_REQUIREMENTS } from '@/lib/trust'
import type { TierProgress } from '@/lib/trust'

// ─── Props ────────────────────────────────────────────────────
interface Props {
  tierProgress: TierProgress | null
  postCount:    number
  joinedAt:     string   // profiles.created_at
}

// ─── マイルストーン定義 ───────────────────────────────────────
interface Milestone {
  id:   string
  day:  number          // 目標日
  icon: string
  text: string
  done: (p: TierProgress | null, posts: number) => boolean
  tip?: string          // 達成のヒント
}

const MILESTONES: Milestone[] = [
  // ── フック期 ─────────────────────────────
  {
    id: 'first_post',
    day: 1,
    icon: '✍️',
    text: '村に初めて投稿する',
    done: (p, posts) => posts >= 1,
    tip: '一言でOK。今日あったこと・感じたこと',
  },
  {
    id: 'first_reaction',
    day: 2,
    icon: '💡',
    text: '誰かの共感を受け取る',
    done: (p) => (p?.reactions_received ?? 0) >= 1,
    tip: '投稿すれば自然と届く',
  },
  {
    id: 'first_voice',
    day: 3,
    icon: '🎙️',
    text: '広場トークに参加してみる',
    done: (p) => (p?.voice_sessions ?? 0) >= 1,
    tip: '聞くだけでもOK。観客として参加できる',
  },

  // ── 習慣形成期 ───────────────────────────
  {
    id: 'post5',
    day: 7,
    icon: '🌱',
    text: '5回投稿して「常連」に近づく',
    done: (p, posts) => posts >= 5,
    tip: '週5回が習慣の最低ライン',
  },
  {
    id: 'days3',
    day: 7,
    icon: '🔥',
    text: '3日連続でアクティブになる',
    done: (p) => (p?.days_active ?? 0) >= 3,
    tip: '3日続けると人間の脳に習慣が刻まれる',
  },
  {
    id: 'resident',
    day: 10,
    icon: '🏡',
    text: '「住民」になる',
    done: (p) => ['resident','regular','trusted','pillar'].includes(p?.tier ?? ''),
    tip: '電話認証 + 初投稿で解放される',
  },
  {
    id: 'bottle',
    day: 10,
    icon: '🍶',
    text: '漂流瓶を流す・拾う',
    done: (p) => false,   // bottle_count未実装のため常にtodo
    tip: '誰かの悩みに答えると村の信頼度が上がる',
  },

  // ── 定着期 ───────────────────────────────
  {
    id: 'voice2',
    day: 20,
    icon: '🎤',
    text: '通話を2回経験する',
    done: (p) => (p?.voice_sessions ?? 0) >= 2,
    tip: '声で話すと繋がりが3倍深くなる',
  },
  {
    id: 'regular',
    day: 21,
    icon: '🌿',
    text: '「常連」になる（5投稿・3日・いいね3）',
    done: (p) => ['regular','trusted','pillar'].includes(p?.tier ?? ''),
    tip: '通話部屋を作れるようになる',
  },
  {
    id: 'post20',
    day: 28,
    icon: '🌳',
    text: '20回投稿して村に根を張る',
    done: (p, posts) => posts >= 20,
    tip: '20投稿した人の90%が継続する',
  },
  {
    id: 'month',
    day: 30,
    icon: '✨',
    text: '30日間、ここにいる',
    done: (p) => (p?.days_active ?? 0) >= 10,
    tip: '30日たった人はvilliaを「居場所」と感じている',
  },
]

const PHASES = [
  { id: 'hook',  label: 'フック期',   range: '1〜3日目',  days: [1,2,3],   color: '#C4713A', bg: 'rgba(196,113,58,0.08)', border: 'rgba(196,113,58,0.2)'  },
  { id: 'habit', label: '習慣形成期', range: '4〜14日目', days: [4,14],    color: '#4A7C59', bg: 'rgba(74,124,89,0.08)',   border: 'rgba(74,124,89,0.2)'   },
  { id: 'root',  label: '定着期',     range: '15〜30日目',days: [15,30],   color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.2)'  },
]

export default function ThirtyDayJourney({ tierProgress, postCount, joinedAt }: Props) {
  // ── 経過日数 ──────────────────────────────────────────────
  const daysSinceJoined = useMemo(() => {
    const joined = new Date(joinedAt)
    const now    = new Date()
    return Math.floor((now.getTime() - joined.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }, [joinedAt])

  const dayLabel = daysSinceJoined > 30 ? '30日以上経過' : `${daysSinceJoined}日目`

  // ── 完了数 ────────────────────────────────────────────────
  const doneCount = MILESTONES.filter(m => m.done(tierProgress, postCount)).length
  const totalCount = MILESTONES.length
  const pct = Math.round((doneCount / totalCount) * 100)

  // ── 次にやること ──────────────────────────────────────────
  const nextTask = MILESTONES.find(m => !m.done(tierProgress, postCount))

  // ── フェーズ判定 ──────────────────────────────────────────
  const currentPhase = daysSinceJoined <= 3 ? PHASES[0] : daysSinceJoined <= 14 ? PHASES[1] : PHASES[2]

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.06)', background: '#fff' }}>

      {/* ── Header ── */}
      <div className="px-4 py-3.5 flex items-center justify-between"
        style={{ background: currentPhase.bg, borderBottom: `1px solid ${currentPhase.border}` }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest"
              style={{ color: currentPhase.color }}>
              {currentPhase.label}
            </span>
            <span className="text-[10px] text-stone-400 font-medium">{dayLabel}</span>
          </div>
          <p className="font-extrabold text-stone-900 text-sm mt-0.5">
            30日間の村旅：{doneCount}/{totalCount} クリア
          </p>
        </div>
        {/* 円形プログレス */}
        <div className="relative w-12 h-12 flex-shrink-0">
          <svg viewBox="0 0 44 44" className="w-full h-full -rotate-90">
            <circle cx="22" cy="22" r="18" fill="none" stroke="#e7e5e4" strokeWidth="3.5" />
            <circle cx="22" cy="22" r="18" fill="none"
              stroke={currentPhase.color} strokeWidth="3.5"
              strokeDasharray={`${pct * 1.13} 113`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold"
            style={{ color: currentPhase.color }}>
            {pct}%
          </span>
        </div>
      </div>

      {/* ── 次にやること（ハイライト）── */}
      {nextTask && (
        <div className="px-4 py-3 flex items-center gap-3"
          style={{ background: 'linear-gradient(90deg, rgba(74,124,89,0.06) 0%, transparent 100%)',
                   borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
          <span className="text-xl flex-shrink-0">{nextTask.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-brand-600 uppercase tracking-wide">次のステップ</p>
            <p className="text-xs font-bold text-stone-800 leading-snug">{nextTask.text}</p>
            {nextTask.tip && <p className="text-[10px] text-stone-400 mt-0.5">{nextTask.tip}</p>}
          </div>
          <span className="text-[10px] font-bold text-stone-400 flex-shrink-0">Day{nextTask.day}</span>
        </div>
      )}

      {/* ── マイルストーン一覧 ── */}
      <div className="divide-y divide-stone-50">
        {MILESTONES.map(m => {
          const done = m.done(tierProgress, postCount)
          return (
            <div key={m.id} className="px-4 py-2.5 flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold transition-all ${
                done
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-stone-100 text-stone-400'
              }`}>
                {done ? '✓' : m.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold leading-snug ${
                  done ? 'text-stone-400 line-through' : 'text-stone-800'
                }`}>
                  {m.text}
                </p>
              </div>
              <span className="text-[10px] text-stone-300 font-medium flex-shrink-0">Day{m.day}</span>
            </div>
          )
        })}
      </div>

      {/* ── フッター ── */}
      {daysSinceJoined >= 28 && doneCount >= 8 ? (
        // Day30達成 — プレミアムCTA
        <a href="/upgrade"
          className="block px-4 py-3.5 text-center active:scale-[0.99] transition-all"
          style={{ background: 'linear-gradient(135deg, #C4713A 0%, #e08554 100%)', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <p className="text-[10px] font-extrabold text-white/80 uppercase tracking-widest mb-0.5">30日達成記念</p>
          <p className="text-sm font-extrabold text-white">プレミアム 14日間 無料で体験する →</p>
          <p className="text-[10px] text-white/60 mt-0.5">あなたはvilliaの一部になりました</p>
        </a>
      ) : (
        <div className="px-4 py-2.5 text-center"
          style={{ background: 'rgba(0,0,0,0.02)', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
          {daysSinceJoined <= 30 ? (
            <p className="text-[10px] text-stone-400">
              30日間ここにいた人は、<span className="font-bold text-stone-600">ここを「居場所」と呼ぶようになります。</span>
            </p>
          ) : (
            <p className="text-[10px] text-stone-400">
              あなたはもうvilliaの仲間です 🏡
            </p>
          )}
        </div>
      )}
    </div>
  )
}
