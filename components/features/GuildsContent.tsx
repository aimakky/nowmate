'use client'

// /guilds と /guild ?tab=guild の両方で使う、ギルド一覧の共通コンテンツ。
// 旧: ダーク背景 + cyan ネオン基調
// 新: 白カードUI + light gray ページ背景 + 紫アクセントのみ (YVOICE らしさは
//     ロゴ・主ボタンのみで残す)
//
// 注意: 関数 / state / data fetch / RLS / DB 呼び出しは一切変更せず、
// 表示だけライト化。既存の handleJoin / fetchVillages / fetchLanes /
// memberIds 等のロジックは元のまま。

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, ChevronRight } from 'lucide-react'
import { INDUSTRIES } from '@/lib/guild'
import { type Village, getFireStatus } from '@/components/ui/VillageCard'
import GuildShieldIcon from '@/components/ui/icons/GuildShieldIcon'
import { SIMPLE_COLORS } from '@/components/ui/SimpleCard'

const GENRE_TABS = [
  { id: 'all', emoji: '🎮', label: 'すべて' },
  ...INDUSTRIES.map(i => ({ id: i.id, emoji: i.emoji, label: i.id })),
]

const SUB_FILTERS = [
  { id: 'popular', label: 'にぎやか', emoji: '🔥' },
  { id: 'new',     label: '新着',     emoji: '✨' },
  { id: 'member',  label: '参加中',   emoji: '🛡️' },
]

const LANES = [
  { id: 'hot', emoji: '🔥', label: '今週にぎわってるギルド', orderBy: 'post_count_7d' as const, ascending: false },
  { id: 'new', emoji: '✨', label: '新しいギルド',          orderBy: 'created_at'    as const, ascending: false },
]

// ── 縦長リストカード (light) ──────────────────────────────
function GuildListCard({ village, isMember, onJoin }: {
  village: Village; isMember: boolean; onJoin: () => void
}) {
  const router = useRouter()
  const fire   = getFireStatus(village.last_post_at ?? null)
  return (
    <div
      className="rounded-3xl overflow-hidden active:scale-[0.99] transition-all cursor-pointer"
      style={{
        background: SIMPLE_COLORS.cardBg,
        border: `1px solid ${SIMPLE_COLORS.cardBorder}`,
        boxShadow: SIMPLE_COLORS.cardShadow,
      }}
      onClick={() => router.push(`/guilds/${village.id}`)}
    >
      <div className="flex items-center gap-3 p-4">
        <div
          className="w-14 h-14 flex-shrink-0 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
            border: '1px solid rgba(15,23,42,0.06)',
          }}
        >
          <span className="text-2xl">{village.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="font-extrabold text-[15px] truncate" style={{ color: SIMPLE_COLORS.textPrimary }}>
              {village.name}
            </p>
            <span className={`text-xs flex-shrink-0 ${fire.animate ? 'animate-pulse' : ''}`}>{fire.emoji}</span>
          </div>
          <p className="text-xs line-clamp-1 leading-relaxed" style={{ color: SIMPLE_COLORS.textSecondary }}>
            {village.description}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[11px] font-bold" style={{ color: SIMPLE_COLORS.textTertiary }}>
              👥 {village.member_count}
            </span>
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onJoin() }}
          className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-extrabold active:scale-90 transition-all"
          style={isMember
            ? {
                background: '#f1f5f9',
                border: '1px solid rgba(15,23,42,0.08)',
                color: SIMPLE_COLORS.textSecondary,
              }
            : {
                background: SIMPLE_COLORS.accent,
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(157,92,255,0.32)',
              }
          }
        >
          {isMember ? '参加中' : '参加'}
        </button>
      </div>
    </div>
  )
}

