'use client'

import { Users } from 'lucide-react'
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

// ─── 村タイプごとのスタイル ───────────────────────────────────
export const VILLAGE_TYPE_STYLES: Record<string, {
  gradient: string   // CSS gradient
  accent: string     // hex for bars + button
  badgeBg: string    // Tailwind class
  label: string
}> = {
  '雑談':     {
    gradient: 'linear-gradient(135deg, #b5a090 0%, #8b7355 100%)',
    accent:   '#8b7355',
    badgeBg:  'bg-amber-50 text-amber-900 border-amber-200',
    label:    '落ち着いた雑談村',
  },
  '仕事終わり': {
    gradient: 'linear-gradient(135deg, #7b83eb 0%, #4f56c8 100%)',
    accent:   '#4f56c8',
    badgeBg:  'bg-indigo-50 text-indigo-800 border-indigo-200',
    label:    '仕事終わりの村',
  },
  '相談': {
    gradient: 'linear-gradient(135deg, #56c8e8 0%, #1a9ec8 100%)',
    accent:   '#1a9ec8',
    badgeBg:  'bg-sky-50 text-sky-800 border-sky-200',
    label:    '相談の村',
  },
  '趣味': {
    gradient: 'linear-gradient(135deg, #f08090 0%, #d44060 100%)',
    accent:   '#d44060',
    badgeBg:  'bg-rose-50 text-rose-800 border-rose-200',
    label:    '趣味の村',
  },
  '職業': {
    gradient: 'linear-gradient(135deg, #f5be5a 0%, #d99820 100%)',
    accent:   '#d99820',
    badgeBg:  'bg-amber-50 text-amber-900 border-amber-200',
    label:    '職業別の村',
  },
  '地域': {
    gradient: 'linear-gradient(135deg, #5dd89a 0%, #28a865 100%)',
    accent:   '#28a865',
    badgeBg:  'bg-emerald-50 text-emerald-800 border-emerald-200',
    label:    '地域別の村',
  },
  '初参加': {
    gradient: 'linear-gradient(135deg, #4dd8ca 0%, #14a89a 100%)',
    accent:   '#14a89a',
    badgeBg:  'bg-teal-50 text-teal-800 border-teal-200',
    label:    '初参加歓迎の村',
  },
  '焚き火': {
    gradient: 'linear-gradient(135deg, #f8976a 0%, #e84820 100%)',
    accent:   '#e84820',
    badgeBg:  'bg-orange-50 text-orange-900 border-orange-200',
    label:    '夜の焚き火村',
  },
}

const DEFAULT_STYLE = VILLAGE_TYPE_STYLES['雑談']

// ─── レベル ──────────────────────────────────────────────────
function getLevelInfo(count: number) {
  if (count >= 500) return { icon: '✨', label: '伝説の村' }
  if (count >= 200) return { icon: '🏡', label: '栄えた村' }
  if (count >= 50)  return { icon: '🌳', label: '活発な村' }
  if (count >= 10)  return { icon: '🌿', label: '育ち中' }
  return                   { icon: '🌱', label: '芽吹き' }
}

// ─── バイブ ──────────────────────────────────────────────────
function getVibes(v: Village): string[] {
  const vibes: string[] = []
  if (v.report_count_7d === 0)       vibes.push('落ち着いている')
  if (v.welcome_reply_count_7d > 5)  vibes.push('初参加しやすい')
  if (v.post_count_7d > 15)          vibes.push('にぎやか')
  if (v.voice_join_count_7d > 8)     vibes.push('通話がにぎやか')
  if (v.welcome_reply_count_7d > 10) vibes.push('聞き専でも安心')
  if (v.report_count_7d > 3)         vibes.push('少し荒れ気味')
  if (vibes.length === 0)            vibes.push('静かな村')
  return vibes.slice(0, 3)
}

