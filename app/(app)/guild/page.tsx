'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, ChevronRight } from 'lucide-react'
import { INDUSTRIES } from '@/lib/guild'
import VillageCard, { type Village, VILLAGE_TYPE_STYLES, getFireStatus } from '@/components/ui/VillageCard'

// ── ゲームジャンルカテゴリ ──────────────────────────────────────
const GENRE_TABS = [
  { id: 'all', emoji: '🎮', label: 'すべて' },
  ...INDUSTRIES.map(i => ({ id: i.id, emoji: i.emoji, label: i.id, color: i.color })),
]

const SUB_FILTERS = [
  { id: 'popular', label: 'にぎやか', emoji: '🔥' },
  { id: 'new',     label: '新着',     emoji: '✨' },
  { id: 'member',  label: '参加中',   emoji: '🏠' },
]

const LANES = [
  { id: 'hot',  emoji: '🔥', label: '今週活発なギルド',  orderBy: 'post_count_7d' as const, ascending: false },
  { id: 'new',  emoji: '✨', label: '新しいギルド',       orderBy: 'created_at'    as const, ascending: false },
]

// ゲーム関連カテゴリ（villagesテーブルで使用）
const GAME_CATEGORIES = INDUSTRIES.map(i => i.id)

// ── スモールカード ──────────────────────────────────────────────
function GuildSmallCard({ village, isMember, onJoin }: {
  village: Village; isMember: boolean; onJoin: () => void
}) {
  const router  = useRouter()
  const genre   = INDUSTRIES.find(i => i.id === village.category) ?? null
  const fire    = getFireStatus(village.last_post_at ?? null)
  return (
    <div
      className="flex-shrink-0 w-44 rounded-2xl overflow-hidden cursor-pointer active:scale-[0.97] transition-all bg-white shadow-sm"
      style={{ border: '1px solid #e9d5ff' }}
      onClick={() => router.push(`/villages/${village.id}`)}
    >
      {/* カラーバー */}
      {genre && <div className="h-[3px]" style={{ background: genre.gradient }} />}
      {/* バナー */}
      <div className="h-16 flex items-center justify-center relative"
        style={{ background: genre ? `${genre.color}15` : '#f5f3ff' }}>
        <span className="text-3xl" style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.15))' }}>
          {village.icon}
        </span>
        <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 bg-black/20 rounded-full px-1.5 py-0.5">
          <span className={`text-[10px] ${fire.animate ? 'animate-pulse' : ''}`}>{fire.emoji}</span>
          <span className="text-[8px] font-bold text-white">{fire.label}</span>
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
            style={{ background: isMember ? '#9ca3af' : (genre?.color ?? '#8b5cf6') }}
          >{isMember ? '参加中' : '参加'}</button>
        </div>
      </div>
    </div>
  )
}