// ── 横スクロール小カード (light) ──────────────────────────────
function GuildSmallCard({ village, isMember, onJoin }: {
  village: Village; isMember: boolean; onJoin: () => void
}) {
  const router = useRouter()
  const fire   = getFireStatus(village.last_post_at ?? null)
  return (
    <div
      className="flex-shrink-0 w-44 rounded-3xl overflow-hidden cursor-pointer active:scale-[0.99] transition-all"
      style={{
        background: SIMPLE_COLORS.cardBg,
        border: `1px solid ${SIMPLE_COLORS.cardBorder}`,
        boxShadow: SIMPLE_COLORS.cardShadow,
      }}
      onClick={() => router.push(`/guilds/${village.id}`)}
    >
      <div
        className="h-16 flex items-center justify-center relative"
        style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}
      >
        <span className="text-3xl">{village.icon}</span>
        <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded-full px-1.5 py-0.5"
          style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)' }}>
          <span className={`text-[10px] ${fire.animate ? 'animate-pulse' : ''}`}>{fire.emoji}</span>
          <span className="text-[8px] font-bold" style={{ color: SIMPLE_COLORS.textSecondary }}>{fire.label}</span>
        </div>
      </div>
      <div className="p-3">
        <p className="font-bold text-xs truncate leading-snug mb-0.5" style={{ color: SIMPLE_COLORS.textPrimary }}>
          {village.name}
        </p>
        <p className="text-[10px] line-clamp-2 leading-relaxed" style={{ color: SIMPLE_COLORS.textSecondary }}>
          {village.description}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[9px] font-bold" style={{ color: SIMPLE_COLORS.textTertiary }}>
            👥 {village.member_count}
          </span>
          <button
            onClick={e => { e.stopPropagation(); onJoin() }}
            className="text-[9px] font-extrabold px-2.5 py-0.5 rounded-full active:scale-90 transition-all"
            style={isMember
              ? { background: '#f1f5f9', border: '1px solid rgba(15,23,42,0.08)', color: SIMPLE_COLORS.textSecondary }
              : { background: SIMPLE_COLORS.accent, color: '#ffffff', boxShadow: '0 2px 6px rgba(157,92,255,0.28)' }
            }
          >
            {isMember ? '参加中' : '参加'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface Props {
  /** /guild ページ内に埋め込まれたとき true。FAB の bottom 位置を上部タブ分ずらす */
  embedded?: boolean
  /** ヘッダー上部のオフセット（埋め込み時にトップタブの高さ分下げる） */
  headerTopOffset?: number
}

export default function GuildsContent({ embedded = false, headerTopOffset = 0 }: Props) {
  const router = useRouter()
  const [villages,  setVillages]  = useState<Village[]>([])
  const [laneData,  setLaneData]  = useState<Record<string, Village[]>>({})
  const [loading,   setLoading]   = useState(true)
  const [genre,     setGenre]     = useState('all')
  const [subFilter, setSubFilter] = useState<string | null>(null)
  const [search,    setSearch]    = useState('')
  const [userId,    setUserId]    = useState<string | null>(null)
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  const fetchLanes = useCallback(async () => {
    const supabase = createClient()
    const results: Record<string, Village[]> = {}
    const gameCategories = INDUSTRIES.map(i => i.id)
    await Promise.all(LANES.map(async lane => {
      const { data } = await supabase
        .from('villages')
        .select('*')
        .eq('is_public', true)
        .in('category', gameCategories)
        .neq('comm_style', 'voice')
        .order(lane.orderBy, { ascending: lane.ascending })
        .limit(8)
      results[lane.id] = (data ?? []) as Village[]
    }))
    setLaneData(results)
  }, [])

  const fetchVillages = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const gameCategories = INDUSTRIES.map(i => i.id)

    let q = supabase
      .from('villages')
      .select('*')
      .eq('is_public', true)
      .neq('comm_style', 'voice')

    if (genre !== 'all') {
      q = q.eq('category', genre)
    } else {
      q = q.in('category', gameCategories)
    }

    if (subFilter === 'popular') q = q.order('post_count_7d', { ascending: false })
    else if (subFilter === 'new') q = q.order('created_at',   { ascending: false })
    else                          q = q.order('member_count', { ascending: false })

    const { data } = await q.limit(40)
    setVillages((data || []) as Village[])
    setLoading(false)
  }, [genre, subFilter])

  const fetchMemberships = useCallback(async () => {
    if (!userId) return
    const { data } = await createClient()
      .from('village_members').select('village_id').eq('user_id', userId)
    setMemberIds(new Set((data || []).map((m: any) => m.village_id)))
  }, [userId])

  useEffect(() => { fetchVillages() },    [fetchVillages])
  useEffect(() => { fetchMemberships() }, [fetchMemberships])
  useEffect(() => {
    if (genre === 'all' && !subFilter) fetchLanes()
  }, [fetchLanes, genre, subFilter])

  async function handleJoin(villageId: string) {
    if (!userId) { router.push('/login'); return }
    const supabase = createClient()
    if (memberIds.has(villageId)) {
      await supabase.from('village_members').delete().eq('village_id', villageId).eq('user_id', userId)
      setMemberIds(prev => { const n = new Set(prev); n.delete(villageId); return n })
    } else {
      await supabase.from('village_members').insert({ village_id: villageId, user_id: userId })
      setMemberIds(prev => new Set([...prev, villageId]))
    }
  }

  const displayed = villages.filter(v => {
    if (subFilter === 'member') return memberIds.has(v.id)
    if (search) {
      const q = search.toLowerCase()
      return v.name.toLowerCase().includes(q) || v.description?.toLowerCase().includes(q)
    }
    return true
  })

  const featured  = displayed[0]
  const rest      = displayed.slice(1)
  const showLanes = genre === 'all' && !subFilter && !search

  return (
    // ライト化: 自分のセクション全体を light gray ページに乗せる。
    // /guild の親ページがダークでも、ここだけ light で「ギルド」タブ世界観を
    // 確立する。/guilds 単体ルートでもそのまま意図通り。
    <div style={{ background: SIMPLE_COLORS.pageBg, minHeight: embedded ? 'auto' : '100vh' }}>

      {/* ── ヘッダー (light) ── */}
      <div
        className="sticky z-10 px-4 pt-6 pb-3"
        style={{
          top: headerTopOffset,
          background: '#ffffff',
          borderBottom: `1px solid ${SIMPLE_COLORS.cardBorder}`,
        }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-[10px] font-extrabold tracking-widest uppercase mb-0.5"
              style={{ color: SIMPLE_COLORS.accent }}>
              GUILD
            </p>
            <h1 className="font-extrabold text-xl leading-tight flex items-center gap-2"
              style={{ color: SIMPLE_COLORS.textPrimary }}>
              <GuildShieldIcon size={22} active={true} />
              ゲーム仲間とつながろう
            </h1>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: SIMPLE_COLORS.textSecondary }}>
              継続的に集まれるコミュニティを見つける場所
            </p>
          </div>
        </div>

        {/* 検索 */}
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2"
            style={{ color: SIMPLE_COLORS.textTertiary }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ギルドを検索..."
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl text-sm focus:outline-none transition-all"
            style={{
              background: '#f5f5f7',
              border: '1px solid rgba(15,23,42,0.08)',
              color: SIMPLE_COLORS.textPrimary,
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = SIMPLE_COLORS.accentBorder
              e.currentTarget.style.background = '#ffffff'
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(157,92,255,0.10)'
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'rgba(15,23,42,0.08)'
              e.currentTarget.style.background = '#f5f5f7'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
        </div>

        {/* ジャンルタブ */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 pl-4 pr-6">
          {GENRE_TABS.map(g => {
            const active = genre === g.id
            return (
              <button key={g.id}
                onClick={() => { setGenre(g.id); setSearch(''); setSubFilter(null) }}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95"
                style={active
                  ? {
                      background: SIMPLE_COLORS.accentBg,
                      color: SIMPLE_COLORS.accentDeep,
                      border: `1px solid ${SIMPLE_COLORS.accentBorder}`,
                    }
                  : {
                      background: '#f5f5f7',
                      color: SIMPLE_COLORS.textSecondary,
                      border: '1px solid rgba(15,23,42,0.06)',
                    }
                }
              >
                <span>{g.emoji}</span>
                <span className="whitespace-nowrap">{g.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── サブフィルター (light) ── */}
      <div
        className="px-4 py-2.5 flex gap-2 overflow-x-auto scrollbar-none"
        style={{ background: '#ffffff', borderBottom: `1px solid ${SIMPLE_COLORS.cardBorder}` }}
      >
        {SUB_FILTERS.map(sf => (
          <button key={sf.id}
            onClick={() => setSubFilter(prev => prev === sf.id ? null : sf.id)}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all"
            style={subFilter === sf.id
              ? {
                  background: SIMPLE_COLORS.accentBg,
                  color: SIMPLE_COLORS.accentDeep,
                  borderColor: SIMPLE_COLORS.accentBorder,
                }
              : {
                  background: '#f5f5f7',
                  color: SIMPLE_COLORS.textSecondary,
                  borderColor: 'rgba(15,23,42,0.06)',
                }
            }
          >
            <span>{sf.emoji}</span><span>{sf.label}</span>
          </button>
        ))}
      </div>

      {/* ── コンテンツ ── */}
      <div className="pb-32">

        {showLanes && (
          <div className="pt-4 space-y-5">
            {LANES.map(lane => {
              const items = laneData[lane.id] ?? []
              if (items.length === 0) return null
              return (
                <div key={lane.id}>
                  <div className="px-4 flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{lane.emoji}</span>
                      <p className="text-xs font-extrabold" style={{ color: SIMPLE_COLORS.textPrimary }}>
                        {lane.label}
                      </p>
                    </div>
                    <button
                      onClick={() => setSubFilter(lane.id === 'hot' ? 'popular' : 'new')}
                      className="flex items-center gap-0.5 text-[10px] font-medium"
                      style={{ color: SIMPLE_COLORS.textTertiary }}
                    >
                      すべて <ChevronRight size={11} />
                    </button>
                  </div>
                  <div className="pl-4 flex gap-3 overflow-x-auto scrollbar-none pr-4">
                    {items.map(v => (
                      <GuildSmallCard key={v.id} village={v}
                        isMember={memberIds.has(v.id)}
                        onJoin={() => handleJoin(v.id)} />
                    ))}
                  </div>
                </div>
              )
            })}
            <div className="px-4 flex items-center gap-2 pt-1">
              <div className="flex-1 h-px" style={{ background: SIMPLE_COLORS.cardBorder }} />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: SIMPLE_COLORS.textTertiary }}>
                すべてのギルド
              </span>
              <div className="flex-1 h-px" style={{ background: SIMPLE_COLORS.cardBorder }} />
            </div>
          </div>
        )}

        {!showLanes && (
          <div className="px-4 flex items-center gap-3 pt-4 pb-2">
            <div className="flex-1 h-px" style={{ background: SIMPLE_COLORS.cardBorder }} />
            <span className="text-[11px] font-bold" style={{ color: SIMPLE_COLORS.textTertiary }}>
              すべてのギルド
            </span>
            <div className="flex-1 h-px" style={{ background: SIMPLE_COLORS.cardBorder }} />
          </div>
        )}

        <div className="px-4 pt-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-3xl overflow-hidden animate-pulse"
                  style={{
                    background: SIMPLE_COLORS.cardBg,
                    border: `1px solid ${SIMPLE_COLORS.cardBorder}`,
                  }}>
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl" style={{ background: '#f1f5f9' }} />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 rounded-full w-2/3" style={{ background: '#e2e8f0' }} />
                      <div className="h-2.5 rounded-full w-full" style={{ background: '#f1f5f9' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-16">
              <div className="relative w-32 h-32 mx-auto mb-5">
                <div className="absolute inset-0 rounded-full" style={{
                  background: 'radial-gradient(circle, rgba(157,92,255,0.14) 0%, transparent 70%)',
                  filter: 'blur(8px)',
                }} />
                <div className="relative w-full h-full flex items-center justify-center">
                  <GuildShieldIcon size={88} active={true} />
                </div>
              </div>
              <p className="font-extrabold text-base mb-2" style={{ color: SIMPLE_COLORS.textPrimary }}>
                {subFilter === 'member' ? 'まだギルドに参加していません' : 'このジャンルのギルドはまだありません'}
              </p>
              <p className="text-sm mb-7 leading-relaxed px-6" style={{ color: SIMPLE_COLORS.textSecondary }}>
                {subFilter === 'member'
                  ? '同じゲームが好きな仲間とつながるギルドに参加しましょう'
                  : '最初のギルドを作って、同じゲームが好きな仲間を集めましょう'}
              </p>
              {subFilter !== 'member' && (
                <button
                  onClick={() => router.push('/guilds/create')}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-extrabold active:scale-95 transition-all"
                  style={{
                    background: SIMPLE_COLORS.accent,
                    color: '#ffffff',
                    boxShadow: '0 4px 14px rgba(157,92,255,0.32)',
                  }}
                >
                  <Plus size={16} />
                  ギルドを作る
                </button>
              )}
            </div>
          ) : (
            <>
              {featured && !search && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest"
                      style={{ color: SIMPLE_COLORS.textTertiary }}>
                      おすすめ · Featured
                    </span>
                    <div className="flex-1 h-px" style={{ background: SIMPLE_COLORS.cardBorder }} />
                  </div>
                  <GuildListCard village={featured} isMember={memberIds.has(featured.id)} onJoin={() => handleJoin(featured.id)} />
                </div>
              )}
              {(search ? displayed : rest).length > 0 && (
                <div className="space-y-3">
                  {(search ? displayed : rest).map(v => (
                    <GuildListCard key={v.id} village={v} isMember={memberIds.has(v.id)} onJoin={() => handleJoin(v.id)} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── FAB (紫アクセント維持) ── */}
      <button
        onClick={() => router.push('/guilds/create')}
        className="fixed right-5 w-14 h-14 rounded-2xl flex items-center justify-center active:scale-90 transition-all z-30"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
          background: SIMPLE_COLORS.accent,
          boxShadow: '0 8px 24px rgba(157,92,255,0.4), 0 2px 6px rgba(157,92,255,0.2)',
        }}
        aria-label="ギルドを作る"
      >
        <Plus size={22} className="text-white" />
      </button>
    </div>
  )
}
