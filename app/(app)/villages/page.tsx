'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, ChevronRight } from 'lucide-react'
import VillageCard, { type Village, getCurrentWeeklyEvent, VILLAGE_TYPE_STYLES } from '@/components/ui/VillageCard'
import VillageOnboarding from '@/components/features/VillageOnboarding'
import Link from 'next/link'

const FILTERS = [
  { id: 'all',    label: 'すべて',   labelEn: 'All',     emoji: '🏕️' },
  { id: 'busy',   label: 'にぎやか', labelEn: 'Active',  emoji: '🔥' },
  { id: 'safe',   label: '安心',     labelEn: 'Safe',    emoji: '🕊️' },
  { id: 'new',    label: '新しい村', labelEn: 'New',     emoji: '🌱' },
  { id: 'member', label: '参加中',   labelEn: 'Joined',  emoji: '🏠' },
]

// おすすめレーン定義
const LANES = [
  {
    id: 'hot',
    emoji: '🔥',
    label: '今週活発な村',
    labelEn: 'Most Active This Week',
    orderBy: 'post_count_7d' as const,
    ascending: false,
  },
  {
    id: 'welcome',
    emoji: '🌱',
    label: '新しい仲間を歓迎',
    labelEn: 'Welcoming Villages',
    orderBy: 'welcome_reply_count_7d' as const,
    ascending: false,
  },
  {
    id: 'new',
    emoji: '✨',
    label: '新しくできた村',
    labelEn: 'Newly Created',
    orderBy: 'created_at' as const,
    ascending: false,
  },
]

