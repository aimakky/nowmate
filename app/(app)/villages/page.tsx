'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, ChevronRight } from 'lucide-react'
import VillageCard, { type Village, getCurrentWeeklyEvent, VILLAGE_TYPE_STYLES, getFireStatus } from '@/components/ui/VillageCard'
import VillageOnboarding from '@/components/features/VillageOnboarding'
import TonightInput from '@/components/features/TonightInput'
import Link from 'next/link'

// ── カテゴリ定義（精神年齢フィルター設計済み） ────────────────
const CATEGORIES = [
  {
    id:      'all',
    emoji:   '🏕️',
    label:   'すべて',
    labelEn: 'All',
    desc:    null,
  },
  {
    id:      'start',
    emoji:   '🌱',
    label:   'はじまりの人へ',
    labelEn: 'New Chapter',
    desc:    '転職・引越・新生活・一人暮らし',
  },
  {
    id:      'work',
    emoji:   '💼',
    label:   '仕事のリアル',
    labelEn: 'Work & Career',
    desc:    '社会人・副業・キャリア・職場の悩み',
  },
  {
    id:      'think',
    emoji:   '🧠',
    label:   '考えを深めたい',
    labelEn: 'Think Deeper',
    desc:    '読書・思考整理・自己分析・議論',
  },
  {
    id:      'help',
    emoji:   '🤝',
    label:   '誰かの役に立てる',
    labelEn: 'Be Helpful',
    desc:    '相談に乗る・経験をシェアする',
  },
  {
    id:      'life',
    emoji:   '🌍',
    label:   '地に足つけて生きる',
    labelEn: 'Everyday Life',
    desc:    'お金・健康・人間関係・暮らし',
  },
  {
    id:      'tonight',
    emoji:   '🌙',
    label:   '今日を終わらせたい',
    labelEn: 'End of Day',
    desc:    '仕事後・ゆるい雑談・ただ聞いてほしい',
  },
]

// ── サブフィルター定義 ─────────────────────────────────────────
const SUB_FILTERS = [
  { id: 'popular', label: 'にぎやか',  emoji: '🔥' },
  { id: 'safe',    label: '安心',      emoji: '🕊️' },
  { id: 'new',     label: '新着',      emoji: '✨' },
  { id: 'member',  label: '参加中',    emoji: '🏠' },
]

// おすすめレーン（全件表示時のみ）
const LANES = [
  { id: 'hot',     emoji: '🔥', label: '今週活発な村',    orderBy: 'post_count_7d'          as const, ascending: false },
  { id: 'welcome', emoji: '🌱', label: '新しい仲間を歓迎', orderBy: 'welcome_reply_count_7d' as const, ascending: false },
  { id: 'new',     emoji: '✨', label: '新しくできた村',   orderBy: 'created_at'             as const, ascending: false },
]

