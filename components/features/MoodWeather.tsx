'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Share2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── Mood classification ──────────────────────────────────────
const MOOD_EMOJIS = ['😊', '😄', '🥰', '😎', '🎉', '😌', '🤔', '😔', '😢', '😤', '😴', '🥱']

const POSITIVE = new Set(['😊', '😄', '🥰', '😎', '🎉', '😌'])
const NEGATIVE  = new Set(['😔', '😢', '😤'])
const TIRED     = new Set(['😴', '🥱', '🤔'])

type WeatherType = 'sunny' | 'partly' | 'cloudy' | 'rainy' | 'stormy'

const WEATHER_MAP: Record<WeatherType, { icon: string; label: string; desc: string; color: string }> = {
  sunny:  { icon: '🌞', label: '快晴',     desc: 'みんな元気いっぱい！',           color: '#f59e0b' },
  partly: { icon: '⛅', label: '晴れ曇り', desc: '全体的に穏やかな雰囲気です',     color: '#84cc16' },
  cloudy: { icon: '☁️', label: '曇り',     desc: 'みんなちょっとお疲れ気味かも…', color: '#94a3b8' },
  rainy:  { icon: '🌧️', label: '雨',       desc: 'なんだか気分が重い日ですね',     color: '#60a5fa' },
  stormy: { icon: '⛈️', label: '嵐',       desc: 'みんなお疲れ様… 頑張って！',    color: '#6366f1' },
}

function classifyWeather(moodCounts: Record<string, number>): WeatherType {
  let pos = 0, neg = 0, tired = 0, total = 0
  for (const [emoji, count] of Object.entries(moodCounts)) {
    total += count
    if (POSITIVE.has(emoji)) pos   += count
    if (NEGATIVE.has(emoji)) neg   += count
    if (TIRED.has(emoji))    tired += count
  }
  if (total === 0) return 'partly'
  const pr = pos / total, nr = neg / total, tr = tired / total
  if (nr > 0.5) return 'stormy'
  if (nr > 0.3) return 'rainy'
  if (pr > 0.6) return 'sunny'
  if (tr > 0.4) return 'cloudy'
  return 'partly'
}

function getJSTDate() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0]
}

interface Props {
  villageId:   string
  villageName: string
  userId:      string
  style:       { accent: string; gradient: string }
  isMember:    boolean
}