function SmallVillageCard({
  village, isMember, onJoin,
}: {
  village: Village; isMember: boolean; onJoin: () => void
}) {
  const router  = useRouter()
  const style   = VILLAGE_TYPE_STYLES[village.type] ?? VILLAGE_TYPE_STYLES['雑談']

  return (
    <div
      className="flex-shrink-0 w-44 rounded-2xl overflow-hidden shadow-sm cursor-pointer active:scale-[0.97] transition-all bg-white border border-stone-100"
      onClick={() => router.push(`/villages/${village.id}`)}
    >
      {/* Gradient header */}
      <div className="h-16 flex items-center justify-center relative"
        style={{ background: style.gradient }}>
        <span className="text-3xl" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.2))' }}>
          {village.icon}
        </span>
      </div>

      <div className="p-2.5">
        <p className="font-bold text-stone-900 text-xs truncate leading-snug">{village.name}</p>
        <p className="text-[10px] text-stone-400 mt-0.5 line-clamp-2 leading-relaxed">{village.description}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[9px] text-stone-400">👥 {village.member_count}</span>
          <button
            onClick={e => { e.stopPropagation(); onJoin() }}
            className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white active:scale-90 transition-all"
            style={{ background: isMember ? '#9ca3af' : style.accent }}>
            {isMember ? '参加中' : '参加'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function VillagesPage() {
  const router = useRouter()
  const [villages,   setVillages]   = useState<Village[]>([])
  const [laneData,   setLaneData]   = useState<Record<string, Village[]>>({})
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState('all')
  const [search,     setSearch]     = useState('')
  const [userId,     setUserId]     = useState<string | null>(null)
  const [memberIds,  setMemberIds]  = useState<Set<string>>(new Set())

  const weeklyEvent = getCurrentWeeklyEvent()

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  // おすすめレーンのデータを取得
  const fetchLanes = useCallback(async () => {
    const supabase = createClient()
    const results: Record<string, Village[]> = {}
    await Promise.all(
      LANES.map(async lane => {
        const { data } = await supabase
          .from('villages')
          .select('*')
          .eq('is_public', true)
          .order(lane.orderBy, { ascending: lane.ascending })
          .limit(8)
        results[lane.id] = (data ?? []) as Village[]
      })
    )
    setLaneData(results)
  }, [])

  const fetchVillages = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    let q = supabase.from('villages').select('*').eq('is_public', true)

    if (filter === 'busy')      q = q.order('post_count_7d',    { ascending: false })
    else if (filter === 'safe') q = q.order('report_count_7d',  { ascending: true }).order('member_count', { ascending: false })
    else if (filter === 'new')  q = q.order('created_at',       { ascending: false })
    else                        q = q.order('member_count',     { ascending: false })

    const { data } = await q.limit(30)
    setVillages((data || []) as Village[])
    setLoading(false)
  }, [filter])

  const fetchMemberships = useCallback(async () => {
    if (!userId) return
    const { data } = await createClient()
      .from('village_members').select('village_id').eq('user_id', userId)
    setMemberIds(new Set((data || []).map((m: any) => m.village_id)))
  }, [userId])

  useEffect(() => { fetchVillages() },    [fetchVillages])
  useEffect(() => { fetchMemberships() }, [fetchMemberships])
  useEffect(() => { fetchLanes() },       [fetchLanes])

  async function handleJoin(villageId: string) {
    if (!userId) { router.push('/login'); return }
    const supabase = createClient()
    if (memberIds.has(villageId)) {
      await supabase.from('village_members').delete()
        .eq('village_id', villageId).eq('user_id', userId)
      setMemberIds(prev => { const n = new Set(prev); n.delete(villageId); return n })
    } else {
      await supabase.from('village_members').insert({ village_id: villageId, user_id: userId })
      setMemberIds(prev => new Set([...prev, villageId]))
    }
  }

  const displayed = villages.filter(v => {
    if (filter === 'member') return memberIds.has(v.id)
    if (search) {
      const q = search.toLowerCase()
      return v.name.toLowerCase().includes(q) || v.description.toLowerCase().includes(q)
    }
    return true
  })

  const featured = displayed[0]
  const rest     = displayed.slice(1)
  const showLanes = filter === 'all' && !search

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9]">

      {/* オンボーディングオーバーレイ */}
      {userId && <VillageOnboarding userId={userId} />}

      {/* ── Hero Header ── */}
      <div
        className="relative overflow-hidden px-4 pt-12 pb-5 sticky top-0 z-10"
        style={{ background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)' }}
      >
        <div className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(1px 1px at 20% 30%, white, transparent),
              radial-gradient(1px 1px at 60% 15%, white, transparent),
              radial-gradient(1.5px 1.5px at 80% 55%, white, transparent),
              radial-gradient(1px 1px at 35% 70%, white, transparent),
              radial-gradient(1px 1px at 90% 25%, white, transparent),
              radial-gradient(1px 1px at 50% 85%, white, transparent)`,
          }}
        />

        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-sm">{weeklyEvent.icon}</span>
          <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
            今週：{weeklyEvent.label}
          </span>
        </div>

        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="font-extrabold text-white text-2xl leading-tight mb-0.5">村を探す</h1>
            <p className="text-xs text-white/50">Find your village · 自分に合う場所で話そう</p>
          </div>
          <button
            onClick={() => router.push('/villages/create')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold flex-shrink-0 active:scale-95 transition-all"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
          >
            <Plus size={13} /> 村を作る
          </button>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="村を検索... / Search villages"
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl text-sm focus:outline-none text-white placeholder-white/30"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
          />
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-none bg-white border-b border-stone-100 shadow-sm">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => { setFilter(f.id); setSearch('') }}
            className={`flex-shrink-0 flex flex-col items-center px-3 py-1.5 rounded-2xl text-xs font-bold border transition-all ${
              filter === f.id
                ? 'bg-stone-900 text-white border-stone-900 shadow-md'
                : 'bg-white border-stone-200 text-stone-500'
            }`}
          >
            <span className="text-base leading-none mb-0.5">{f.emoji}</span>
            <span className="text-[10px] font-bold">{f.label}</span>
            <span className={`text-[8px] font-medium ${filter === f.id ? 'text-white/60' : 'text-stone-400'}`}>{f.labelEn}</span>
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="pb-32">

        {/* ══ おすすめレーン（all・非検索時のみ）══ */}
        {showLanes && (
          <div className="pt-4 space-y-5">
            {LANES.map(lane => {
              const items = laneData[lane.id] ?? []
              if (items.length === 0) return null
              return (
                <div key={lane.id}>
                  {/* レーンヘッダー */}
                  <div className="px-4 flex items-center justify-between mb-2.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{lane.emoji}</span>
                        <p className="text-xs font-extrabold text-stone-800">{lane.label}</p>
                      </div>
                      <p className="text-[9px] text-stone-400 ml-6">{lane.labelEn}</p>
                    </div>
                    <button
                      onClick={() => setFilter(lane.id === 'hot' ? 'busy' : lane.id === 'new' ? 'new' : 'all')}
                      className="flex items-center gap-0.5 text-[10px] text-stone-400 font-medium"
                    >
                      すべて <ChevronRight size={11} />
                    </button>
                  </div>

                  {/* 横スクロールカード */}
                  <div className="pl-4 flex gap-3 overflow-x-auto scrollbar-none pr-4">
                    {items.map(v => (
                      <SmallVillageCard
                        key={v.id}
                        village={v}
                        isMember={memberIds.has(v.id)}
                        onJoin={() => handleJoin(v.id)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}

            {/* 区切り */}
            <div className="px-4 flex items-center gap-2 pt-1">
              <div className="flex-1 h-px bg-stone-100" />
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">すべての村</span>
              <div className="flex-1 h-px bg-stone-100" />
            </div>
          </div>
        )}

        {/* ══ メインリスト ══ */}
        <div className="px-4 pt-4">
          {loading ? (
            <div className="space-y-3">
              <div className="bg-white rounded-3xl overflow-hidden shadow-md animate-pulse">
                <div className="h-[120px] bg-stone-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-stone-100 rounded-full w-2/3" />
                  <div className="h-3 bg-stone-100 rounded-full w-full" />
                </div>
              </div>
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-md animate-pulse">
                  <div className="h-24 bg-stone-200" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-stone-100 rounded-full w-2/3" />
                    <div className="h-3 bg-stone-100 rounded-full w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">{filter === 'member' ? '🏠' : '🏕️'}</div>
              <p className="font-extrabold text-stone-800 text-base mb-1">
                {filter === 'member' ? 'まだ村に参加していません' : '村が見つかりません'}
              </p>
              <p className="text-sm text-stone-400 mb-1">
                {filter === 'member' ? 'No villages joined yet' : 'No villages found'}
              </p>
              <p className="text-sm text-stone-400 mb-6">
                {filter === 'member' ? '気に入った村に参加しよう' : '最初の村を作ってみましょう'}
              </p>
              {filter !== 'member' && (
                <button
                  onClick={() => router.push('/villages/create')}
                  className="px-6 py-3 bg-stone-900 text-white rounded-2xl text-sm font-bold shadow-md active:scale-95 transition-all"
                >
                  🏕️ 村を作る
                </button>
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
                        {filter === 'all'    ? 'その他の村 · More'          :
                         filter === 'busy'   ? '今週活発 · Most Active'     :
                         filter === 'safe'   ? '安心の村 · Safe Spaces'     :
                         filter === 'new'    ? '新しい村 · New Villages'    :
                         '参加中 · Joined'}
                      </span>
                      <div className="flex-1 h-px bg-stone-100" />
                    </div>
                  )}
                  <div className="space-y-3">
                    {(search ? displayed : rest).map(v => (
                      <VillageCard
                        key={v.id}
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
        onClick={() => router.push('/villages/create')}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl active:scale-90 transition-all z-30"
        style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}
      >
        <Plus size={22} className="text-white" />
      </button>
    </div>
  )
}
