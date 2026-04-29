'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, ChevronRight } from 'lucide-react'
import { INDUSTRIES } from '@/lib/guild'
import { type Village, getFireStatus } from '@/components/ui/VillageCard'

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
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-100 active:scale-[0.98] transition-all cursor-pointer"
      onClick={() => router.push(`/guilds/${village.id}`)}
    >
      <div className="flex items-center gap-3 p-3.5">
        <div className="w-14 h-14 flex-shrink-0 rounded-2xl flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700">
          <span className="text-2xl">{village.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="font-extrabold text-stone-800 text-sm truncate">{village.name}</p>
            <span className={`text-[10px] flex-shrink-0 ${fire.animate ? 'animate-pulse' : ''}`}>{fire.emoji}</span>
          </div>
          <p className="text-[11px] text-stone-400 line-clamp-1 leading-relaxed">{village.description}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-stone-400">👥 {village.member_count}</span>
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onJoin() }}
          className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold active:scale-90 transition-all text-white"
          style={{ background: isMember ? '#9ca3af' : '#6366f1' }}
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
      className="flex-shrink-0 w-44 rounded-2xl overflow-hidden cursor-pointer active:scale-[0.97] transition-all bg-white shadow-sm border border-stone-100"
      onClick={() => router.push(`/guilds/${village.id}`)}
    >
      <div className="h-16 flex items-center justify-center relative bg-gradient-to-br from-slate-800 to-slate-900">
        <span className="text-3xl" style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.3))' }}>
          {village.icon}
        </span>
        <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 bg-black/30 rounded-full px-1.5 py-0.5">
          <span className={`text-[10px] ${fire.animate ? 'animate-pulse' : ''}`}>{fire.emoji}</span>
          <span className="text-[8px] font-bold text-white/80">{fire.label}</span>
        </div>
      </div>
      <div className="p-2.5">
        <p className="font-bold text-stone-800 text-xs truncate leading-snug mb-0.5">{village.name}</p>
        <p className="text-[10px] text-stone-400 line-clamp-2 leading-relaxed">{village.description}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[9px] text-stone-400">👥 {village.member_count}</span>
          <button
            onClick={e => { e.stopPropagation(); onJoin() }}
            className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white active:scale-90 transition-all"
            style={{ background: isMember ? '#9ca3af' : '#6366f1' }}
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
    // ゲームジャンルのみ（comm_style が voice 以外、つまり通常ギルド）
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
    <div className="max-w-md mx-auto min-h-screen bg-[#0f0f1a]">

      {/* ── ヘッダー ── */}
      <div className="sticky top-0 z-10 px-4 pt-12 pb-0"
        style={{ background: 'linear-gradient(160deg,#0f0f1a 0%,#1a1035 60%,#0d1f4a 100%)' }}>

        {/* 背景テクスチャ */}
        <div className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ backgroundImage: `radial-gradient(1px 1px at 15% 25%, #818cf8, transparent), radial-gradient(1.5px 1.5px at 75% 20%, #a78bfa, transparent), radial-gradient(1px 1px at 88% 65%, #6366f1, transparent), radial-gradient(1px 1px at 40% 80%, #818cf8, transparent), radial-gradient(1.5px 1.5px at 55% 45%, white, transparent)` }} />

        <div className="relative">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-indigo-300/60 text-[10px] font-bold tracking-widest uppercase mb-0.5">GUILD</p>
              <h1 className="font-extrabold text-white text-2xl leading-tight">🛡️ ギルドを探す</h1>
              <p className="text-white/40 text-xs mt-0.5">同じゲームを愛する仲間が集まるコミュニティ</p>
            </div>
            <button
              onClick={() => router.push('/guilds/create')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold flex-shrink-0 active:scale-95 transition-all"
              style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}
            >
              <Plus size={13} /> 作る
            </button>
          </div>

          {/* 検索 */}
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ギルドを検索..."
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl text-sm focus:outline-none text-white placeholder-white/25"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)' }}
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
                    ? { background: '#6366f1', color: '#fff' }
                    : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.50)', border: '1px solid rgba(255,255,255,0.08)' }
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
      <div className="border-b border-white/5 px-4 py-2 flex gap-2 overflow-x-auto scrollbar-none"
        style={{ background: 'rgba(255,255,255,0.03)' }}>
        {SUB_FILTERS.map(sf => (
          <button key={sf.id}
            onClick={() => setSubFilter(prev => prev === sf.id ? null : sf.id)}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-xl text-[11px] font-bold border transition-all"
            style={subFilter === sf.id
              ? { background: '#6366f1', color: '#fff', borderColor: '#6366f1' }
              : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)', borderColor: 'rgba(255,255,255,0.10)' }
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
                      <p className="text-xs font-extrabold text-white/80">{lane.label}</p>
                    </div>
                    <button
                      onClick={() => setSubFilter(lane.id === 'hot' ? 'popular' : 'new')}
                      className="flex items-center gap-0.5 text-[10px] text-white/30 font-medium"
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
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">すべてのギルド</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
          </div>
        )}

        <div className="px-4 pt-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden animate-pulse border border-white/5"
                  style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className={`${i === 0 ? 'h-[80px]' : 'h-16'} bg-white/5`} />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-white/10 rounded-full w-2/3" />
                    <div className="h-3 bg-white/5 rounded-full w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🛡️</div>
              <p className="font-extrabold text-white text-base mb-1.5">
                {subFilter === 'member' ? 'まだギルドに参加していません' : 'このジャンルのギルドはまだありません'}
              </p>
              <p className="text-sm text-white/40 mb-6">最初のギルドを作ってみましょう</p>
              <button
                onClick={() => router.push('/guilds/create')}
                className="px-6 py-3 rounded-2xl text-sm font-bold text-white active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg,#6366f1 0%,#4f46e5 100%)', boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}
              >🛡️ ギルドを作る</button>
            </div>
          ) : (
            <>
              {featured && !search && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-[10px] font-extrabold text-white/30 uppercase tracking-widest">おすすめ · Featured</span>
                    <div className="flex-1 h-px bg-white/10" />
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
          background: 'linear-gradient(135deg,#6366f1 0%,#4f46e5 100%)',
          boxShadow: '0 8px 24px rgba(99,102,241,0.5)',
        }}
      >
        <Plus size={22} className="text-white" />
      </button>
    </div>
  )
}
