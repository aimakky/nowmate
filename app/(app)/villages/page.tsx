'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, Compass } from 'lucide-react'
import Header from '@/components/layout/Header'
import VillageCard, { type Village } from '@/components/ui/VillageCard'

const FILTERS = [
  { id: 'all',    label: 'すべて',    emoji: '🏕️' },
  { id: 'busy',   label: 'にぎやか',  emoji: '🔥' },
  { id: 'safe',   label: '安心',      emoji: '🕊️' },
  { id: 'new',    label: '新しい村',  emoji: '🌱' },
  { id: 'member', label: '参加中',    emoji: '🏠' },
]

const SECTION_HEADERS = [
  { filter: 'all',    title: 'あなたに合いそうな村',    sub: 'にぎわっている順に表示しています' },
  { filter: 'busy',   title: '今にぎわっている村',       sub: '今週の投稿が多い村です' },
  { filter: 'safe',   title: '安心して話せる村',         sub: '安全・安心な交流が続いています' },
  { filter: 'new',    title: '新しくできた村',           sub: '最近誕生した村を探してみましょう' },
  { filter: 'member', title: '参加中の村',               sub: 'あなたが住民の村です' },
]

export default function VillagesPage() {
  const router = useRouter()
  const [villages, setVillages]   = useState<Village[]>([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('all')
  const [search, setSearch]       = useState('')
  const [userId, setUserId]       = useState<string | null>(null)
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set())

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

  useEffect(() => { fetchVillages() }, [fetchVillages])
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

  const sectionInfo = SECTION_HEADERS.find(s => s.filter === filter)!

  const displayed = villages.filter(v => {
    if (filter === 'member') return memberIds.has(v.id)
    if (search) {
      const q = search.toLowerCase()
      return v.name.toLowerCase().includes(q) || v.description.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9]">
      {/* ── Custom Header ── */}
      <div className="bg-white border-b border-stone-100 px-4 pt-5 pb-3 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-extrabold text-stone-900 text-lg leading-tight">村を探す</h1>
            <p className="text-xs text-stone-400">自分に合う村を見つけよう</p>
          </div>
          <button
            onClick={() => router.push('/villages/create')}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-500 text-white rounded-xl text-xs font-bold shadow-sm shadow-brand-200 active:scale-95 transition-all"
          >
            <Plus size={14} /> 村を作る
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="村を検索..."
            className="w-full pl-9 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-sm focus:outline-none focus:border-brand-400 focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="px-4 pt-3 pb-2 flex gap-2 overflow-x-auto scrollbar-none">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => { setFilter(f.id); setSearch('') }}
            className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              filter === f.id
                ? 'bg-brand-500 text-white border-brand-500 shadow-sm shadow-brand-200'
                : 'bg-white border-stone-200 text-stone-500'
            }`}
          >
            <span>{f.emoji}</span> {f.label}
          </button>
        ))}
      </div>

      {/* ── Section title ── */}
      {!search && (
        <div className="px-4 pt-1 pb-3">
          <p className="font-bold text-stone-800 text-sm">{sectionInfo.title}</p>
          <p className="text-[11px] text-stone-400">{sectionInfo.sub}</p>
        </div>
      )}

      {/* ── Village list ── */}
      <div className="px-4 pb-32 space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-stone-100 h-56 animate-pulse" />
          ))
        ) : displayed.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">
              {filter === 'member' ? '🏠' : '🏕️'}
            </div>
            <p className="font-bold text-stone-700">
              {filter === 'member' ? 'まだ村に参加していません' : '村が見つかりません'}
            </p>
            <p className="text-sm text-stone-400 mt-1.5 mb-5">
              {filter === 'member'
                ? '気に入った村に「参加する」を押してみましょう'
                : '最初の村を作ってみましょう'}
            </p>
            {filter !== 'member' && (
              <button
                onClick={() => router.push('/villages/create')}
                className="px-5 py-2.5 bg-brand-500 text-white rounded-2xl text-sm font-bold shadow-sm active:scale-95 transition-all"
              >
                🏕️ 村を作る
              </button>
            )}
          </div>
        ) : (
          displayed.map(v => (
            <VillageCard
              key={v.id}
              village={v}
              isMember={memberIds.has(v.id)}
              onJoin={() => handleJoin(v.id)}
            />
          ))
        )}
      </div>

      {/* ── FAB ── */}
      <button
        onClick={() => router.push('/villages/create')}
        className="fixed bottom-24 right-5 w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center shadow-xl shadow-brand-200 hover:bg-brand-600 active:scale-90 transition-all z-30"
      >
        <Plus size={22} className="text-white" />
      </button>
    </div>
  )
}
