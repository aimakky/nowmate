'use client'
// v2
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, ChevronRight, Moon, Mic, MicOff, X, Check } from 'lucide-react'
import { INDUSTRIES } from '@/lib/guild'
import VillageCard, { type Village, VILLAGE_TYPE_STYLES, getFireStatus } from '@/components/ui/VillageCard'
import GuildHeroGamepad from '@/components/ui/icons/GuildHeroGamepad'
import GuildShieldIcon from '@/components/ui/icons/GuildShieldIcon'
import GuildsContent from '@/components/features/GuildsContent'

// 上部タブの高さ（いますぐ村 / ギルド の切替バー）
const TOP_TAB_HEIGHT = 44

// ── 型定義 ──────────────────────────────────────────────────────
type TonightSlot = {
  id: string
  user_id: string
  game: string
  time_slot: string
  skill_level: string
  has_voice: boolean
  note: string | null
  created_at: string
  profiles: { display_name: string; avatar_url: string | null } | null
}

const TIME_SLOTS = ['19-21時', '20-22時', '21-23時', '22-24時', '23時〜']
const SKILL_LEVELS = ['問わない', 'ビギナー', '中級', '上級']

// ── ゲームジャンルカテゴリ ──────────────────────────────────────
const GENRE_TABS = [
  { id: 'all', emoji: '', label: 'すべて' },
  ...INDUSTRIES.map(i => ({ id: i.id, emoji: i.emoji, label: i.id, color: i.color })),
]

const SUB_FILTERS = [
  { id: 'popular', label: 'にぎやか', emoji: '🔥' },
  { id: 'new',     label: '新着',     emoji: '✨' },
  { id: 'member',  label: '参加中',   emoji: '🏠' },
]

const LANES = [
  { id: 'hot',  emoji: '🔥', label: '今週にぎわってるゲーム村',  orderBy: 'post_count_7d' as const, ascending: false },
  { id: 'new',  emoji: '✨', label: '新しいゲーム村',      orderBy: 'created_at'    as const, ascending: false },
]

// ゲーム関連カテゴリ（villagesテーブルで使用）
const GAME_CATEGORIES = INDUSTRIES.map(i => i.id)

// GENRE_TABS alias（コンポーネント内で使用）
const GENRES = GENRE_TABS

// ── スモールカード ──────────────────────────────────────────────
function GuildSmallCard({ village, isMember, onJoin }: {
  village: Village; isMember: boolean; onJoin: () => void
}) {
  const router  = useRouter()
  const genre   = INDUSTRIES.find(i => i.id === village.category) ?? null
  const fire    = getFireStatus(village.last_post_at ?? null)
  return (
    <div
      className="flex-shrink-0 w-44 rounded-2xl overflow-hidden cursor-pointer active:scale-[0.97] transition-all"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(139,92,246,0.2)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
      onClick={() => router.push(`/villages/${village.id}`)}
    >
      {genre && <div className="h-[3px]" style={{ background: genre.gradient }} />}
      <div className="h-16 flex items-center justify-center relative"
        style={{ background: genre ? `${genre.color}18` : 'rgba(139,92,246,0.08)' }}>
        <span className="text-3xl" style={{ filter: 'drop-shadow(0 2px 8px rgba(139,92,246,0.4))' }}>
          {village.icon}
        </span>
        <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded-full px-1.5 py-0.5"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <span className={`text-[10px] ${fire.animate ? 'animate-pulse' : ''}`}>{fire.emoji}</span>
          <span className="text-[8px] font-bold text-white">{fire.label}</span>
        </div>
      </div>
      <div className="p-2.5">
        <p className="font-bold text-xs truncate leading-snug mb-0.5" style={{ color: '#F0EEFF' }}>{village.name}</p>
        <p className="text-[10px] line-clamp-2 leading-relaxed" style={{ color: 'rgba(240,238,255,0.4)' }}>{village.description}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[9px]" style={{ color: 'rgba(240,238,255,0.35)' }}>👥 {village.member_count}</span>
          <button
            onClick={e => { e.stopPropagation(); onJoin() }}
            className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white active:scale-90 transition-all"
            style={{ background: isMember ? 'rgba(139,92,246,0.3)' : (genre?.color ?? '#8B5CF6') }}
          >{isMember ? '参加中' : '参加'}</button>
        </div>
      </div>
    </div>
  )
}

