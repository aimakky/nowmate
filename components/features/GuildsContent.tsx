'use client'

// /guilds と /guild ?tab=guild の両方で使うギルド一覧の共通コンテンツ。
//
// 方針:
//   - 配色: ダーク紫基調 (YVOICE 既存世界観) を維持
//   - 表示: 大きめカード + 余白広め + アイコン + 名前 + 人数 のシンプル一覧
//   - 削った装飾: 強いネオン、cluttered な小カード、過剰な装飾
//
// 関数 / state / data fetch / RLS / DB 呼び出しは一切変更せず、表示だけ
// 整理。handleJoin / fetchVillages / fetchLanes / memberIds / displayed 等は
// 元のロジックを完全に維持。

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, ChevronRight, Users } from 'lucide-react'
import { INDUSTRIES } from '@/lib/guild'
import { type Village } from '@/components/ui/VillageCard'
import GuildShieldIcon from '@/components/ui/icons/GuildShieldIcon'
import { SIMPLE_COLORS } from '@/components/ui/SimpleCard'

const SUB_FILTERS = [
  { id: 'popular', label: 'にぎやか', emoji: '🔥' },
  { id: 'new',     label: '新着',     emoji: '✨' },
  { id: 'member',  label: '参加中',   emoji: '🛡️' },
]

// 2026-05-09 マッキーさん指示「ギルドタブにもジャンルフィルターを表示」対応。
// /guild/page.tsx (いますぐ村タブ) の GENRE_TABS と完全同一の定義。
// すべて + INDUSTRIES の 10 ジャンル (FPS・TPS / RPG / アクション 等)。
const GENRE_TABS = [
  { id: 'all', emoji: '🎮', label: 'すべて' },
  ...INDUSTRIES.map(i => ({ id: i.id, emoji: i.emoji, label: i.id })),
]

// ── シンプル一覧カード (icon + name + count + 参加状態) ──
function GuildSimpleCard({
  village,
  isMember,
  onJoin,
  onClick,
}: {
  village: Village
  isMember: boolean
  onJoin: () => void
  onClick: () => void
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden active:scale-[0.99] transition-all cursor-pointer flex items-center gap-3 px-4 py-3.5"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(157,92,255,0.18)',
      }}
      onClick={onClick}
    >
      {/* アイコン (角丸正方形タイル) */}
      <div
        className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(157,92,255,0.22), rgba(124,58,237,0.16))',
          border: '1px solid rgba(157,92,255,0.25)',
        }}
      >
        {village.icon}
      </div>

      {/* 名前 + 人数 */}
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-extrabold truncate" style={{ color: SIMPLE_COLORS.textPrimary }}>
          {village.name}
          <span className="ml-1.5 font-bold" style={{ color: SIMPLE_COLORS.textSecondary }}>
            ({village.member_count})
          </span>
        </p>
      </div>

      {/* 参加状態ボタン */}
      <button
        onClick={e => { e.stopPropagation(); onJoin() }}
        className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-extrabold active:scale-90 transition-all"
        style={isMember
          ? {
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(157,92,255,0.25)',
              color: SIMPLE_COLORS.textSecondary,
            }
          : {
              background: SIMPLE_COLORS.accent,
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(157,92,255,0.32)',
            }
        }
      >
        {isMember ? '参加中' : '参加'}
      </button>
    </div>
  )
}

interface Props {
  embedded?: boolean
  headerTopOffset?: number
}

