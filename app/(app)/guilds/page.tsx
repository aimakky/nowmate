'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, ChevronRight } from 'lucide-react'
import { INDUSTRIES } from '@/lib/guild'
import VillageCard, { type Village, getFireStatus } from '@/components/ui/VillageCard'

// ゲーム以外のカテゴリ
const GAME_CATEGORIES = new Set(INDUSTRIES.map(i => i.id))

const GENRE_TABS = [
  { id: 'all',  emoji: '🛡️', label: 'すべて' },
  { id: '趣味', emoji: '🎨', label: '趣味' },
  { id: '仕事', emoji: '💼', label: '仕事' },
  { id: '学習', emoji: '📚', label: '学習' },
  { id: '地域', emoji: '📍', label: '地域' },
  { id: '雑談', emoji: '☕', label: '雑談' },
  { id: '相談', emoji: '🤝', label: '相談' },
]

const SUB_FILTERS = [
  { id: 'popular', label: 'にぎやか', emoji: '🔥' },
  { id: 'new',     label: '新着',     emoji: '✨' },
  { id: 'member',  label: '参加中',   emoji: '🏠' },
]

const LANES = [
  { id: 'hot', emoji: '🔥', label: '今週活発なギルド', orderBy: 'post_count_7d' as const, ascending: false },
  { id: 'new', emoji: '✨', label: '新しいギルド',     orderBy: 'created_at'    as const, ascending: false },
]

function GuildSmallCard({ village, isMember, onJoin }: {
  village: Village; isMember: boolean; onJoin: () => void
}) {
  const router = useRouter()
  const fire   = getFireStatus(village.last_post_at ?? null)
  return (
    <div
      className="flex-shrink-0 w-44 rounded-2xl overflow-hidden cursor-pointer active:scale-[0.97] transition-all bg-white shadow-sm border border-stone-100"
      onClick={() => router.push(`/villages/${village.id}`)}
    >
      <div className="h-16 flex items-center justify-center relative bg-gradient-to-br from-amber-50 to-orange-50">
        <span className="text-3xl" style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.12))' }}>
          {village.icon}
        </span>
        <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 bg-black/15 rounded-full px-1.5 py-0.5">
          <span className={`text-[10px] ${fire.animate ? 'animate-pulse' : ''}`}>{fire.emoji}</span>
          <span className="text-[8px] font-bold text-stone-700">{fire.label}</span>
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
            style={{ background: isMember ? '#9ca3af' : '#f97316' }}
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
    await Promise.all(LANES.map(async lane => {
      const { data } = await supabase
        .from('villages').select('*').eq('is_public', true)
        .not('category', 'in', `(${[...GAME_CATEGORIES].join(',')})`)
        .order(lane.orderBy, { ascending: lane.ascending }).limit(8)
      results[lane.id] = (data ?? []) as Village[]
    }))
    setLaneData(results)
  }, [])

  const fetchVillages = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    let q = supabase.from('villages').select('*').eq('is_public', true)

    if (genre !== 'all') {
      q = q.eq('type', genre)
    } else {
      q = q.not('category', 'in', `(${[...GAME_CATEGORIES].join(',')})`)
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
    <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9]">

      {/* ── ヘッダー ── */}
      <div className="sticky top-0 z-10 px-4 pt-12 pb-0"
        style={{ background: 'linear-gradient(160deg,#431407 0%,#7c2d12 60%,#9a3412 100%)' }}>

        {/* 背景テクスチャ */}
        <div className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ backgroundImage: `radial-gradient(1px 1px at 15% 25%, #fed7aa, transparent), radial-gradient(1.5px 1.5px at 75% 20%, #fdba74, transparent), radial-gradient(1px 1px at 88% 65%, #fbbf24, transparent), radial-gradient(1px 1px at 40% 80%, #fed7aa, transparent), radial-gradient(1.5px 1.5px at 55% 45%, white, transparent)` }} />

        <div className="relative">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-orange-300/60 text-[10px] font-bold tracking-widest uppercase mb-0.5">GUILD</p>
              <h1 className="font-extrabold text-white text-2xl leading-tight">🛡️ ギルドを探す</h1>
              <p className="text-white/40 text-xs mt-0.5">趣味・仕事・学習の仲間が集まるギルド</p>
            </div>
            <button
              onClick={() => router.push('/villages/create')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold flex-shrink-0 active:scale-95 transition-all"
              style={{ background: 'rgba(251,146,60,0.25)', color: '#fed7aa', border: '1px solid rgba(251,146,60,0.35)' }}
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
              style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.12)' }}
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
                    ? { background: '#f97316', color: '#fff' }
                    : { background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.10)' }
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
      <div className="bg-white border-b border-stone-100 shadow-sm px-4 py-2 flex gap-2 overflow-x-auto scrollbar-none">
        {SUB_FILTERS.map(sf => (
          <button key={sf.id}
            onClick={() => setSubFilter(prev => prev === sf.id ? null : sf.id)}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-xl text-[11px] font-bold border transition-all"
            style={subFilter === sf.id
              ? { background: '#1c1917', color: '#fff', borderColor: '#1c1917' }
              : { background: '#fafaf9', color: '#78716c', borderColor: '#e7e5e4' }
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
                      <p className="text-xs font-extrabold text-stone-800">{lane.label}</p>
                    </div>
                    <button
                      onClick={() => setSubFilter(lane.id === 'hot' ? 'popular' : 'new')}
                      className="flex items-center gap-0.5 text-[10px] text-stone-400 font-medium"
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
              <div className="flex-1 h-px bg-stone-100" />
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">すべてのギルド</span>
              <div className="flex-1 h-px bg-stone-100" />
            </div>
          </div>
        )}

        <div className="px-4 pt-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-sm animate-pulse border border-stone-100">
                  <div className={`${i === 0 ? 'h-[120px]' : 'h-24'} bg-stone-100`} />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-stone-100 rounded-full w-2/3" />
                    <div className="h-3 bg-stone-100 rounded-full w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🛡️</div>
              <p className="font-extrabold text-stone-800 text-base mb-1.5">
                {subFilter === 'member' ? 'まだギルドに参加していません' : 'このカテゴリのギルドはまだありません'}
              </p>
              <p className="text-sm text-stone-400 mb-6">最初のギルドを作ってみましょう</p>
              <button
                onClick={() => router.push('/villages/create')}
                className="px-6 py-3 rounded-2xl text-sm font-bold text-white active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg,#f97316 0%,#ea580c 100%)', boxShadow: '0 8px 24px rgba(249,115,22,0.4)' }}
              >🛡️ ギルドを作る</button>
            </div>
          ) : (
            <>
              {featured && !search && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-widest">おすすめ · Featured</span>
                    <div className="flex-1 h-px bg-stone-100" />
                  </div>
                  <VillageCard village={featured} isMember={memberIds.has(featured.id)} onJoin={() => handleJoin(featured.id)} featured={true} />
                </div>
              )}
              {(search ? displayed : rest).length > 0 && (
                <div className="space-y-3">
                  {(search ? displayed : rest).map(v => (
                    <VillageCard key={v.id} village={v} isMember={memberIds.has(v.id)} onJoin={() => handleJoin(v.id)} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── FAB ── */}
      <button
        onClick={() => router.push('/villages/create')}
        className="fixed right-5 w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl active:scale-90 transition-all z-30"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
          background: 'linear-gradient(135deg,#f97316 0%,#ea580c 100%)',
          boxShadow: '0 8px 24px rgba(249,115,22,0.5)',
        }}
      >
        <Plus size={22} className="text-white" />
      </button>
    </div>
  )
}
