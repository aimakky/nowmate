'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search } from 'lucide-react'
import VillageCard, { type Village, getCurrentWeeklyEvent, VILLAGE_TYPE_STYLES } from '@/components/ui/VillageCard'

const FILTERS = [
  { id: 'all',    label: 'すべて',   emoji: '🏕️' },
  { id: 'busy',   label: 'にぎやか', emoji: '🔥' },
  { id: 'safe',   label: '安心',     emoji: '🕊️' },
  { id: 'new',    label: '新しい村', emoji: '🌱' },
  { id: 'member', label: '参加中',   emoji: '🏠' },
]

export default function VillagesPage() {
  const router = useRouter()
  const [villages, setVillages]   = useState<Village[]>([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('all')
  const [search, setSearch]       = useState('')
  const [userId, setUserId]       = useState<string | null>(null)
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set())

  const weeklyEvent = getCurrentWeeklyEvent()

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  const fetchVillages = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    let q = supabase.from('villages').select('*').eq('is_public', true)

    if (filter === 'busy')      q = q.order('post_count_7d', { ascending: false })
    else if (filter === 'safe') q = q.order('report_count_7d', { ascending: true }).order('member_count', { ascending: false })
    else if (filter === 'new')  q = q.order('created_at', { ascending: false })
    else                        q = q.order('member_count', { ascending: false })

    const { data } = await q.limit(30)
    setVillages((data || []) as Village[])
    setLoading(false)
  }, [filter])

  const fetchMemberships = useCallback(async () => {
    if (!userId) return
    const { data } = await createClient()
      .from('village_members')
      .select('village_id')
      .eq('user_id', userId)
    setMemberIds(new Set((data || []).map((m: any) => m.village_id)))
  }, [userId])

  useEffect(() => { fetchVillages() },    [fetchVillages])
  useEffect(() => { fetchMemberships() }, [fetchMemberships])

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

  const featured   = displayed[0]
  const rest       = displayed.slice(1)

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9]">

      {/* ── Hero Header ── */}
      <div
        className="relative overflow-hidden px-4 pt-12 pb-5 sticky top-0 z-10"
        style={{ background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)' }}
      >
        {/* Stars background */}
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

        {/* Weekly event badge */}
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-sm">{weeklyEvent.icon}</span>
          <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
            今週のイベント：{weeklyEvent.label}
          </span>
        </div>

        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="font-extrabold text-white text-2xl leading-tight mb-0.5">村を探す</h1>
            <p className="text-xs text-white/50">自分に合う村で話そう</p>
          </div>
          <button
            onClick={() => router.push('/villages/create')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold flex-shrink-0 active:scale-95 transition-all"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
          >
            <Plus size={13} /> 村を作る
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="村を検索..."
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
            className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              filter === f.id
                ? 'bg-stone-900 text-white border-stone-900 shadow-md'
                : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300'
            }`}
          >
            <span>{f.emoji}</span> {f.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="px-4 pt-4 pb-32">

        {loading ? (
          <div className="space-y-3">
            {/* Featured skeleton */}
            <div className="bg-white rounded-3xl overflow-hidden shadow-md animate-pulse">
              <div className="h-[120px] bg-stone-200" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-stone-100 rounded-full w-2/3" />
                <div className="h-3 bg-stone-100 rounded-full w-full" />
                <div className="h-3 bg-stone-100 rounded-full w-4/5" />
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
            <div className="text-6xl mb-4">
              {filter === 'member' ? '🏠' : '🏕️'}
            </div>
            <p className="font-extrabold text-stone-800 text-base mb-1.5">
              {filter === 'member' ? 'まだ村に参加していません' : '村が見つかりません'}
            </p>
            <p className="text-sm text-stone-400 mb-6">
              {filter === 'member'
                ? '気に入った村に「参加する」を押してみましょう'
                : '最初の村を作ってみましょう'}
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
            {/* ── Featured (first village) ── */}
            {featured && !search && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-widest">おすすめの村</span>
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

            {/* ── Rest ── */}
            {(search ? displayed : rest).length > 0 && (
              <>
                {!search && (
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-widest">
                      {filter === 'all'    ? 'その他の村'    :
                       filter === 'busy'   ? '今にぎわっている村' :
                       filter === 'safe'   ? '安心して話せる村'   :
                       filter === 'new'    ? '新しくできた村'     :
                       '参加中の村'}
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
