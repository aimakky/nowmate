'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, ChevronRight } from 'lucide-react'
import { INDUSTRIES } from '@/lib/guild'
import { type Village, getFireStatus } from '@/components/ui/VillageCard'
import GuildShieldIcon from '@/components/ui/icons/GuildShieldIcon'

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

// ── 縦長リストカード ──────────────────────────────────────────
function GuildListCard({ village, isMember, onJoin }: {
  village: Village; isMember: boolean; onJoin: () => void
}) {
  const router = useRouter()
  const fire   = getFireStatus(village.last_post_at ?? null)
  return (
    <div
      className="rounded-2xl overflow-hidden active:scale-[0.98] transition-all cursor-pointer"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(39,223,255,0.2)',
      }}
      onClick={() => router.push(`/guilds/${village.id}`)}
    >
      <div className="flex items-center gap-3 p-3.5">
        <div
          className="w-14 h-14 flex-shrink-0 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #27DFFF 0%, #0891B2 100%)',
            boxShadow: '0 0 16px rgba(39,223,255,0.4)',
          }}
        >
          <span className="text-2xl">{village.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="font-extrabold text-sm truncate" style={{ color: '#F0EEFF' }}>{village.name}</p>
            <span className={`text-[10px] flex-shrink-0 ${fire.animate ? 'animate-pulse' : ''}`}>{fire.emoji}</span>
          </div>
          <p className="text-[11px] line-clamp-1 leading-relaxed" style={{ color: 'rgba(240,238,255,0.55)' }}>{village.description}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-bold" style={{ color: '#27DFFF' }}>👥 {village.member_count}</span>
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onJoin() }}
          className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold active:scale-90 transition-all text-white"
          style={isMember
            ? { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(39,223,255,0.3)', color: 'rgba(240,238,255,0.55)' }
            : { background: 'linear-gradient(135deg, #27DFFF 0%, #0891B2 100%)', boxShadow: '0 4px 20px rgba(39,223,255,0.4)', color: '#051020' }
          }
        >{isMember ? '参加中' : '参加'}</button>
      </div>
    </div>
  )
}

// ── 横スクロール小カード ──────────────────────────────────────
function GuildSmallCard({ village, isMember, onJoin }: {
  village: Village; isMember: boolean; onJoin: () => void
}) {
  const router = useRouter()
  const fire   = getFireStatus(village.last_post_at ?? null)
  return (
    <div
      className="flex-shrink-0 w-44 rounded-2xl overflow-hidden cursor-pointer active:scale-[0.97] transition-all"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(39,223,255,0.2)',
      }}
      onClick={() => router.push(`/guilds/${village.id}`)}
    >
      <div
        className="h-16 flex items-center justify-center relative"
        style={{ background: 'linear-gradient(135deg, #27DFFF 0%, #0891B2 60%, #22d3ee 100%)' }}
      >
        <span className="text-3xl" style={{ filter: 'drop-shadow(0 1px 8px rgba(39,223,255,0.6))' }}>
          {village.icon}
        </span>
        <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded-full px-1.5 py-0.5"
          style={{ background: 'rgba(8,8,18,0.6)', backdropFilter: 'blur(4px)' }}>
          <span className={`text-[10px] ${fire.animate ? 'animate-pulse' : ''}`}>{fire.emoji}</span>
          <span className="text-[8px] font-bold" style={{ color: 'rgba(240,238,255,0.8)' }}>{fire.label}</span>
        </div>
      </div>
      <div className="p-2.5">
        <p className="font-bold text-xs truncate leading-snug mb-0.5" style={{ color: '#F0EEFF' }}>{village.name}</p>
        <p className="text-[10px] line-clamp-2 leading-relaxed" style={{ color: 'rgba(240,238,255,0.55)' }}>{village.description}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[9px] font-bold" style={{ color: '#27DFFF' }}>👥 {village.member_count}</span>
          <button
            onClick={e => { e.stopPropagation(); onJoin() }}
            className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white active:scale-90 transition-all"
            style={isMember
              ? { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(39,223,255,0.3)', color: 'rgba(240,238,255,0.55)' }
              : { background: 'linear-gradient(135deg, #27DFFF 0%, #0891B2 100%)', boxShadow: '0 2px 10px rgba(39,223,255,0.4)', color: '#051020' }
            }
          >{isMember ? '参加中' : '参加'}</button>
        </div>
      </div>
    </div>
  )
}

