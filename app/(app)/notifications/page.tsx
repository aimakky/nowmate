'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import { User } from 'lucide-react'

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
  new_member_post:    { emoji: '🌱', label: 'ギルドに初めての投稿をしました — 迎えてあげて', section: 'reaction' },
  voice_room_started: { emoji: '🎙️', label: 'ゲーム村が開きました — 参加しませんか？',       section: 'voice'    },
  comment:            { emoji: '🛡️', label: 'ギルドの投稿にコメントしました',               section: 'other'    },
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
          <Avatar src={actor?.avatar_url} name={actor?.display_name ?? '?'} size="sm" />
          <span className="absolute -bottom-1 -right-1 text-sm leading-none">{cfg.emoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-snug" style={{ color: 'rgba(255,255,255,0.9)' }}>
            <span className="font-bold">{actor?.display_name ?? '誰か'}</span>
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

      {/* ── ヘッダー ── */}
      <div className="sticky top-0 z-10 px-4 pt-12 pb-3 backdrop-blur-md"
        style={{ background: 'rgba(8,8,18,0.92)', borderBottom: '1px solid rgba(255,201,40,0.2)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ border: '2px solid rgba(255,201,40,0.6)', background: 'rgba(255,201,40,0.1)' }}>
              <User size={16} style={{ color: '#FFC928' }} />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#FFC928' }}>NOTIFICATIONS</p>
              <h1 className="font-extrabold text-2xl leading-tight" style={{ color: '#F0EEFF' }}>通知</h1>
            </div>
          </div>
          {unreadCount > 0 && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(255,201,40,0.15)', color: '#FFC928', border: '1px solid rgba(255,201,40,0.35)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#FFC928' }} />
              {unreadCount}件未読
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="px-4 pt-4 space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-2xl p-4 flex gap-3 animate-pulse"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="w-10 h-10 rounded-full flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }} />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 rounded w-3/4" style={{ background: 'rgba(255,255,255,0.1)' }} />
                <div className="h-3 rounded w-1/3" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>
            </div>
          ))}
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

