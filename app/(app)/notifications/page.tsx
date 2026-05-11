'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import { Bell } from 'lucide-react'
import { getUserDisplayName } from '@/lib/user-display'
import PageHeader from '@/components/layout/PageHeader'
import { useDelayedSkeleton } from '@/hooks/useDelayedSkeleton'

type Notif = {
  id: string
  type: 'like' | 'reply' | 'follow' | 'comment' | 'bottle_reply' | 'new_member_post' | 'voice_room_started' | 'call_invite' | 'guild_invite' | 'now_village_invite'
  actor_id: string | null
  target_id: string | null
  target_type: string | null
  is_read: boolean
  priority: 'high' | 'normal'
  created_at: string
  actor: { display_name: string; avatar_url: string | null } | null
}

const TYPE_CONFIG: Record<string, { emoji: string; label: string; section: 'reaction' | 'voice' | 'other' }> = {
  like:               { emoji: '🌱', label: 'あなたの言葉、ちゃんと届いてます',           section: 'reaction' },
  reply:              { emoji: '💬', label: 'あなたの話に返事を書いてくれました',          section: 'reaction' },
  follow:             { emoji: '✨', label: 'あなたのことが気になっているようです',        section: 'reaction' },
  new_member_post:    { emoji: '🌱', label: 'ギルドに初めての投稿をしました — 迎えてあげて', section: 'reaction' },
  voice_room_started: { emoji: '🎙️', label: 'ゲーム村が開きました — 参加しませんか？',       section: 'voice'    },
  comment:            { emoji: '🛡️', label: 'ギルドの投稿にコメントしました',               section: 'other'    },
  bottle_reply:       { emoji: '🍶', label: '波の向こうから、返事が来ました',              section: 'other'    },
  tier_up:            { emoji: '🌿', label: '村のみんなが、あなたを信頼し始めています',    section: 'other'    },
  bottle_found:       { emoji: '🍶', label: 'あなたの瓶を、誰かが大切に拾ってくれました', section: 'other'    },
  // 2026-05-10: フレンド「誘う」機能で発生する新 type 群 (FriendInviteSheet 経由)
  call_invite:        { emoji: '📞', label: 'あなたを通話に誘いました',                   section: 'voice'    },
  guild_invite:       { emoji: '🎮', label: 'あなたをゲーム村に誘いました',               section: 'voice'    },
  now_village_invite: { emoji: '⏱️', label: 'あなたをいますぐ村に誘いました',             section: 'voice'    },
}

// 2026-05-09 マッキーさん指示「取得済みデータがあれば skeleton に戻さず前回表示を
// 維持しながら裏で再取得」対応 (rule 8)。
// AppLayout の `key={pathname}` で本コンポーネントは毎回 unmount/remount されるが、
// この module-level 変数は React tree 外なので保持される。再訪問時は cachedNotifs
// から即時復元 → loading=false で skeleton スキップ → 裏で fetch して最新化。
let cachedNotifs: Notif[] | null = null