export default function GuildsPage() {
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
    <div className="max-w-md mx-auto min-h-screen pb-28" style={{ background: '#080812' }}>

      {/* ── ヘッダー ── */}
      <div
        className="sticky top-0 z-10 px-4 pt-12 pb-0"
        style={{ background: 'linear-gradient(160deg, #081a26 0%, #0a1824 60%, #0a1824 100%)', borderBottom: '1px solid rgba(39,223,255,0.1)' }}
      >
        {/* 背景グロー */}
        <div className="absolute inset-0 opacity-30 pointer-events-none"
          style={{ backgroundImage: `radial-gradient(1px 1px at 15% 25%, #27DFFF, transparent), radial-gradient(1.5px 1.5px at 75% 20%, #0891B2, transparent), radial-gradient(1px 1px at 88% 65%, #49E1FF, transparent), radial-gradient(1px 1px at 40% 80%, #27DFFF, transparent), radial-gradient(1.5px 1.5px at 55% 45%, rgba(240,238,255,0.8), transparent)` }} />

        <div className="relative">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase mb-0.5" style={{ color: '#27DFFF' }}>GUILD</p>
              <h1 className="font-extrabold text-2xl leading-tight flex items-center gap-2" style={{ color: '#F0EEFF' }}>
                <GuildShieldIcon size={28} active={true} />
                ギルドを探す
              </h1>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(240,238,255,0.3)' }}>同じゲームを愛する仲間が集まるコミュニティ</p>
            </div>
            <button
              onClick={() => router.push('/guilds/create')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold flex-shrink-0 active:scale-95 transition-all"
              style={{ background: 'rgba(39,223,255,0.15)', color: '#27DFFF', border: '1px solid rgba(39,223,255,0.3)' }}
            >
              <Plus size={13} /> 作る
            </button>
          </div>

          {/* 検索 */}
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(240,238,255,0.3)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ギルドを検索..."
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl text-sm focus:outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(39,223,255,0.2)',
                color: '#F0EEFF',
              }}
              onFocus={e => { e.currentTarget.style.border = '1px solid rgba(39,223,255,0.5)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(39,223,255,0.15)' }}
              onBlur={e => { e.currentTarget.style.border = '1px solid rgba(39,223,255,0.2)'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>

          {/* ジャンルタブ */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 pb-3">
            {GENRE_TABS.map(g => {
              const active = genre === g.id
              return (
                <button key={g.id}
                  onClick={() => { setGenre(g.id); setSearch(''); setSubFilter(null) }}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95"
                  style={active
                    ? { background: 'rgba(39,223,255,0.2)', color: '#27DFFF', border: '1px solid rgba(39,223,255,0.4)', boxShadow: '0 0 12px rgba(39,223,255,0.2)' }
                    : { background: 'rgba(255,255,255,0.04)', color: 'rgba(240,238,255,0.5)', border: '1px solid rgba(39,223,255,0.1)' }
                  }
                >
                  <span>{g.emoji}</span>
                  <span className="whitespace-nowrap">{g.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── サブフィルター ── */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-none" style={{ background: 'rgba(39,223,255,0.03)', borderBottom: '1px solid rgba(39,223,255,0.08)' }}>
        {SUB_FILTERS.map(sf => (
          <button key={sf.id}
            onClick={() => setSubFilter(prev => prev === sf.id ? null : sf.id)}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-xl text-[11px] font-bold border transition-all"
            style={subFilter === sf.id
              ? { background: 'rgba(39,223,255,0.2)', color: '#27DFFF', borderColor: 'rgba(39,223,255,0.4)', boxShadow: '0 0 10px rgba(39,223,255,0.2)' }
              : { background: 'rgba(255,255,255,0.03)', color: 'rgba(240,238,255,0.45)', borderColor: 'rgba(39,223,255,0.1)' }
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
                      <p className="text-xs font-extrabold" style={{ color: '#F0EEFF' }}>{lane.label}</p>
                    </div>
                    <button
                      onClick={() => setSubFilter(lane.id === 'hot' ? 'popular' : 'new')}
                      className="flex items-center gap-0.5 text-[10px] font-medium"
                      style={{ color: 'rgba(240,238,255,0.3)' }}
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
              <div className="flex-1 h-px" style={{ background: 'rgba(39,223,255,0.2)' }} />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(240,238,255,0.3)' }}>すべてのギルド</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(39,223,255,0.2)' }} />
            </div>
          </div>
        )}

        {/* すべてのギルド divider */}
        {!showLanes && (
          <div className="px-4 flex items-center gap-3 pt-4 pb-2">
            <div className="flex-1 h-px" style={{ background: 'rgba(39,223,255,0.2)' }} />
            <span className="text-[11px] font-bold" style={{ color: 'rgba(240,238,255,0.4)' }}>すべてのギルド</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(39,223,255,0.2)' }} />
          </div>
        )}

        <div className="px-4 pt-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden animate-pulse"
                  style={{ background: 'rgba(39,223,255,0.05)', border: '1px solid rgba(39,223,255,0.1)' }}>
                  <div className={`${i === 0 ? 'h-[80px]' : 'h-16'}`} style={{ background: 'rgba(39,223,255,0.08)' }} />
                  <div className="p-4 space-y-2">
                    <div className="h-4 rounded-full w-2/3" style={{ background: 'rgba(39,223,255,0.15)' }} />
                    <div className="h-3 rounded-full w-full" style={{ background: 'rgba(39,223,255,0.08)' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-16">
              {/* Glowing shield */}
              <div className="relative w-44 h-44 mx-auto mb-6">
                {/* Outer glow ring */}
                <div className="absolute inset-0 rounded-full" style={{
                  background: 'radial-gradient(circle, rgba(39,223,255,0.2) 0%, rgba(39,223,255,0.1) 50%, transparent 70%)',
                  filter: 'blur(16px)',
                }} />
                {/* Sparkle dots */}
                <span className="absolute top-4 right-8 text-xs font-bold" style={{ color: 'rgba(39,223,255,0.7)' }}>•</span>
                <span className="absolute top-8 right-4 text-[8px] font-bold" style={{ color: 'rgba(39,223,255,0.5)' }}>•</span>
                <span className="absolute bottom-6 left-6 text-xs font-bold" style={{ color: 'rgba(39,223,255,0.5)' }}>•</span>
                <span className="absolute top-6 left-8 text-[8px] font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>•</span>
                {/* Shield icon */}
                <div className="relative w-full h-full flex items-center justify-center">
                  <div
                    className="w-28 h-28 flex items-center justify-center"
                    style={{ filter: 'drop-shadow(0 0 24px rgba(39,223,255,0.5)) drop-shadow(0 0 48px rgba(39,223,255,0.3))' }}
                  >
                    <GuildShieldIcon size={112} active={true} />
                  </div>
                </div>
              </div>

              <p className="font-extrabold text-lg mb-2" style={{ color: '#F0EEFF' }}>
                {subFilter === 'member' ? 'まだギルドに参加していません' : 'このジャンルのギルドはまだありません'}
              </p>
              <p className="text-sm mb-8" style={{ color: 'rgba(240,238,255,0.4)' }}>
                {subFilter === 'member' ? '気に入ったギルドに参加しよう' : '最初のギルドを作ってみましょう'}
              </p>
              {subFilter !== 'member' && (
                <button
                  onClick={() => router.push('/guilds/create')}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold text-white active:scale-95 transition-all"
                  style={{
                    background: 'linear-gradient(135deg,#27DFFF 0%,#0891B2 100%)',
                    color: '#051020',
                    boxShadow: '0 8px 28px rgba(39,223,255,0.4)',
                  }}
                >
                  🛡️ ギルドを作る
                </button>
              )}
            </div>
          ) : (
            <>
              {featured && !search && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: 'rgba(240,238,255,0.3)' }}>おすすめ · Featured</span>
                    <div className="flex-1 h-px" style={{ background: 'rgba(39,223,255,0.2)' }} />
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

      {/* ── FAB ── */}
      <button
        onClick={() => router.push('/guilds/create')}
        className="fixed right-5 w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl active:scale-90 transition-all z-30"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
          background: 'linear-gradient(135deg, #27DFFF 0%, #0891B2 100%)',
          boxShadow: '0 8px 24px rgba(39,223,255,0.5), 0 0 20px rgba(39,223,255,0.3)',
        }}
      >
        <Plus size={22} className="text-white" />
      </button>
    </div>
  )
}

