'use client'
// v3: ダーク紫基調 + シンプル一覧 (アイコン + 名前 + 人数 + 参加状態) に強制 restructure。
//
// 削除:
//  - GAME ROOM ヒーロー、「今すぐ一緒に遊ぶ人を探そう」「通話ルームを開いて仲間を募集する場所」
//  - GENRE_TABS の大量カテゴリチップ
//  - 今週にぎわってる / 新しいゲーム村 の横スクロールレーン
//  - おすすめ・Featured 二重表示
//  - GuildSmallCard / VillageCard (このページからの利用は廃止)
//  - 強いグロー・装飾
//
// 維持:
//  - 上部タブ (いますぐ村 / ギルド)
//  - 「今夜あそぶ人を探す」紫カード (機能維持、視覚的にコンパクト化)
//  - サブフィルター (にぎやか / 新着 / 参加中) は最小限に維持
//  - 検索 (シンプルに)
//  - 右下 FAB
//  - DB / fetch ロジック / handleJoin / handleTonightRegister / handleTonightCancel すべて維持

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
// Trophy / X / Briefcase は WorkCupTeaserCard で使用していたが、削除に伴い未使用化
import { Plus, Search, Moon, Mic, MicOff, Check, ChevronRight } from 'lucide-react'
import { INDUSTRIES } from '@/lib/guild'
import { type Village } from '@/components/ui/VillageCard'
import GuildsContent from '@/components/features/GuildsContent'
import { SIMPLE_COLORS } from '@/components/ui/SimpleCard'

const TOP_TAB_HEIGHT = 44

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
const GAME_CATEGORIES = INDUSTRIES.map(i => i.id)

const SUB_FILTERS = [
  { id: 'popular', label: 'にぎやか', emoji: '🔥' },
  { id: 'new',     label: '新着',     emoji: '✨' },
  { id: 'member',  label: '参加中',   emoji: '🛡️' },
]

// ジャンルタブ: すべて + INDUSTRIES の 10 ジャンル (FPS・TPS / RPG / アクション
// / スポーツ / スマホゲーム / シミュレーション / パズル・カジュアル /
// インディー / レトロゲーム / 雑談・その他)
const GENRE_TABS = [
  { id: 'all', emoji: '🎮', label: 'すべて' },
  ...INDUSTRIES.map(i => ({ id: i.id, emoji: i.emoji, label: i.id })),
]

// ── シンプル一覧カード (アイコン + 名前(N) + 参加状態) ──
function SimpleVillageCard({
  village, isMember, onJoin, onClick,
}: {
  village: Village; isMember: boolean; onJoin: () => void; onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="rounded-2xl overflow-hidden active:scale-[0.99] transition-all cursor-pointer flex items-center gap-3 px-4 py-3.5"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(157,92,255,0.18)',
      }}
    >
      <div
        className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(157,92,255,0.22), rgba(124,58,237,0.16))',
          border: '1px solid rgba(157,92,255,0.25)',
        }}
      >
        {village.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-extrabold truncate" style={{ color: SIMPLE_COLORS.textPrimary }}>
          {village.name}
          <span className="ml-1.5 font-bold" style={{ color: SIMPLE_COLORS.textSecondary }}>
            ({village.member_count})
          </span>
        </p>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onJoin() }}
        className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-extrabold active:scale-90 transition-all"
        style={isMember
          ? { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(157,92,255,0.25)', color: SIMPLE_COLORS.textSecondary }
          : { background: SIMPLE_COLORS.accent, color: '#ffffff', boxShadow: '0 2px 6px rgba(157,92,255,0.4)' }
        }
      >
        {isMember ? '参加中' : '参加'}
      </button>
    </div>
  )
}

