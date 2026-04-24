'use client'

import { Users, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

export interface Village {
  id: string
  name: string
  description: string
  type: string
  icon: string
  member_count: number
  post_count_7d: number
  report_count_7d: number
  welcome_reply_count_7d: number
  voice_join_count_7d: number
  season_title: string | null
  created_at: string
}

const VILLAGE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  '雑談':     { label: '落ち着いた雑談村',   color: 'bg-stone-100 text-stone-600' },
  '仕事終わり': { label: '仕事終わりの村',    color: 'bg-indigo-50 text-indigo-600' },
  '相談':     { label: '相談の村',           color: 'bg-sky-50 text-sky-600' },
  '趣味':     { label: '趣味の村',           color: 'bg-rose-50 text-rose-600' },
  '職業':     { label: '職業別の村',         color: 'bg-amber-50 text-amber-700' },
  '地域':     { label: '地域別の村',         color: 'bg-emerald-50 text-emerald-700' },
  '初参加':   { label: '初参加歓迎の村',     color: 'bg-teal-50 text-teal-700' },
  '焚き火':   { label: '夜の焚き火村',       color: 'bg-orange-50 text-orange-700' },
}

function getLevelInfo(count: number) {
  if (count >= 500) return { icon: '✨', label: '伝説の村',  color: 'text-amber-600 bg-amber-50 border-amber-200' }
  if (count >= 200) return { icon: '🏡', label: '栄えた村',  color: 'text-emerald-600 bg-emerald-50 border-emerald-200' }
  if (count >= 50)  return { icon: '🌳', label: '活発な村',  color: 'text-green-600 bg-green-50 border-green-200' }
  if (count >= 10)  return { icon: '🌿', label: '育ち中',    color: 'text-lime-600 bg-lime-50 border-lime-200' }
  return                   { icon: '🌱', label: '芽吹き',    color: 'text-teal-600 bg-teal-50 border-teal-200' }
}

function getVibes(v: Village): string[] {
  const vibes: string[] = []
  if (v.report_count_7d === 0)        vibes.push('落ち着いている')
  if (v.welcome_reply_count_7d > 5)   vibes.push('初参加しやすい')
  if (v.post_count_7d > 15)           vibes.push('にぎやか')
  if (v.voice_join_count_7d > 8)      vibes.push('通話がにぎやか')
  if (v.welcome_reply_count_7d > 10)  vibes.push('聞き専でも安心')
  if (v.report_count_7d > 3)          vibes.push('少し荒れ気味')
  if (vibes.length === 0)             vibes.push('静かな村')
  return vibes.slice(0, 3)
}

function ScoreDots({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex gap-0.5 justify-center">
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full transition-colors ${
            i < value ? 'bg-brand-400' : 'bg-stone-200'
          }`}
        />
      ))}
    </div>
  )
}

// ─── Weekly event (auto-rotates by calendar week) ────────────
const WEEKLY_EVENTS = [
  { label: '新人歓迎週間',     icon: '🌱' },
  { label: '夜の焚き火週間',   icon: '🔥' },
  { label: '相談強化週間',     icon: '🤝' },
  { label: '職業交流週間',     icon: '💼' },
  { label: '趣味投稿週間',     icon: '🎨' },
  { label: '聞き専歓迎週間',   icon: '👂' },
  { label: 'やさしい返信週間', icon: '💌' },
]

export function getCurrentWeeklyEvent() {
  const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
  return WEEKLY_EVENTS[weekNum % WEEKLY_EVENTS.length]
}

// ─── Main Component ───────────────────────────────────────────
export default function VillageCard({
  village,
  onJoin,
  isMember,
}: {
  village: Village
  onJoin?: () => void
  isMember?: boolean
}) {
  const router = useRouter()
  const level       = getLevelInfo(village.member_count)
  const vibes       = getVibes(village)
  const weeklyEvent = getCurrentWeeklyEvent()
  const typeInfo    = VILLAGE_TYPE_LABELS[village.type] ?? { label: village.type, color: 'bg-stone-100 text-stone-600' }

  const busyScore    = Math.min(5, Math.floor(village.post_count_7d / 5))
  const safetyScore  = village.report_count_7d === 0 ? 5 : village.report_count_7d < 2 ? 3 : 1
  const welcomeScore = Math.min(5, Math.floor(village.welcome_reply_count_7d / 2) + 1)

  return (
    <div
      onClick={() => router.push(`/villages/${village.id}`)}
      className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm cursor-pointer active:scale-[0.99] hover:shadow-md transition-all"
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-center text-2xl flex-shrink-0">
            {village.icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
              <p className="font-extrabold text-stone-900 text-sm leading-tight">{village.name}</p>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${level.color}`}>
                {level.icon} {level.label}
              </span>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeInfo.color}`}>
              {typeInfo.label}
            </span>
          </div>
        </div>
        <ChevronRight size={16} className="text-stone-300 flex-shrink-0 mt-1" />
      </div>

      {/* ── Description ── */}
      <p className="text-xs text-stone-500 leading-relaxed mb-3 line-clamp-2">
        {village.description}
      </p>

      {/* ── Vibe tags ── */}
      <div className="flex flex-wrap gap-1 mb-3">
        {vibes.map(v => (
          <span
            key={v}
            className="text-[10px] bg-stone-50 border border-stone-100 text-stone-500 px-2 py-0.5 rounded-full font-medium"
          >
            {v}
          </span>
        ))}
      </div>

      {/* ── Weekly event ── */}
      <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-xl px-2.5 py-1.5 mb-3">
        <span className="text-sm">{weeklyEvent.icon}</span>
        <span className="text-[10px] font-bold text-amber-700">
          今週のイベント：{weeklyEvent.label}
        </span>
      </div>

      {/* ── Score dots ── */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: 'にぎわい',    score: busyScore },
          { label: '安心度',      score: safetyScore },
          { label: '入りやすさ',  score: welcomeScore },
        ].map(({ label, score }) => (
          <div key={label} className="bg-stone-50 rounded-xl px-2 py-2 text-center">
            <p className="text-[9px] text-stone-400 font-semibold mb-1.5">{label}</p>
            <ScoreDots value={score} />
          </div>
        ))}
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-stone-400">
          <Users size={12} />
          <span className="text-xs font-semibold text-stone-600">
            {village.member_count.toLocaleString()} 住民
          </span>
        </div>

        {village.season_title ? (
          <span className="text-[9px] bg-violet-50 text-violet-600 border border-violet-100 px-2 py-0.5 rounded-full font-bold truncate max-w-[100px]">
            {village.season_title}
          </span>
        ) : <span />}

        <button
          onClick={e => { e.stopPropagation(); onJoin?.() }}
          className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all active:scale-95 flex-shrink-0 ${
            isMember
              ? 'bg-stone-100 text-stone-600'
              : 'bg-brand-500 text-white shadow-sm shadow-brand-200'
          }`}
        >
          {isMember ? '住民 ✓' : '参加する'}
        </button>
      </div>
    </div>
  )
}