// ── メインページ ────────────────────────────────────────────────
export default function GuildPage() {
  const router = useRouter()
  const [villages,   setVillages]   = useState<Village[]>([])
  const [laneData,   setLaneData]   = useState<Record<string, Village[]>>({})
  const [loading,    setLoading]    = useState(true)
  const [genre,      setGenre]      = useState('all')
  const [subFilter,  setSubFilter]  = useState<string | null>(null)
  const [search,     setSearch]     = useState('')
  const [userId,     setUserId]     = useState<string | null>(null)
  const [memberIds,  setMemberIds]  = useState<Set<string>>(new Set())

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
        .in('category', GAME_CATEGORIES)
        .order(lane.orderBy, { ascending: lane.ascending }).limit(8)
      results[lane.id] = (data ?? []) as Village[]
    }))
    setLaneData(results)
  }, [])

  const fetchVillages = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    let q = supabase.from('villages').select('*').eq('is_public', true)

    if (genre !== 'all') q = q.eq('category', genre)
    else q = q.in('category', GAME_CATEGORIES)

    if (subFilter === 'popular') q = q.order('post_count_7d', { ascending: false })
    else if (subFilter === 'new') q = q.order('created_at',   { ascending: false })
    else                          q = q.order('member_count', { ascending: false })

    const { data } = await q.limit(40)
    setVillages((data || []) as Village[])
    setLoading(false)
  }, [genre, subFilter])

  const fetchMemberships = useCallback(async () => {
    if (!userId) return
    const supabase = createClient()
    const { data } = await supabase
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
  const activeGenre = GENRES.find(g => g.id === genre)

  return (
    <div className="max-w-md mx-auto min-h-screen bg-birch">

      {/* ── ヘッダー ── */}
      <div className="sticky top-0 z-10 px-4 pt-12 pb-0"
        style={{ background: 'linear-gradient(160deg, #0f0f1a 0%, #1a1035 60%, #1a1035 100%)' }}>

        {/* 星背景 */}
        <div className="absolute inset-0 opacity-40 pointer-events-none"
          style={{ backgroundImage: `radial-gradient(1px 1px at 10% 20%, #a78bfa, transparent), radial-gradient(1.5px 1.5px at 70% 15%, #818cf8, transparent), radial-gradient(1px 1px at 85% 60%, #c4b5fd, transparent), radial-gradient(1px 1px at 35% 75%, #a78bfa, transparent), radial-gradient(1.5px 1.5px at 50% 40%, white, transparent), radial-gradient(1px 1px at 92% 35%, white, transparent)` }} />

        <div className="relative">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-purple-400/60 text-[10px] font-bold tracking-widest uppercase mb-0.5">GAME GUILD</p>
              <h1 className="font-extrabold text-white text-2xl leading-tight">🎮 ギルドを探す</h1>
              <p className="text-white/40 text-xs mt-0.5">ゲーム仲間が集まるギルドに参加しよう</p>
            </div>
            <button
              onClick={() => router.push('/guild/create')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold flex-shrink-0 active:scale-95 transition-all"
              style={{ background: 'rgba(139,92,246,0.25)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.35)' }}
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
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
            />
          </div>

          {/* ジャンルタブ */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 pb-3">
            {GENRE_TABS.map(g => {
              const active  = genre === g.id
              const gInfo   = INDUSTRIES.find(i => i.id === g.id)
              return (
                <button key={g.id}
                  onClick={() => { setGenre(g.id); setSearch(''); setSubFilter(null) }}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95"
                  style={active
                    ? { background: gInfo?.color ?? '#fff', color: '#fff' }
                    : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.10)' }
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

        {/* ══ おすすめレーン ══ */}
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

        {/* ══ メインリスト ══ */}
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
              <div className="text-5xl mb-4">
                {subFilter === 'member' ? '🏠' : '🎮'}
              </div>
              <p className="font-extrabold text-stone-800 text-base mb-1.5">
                {subFilter === 'member' ? 'まだギルドに参加していません' : 'このジャンルのギルドはまだありません'}
              </p>
              <p className="text-sm text-stone-400 mb-6">
                {subFilter === 'member' ? '気に入ったギルドに参加しよう' : '最初のギルドを作ってみましょう'}
              </p>
              {subFilter !== 'member' && (
                <button
                  onClick={() => router.push('/guild/create')}
                  className="px-6 py-3 rounded-2xl text-sm font-bold text-white active:scale-95 transition-all"
                  style={{ background: 'linear-gradient(135deg,#8b5cf6 0%,#6d28d9 100%)', boxShadow: '0 8px 24px rgba(139,92,246,0.4)' }}
                >🎮 ギルドを作る</button>
              )}
            </div>
          ) : (
            <>
              {featured && !search && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-widest">おすすめ · Featured</span>
                    <div className="flex-1 h-px bg-stone-100" />
                  </div>
                  <VillageCard
                    village={featured}
                    isMember={memberIds.has(featured.id)}
                    onJoin={() => handleJoin(featured.id)}
                    featured={true}
                  />
                </div>
              )}

              {(search ? displayed : rest).length > 0 && (
                <>
                  {!search && (
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-widest">
                        {subFilter === 'popular' ? '今週活発'  :
                         subFilter === 'new'     ? '新着'       :
                         subFilter === 'member'  ? '参加中'     :
                         genre !== 'all'         ? `${activeGenre?.label}のギルド` :
                         'その他のギルド'}
                      </span>
                      <div className="flex-1 h-px bg-stone-100" />
                    </div>
                  )}
                  <div className="space-y-3">
                    {(search ? displayed : rest).map(v => (
                      <VillageCard key={v.id}
                        village={v}
                        isMember={memberIds.has(v.id)}
                        onJoin={() => handleJoin(v.id)}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── FAB ── */}
      <button
        onClick={() => router.push('/guild/create')}
        className="fixed right-5 w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl active:scale-90 transition-all z-30"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
          background: 'linear-gradient(135deg,#8b5cf6 0%,#6d28d9 100%)',
          boxShadow: '0 8px 24px rgba(139,92,246,0.5)',
        }}
      >
        <Plus size={22} className="text-white" />
      </button>
    </div>
  )
}

// GENRE_TABS と同じ形式で参照できるよう alias
const GENRES = GENRE_TABS
