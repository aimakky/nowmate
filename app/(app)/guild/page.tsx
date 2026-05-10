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
//  - サブフィルター (にぎやか / 新着 / 参加中) は最小限に維持
//  - 検索 (シンプルに)
//  - 右下 FAB
//  - DB / fetch ロジック / handleJoin すべて維持
//
// 2026-05-09 削除追記:
//  - 「今夜あそぶ人を探す」紫カード一式 (現状参加者がいない空表示で過疎印象を与えるため)
//  - 関連 state / useEffect / handler / TonightSlot 型 / TIME_SLOTS / SKILL_LEVELS 定数
//  - tonight_slots テーブル本体は将来復活に備えて DB 側は残置

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
// 2026-05-09: 「今夜あそぶ人を探す」セクション削除に伴い、Moon / Mic / MicOff / Check
// を未使用化したため削除。ChevronRight も元から未使用だったため一緒に整理。
import { Plus, Search } from 'lucide-react'
import { INDUSTRIES } from '@/lib/guild'
import { type Village } from '@/components/ui/VillageCard'
import GuildsContent from '@/components/features/GuildsContent'
import GuildShieldIcon from '@/components/ui/icons/GuildShieldIcon'
import { SIMPLE_COLORS } from '@/components/ui/SimpleCard'
import { useSwipeTabs } from '@/hooks/useSwipeTabs'

const TOP_TAB_HEIGHT = 44

// 2026-05-10 マッキーさん指示「X のようにタップ + 横スワイプで切り替え」対応。
// 表示順 (= TOP_TABS と同じ): いますぐ村 → ギルド。
// 左スワイプ = 次のタブ (instant → guild)、右スワイプ = 前のタブ (guild → instant)。
type TopTab = 'instant' | 'guild'
const TOP_TAB_ORDER: readonly TopTab[] = ['instant', 'guild'] as const

// 2026-05-09: 「今夜あそぶ人を探す」セクション削除に伴い、TonightSlot 型 / TIME_SLOTS /
// SKILL_LEVELS は不要となり削除。tonight_slots テーブルは将来復活に備えて DB 側は残置。

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
  const [topTab, setTopTab] = useState<TopTab>('instant')
  // 2026-05-10: 横スワイプでも topTab を切り替え。タップ用 setTopTab と同じ setter を渡す。
  const swipeHandlers = useSwipeTabs(TOP_TAB_ORDER, topTab, setTopTab)

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

  // 2026-05-09: 「今夜あそぶ人を探す」セクション削除に伴い、tonight 関連 state /
  // useEffect / handler / fetch をすべて削除。tonight_slots テーブルは将来復活に備えて
  // DB 側は残置 (Supabase 側は touch していない)。

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

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

  // 2026-05-10: 外側 wrapper に touch handler を付与。タブ切替 (タップ) は
  // 内側の <button onClick> がそのまま処理する。swipe は dx>=50 + 短時間のみ
  // 発火するので tap (dx=0) と干渉しない。
  return (
    <div
      className="max-w-md mx-auto min-h-screen"
      style={{ background: SIMPLE_COLORS.pageBg }}
      onTouchStart={swipeHandlers.onTouchStart}
      onTouchEnd={swipeHandlers.onTouchEnd}
    >

      {/* ── 上部タブ：いますぐ村 / ギルド ──
          2026-05-09 マッキーさん指示「左右タブを完全に同一 DOM / CSS / 高さ /
          余白 / 下線位置に揃える」対応:
          - TOP_TABS 配列を map で展開し、左右の button を完全同一ロジックで出力
          - 下線は left-1/4 right-1/4 (親幅依存の可変) → left-1/2 -translate-x-1/2
            w-12 (中央固定 48px 幅) に変更し、文字数に依らず完全対称に
          - active / inactive の差は color と下線表示のみ。height / padding /
            font-size / line-height / margin は同一。
          - button 全体は flex-1 で 50% / 50% 均等。 */}
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
        {([
          { id: 'instant', label: 'いますぐ村' },
          { id: 'guild',   label: 'ギルド' },
        ] as const).map(t => {
          const active = topTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTopTab(t.id)}
              className="flex-1 flex items-center justify-center text-xs font-extrabold transition-all relative"
              style={{ color: active ? SIMPLE_COLORS.accentDeep : SIMPLE_COLORS.textSecondary }}
              aria-pressed={active}
            >
              {t.label}
              {active && (
                <span
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 rounded-full"
                  style={{ background: SIMPLE_COLORS.accent }}
                />
              )}
            </button>
          )
        })}
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

          {/* ── ゲーム村一覧 (シンプル縦並び) ── */}
          {/* 2026-05-09: BottomNav クリアランスを TL/通知/チャット と同じ pb-28 に統一
              2026-05-09 マッキーさん指示「今夜あそぶ人を探すセクションを削除」対応で、
              旧 162 行の紫カードブロック (L408-L569) と関連 state / handler / type / 定数 /
              icon import (Moon/Mic/MicOff/Check) を完全削除。tonight_slots テーブル本体は
              将来戻す可能性に備えて DB は触らずに残置。 */}
          <div className="px-4 pt-4 pb-28">
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