// ── メインページ ────────────────────────────────────────────────
export default function GuildPage() {
  const router = useRouter()
  // 上部タブ: いますぐ村 / ギルド を 1 ページ内で切り替える
  const [topTab, setTopTab] = useState<'instant' | 'guild'>('instant')

  // URL ?tab=guild が来た場合（旧 /guilds 互換 or 内部リンク）はギルド側を初期表示。
  // SSR 時に useSearchParams() を使うと Suspense 境界が必要になり build エラーに
  // なるため、mount 後に window.location から拾うシンプルな方式に切替えた。
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('tab') === 'guild') setTopTab('guild')
  }, [])
  const [villages,      setVillages]      = useState<Village[]>([])
  const [laneData,      setLaneData]      = useState<Record<string, Village[]>>({})
  const [loading,       setLoading]       = useState(true)
  const [genre,         setGenre]         = useState('all')
  const [subFilter,     setSubFilter]     = useState<string | null>(null)
  const [search,        setSearch]        = useState('')
  const [userId,        setUserId]        = useState<string | null>(null)
  const [memberIds,     setMemberIds]     = useState<Set<string>>(new Set())

  // 今夜マッチング state
  const [tonightSlots,  setTonightSlots]  = useState<TonightSlot[]>([])
  const [mySlot,        setMySlot]        = useState<TonightSlot | null>(null)
  const [showForm,      setShowForm]      = useState(false)
  const [tGame,         setTGame]         = useState('')
  const [tTimeSlot,     setTTimeSlot]     = useState('21-23時')
  const [tSkill,        setTSkill]        = useState('問わない')
  const [tVoice,        setTVoice]        = useState(true)
  const [tNote,         setTNote]         = useState('')
  const [tSaving,       setTSaving]       = useState(false)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  // 今夜スロット取得
  const fetchTonightSlots = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('tonight_slots')
      .select('*, profiles(display_name, avatar_url)')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(20)
    setTonightSlots((data ?? []) as TonightSlot[])
  }, [])

  // 自分のスロット取得
  const fetchMySlot = useCallback(async () => {
    if (!userId) return
    const supabase = createClient()
    const { data } = await supabase
      .from('tonight_slots')
      .select('*, profiles(display_name, avatar_url)')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()
    setMySlot(data as TonightSlot | null)
  }, [userId])

  useEffect(() => { fetchTonightSlots() }, [fetchTonightSlots])
  useEffect(() => { fetchMySlot() }, [fetchMySlot])

  // 今夜登録
  async function handleTonightRegister() {
    if (!userId || !tGame.trim() || tSaving) return
    setTSaving(true)
    const supabase = createClient()
    // upsert（1ユーザー1スロット）
    await supabase.from('tonight_slots').upsert({
      user_id:     userId,
      game:        tGame.trim(),
      time_slot:   tTimeSlot,
      skill_level: tSkill,
      has_voice:   tVoice,
      note:        tNote.trim() || null,
      expires_at:  new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: 'user_id' })
    await Promise.all([fetchTonightSlots(), fetchMySlot()])
    setShowForm(false)
    setTGame('')
    setTNote('')
    setTSaving(false)
  }

  // 今夜登録解除
  async function handleTonightCancel() {
    if (!userId) return
    const supabase = createClient()
    await supabase.from('tonight_slots').delete().eq('user_id', userId)
    setMySlot(null)
    setTonightSlots(prev => prev.filter(s => s.user_id !== userId))
  }

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
    <div className="max-w-md mx-auto min-h-screen" style={{ background: '#080812' }}>

      {/* ── 上部タブ：いますぐ村 / ギルド ── */}
      <div
        className="sticky top-0 z-30 flex"
        style={{
          height: TOP_TAB_HEIGHT,
          background: 'rgba(8,8,18,0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <button
          onClick={() => setTopTab('instant')}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-extrabold transition-all relative"
          style={{ color: topTab === 'instant' ? '#c4b5fd' : 'rgba(240,238,255,0.45)' }}
        >
          <GuildHeroGamepad size={14} />
          いますぐ村
          {topTab === 'instant' && (
            <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full"
              style={{ background: '#8B5CF6', boxShadow: '0 0 8px rgba(139,92,246,0.7)' }} />
          )}
        </button>
        <button
          onClick={() => setTopTab('guild')}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-extrabold transition-all relative"
          style={{ color: topTab === 'guild' ? '#27DFFF' : 'rgba(240,238,255,0.45)' }}
        >
          <GuildShieldIcon size={14} active={topTab === 'guild'} />
          ギルド
          {topTab === 'guild' && (
            <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full"
              style={{ background: '#27DFFF', boxShadow: '0 0 8px rgba(39,223,255,0.7)' }} />
          )}
        </button>
      </div>

      {/* ── ギルドタブ（旧 /guilds の中身） ── */}
      {topTab === 'guild' && (
        <GuildsContent embedded headerTopOffset={TOP_TAB_HEIGHT} />
      )}

      {/* ── いますぐ村タブ（既存コンテンツ）以下、topTab === 'instant' のときのみ表示 ── */}
      {topTab === 'instant' && (
      <>
      {/* ── ヘッダー ── */}
      <div className="sticky z-10 px-4 pt-12 pb-0"
        style={{ top: TOP_TAB_HEIGHT, background: 'linear-gradient(160deg, #0f0f1a 0%, #1a1035 60%, #1a1035 100%)' }}>

        {/* 星背景 */}
        <div className="absolute inset-0 opacity-40 pointer-events-none"
          style={{ backgroundImage: `radial-gradient(1px 1px at 10% 20%, #a78bfa, transparent), radial-gradient(1.5px 1.5px at 70% 15%, #818cf8, transparent), radial-gradient(1px 1px at 85% 60%, #c4b5fd, transparent), radial-gradient(1px 1px at 35% 75%, #a78bfa, transparent), radial-gradient(1.5px 1.5px at 50% 40%, white, transparent), radial-gradient(1px 1px at 92% 35%, white, transparent)` }} />

        <div className="relative">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase mb-0.5 text-purple-400/60">GAME ROOM</p>
              <h1 className="font-extrabold text-white text-2xl leading-tight flex items-center gap-2">
                <GuildHeroGamepad size={28} />
                今すぐ一緒に遊ぶ人を探そう
              </h1>
              <p className="text-white/45 text-xs mt-1 leading-relaxed">
                通話ルームを開いて仲間を募集する場所
              </p>
            </div>
            {/* 旧 "+ 作る" 右上ボタンは右下 FAB と重複していたため削除し、作成導線を 1 つに統一した */}
          </div>

          {/* 検索 */}
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ゲーム村を検索..."
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
                    ? { background: '#8B5CF6', color: '#fff', boxShadow: '0 0 12px rgba(139,92,246,0.5)' }
                    : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.10)' }
                  }
                >
                  {g.emoji && <span>{g.emoji}</span>}
                  <span className="whitespace-nowrap">{g.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── サブフィルター ── */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-none" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(139,92,246,0.1)' }}>
        {SUB_FILTERS.map(sf => {
          const ACTIVE_STYLES: Record<string, React.CSSProperties> = {
            popular: { background: 'rgba(251,146,60,0.2)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.4)' },
            new:     { background: 'rgba(255,182,217,0.22)', color: '#ffb6d9', border: '1px solid rgba(255,182,217,0.45)' },
            member:  { background: 'rgba(73,225,255,0.15)', color: '#49E1FF', border: '1px solid rgba(73,225,255,0.35)' },
          }
          const INACTIVE: React.CSSProperties = { background: 'rgba(255,255,255,0.06)', color: 'rgba(240,238,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }
          return (
            <button key={sf.id}
              onClick={() => setSubFilter(prev => prev === sf.id ? null : sf.id)}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold transition-all"
              style={subFilter === sf.id ? ACTIVE_STYLES[sf.id] : INACTIVE}>
              <span>{sf.emoji}</span><span>{sf.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── コンテンツ ── */}
      <div className="pb-32">

        {/* ══ 今夜マッチング ══ */}
        {showLanes && (
          <div className="px-4 pt-4 pb-2">
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'linear-gradient(135deg,rgba(26,16,53,0.95),rgba(26,16,53,0.95))', border: '1px solid rgba(139,92,246,0.25)', boxShadow: '0 4px 24px rgba(139,92,246,0.1)' }}>

              {/* ヘッダー */}
              <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
                <div className="flex items-center gap-2">
                  <Moon size={15} style={{ color: '#a78bfa' }} />
                  <span className="text-sm font-extrabold text-white">今夜あそぶ人を探す</span>
                  {tonightSlots.length > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.25)' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {tonightSlots.length}人待機中
                    </span>
                  )}
                </div>
                {mySlot ? (
                  <button onClick={handleTonightCancel}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-xl transition-all active:scale-95"
                    style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
                    登録解除
                  </button>
                ) : (
                  <button onClick={() => setShowForm(v => !v)}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-xl transition-all active:scale-95"
                    style={showForm
                      ? { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }
                      : { background: 'rgba(139,92,246,0.25)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.4)' }
                    }>
                    {showForm ? 'とじる' : '+ 今夜参加を登録'}
                  </button>
                )}
              </div>

              {/* 自分の登録済み表示 */}
              {mySlot && !showForm && (
                <div className="mx-3 mb-3 px-3 py-2.5 rounded-xl flex items-center gap-2"
                  style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)' }}>
                  <Check size={12} style={{ color: '#a78bfa', flexShrink: 0 }} />
                  <span className="text-xs font-bold text-white truncate">{mySlot.game}</span>
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{mySlot.time_slot}</span>
                  {mySlot.has_voice
                    ? <Mic size={11} style={{ color: '#a78bfa', flexShrink: 0 }} />
                    : <MicOff size={11} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                  }
                </div>
              )}

              {/* 登録フォーム */}
              {showForm && (
                <div className="mx-3 mb-3 p-3 rounded-2xl space-y-2.5"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {/* ゲーム名 */}
                  <input
                    value={tGame}
                    onChange={e => setTGame(e.target.value)}
                    placeholder="ゲーム名（例: Apex、ヴァロ、原神…）"
                    maxLength={40}
                    className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', caretColor: '#8b5cf6' }}
                  />
                  {/* 時間帯 + スキル */}
                  <div className="grid grid-cols-2 gap-2">
                    <select value={tTimeSlot} onChange={e => setTTimeSlot(e.target.value)}
                      className="px-3 py-2 rounded-xl text-xs font-bold focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
                      {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select value={tSkill} onChange={e => setTSkill(e.target.value)}
                      className="px-3 py-2 rounded-xl text-xs font-bold focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
                      {SKILL_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  {/* ボイチャ + ひとこと */}
                  <div className="flex items-center gap-2">
                    <button onClick={() => setTVoice(v => !v)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all active:scale-95"
                      style={tVoice
                        ? { background: 'rgba(139,92,246,0.2)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }
                        : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }
                      }>
                      {tVoice ? <Mic size={11} /> : <MicOff size={11} />}
                      ボイチャ{tVoice ? 'あり' : 'なし'}
                    </button>
                    <input
                      value={tNote}
                      onChange={e => setTNote(e.target.value)}
                      placeholder="ひとこと（任意）"
                      maxLength={30}
                      className="flex-1 px-3 py-1.5 rounded-xl text-xs focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', caretColor: '#8b5cf6' }}
                    />
                  </div>
                  {/* 登録ボタン */}
                  <button onClick={handleTonightRegister}
                    disabled={!tGame.trim() || tSaving}
                    className="w-full py-2.5 rounded-xl text-sm font-extrabold text-white transition-all active:scale-[0.98] disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', boxShadow: '0 4px 14px rgba(139,92,246,0.4)', color: 'white' }}>
                    {tSaving ? '登録中…' : '今夜の参加を登録する'}
                  </button>
                </div>
              )}

              {/* 待機中の人リスト */}
              {tonightSlots.length > 0 ? (
                <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  {tonightSlots.map(slot => {
                    const isMe = slot.user_id === userId
                    const prof = slot.profiles as any
                    return (
                      <div key={slot.id} className="flex items-center gap-3 px-4 py-3">
                        {/* アバター */}
                        <div className="relative flex-shrink-0">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold overflow-hidden"
                            style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: 'white' }}>
                            {prof?.avatar_url
                              ? <img src={prof.avatar_url} alt="" className="w-full h-full object-cover" />
                              : (prof?.display_name?.[0] ?? '?')}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400"
                            style={{ border: '2px solid #0f0f1a' }} />
                        </div>
                        {/* 情報 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            <span className="text-xs font-extrabold text-white truncate">
                              {prof?.display_name ?? '名無し'}
                            </span>
                            {isMe && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{ color: '#818cf8', background: 'rgba(129,140,248,0.15)', border: '1px solid rgba(129,140,248,0.25)' }}>
                                あなた
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold" style={{ color: '#c4b5fd' }}>{slot.game}</span>
                            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{slot.time_slot}</span>
                            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{slot.skill_level}</span>
                            {slot.has_voice
                              ? <Mic size={10} style={{ color: '#a78bfa' }} />
                              : <MicOff size={10} style={{ color: 'rgba(255,255,255,0.25)' }} />
                            }
                          </div>
                          {slot.note && (
                            <p className="text-[10px] mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                              {slot.note}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="px-4 pb-4 pt-1 text-center">
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    今夜の参加者がまだいません。最初に登録してみよう！
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

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
                      <p className="text-xs font-extrabold" style={{ color: '#F0EEFF' }}>{lane.label}</p>
                    </div>
                    <button
                      onClick={() => setSubFilter(lane.id === 'hot' ? 'popular' : 'new')}
                      className="flex items-center gap-0.5 text-[10px] font-medium"
                      style={{ color: 'rgba(240,238,255,0.4)' }}
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
              <div className="flex-1 h-px" style={{ background: 'rgba(139,92,246,0.2)' }} />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(240,238,255,0.4)' }}>すべてのゲーム村</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(139,92,246,0.2)' }} />
            </div>
          </div>
        )}

        {/* ══ メインリスト ══ */}
        <div className="px-4 pt-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-3xl overflow-hidden animate-pulse" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(139,92,246,0.1)' }}>
                  <div className={`${i === 0 ? 'h-[120px]' : 'h-24'}`} style={{ background: 'rgba(139,92,246,0.1)' }} />
                  <div className="p-4 space-y-2">
                    <div className="h-4 rounded-full w-2/3" style={{ background: 'rgba(139,92,246,0.1)' }} />
                    <div className="h-3 rounded-full w-full" style={{ background: 'rgba(139,92,246,0.1)' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-20">
              <div className="relative w-44 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.45) 0%, transparent 70%)', filter: 'blur(28px)' }} />
                <div className="relative flex items-center justify-center">
                  <GuildHeroGamepad size={150} />
                </div>
              </div>
              <p className="font-extrabold text-base mb-1.5" style={{ color: '#F0EEFF' }}>
                {subFilter === 'member' ? 'まだゲーム村に参加していません' : 'このジャンルのゲーム村はまだありません'}
              </p>
              <p className="text-sm mb-6" style={{ color: 'rgba(240,238,255,0.4)' }}>
                {subFilter === 'member' ? '気に入ったゲーム村に参加しよう' : '最初のゲーム村を立ててみましょう'}
              </p>
              {subFilter !== 'member' && (
                <button
                  onClick={() => router.push('/guild/create')}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold text-white active:scale-95 transition-all"
                  style={{
                    background: 'linear-gradient(135deg,#8B5CF6 0%,#7C3AED 100%)',
                    boxShadow: '0 8px 24px rgba(139,92,246,0.4)',
                    border: '1px solid rgba(139,92,246,0.3)',
                  }}
                >ゲーム村を立てる</button>
              )}
            </div>
          ) : (
            <>
              {featured && !search && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: 'rgba(240,238,255,0.4)' }}>おすすめ · Featured</span>
                    <div className="flex-1 h-px" style={{ background: 'rgba(139,92,246,0.2)' }} />
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
                      <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: 'rgba(240,238,255,0.4)' }}>
                        {subFilter === 'popular' ? '今週活発'  :
                         subFilter === 'new'     ? '新着'       :
                         subFilter === 'member'  ? '参加中'     :
                         genre !== 'all'         ? `${activeGenre?.label}のゲーム村` :
                         'その他のゲーム村'}
                      </span>
                      <div className="flex-1 h-px" style={{ background: 'rgba(139,92,246,0.2)' }} />
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

      {/* ── FAB（いますぐ村作成） ── */}
      <button
        onClick={() => router.push('/guild/create')}
        className="fixed right-5 w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl active:scale-90 transition-all z-30"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
          background: 'linear-gradient(135deg,#8b5cf6 0%,#6d28d9 100%)',
          boxShadow: '0 8px 24px rgba(139,92,246,0.5)',
        }}
        aria-label="ゲーム村を作る"
      >
        <Plus size={22} className="text-white" />
      </button>
      </>
      )}
    </div>
  )
}