export default function MoodWeather({ villageId, villageName, userId, style, isMember }: Props) {
  const [moodCounts, setMoodCounts] = useState<Record<string, number>>({})
  const [myMood,     setMyMood]     = useState<string | null>(null)
  const [expanded,   setExpanded]   = useState(false)
  const [voting,     setVoting]     = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [justVoted,  setJustVoted]  = useState(false)
  const today = getJSTDate()

  useEffect(() => { load() }, [villageId])

  async function load() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('village_moods')
      .select('mood_emoji, user_id')
      .eq('village_id', villageId)
      .eq('date', today)

    if (data) {
      const counts: Record<string, number> = {}
      for (const row of data) {
        counts[row.mood_emoji] = (counts[row.mood_emoji] ?? 0) + 1
        if (row.user_id === userId) setMyMood(row.mood_emoji)
      }
      setMoodCounts(counts)
    }
    setLoading(false)
  }

  async function vote(emoji: string) {
    if (voting) return
    setVoting(true)
    const supabase = createClient()
    await supabase.from('village_moods').upsert(
      { village_id: villageId, user_id: userId, mood_emoji: emoji, date: today },
      { onConflict: 'village_id,user_id,date' }
    )
    setMoodCounts(prev => {
      const next = { ...prev }
      if (myMood && myMood !== emoji) {
        next[myMood] = Math.max(0, (next[myMood] ?? 1) - 1)
        if (next[myMood] === 0) delete next[myMood]
      }
      if (!myMood || myMood !== emoji) next[emoji] = (next[emoji] ?? 0) + 1
      return next
    })
    setMyMood(emoji)
    setJustVoted(true)
    setExpanded(false)
    setVoting(false)
  }

  function handleShare() {
    const wInfo = WEATHER_MAP[classifyWeather(moodCounts)]
    const text  = `今日の${villageName}は${wInfo.icon}${wInfo.label}！ ${wInfo.desc} #VILLIA`
    const url   = `https://nowmatejapan.com/villages/${villageId}`
    if (navigator.share) {
      navigator.share({ text, url }).catch(() => {})
    } else {
      navigator.clipboard.writeText(`${text}\n${url}`)
    }
  }

  const weather = classifyWeather(moodCounts)
  const wInfo   = WEATHER_MAP[weather]
  const total   = Object.values(moodCounts).reduce((a, b) => a + b, 0)
  const topMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]).slice(0, 4)

  if (loading) return null

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: `${style.accent}08`,
        border: `1px solid ${style.accent}20`,
      }}
    >
      {/* ── コンパクト帯（常時表示）── */}
      <button
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 active:bg-black/5 transition-all"
        onClick={() => setExpanded(e => !e)}
      >
        {/* 天気アイコン */}
        <span className="text-xl flex-shrink-0">{wInfo.icon}</span>

        {/* テキスト */}
        <div className="flex-1 text-left min-w-0">
          <span className="text-xs font-bold text-stone-700">
            今日の村は
            <span className="ml-1" style={{ color: wInfo.color }}>{wInfo.label}</span>
          </span>
          {total > 0 && (
            <span className="text-[10px] text-stone-400 ml-2">{total}人が回答</span>
          )}
        </div>

        {/* 右側：自分の気分 or 投票促進 + トップ絵文字 */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {topMoods.length > 0 && (
            <div className="flex gap-0.5">
              {topMoods.map(([emoji]) => (
                <span key={emoji} className="text-sm">{emoji}</span>
              ))}
            </div>
          )}
          {isMember && !myMood && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${style.accent}20`, color: style.accent }}
            >
              投票
            </span>
          )}
          {myMood && (
            <span className="text-sm">{myMood}</span>
          )}
          {expanded
            ? <ChevronUp size={13} className="text-stone-400" />
            : <ChevronDown size={13} className="text-stone-400" />
          }
        </div>
      </button>

      {/* ── 展開パネル ── */}
      {expanded && (
        <div
          className="px-4 pt-3 pb-4 border-t"
          style={{ borderColor: `${style.accent}15` }}
        >
          {/* 天気詳細 */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{ background: `${wInfo.color}15`, border: `1.5px solid ${wInfo.color}25` }}
            >
              {wInfo.icon}
            </div>
            <div className="flex-1">
              <p className="font-extrabold text-stone-900 text-sm">{wInfo.label}</p>
              <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">{wInfo.desc}</p>
            </div>
            {/* シェアボタン */}
            {total > 0 && (
              <button
                onClick={handleShare}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 active:scale-90 transition-all"
                style={{ background: `${style.accent}15`, border: `1px solid ${style.accent}25` }}
              >
                <Share2 size={14} style={{ color: style.accent }} />
              </button>
            )}
          </div>

          {/* 投票済みフィードバック */}
          {justVoted && myMood && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3 text-xs font-bold"
              style={{ background: `${style.accent}15`, color: style.accent }}
            >
              <span>{myMood}</span>
              <span>今日の気分を記録しました！</span>
            </div>
          )}

          {/* 絵文字ピッカー */}
          {isMember ? (
            <div>
              <p className="text-[10px] font-bold text-stone-400 mb-2 uppercase tracking-wider">今日の気分は？</p>
              <div className="grid grid-cols-6 gap-2">
                {MOOD_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => vote(emoji)}
                    disabled={voting}
                    className="aspect-square rounded-xl flex items-center justify-center text-xl transition-all active:scale-90"
                    style={{
                      background: myMood === emoji ? `${style.accent}22` : '#f5f5f4',
                      border:     myMood === emoji ? `2px solid ${style.accent}` : '2px solid transparent',
                      transform:  myMood === emoji ? 'scale(1.1)' : undefined,
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-stone-400 text-center py-2">村に参加すると気分を投票できます</p>
          )}
        </div>
      )}
    </div>
  )
}