// ── メインページ ────────────────────────────────────────────
export default function GuildPage() {
  const router = useRouter()
  const [topTab, setTopTab] = useState<'instant' | 'guild'>('instant')

  // URL ?tab=guild 互換 (旧 /guilds 互換 or 内部リンク)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('tab') === 'guild') setTopTab('guild')
  }, [])

  const [villages,  setVillages]  = useState<Village[]>([])
  const [loading,   setLoading]   = useState(true)
  const [genre,     setGenre]     = useState('all')
  const [subFilter, setSubFilter] = useState<string | null>(null)
  const [search,    setSearch]    = useState('')
  const [userId,    setUserId]    = useState<string | null>(null)
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set())

  // 今夜マッチング state
  const [tonightSlots, setTonightSlots] = useState<TonightSlot[]>([])
  const [mySlot,       setMySlot]       = useState<TonightSlot | null>(null)
  const [showForm,     setShowForm]     = useState(false)
  const [tGame,        setTGame]        = useState('')
  const [tTimeSlot,    setTTimeSlot]    = useState('21-23時')
  const [tSkill,       setTSkill]       = useState('問わない')
  const [tVoice,       setTVoice]       = useState(true)
  const [tNote,        setTNote]        = useState('')
  const [tSaving,      setTSaving]      = useState(false)

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

  async function handleTonightRegister() {
    if (!userId || !tGame.trim() || tSaving) return
    setTSaving(true)
    const supabase = createClient()
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

  async function handleTonightCancel() {
    if (!userId) return
    const supabase = createClient()
    await supabase.from('tonight_slots').delete().eq('user_id', userId)
    setMySlot(null)
    setTonightSlots(prev => prev.filter(s => s.user_id !== userId))
  }

  const fetchVillages = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    let q = supabase.from('villages').select('*').eq('is_public', true)

    // ジャンル絞り込み: 'all' なら全ゲームジャンル、特定ジャンル選択時は
    // category 完全一致 (例: 'FPS・TPS')
    if (genre !== 'all') q = q.eq('category', genre)
    else                 q = q.in('category', GAME_CATEGORIES)

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

  return (
    <div className="max-w-md mx-auto min-h-screen" style={{ background: SIMPLE_COLORS.pageBg }}>

      {/* ── 上部タブ：いますぐ村 / ギルド ── */}
      <div
        className="sticky top-0 z-30 flex"
        style={{
          height: TOP_TAB_HEIGHT,
          background: 'rgba(10,10,24,0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${SIMPLE_COLORS.cardBorder}`,
        }}
      >
        <button
          onClick={() => setTopTab('instant')}
          className="flex-1 flex items-center justify-center text-xs font-extrabold transition-all relative"
          style={{ color: topTab === 'instant' ? SIMPLE_COLORS.accentDeep : SIMPLE_COLORS.textSecondary }}
          aria-pressed={topTab === 'instant'}
        >
          いますぐ村
          {topTab === 'instant' && (
            <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full"
              style={{ background: SIMPLE_COLORS.accent }} />
          )}
        </button>
        <button
          onClick={() => setTopTab('guild')}
          className="flex-1 flex items-center justify-center text-xs font-extrabold transition-all relative"
          style={{ color: topTab === 'guild' ? SIMPLE_COLORS.accentDeep : SIMPLE_COLORS.textSecondary }}
          aria-pressed={topTab === 'guild'}
        >
          ギルド
          {topTab === 'guild' && (
            <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full"
              style={{ background: SIMPLE_COLORS.accent }} />
          )}
        </button>
      </div>

      {/* ── ギルドタブ ── */}
      {topTab === 'guild' && (
        <GuildsContent embedded headerTopOffset={TOP_TAB_HEIGHT} />
      )}

      {/* ── いますぐ村タブ ── */}
      {topTab === 'instant' && (
        <>
          {/* ── コンパクトヘッダー (検索 + サブフィルター) ──
              旧 GAME ROOM 巨大ヒーロー / 「今すぐ一緒に遊ぶ人を探そう」
              / 「通話ルームを開いて仲間を募集する場所」/ 多数のジャンル
              チップは全削除。タブ直下にスッキリ検索 + 3 chip フィルタ
              のみ。 */}
          <div className="sticky z-10 px-4 pt-3 pb-2.5"
            style={{
              top: TOP_TAB_HEIGHT,
              background: 'rgba(10,10,24,0.95)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderBottom: `1px solid ${SIMPLE_COLORS.cardBorder}`,
            }}>

            <div className="relative mb-2.5">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2"
                style={{ color: SIMPLE_COLORS.textTertiary }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ゲーム村を検索..."
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl text-sm focus:outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(157,92,255,0.18)',
                  color: SIMPLE_COLORS.textPrimary,
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = SIMPLE_COLORS.accentBorder
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(157,92,255,0.12)'
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'rgba(157,92,255,0.18)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
            </div>

            {/* ジャンルタブ (横スクロール) — 検索欄直下、サブフィルターの上 */}
            <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 mb-2.5">
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
                          background: 'rgba(255,255,255,0.04)',
                          color: SIMPLE_COLORS.textSecondary,
                          border: '1px solid rgba(157,92,255,0.12)',
                        }
                    }
                  >
                    <span>{g.emoji}</span>
                    <span className="whitespace-nowrap">{g.label}</span>
                  </button>
                )
              })}
            </div>

            <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4">
              {SUB_FILTERS.map(sf => (
                <button key={sf.id}
                  onClick={() => setSubFilter(prev => prev === sf.id ? null : sf.id)}
                  className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all active:scale-95"
                  style={subFilter === sf.id
                    ? { background: SIMPLE_COLORS.accentBg, color: SIMPLE_COLORS.accentDeep, borderColor: SIMPLE_COLORS.accentBorder }
                    : { background: 'rgba(255,255,255,0.04)', color: SIMPLE_COLORS.textSecondary, borderColor: 'rgba(157,92,255,0.12)' }
                  }
                >
                  <span>{sf.emoji}</span><span>{sf.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── 今夜あそぶ人を探す (紫カード、機能維持) ── */}
          <div className="px-4 pt-3">
            <div className="rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(157,92,255,0.10), rgba(124,58,237,0.05))',
                border: '1px solid rgba(157,92,255,0.25)',
              }}>
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <div className="flex items-center gap-2">
                  <Moon size={14} style={{ color: '#c4b5fd' }} />
                  <span className="text-sm font-extrabold" style={{ color: SIMPLE_COLORS.textPrimary }}>
                    今夜あそぶ人を探す
                  </span>
                  {tonightSlots.length > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(157,92,255,0.18)', color: '#c4b5fd', border: '1px solid rgba(157,92,255,0.3)' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {tonightSlots.length}人
                    </span>
                  )}
                </div>
                {mySlot ? (
                  <button onClick={handleTonightCancel}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full transition-all active:scale-95"
                    style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                    解除
                  </button>
                ) : (
                  <button onClick={() => setShowForm(v => !v)}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full transition-all active:scale-95"
                    style={showForm
                      ? { background: 'rgba(255,255,255,0.06)', color: SIMPLE_COLORS.textSecondary, border: '1px solid rgba(157,92,255,0.18)' }
                      : { background: 'rgba(157,92,255,0.25)', color: '#c4b5fd', border: '1px solid rgba(157,92,255,0.4)' }
                    }>
                    {showForm ? 'とじる' : '+ 登録'}
                  </button>
                )}
              </div>

              {mySlot && !showForm && (
                <div className="mx-3 mb-3 px-3 py-2 rounded-xl flex items-center gap-2"
                  style={{ background: 'rgba(157,92,255,0.12)', border: '1px solid rgba(157,92,255,0.3)' }}>
                  <Check size={11} style={{ color: '#c4b5fd', flexShrink: 0 }} />
                  <span className="text-xs font-bold truncate" style={{ color: SIMPLE_COLORS.textPrimary }}>{mySlot.game}</span>
                  <span className="text-[10px]" style={{ color: SIMPLE_COLORS.textSecondary }}>{mySlot.time_slot}</span>
                  {mySlot.has_voice
                    ? <Mic size={10} style={{ color: '#c4b5fd', flexShrink: 0 }} />
                    : <MicOff size={10} style={{ color: SIMPLE_COLORS.textTertiary, flexShrink: 0 }} />
                  }
                </div>
              )}

              {showForm && (
                <div className="mx-3 mb-3 p-3 rounded-2xl space-y-2"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(157,92,255,0.18)' }}>
                  <input
                    value={tGame}
                    onChange={e => setTGame(e.target.value)}
                    placeholder="ゲーム名（例: Apex、ヴァロ、原神…）"
                    maxLength={40}
                    className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(157,92,255,0.18)', color: SIMPLE_COLORS.textPrimary }}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select value={tTimeSlot} onChange={e => setTTimeSlot(e.target.value)}
                      className="px-3 py-2 rounded-xl text-xs font-bold focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(157,92,255,0.18)', color: SIMPLE_COLORS.textPrimary }}>
                      {TIME_SLOTS.map(t => <option key={t} value={t} style={{ background: '#0a0a18' }}>{t}</option>)}
                    </select>
                    <select value={tSkill} onChange={e => setTSkill(e.target.value)}
                      className="px-3 py-2 rounded-xl text-xs font-bold focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(157,92,255,0.18)', color: SIMPLE_COLORS.textPrimary }}>
                      {SKILL_LEVELS.map(s => <option key={s} value={s} style={{ background: '#0a0a18' }}>{s}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setTVoice(v => !v)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all active:scale-95"
                      style={tVoice
                        ? { background: 'rgba(157,92,255,0.20)', color: '#c4b5fd', border: '1px solid rgba(157,92,255,0.35)' }
                        : { background: 'rgba(255,255,255,0.04)', color: SIMPLE_COLORS.textSecondary, border: '1px solid rgba(157,92,255,0.12)' }
                      }>
                      {tVoice ? <Mic size={10} /> : <MicOff size={10} />}
                      ボイチャ{tVoice ? 'あり' : 'なし'}
                    </button>
                    <input
                      value={tNote}
                      onChange={e => setTNote(e.target.value)}
                      placeholder="ひとこと（任意）"
                      maxLength={30}
                      className="flex-1 px-3 py-1.5 rounded-xl text-xs focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(157,92,255,0.18)', color: SIMPLE_COLORS.textPrimary }}
                    />
                  </div>
                  <button onClick={handleTonightRegister}
                    disabled={!tGame.trim() || tSaving}
                    className="w-full py-2.5 rounded-xl text-sm font-extrabold text-white transition-all active:scale-[0.98] disabled:opacity-40"
                    style={{ background: SIMPLE_COLORS.accent, boxShadow: '0 4px 14px rgba(157,92,255,0.4)' }}>
                    {tSaving ? '登録中…' : '今夜の参加を登録する'}
                  </button>
                </div>
              )}

              {tonightSlots.length === 0 && !showForm && !mySlot && (
                <div className="px-4 pb-3 text-center">
                  <p className="text-xs" style={{ color: SIMPLE_COLORS.textTertiary }}>
                    今夜の参加者がまだいません
                  </p>
                </div>
              )}

              {tonightSlots.length > 0 && (
                <div className="divide-y" style={{ borderColor: 'rgba(157,92,255,0.10)' }}>
                  {tonightSlots.map(slot => {
                    const isMe = slot.user_id === userId
                    const prof = slot.profiles as any
                    return (
                      <div key={slot.id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="relative flex-shrink-0">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold overflow-hidden"
                            style={{ background: SIMPLE_COLORS.accent, color: 'white' }}>
                            {prof?.avatar_url
                              ? <img src={prof.avatar_url} alt="" className="w-full h-full object-cover" />
                              : (prof?.display_name?.[0] ?? '?')}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400"
                            style={{ border: '2px solid #0a0a18' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            <span className="text-xs font-extrabold truncate" style={{ color: SIMPLE_COLORS.textPrimary }}>
                              {prof?.display_name ?? '名無し'}
                            </span>
                            {isMe && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{ color: '#c4b5fd', background: 'rgba(157,92,255,0.18)', border: '1px solid rgba(157,92,255,0.3)' }}>
                                あなた
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold" style={{ color: '#c4b5fd' }}>{slot.game}</span>
                            <span className="text-[10px]" style={{ color: SIMPLE_COLORS.textTertiary }}>{slot.time_slot}</span>
                            <span className="text-[10px]" style={{ color: SIMPLE_COLORS.textTertiary }}>{slot.skill_level}</span>
                            {slot.has_voice
                              ? <Mic size={10} style={{ color: '#c4b5fd' }} />
                              : <MicOff size={10} style={{ color: SIMPLE_COLORS.textTertiary }} />
                            }
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── ゲーム村一覧 (シンプル縦並び) ── */}
          <div className="px-4 pt-4 pb-32">
            {loading ? (
              <div className="space-y-2.5">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="rounded-2xl px-4 py-3.5 animate-pulse flex items-center gap-3"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(157,92,255,0.12)' }}>
                    <div className="w-12 h-12 rounded-2xl flex-shrink-0" style={{ background: 'rgba(157,92,255,0.12)' }} />
                    <div className="flex-1 h-4 rounded" style={{ background: 'rgba(157,92,255,0.10)' }} />
                    <div className="w-14 h-7 rounded-full" style={{ background: 'rgba(157,92,255,0.12)' }} />
                  </div>
                ))}
              </div>
            ) : displayed.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center text-3xl"
                  style={{ background: 'rgba(157,92,255,0.10)', border: '1px solid rgba(157,92,255,0.22)' }}>
                  🎮
                </div>
                <p className="font-extrabold text-base mb-1.5" style={{ color: SIMPLE_COLORS.textPrimary }}>
                  {subFilter === 'member' ? 'まだ参加していません' : 'ゲーム村が見つかりません'}
                </p>
                <p className="text-sm mb-6 leading-relaxed px-6" style={{ color: SIMPLE_COLORS.textSecondary }}>
                  {subFilter === 'member' ? '気になるゲーム村に参加しよう' : '最初のゲーム村を立ててみましょう'}
                </p>
                {subFilter !== 'member' && (
                  <button
                    onClick={() => router.push('/guild/create')}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-extrabold active:scale-95 transition-all"
                    style={{
                      background: SIMPLE_COLORS.accent,
                      color: '#ffffff',
                      boxShadow: '0 4px 14px rgba(157,92,255,0.4)',
                    }}
                  >
                    <Plus size={15} />
                    ゲーム村を立てる
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {displayed.map(v => (
                  <SimpleVillageCard
                    key={v.id}
                    village={v}
                    isMember={memberIds.has(v.id)}
                    onJoin={() => handleJoin(v.id)}
                    onClick={() => router.push(`/villages/${v.id}`)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── FAB (紫アクセント) ── */}
          <button
            onClick={() => router.push('/guild/create')}
            className="fixed right-5 w-14 h-14 rounded-2xl flex items-center justify-center active:scale-90 transition-all z-30"
            style={{
              bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
              background: SIMPLE_COLORS.accent,
              boxShadow: '0 8px 24px rgba(157,92,255,0.5), 0 0 20px rgba(157,92,255,0.3)',
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

// ─── 職業別ゲーム大会 Coming Soon カード (削除済) ──────────────
// 旧 WorkCupTeaserCard コンポーネントは未確定機能の Coming Soon 告知だったが、
// ユーザー判断で UI から完全に取り除いた。実装計画ドキュメント (docs/work-cup-plan.md)
// も併せて削除。再開する場合は git 履歴 (commit e7881b5 周辺) から復活可能。
// 過去の配置: /guild「いますぐ村」タブの「今夜あそぶ人を探す」直下、ゲーム村
// 一覧の上。最も目に入りやすいが、メインの一覧導線は壊さない位置。
//
// 実装ロードマップは docs/work-cup-plan.md 参照。