export default function GuildsContent({ embedded = false, headerTopOffset = 0 }: Props) {
  const router = useRouter()
  const [villages,  setVillages]  = useState<Village[]>([])
  const [loading,   setLoading]   = useState(true)
  const [subFilter, setSubFilter] = useState<string | null>(null)
  const [search,    setSearch]    = useState('')
  const [userId,    setUserId]    = useState<string | null>(null)
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set())
  // 2026-05-09 マッキーさん指示「ギルドタブにもジャンルフィルター」対応。
  // 'all' = フィルタなし、それ以外は INDUSTRIES の category id (例 'FPS・TPS') で絞り込む。
  const [genre, setGenre] = useState<string>('all')

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
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

    // 2026-05-09: ジャンル絞り込み (いますぐ村タブと同じロジック)
    // - genre === 'all' なら全ジャンル (INDUSTRIES の 10 種類すべて)
    // - genre が特定 INDUSTRY id ならその category 完全一致
    if (genre === 'all') {
      q = q.in('category', gameCategories)
    } else {
      q = q.eq('category', genre)
    }

    if (subFilter === 'popular') q = q.order('post_count_7d', { ascending: false })
    else if (subFilter === 'new') q = q.order('created_at',   { ascending: false })
    else                          q = q.order('member_count', { ascending: false })

    const { data } = await q.limit(40)
    setVillages((data || []) as Village[])
    setLoading(false)
  }, [subFilter, genre])

  const fetchMemberships = useCallback(async () => {
    if (!userId) return
    const { data } = await createClient()
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
    <div style={{ background: SIMPLE_COLORS.pageBg, minHeight: embedded ? 'auto' : '100vh' }}>

      {/* ── ヘッダー (ダーク + シンプル) ── */}
      <div
        className="sticky z-10 px-4 pt-4 pb-3"
        style={{
          top: headerTopOffset,
          background: 'rgba(10,10,24,0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${SIMPLE_COLORS.cardBorder}`,
        }}
      >
        {/* 2026-05-09 マッキーさん指示「ギルドタブの『🛡️ ギルド』『ゲーム仲間と
            つながろう』見出しを削除」対応。検索欄を上部タブ直下に配置し、
            上部タブとの最低限の余白だけ残して詰まりすぎないようにする。
            GuildShieldIcon は別箇所 (SUB_FILTERS の参加中アイコン / 空状態アイコン)
            で引き続き使うので import は残置。 */}

        {/* 検索 */}
        <div className="relative mb-2.5">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2"
            style={{ color: SIMPLE_COLORS.textTertiary }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ギルドを検索..."
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

        {/* 2026-05-09 マッキーさん指示「ギルドタブにもジャンルフィルター表示」対応。
            /guild/page.tsx (いますぐ村タブ) の GENRE_TABS UI を完全移植。
            DOM / className / wrapper / スタイルは「いますぐ村」と完全同一。 */}
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

        {/* サブフィルター (にぎやか / 新着 / 参加中) */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4">
          {SUB_FILTERS.map(sf => (
            <button key={sf.id}
              onClick={() => setSubFilter(prev => prev === sf.id ? null : sf.id)}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all active:scale-95"
              style={subFilter === sf.id
                ? {
                    background: SIMPLE_COLORS.accentBg,
                    color: SIMPLE_COLORS.accentDeep,
                    borderColor: SIMPLE_COLORS.accentBorder,
                  }
                : {
                    background: 'rgba(255,255,255,0.04)',
                    color: SIMPLE_COLORS.textSecondary,
                    borderColor: 'rgba(157,92,255,0.12)',
                  }
              }
            >
              <span className="flex items-center">
                {sf.id === 'member'
                  ? <GuildShieldIcon size={12} active={subFilter === sf.id} />
                  : sf.emoji}
              </span>
              <span>{sf.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── 一覧 ── */}
      <div className="px-4 pt-3 pb-32">
        {loading ? (
          <div className="space-y-2.5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="rounded-2xl px-4 py-3.5 animate-pulse flex items-center gap-3"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(157,92,255,0.12)',
                }}>
                <div className="w-12 h-12 rounded-2xl flex-shrink-0"
                  style={{ background: 'rgba(157,92,255,0.12)' }} />
                <div className="flex-1 h-4 rounded" style={{ background: 'rgba(157,92,255,0.10)' }} />
                <div className="w-14 h-7 rounded-full" style={{ background: 'rgba(157,92,255,0.12)' }} />
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(157,92,255,0.10)', border: '1px solid rgba(157,92,255,0.22)' }}>
              <GuildShieldIcon size={36} active={true} />
            </div>
            <p className="font-extrabold text-base mb-2" style={{ color: SIMPLE_COLORS.textPrimary }}>
              {subFilter === 'member' ? 'まだギルドに参加していません' : 'ギルドが見つかりません'}
            </p>
            <p className="text-sm mb-6 leading-relaxed px-6" style={{ color: SIMPLE_COLORS.textSecondary }}>
              {subFilter === 'member'
                ? '同じゲームが好きな仲間とつながるギルドに参加しましょう'
                : '最初のギルドを作って、仲間を集めましょう'}
            </p>
            {subFilter !== 'member' && (
              <button
                onClick={() => router.push('/guilds/create')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-extrabold active:scale-95 transition-all"
                style={{
                  background: SIMPLE_COLORS.accent,
                  color: '#ffffff',
                  boxShadow: '0 4px 14px rgba(157,92,255,0.4)',
                }}
              >
                <Plus size={15} />
                ギルドを作る
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayed.map(v => (
              <GuildSimpleCard
                key={v.id}
                village={v}
                isMember={memberIds.has(v.id)}
                onJoin={() => handleJoin(v.id)}
                onClick={() => router.push(`/guilds/${v.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── FAB (紫アクセント) ── */}
      <button
        onClick={() => router.push('/guilds/create')}
        className="fixed right-5 w-14 h-14 rounded-2xl flex items-center justify-center active:scale-90 transition-all z-30"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
          background: SIMPLE_COLORS.accent,
          boxShadow: '0 8px 24px rgba(157,92,255,0.5), 0 0 20px rgba(157,92,255,0.3)',
        }}
        aria-label="ギルドを作る"
      >
        <Plus size={22} className="text-white" />
      </button>
    </div>
  )
}
