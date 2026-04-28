'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'

type Notif = {
  id: string
  type: 'like' | 'reply' | 'follow' | 'comment' | 'bottle_reply' | 'new_member_post' | 'voice_room_started'
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
  new_member_post:    { emoji: '🌱', label: '村に初めての言葉を残しました — 迎えてあげて', section: 'reaction' },
  voice_room_started: { emoji: '🎙️', label: '今夜の広場、少しだけ顔出してみませんか？',   section: 'voice'    },
  comment:            { emoji: '🏕️', label: '村の話題にそっとコメントしました',           section: 'other'    },
  bottle_reply:       { emoji: '🍶', label: '波の向こうから、返事が来ました',              section: 'other'    },
  tier_up:            { emoji: '🌿', label: '村のみんなが、あなたを信頼し始めています',    section: 'other'    },
  bottle_found:       { emoji: '🍶', label: 'あなたの瓶を、誰かが大切に拾ってくれました', section: 'other'    },
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifs,  setNotifs]  = useState<Notif[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase
      .from('notifications')
      .select('*, actor:actor_id(display_name, avatar_url)')
      .eq('user_id', user.id)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(80)

    setNotifs((data || []) as Notif[])
    setLoading(false)

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
  }

  const reactionNotifs = notifs.filter(n => TYPE_CONFIG[n.type]?.section === 'reaction')
  const voiceNotifs    = notifs.filter(n => TYPE_CONFIG[n.type]?.section === 'voice')
  const otherNotifs    = notifs.filter(n => TYPE_CONFIG[n.type]?.section === 'other' || !TYPE_CONFIG[n.type])
  const unreadCount    = notifs.filter(n => !n.is_read).length

  function NotifRow({ n, tint }: { n: Notif; tint?: string }) {
    const cfg   = TYPE_CONFIG[n.type] ?? { emoji: '🔔', label: '通知', section: 'other' as const }
    const actor = n.actor as any
    return (
      <button
        onClick={() => handleTap(n)}
        className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors active:bg-stone-50 ${
          !n.is_read && tint ? tint : (!n.is_read ? 'bg-brand-50/30' : '')
        }`}
      >
        <div className="relative flex-shrink-0">
          <Avatar src={actor?.avatar_url} name={actor?.display_name ?? '?'} size="sm" />
          <span className="absolute -bottom-1 -right-1 text-sm leading-none">{cfg.emoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-stone-800 leading-snug">
            <span className="font-bold">{actor?.display_name ?? '誰か'}</span>
            {' '}
            <span className="text-stone-600">{cfg.label}</span>
          </p>
          <p className="text-xs text-stone-400 mt-0.5">{timeAgo(n.created_at)}</p>
        </div>
        {!n.is_read && (
          <span className="w-2 h-2 bg-brand-500 rounded-full flex-shrink-0 mt-1.5" />
        )}
      </button>
    )
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-birch">

      {/* ── ヘッダー ── */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-stone-100 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="font-extrabold text-stone-900 text-lg">通知</h1>
          {unreadCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-500 border border-red-100">
              🔴 {unreadCount}件未読
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="px-4 pt-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-stone-100 p-4 flex gap-3 animate-pulse">
              <div className="w-10 h-10 bg-stone-200 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 bg-stone-200 rounded w-3/4" />
                <div className="h-3 bg-stone-100 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : notifs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 px-8 text-center">
          <div className="text-6xl mb-4">🔔</div>
          <p className="font-bold text-stone-700 text-base mb-1">通知はまだありません</p>
          <p className="text-sm text-stone-400 leading-relaxed">
            村に投稿・返信・共感をすると、ここに届きます
          </p>
        </div>
      ) : (
        <div className="pb-28">

          {/* ── 返信・反応 ── */}
          {reactionNotifs.length > 0 && (
            <div>
              <div className="px-4 pt-5 pb-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[11px] font-bold text-red-500 uppercase tracking-wider">
                  返信・反応
                </span>
              </div>
              <div className="mx-4 rounded-2xl overflow-hidden border border-red-100 shadow-sm divide-y divide-red-50">
                {reactionNotifs.map(n => (
                  <NotifRow key={n.id} n={n} tint="bg-red-50/40" />
                ))}
              </div>
            </div>
          )}

          {/* ── 通話 ── */}
          {voiceNotifs.length > 0 && (
            <div>
              <div className="px-4 pt-5 pb-2 flex items-center gap-2">
                <span className="text-[11px] font-bold text-violet-500 uppercase tracking-wider">🎙️ 通話</span>
              </div>
              <div className="mx-4 rounded-2xl overflow-hidden border border-violet-100 shadow-sm divide-y divide-violet-50 bg-white">
                {voiceNotifs.map(n => (
                  <NotifRow key={n.id} n={n} tint="bg-violet-50/40" />
                ))}
              </div>
            </div>
          )}

          {/* ── その他 ── */}
          {otherNotifs.length > 0 && (
            <div>
              <div className="px-4 pt-5 pb-2">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  その他
                </span>
              </div>
              <div className="bg-white border-y border-stone-100 divide-y divide-stone-50">
                {otherNotifs.map(n => (
                  <NotifRow key={n.id} n={n} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