function SmallVillageCard({ village, isMember, onJoin }: {
  village: Village; isMember: boolean; onJoin: () => void
}) {
  const router = useRouter()
  const style  = VILLAGE_TYPE_STYLES[village.type] ?? VILLAGE_TYPE_STYLES['雑談']
  const fire   = getFireStatus(village.last_post_at ?? null)
  return (
    <div
      className="flex-shrink-0 w-44 rounded-2xl overflow-hidden shadow-sm cursor-pointer active:scale-[0.97] transition-all bg-white border border-stone-100"
      onClick={() => router.push(`/villages/${village.id}`)}
    >
      <div className="h-16 flex items-center justify-center relative" style={{ background: style.gradient }}>
        <span className="text-3xl" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.2))' }}>
          {village.icon}
        </span>
        {/* 焚き火バッジ */}
        <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 bg-black/30 backdrop-blur-sm rounded-full px-1.5 py-0.5">
          <span className={`text-[10px] ${fire.animate ? 'animate-pulse' : ''}`}>{fire.emoji}</span>
          <span className="text-[8px] font-bold text-white/90">{fire.label}</span>
        </div>
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
  const [villages,      setVillages]      = useState<Village[]>([])
  const [laneData,      setLaneData]      = useState<Record<string, Village[]>>({})
  const [loading,       setLoading]       = useState(true)
  const [category,      setCategory]      = useState('all')
  const [subFilter,     setSubFilter]     = useState<string | null>(null)
  const [search,        setSearch]        = useState('')
  const [userId,        setUserId]        = useState<string | null>(null)
  const [memberIds,     setMemberIds]     = useState<Set<string>>(new Set())
  const [myVillages,    setMyVillages]    = useState<Village[]>([])
  const [unreadCounts,  setUnreadCounts]  = useState<Record<string, number>>({})
  const [jobVillages,   setJobVillages]   = useState<Village[]>([])

  const weeklyEvent = getCurrentWeeklyEvent()

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
        .order(lane.orderBy, { ascending: lane.ascending }).limit(8)
      results[lane.id] = (data ?? []) as Village[]
    }))
    setLaneData(results)
  }, [])

  const fetchVillages = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    let q = supabase.from('villages').select('*').eq('is_public', true)

    // カテゴリフィルター
    if (category !== 'all') q = q.eq('category', category)

    // サブフィルター
    if (subFilter === 'popular') q = q.order('post_count_7d',   { ascending: false })
    else if (subFilter === 'safe')   q = q.order('report_count_7d', { ascending: true }).order('member_count', { ascending: false })
    else if (subFilter === 'new')    q = q.order('created_at',      { ascending: false })
    else                             q = q.order('member_count',    { ascending: false })

    const { data } = await q.limit(40)
    setVillages((data || []) as Village[])
    setLoading(false)
  }, [category, subFilter])

  const fetchMemberships = useCallback(async () => {
    if (!userId) return
    const supabase = createClient()
    const { data } = await supabase
      .from('village_members')
      .select('village_id, villages(*)')
      .eq('user_id', userId)
    const joined = (data || []).map((m: any) => m.villages).filter(Boolean) as Village[]
    setMyVillages(joined)
    setMemberIds(new Set(joined.map(v => v.id)))

    // 職業限定村を優先表示
    const jobV = joined.filter((v: any) => v.job_locked)
    setJobVillages(jobV)

    // 未読件数計算（lastVisit_villages基準）
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const lastVisit = localStorage.getItem('lastVisit_villages') || since24h
    const counts: Record<string, number> = {}
    await Promise.all(joined.map(async (v: any) => {
      const { count } = await supabase
        .from('village_posts')
        .select('*', { count: 'exact', head: true })
        .eq('village_id', v.id)
        .gte('created_at', lastVisit)
        .neq('user_id', userId)
      counts[v.id] = count ?? 0
    }))
    setUnreadCounts(counts)
  }, [userId])

  useEffect(() => { fetchVillages() },    [fetchVillages])
  useEffect(() => { fetchMemberships() }, [fetchMemberships])
  useEffect(() => { if (category === 'all' && !subFilter) fetchLanes() }, [fetchLanes, category, subFilter])

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

  // 表示する村リスト（サブフィルター: 参加中 + 検索）
  const displayed = villages.filter(v => {
    if (subFilter === 'member') return memberIds.has(v.id)
    if (search) {
      const q = search.toLowerCase()
      return v.name.toLowerCase().includes(q) || v.description.toLowerCase().includes(q)
    }
    return true
  })

  const featured  = displayed[0]
  const rest      = displayed.slice(1)
  const showLanes = category === 'all' && !subFilter && !search
  const activeCat = CATEGORIES.find(c => c.id === category)

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9]">

      {userId && <VillageOnboarding userId={userId} />}

      {/* ── Hero Header ── */}
      <div
        className="relative overflow-hidden px-4 pt-12 pb-4 sticky top-0 z-10"
        style={{ background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)' }}
      >
        <div className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(1px 1px at 20% 30%, white, transparent),
              radial-gradient(1px 1px at 60% 15%, white, transparent),
              radial-gradient(1.5px 1.5px at 80% 55%, white, transparent),
              radial-gradient(1px 1px at 35% 70%, white, transparent),
              radial-gradient(1px 1px at 90% 25%, white, transparent)`,
          }}
        />

        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-sm">{weeklyEvent.icon}</span>
          <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
            今週：{weeklyEvent.label}
          </span>
        </div>

        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h1 className="font-extrabold text-white text-2xl leading-tight mb-0.5">村を探す</h1>
            <p className="text-xs text-white/50">自分に合う場所で、何かを増やそう</p>
          </div>
          <button
            onClick={() => router.push('/villages/create')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold flex-shrink-0 active:scale-95 transition-all"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
          >
            <Plus size={13} /> 村を作る
          </button>
        </div>

        {/* 検索 */}
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="村を検索..."
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl text-sm focus:outline-none text-white placeholder-white/30"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
          />
        </div>

        {/* ── カテゴリタブ（横スクロール）── */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1">
          {CATEGORIES.map(cat => {
            const active = category === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => { setCategory(cat.id); setSearch(''); setSubFilter(null) }}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold transition-all active:scale-95"
                style={active
                  ? { background: 'rgba(255,255,255,0.95)', color: '#1c1917' }
                  : { background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)' }
                }
              >
                <span className="text-sm">{cat.emoji}</span>
                <span className="whitespace-nowrap">{cat.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── カテゴリ説明 + サブフィルター ── */}
      <div className="bg-white border-b border-stone-100 shadow-sm">
        {activeCat?.desc && category !== 'all' && (
          <div className="px-4 pt-3 pb-1">
            <p className="text-[11px] text-stone-400 leading-relaxed">
              {activeCat.emoji} {activeCat.desc}
            </p>
          </div>
        )}
        <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-none">
          {SUB_FILTERS.map(sf => (
            <button
              key={sf.id}
              onClick={() => setSubFilter(prev => prev === sf.id ? null : sf.id)}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-xl text-[11px] font-bold border transition-all"
              style={subFilter === sf.id
                ? { background: '#1c1917', color: '#fff', borderColor: '#1c1917' }
                : { background: '#fafaf9', color: '#78716c', borderColor: '#e7e5e4' }
              }
            >
              <span>{sf.emoji}</span>
              <span>{sf.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── 未読バナー ── */}
      {(() => {
        const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)
        if (totalUnread === 0) return null
        return (
          <div className="px-4 pt-3">
            <button
              onClick={() => setSubFilter('member')}
              className="w-full flex items-center gap-3 bg-brand-50 border border-brand-200 rounded-2xl px-4 py-3 active:scale-[0.99] transition-all"
            >
              <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse flex-shrink-0" />
              <p className="text-sm font-bold text-brand-700 flex-1 text-left">
                参加中の村に{totalUnread}件の新着があります
              </p>
              <span className="text-[10px] font-bold text-brand-500">見る →</span>
            </button>
          </div>
        )
      })()}

      {/* ── 今夜の一言 ── */}
      <div className="pt-3">
        <TonightInput userId={userId} />
      </div>

      {/* ── Content ── */}
      <div className="pb-32">

        {/* ══ 職業限定村（参加中かつ全表示時）══ */}
        {showLanes && jobVillages.length > 0 && (
          <div className="pt-4 px-4">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-base">💼</span>
              <p className="text-xs font-extrabold text-stone-800">あなたの職業村</p>
            </div>
            <div className="space-y-2">
              {jobVillages.map((v: any) => {
                const unread = unreadCounts[v.id] ?? 0
                const fire   = getFireStatus(v.last_post_at ?? null)
                return (
                  <button key={v.id}
                    onClick={() => router.push(`/villages/${v.id}`)}
                    className="w-full flex items-center gap-3 bg-white border border-indigo-100 rounded-2xl px-4 py-3.5 shadow-sm active:scale-[0.99] transition-all text-left"
                    style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #ffffff 100%)' }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}>
                      {v.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-extrabold text-stone-900 truncate">{v.name}</p>
                        {unread > 0 && (
                          <span className="flex-shrink-0 w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white">
                            {unread > 9 ? '9+' : unread}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-indigo-500 font-bold">
                          {v.job_type}限定 · 👥 {v.member_count}人
                        </p>
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                          style={{ background: fire.bgColor, color: fire.textColor }}
                        >
                          <span className={fire.animate ? 'animate-pulse' : ''}>{fire.emoji}</span>
                          {fire.label}
                        </span>
                      </div>
                    </div>
                    <span className="text-stone-300 text-sm flex-shrink-0">›</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ══ おすすめレーン（all・サブフィルターなし・非検索時）══ */}
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
                      onClick={() => setSubFilter(lane.id === 'hot' ? 'popular' : lane.id === 'new' ? 'new' : null)}
                      className="flex items-center gap-0.5 text-[10px] text-stone-400 font-medium"
                    >
                      すべて <ChevronRight size={11} />
                    </button>
                  </div>
                  <div className="pl-4 flex gap-3 overflow-x-auto scrollbar-none pr-4">
                    {items.map(v => (
                      <SmallVillageCard
                        key={v.id} village={v}
                        isMember={memberIds.has(v.id)}
                        onJoin={() => handleJoin(v.id)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}

            <div className="px-4 flex items-center gap-2 pt-1">
              <div className="flex-1 h-px bg-stone-100" />
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">すべての村</span>
              <div className="flex-1 h-px bg-stone-100" />
            </div>
          </div>
        )}

        {/* ══ カテゴリ選択時のヘッダー ══ */}
        {category !== 'all' && !search && (
          <div className="px-4 pt-5 pb-2 flex items-center gap-2">
            <span className="text-2xl">{activeCat?.emoji}</span>
            <div>
              <p className="text-sm font-extrabold text-stone-800">{activeCat?.label}</p>
              <p className="text-[10px] text-stone-400">{activeCat?.labelEn}</p>
            </div>
          </div>
        )}

        {/* ══ メインリスト ══ */}
        <div className="px-4 pt-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-md animate-pulse">
                  <div className={`${i === 0 ? 'h-[120px]' : 'h-24'} bg-stone-200`} />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-stone-100 rounded-full w-2/3" />
                    <div className="h-3 bg-stone-100 rounded-full w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">{subFilter === 'member' ? '🏠' : activeCat?.emoji ?? '🏕️'}</div>
              <p className="font-extrabold text-stone-800 text-base mb-1">
                {subFilter === 'member' ? 'まだ村に参加していません' : 'この村はまだありません'}
              </p>
              <p className="text-sm text-stone-400 mb-6">
                {subFilter === 'member' ? '気に入った村に参加しよう' : '最初の村を作ってみましょう'}
              </p>
              {subFilter !== 'member' && (
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
                        {subFilter === 'popular' ? '今週活発 · Most Active'   :
                         subFilter === 'safe'    ? '安心の村 · Safe Spaces'   :
                         subFilter === 'new'     ? '新着 · New Villages'      :
                         subFilter === 'member'  ? '参加中 · Joined'          :
                         category !== 'all'      ? `${activeCat?.label}の村`  :
                         'その他の村 · More'}
                      </span>
                      <div className="flex-1 h-px bg-stone-100" />
                    </div>
                  )}
                  <div className="space-y-3">
                    {(search ? displayed : rest).map(v => (
                      <VillageCard
                        key={v.id} village={v}
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