// ─── スコアバー ──────────────────────────────────────────────
function ScoreBar({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-stone-400 w-[4.5rem] flex-shrink-0 font-medium">{label}</span>
      <div className="flex gap-0.5 flex-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1.5 rounded-full transition-all"
            style={{ background: i < value ? accent : '#e7e5e4' }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── 週次イベント ────────────────────────────────────────────
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
  const w = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
  return WEEKLY_EVENTS[w % WEEKLY_EVENTS.length]
}

// ─── Main Card ───────────────────────────────────────────────
export default function VillageCard({
  village,
  onJoin,
  isMember,
  featured = false,
}: {
  village: Village
  onJoin?: () => void
  isMember?: boolean
  featured?: boolean
}) {
  const router  = useRouter()
  const style   = VILLAGE_TYPE_STYLES[village.type] ?? DEFAULT_STYLE
  const level   = getLevelInfo(village.member_count)
  const vibes   = getVibes(village)
  const event   = getCurrentWeeklyEvent()

  const busyScore    = Math.min(5, Math.floor(village.post_count_7d / 5))
  const safetyScore  = village.report_count_7d === 0 ? 5 : village.report_count_7d < 2 ? 3 : 1
  const welcomeScore = Math.min(5, Math.floor(village.welcome_reply_count_7d / 2) + 1)

  return (
    <div
      onClick={() => router.push(`/villages/${village.id}`)}
      className="bg-white rounded-3xl overflow-hidden shadow-md active:scale-[0.985] hover:shadow-xl transition-all duration-200 cursor-pointer border border-white"
      style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)' }}
    >
      {/* ── Gradient Banner ── */}
      <div
        className="relative flex items-center justify-center"
        style={{
          background: style.gradient,
          height: featured ? 120 : 96,
        }}
      >
        {/* Noise texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Level badge — top left */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-black/20 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-white/20">
          {level.icon} {level.label}
        </div>

        {/* Season title — top right */}
        {village.season_title && (
          <div className="absolute top-2.5 right-2.5 bg-black/20 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-white/20 max-w-[120px] truncate">
            {village.season_title}
          </div>
        )}

        {/* Icon */}
        <span
          className="select-none"
          style={{ fontSize: featured ? '3.5rem' : '2.8rem', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.25))' }}
        >
          {village.icon}
        </span>
      </div>

      {/* ── Content ── */}
      <div className="p-4">

        {/* Name + type badge */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-extrabold text-stone-900 text-base leading-tight">{village.name}</h3>
          <span className={`flex-shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full border ${style.badgeBg}`}>
            {style.label}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-stone-500 leading-relaxed mb-3 line-clamp-2">
          {village.description}
        </p>

        {/* Vibe tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {vibes.map(v => (
            <span
              key={v}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full border"
              style={{
                backgroundColor: `${style.accent}12`,
                borderColor:     `${style.accent}30`,
                color:           style.accent,
              }}
            >
              {v}
            </span>
          ))}
        </div>

        {/* Weekly event */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3 border"
          style={{
            backgroundColor: `${style.accent}10`,
            borderColor:     `${style.accent}25`,
          }}
        >
          <span className="text-sm">{event.icon}</span>
          <span className="text-[10px] font-bold" style={{ color: style.accent }}>
            今週のイベント：{event.label}
          </span>
        </div>

        {/* Score bars */}
        <div className="space-y-1.5 mb-4">
          <ScoreBar label="にぎわい"   value={busyScore}    accent={style.accent} />
          <ScoreBar label="安心度"     value={safetyScore}  accent="#22c55e" />
          <ScoreBar label="入りやすさ" value={welcomeScore} accent="#06b6d4" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-stone-100">
          <div className="flex items-center gap-1.5 text-stone-500">
            <Users size={13} />
            <span className="text-xs font-semibold">{village.member_count.toLocaleString()} 住民</span>
          </div>

          <button
            onClick={e => { e.stopPropagation(); onJoin?.() }}
            className="text-xs font-bold px-4 py-1.5 rounded-xl transition-all active:scale-95 flex-shrink-0"
            style={
              isMember
                ? { background: '#f5f5f4', color: '#78716c' }
                : { background: style.accent, color: '#fff', boxShadow: `0 2px 8px ${style.accent}50` }
            }
          >
            {isMember ? '住民 ✓' : '参加する →'}
          </button>
        </div>
      </div>
    </div>
  )
}