export default function NotificationsPage() {
  const router = useRouter()
  const [notifs,  setNotifs]  = useState<Notif[]>(cachedNotifs ?? [])
  // 初回訪問 (cachedNotifs === null) のみ loading=true で skeleton 表示。
  // 再訪問は cached を即時表示しつつ裏で再 fetch (loading=false 維持)。
  const [loading, setLoading] = useState(cachedNotifs === null)
  // 2026-05-09: 速い読込 (<200ms) では skeleton を表示しない。
  // 遅い読込のみ skeleton を出すことで、skeleton↔loaded の切替に伴うわずかな
  // ズレが見えなくなる。
  const showSkeleton = useDelayedSkeleton(loading)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // priority は text の 'high' / 'normal'。文字列の昇順だと 'high' < 'normal' になるので、
    // ascending: true が「重要が上」になる。旧実装は ascending: false で 'normal' が上に来ていた。
    //
    // PostgREST embed (actor:actor_id(...)) を撤廃。embed 解決失敗で親 row が
    // 消える脆弱性 (= ミヤさん投稿が TL に出ない問題と同じ構造) を回避するため、
    // actor profile は別 query で in() 取得し client-side で merge する。
    // docs/development-checklist.md の「禁止事項 1: PostgREST embed 禁止」遵守。
    const { data: rawNotifs, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('priority',   { ascending: true  })
      .order('created_at', { ascending: false })
      .limit(80)
    if (error) console.error('[notifications] fetch error:', error)

    const rows = (rawNotifs ?? []) as any[]

    // actor_id 集合を作って profiles を別 query で取得 (fail-open)
    const actorIds = Array.from(new Set(
      rows.map(n => n.actor_id).filter((id: any): id is string => typeof id === 'string' && id.length > 0)
    ))
    const actorMap = new Map<string, { display_name: string; avatar_url: string | null }>()
    if (actorIds.length > 0) {
      const { data: actors, error: aErr } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', actorIds)
      if (aErr) console.error('[notifications] actor profiles error:', aErr)
      for (const p of (actors ?? []) as any[]) {
        actorMap.set(p.id, { display_name: p.display_name ?? '', avatar_url: p.avatar_url ?? null })
      }
    }

    // 各 notification に actor を merge
    const merged = rows.map(n => ({
      ...n,
      actor: n.actor_id ? actorMap.get(n.actor_id) ?? null : null,
    }))

    setNotifs(merged as Notif[])
    setLoading(false)
    // 2026-05-09: module-level cache を更新。次回訪問時に skeleton をスキップできる。
    cachedNotifs = merged as Notif[]

    // 既読化
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
  }, [router])

  useEffect(() => { load() }, [load])

  function handleTap(n: Notif) {
    if (n.type === 'follow' && n.actor_id) {
      router.push(`/profile/${n.actor_id}`)
    } else if ((n.type === 'like' || n.type === 'reply') && n.target_id) {
      router.push(`/tweet/${n.target_id}`)
    } else if (n.type === 'comment' && n.target_id) {
      router.push(`/villages/${n.target_id}`)
    } else if (n.type === 'new_member_post' && n.target_id) {
      router.push(`/villages/${n.target_id}`)
    } else if (n.type === 'voice_room_started' && n.target_id) {
      router.push(`/voice/${n.target_id}`)
    } else if (n.type === 'bottle_reply') {
      router.push('/mypage')
    }
    // 2026-05-10: フレンド「誘う」由来の通知 tap 時、誘った相手のプロフィールへ遷移
    // (= 「誰が誘ってくれたのか」確認できる + 安全な既存ルートのみ使用)
    else if ((n.type === 'call_invite' || n.type === 'guild_invite' || n.type === 'now_village_invite') && n.actor_id) {
      router.push(`/profile/${n.actor_id}`)
    }
  }

  const reactionNotifs = notifs.filter(n => TYPE_CONFIG[n.type]?.section === 'reaction')
  const voiceNotifs    = notifs.filter(n => TYPE_CONFIG[n.type]?.section === 'voice')
  const otherNotifs    = notifs.filter(n => TYPE_CONFIG[n.type]?.section === 'other' || !TYPE_CONFIG[n.type])
  const unreadCount    = notifs.filter(n => !n.is_read).length

  function NotifRow({ n, glowColor }: { n: Notif; glowColor?: string }) {
    const cfg   = TYPE_CONFIG[n.type] ?? { emoji: '🔔', label: '通知', section: 'other' as const }
    const actor = n.actor as any
    const unread = !n.is_read
    return (
      <button
        onClick={() => handleTap(n)}
        className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-all active:scale-[0.99]"
        style={unread ? {
          background: glowColor ? `${glowColor}10` : 'rgba(255,201,40,0.08)',
        } : {}}
      >
        <div className="relative flex-shrink-0">
          <Avatar src={actor?.avatar_url} name={getUserDisplayName(actor, '?')} size="sm" />
          <span className="absolute -bottom-1 -right-1 text-sm leading-none">{cfg.emoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-snug" style={{ color: 'rgba(255,255,255,0.9)' }}>
            <span className="font-bold">{getUserDisplayName(actor, '誰か')}</span>
            {' '}
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>{cfg.label}</span>
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{timeAgo(n.created_at)}</p>
        </div>
        {unread && (
          <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
            style={{ background: glowColor ?? '#FFC928', boxShadow: `0 0 6px ${glowColor ?? '#FFC928'}` }} />
        )}
      </button>
    )
  }

  return (
    <div className="max-w-md mx-auto min-h-screen" style={{ background: '#080812' }}>

      {/* ── ヘッダー (2026-05-09: 共通 PageHeader に移行) ──
          - 旧: sticky top-0 / pt-12 pb-3 / 黄アクセント / 未読バッジ右上
          - 新: 共通 PageHeader / pt-12 pb-3 / 黄アクセント (#FFC928)
          - 未読バッジは actions prop で右側に維持 */}
      <PageHeader
        label="NOTIFICATIONS"
        title="通知"
        icon={Bell}
        accentColor="#FFC928"
        actions={
          unreadCount > 0 ? (
            <span
              className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(255,201,40,0.15)', color: '#FFC928', border: '1px solid rgba(255,201,40,0.35)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#FFC928' }} />
              {unreadCount}件未読
            </span>
          ) : undefined
        }
      />

      {loading && !showSkeleton ? (
        // 2026-05-09: 速い読込 (<200ms) は skeleton を出さず空のまま。
        // PageHeader は表示済みなので、ユーザーには「ヘッダーだけ見える」状態が一瞬。
        // 多くの読込は <200ms で完了するため、結果的にこの分岐がほとんどのケースになる。
        <div style={{ minHeight: '50vh' }} aria-busy="true" />
      ) : loading ? (
        // 2026-05-09 マッキーさん指示「skeleton と本表示の高さを揃える」対応。
        // 旧 skeleton (5 行フラット px-4 pt-4 space-y-2) は loaded 状態 (3 セクション
        // ラベル + 容器) と構造が違い、loading→loaded で ~90px のジャンプが発生していた。
        // 新 skeleton: 本表示と同じ構造 (pb-28 pt-2 wrapper + section ラベル + 容器内 row)
        // で 1 セクション分を描画。本表示に切替った瞬間の高さ・余白が一致する。
        // この分岐は「読込が 200ms 以上かかった場合のみ」発火する (useDelayedSkeleton)。
        <div className="pb-28 pt-2">
          <div className="px-4 mb-4">
            {/* セクションラベル placeholder (本表示の「返信・反応」と同位置) */}
            <div className="flex items-center gap-2 py-3">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(255,201,40,0.4)' }} />
              <div className="h-2.5 w-20 rounded animate-pulse" style={{ background: 'rgba(255,201,40,0.18)' }} />
            </div>
            {/* row 容器 (本表示と同じ rounded-2xl + border) */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,201,40,0.2)', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
              <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3.5 animate-pulse">
                    <div className="w-10 h-10 rounded-full flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }} />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3 rounded w-3/4" style={{ background: 'rgba(255,255,255,0.1)' }} />
                      <div className="h-3 rounded w-1/3" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : notifs.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6" style={{ minHeight: 'calc(100vh - 120px)' }}>
          <div className="w-full max-w-xs rounded-3xl p-8 flex flex-col items-center text-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,201,40,0.18)' }}>
            {/* Bell icon with sparkles */}
            <div className="relative mb-6">
              {/* Sparkle dots */}
              <span className="absolute -top-2 -right-2 text-[10px] font-bold" style={{ color: 'rgba(255,201,40,0.6)' }}>+</span>
              <span className="absolute -bottom-1 -left-3 text-[10px] font-bold" style={{ color: 'rgba(255,201,40,0.4)' }}>+</span>
              <span className="absolute top-1 -left-4 text-[8px] font-bold" style={{ color: 'rgba(255,201,40,0.5)' }}>+</span>
              <span className="absolute -top-3 left-3 text-[8px] font-bold" style={{ color: 'rgba(255,201,40,0.3)' }}>+</span>
              <div
                className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,201,40,0.25) 0%, rgba(255,77,144,0.2) 100%)',
                  border: '1px solid rgba(255,201,40,0.4)',
                  boxShadow: '0 0 30px rgba(255,201,40,0.25)',
                }}
              >
                <span className="text-4xl">🔔</span>
              </div>
            </div>
            <p className="font-extrabold text-xl mb-2" style={{ color: '#F0EEFF' }}>通知はまだありません</p>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(240,238,255,0.4)' }}>
              ギルドに投稿・返信・反応すると<br />ここに届きます
            </p>
          </div>
        </div>
      ) : (
        <div className="pb-28 pt-2">

          {/* ── 返信・反応 ── */}
          {reactionNotifs.length > 0 && (
            <div className="px-4 mb-4">
              <div className="flex items-center gap-2 py-3">
                <div className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,201,40,0.9)' }}>
                  返信・反応
                </span>
              </div>
              <div className="rounded-2xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,201,40,0.2)', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
                <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  {reactionNotifs.map(n => (
                    <NotifRow key={n.id} n={n} glowColor="#FFC928" />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── 通話 ── */}
          {voiceNotifs.length > 0 && (
            <div className="px-4 mb-4">
              <div className="flex items-center gap-2 py-3">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,201,40,0.8)' }}>🎙️ ゲーム村通話</span>
              </div>
              <div className="rounded-2xl overflow-hidden"
                style={{ background: 'rgba(255,201,40,0.06)', border: '1px solid rgba(255,201,40,0.25)', boxShadow: '0 4px 24px rgba(255,201,40,0.15)' }}>
                <div className="divide-y" style={{ borderColor: 'rgba(255,201,40,0.12)' }}>
                  {voiceNotifs.map(n => (
                    <NotifRow key={n.id} n={n} glowColor="#FFC928" />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── その他 ── */}
          {otherNotifs.length > 0 && (
            <div className="px-4 mb-4">
              <div className="flex items-center gap-2 py-3">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  その他
                </span>
              </div>
              <div className="rounded-2xl overflow-hidden"
                style={{ background: 'rgba(255,201,40,0.03)', border: '1px solid rgba(255,201,40,0.1)' }}>
                <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  {otherNotifs.map(n => (
                    <NotifRow key={n.id} n={n} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

