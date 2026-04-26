'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'

type Notif = {
  id: string
  type: 'like' | 'reply' | 'follow' | 'comment' | 'bottle_reply'
  actor_id: string | null
  target_id: string | null
  target_type: string | null
  is_read: boolean
  created_at: string
  actor: { display_name: string; avatar_url: string | null } | null
}

const TYPE_CONFIG = {
  like:         { emoji: '💡', label: 'あなたの考えに共感しました' },
  reply:        { emoji: '💬', label: 'あなたの考えに返しました' },
  follow:       { emoji: '📖', label: 'あなたから学ぶことにしました' },
  comment:      { emoji: '🏕️', label: '村の議題にコメントしました' },
  bottle_reply: { emoji: '🍶', label: '相談に返信しました' },
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifs, setNotifs]     = useState<Notif[]>([])
  const [loading, setLoading]   = useState(true)
  const [userId, setUserId]     = useState<string | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUserId(user.id)

    const { data } = await supabase
      .from('notifications')
      .select('*, actor:actor_id(display_name, avatar_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    setNotifs((data || []) as Notif[])
    setLoading(false)

    // 全部既読にする
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
    } else if (n.type === 'bottle_reply') {
      router.push('/mypage')
    }
  }

  // 日付グループ
  function getGroup(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const h = diff / 3600000
    if (h < 24)  return '今日'
    if (h < 48)  return '昨日'
    if (h < 168) return '今週'
    return 'それ以前'
  }

  const grouped = notifs.reduce<Record<string, Notif[]>>((acc, n) => {
    const g = getGroup(n.created_at)
    if (!acc[g]) acc[g] = []
    acc[g].push(n)
    return acc
  }, {})

  const GROUP_ORDER = ['今日', '昨日', '今週', 'それ以前']

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9]">

      {/* ── ヘッダー ── */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-stone-100 px-4 pt-4 pb-3">
        <h1 className="font-extrabold text-stone-900 text-lg">今日の収穫</h1>
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
          <p className="font-bold text-stone-700 text-base mb-1">今日の収穫はまだありません</p>
          <p className="text-sm text-stone-400 leading-relaxed">
            議題への共感・QAへの感謝・村での活動がここに届きます
          </p>
        </div>
      ) : (
        <div className="pb-28">
          {GROUP_ORDER.filter(g => grouped[g]?.length).map(group => (
            <div key={group}>
              {/* グループラベル */}
              <div className="px-4 pt-5 pb-2">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">{group}</span>
              </div>

              <div className="bg-white border-y border-stone-100 divide-y divide-stone-50">
                {grouped[group].map(n => {
                  const cfg = TYPE_CONFIG[n.type]
                  const actor = n.actor as any
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleTap(n)}
                      className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-stone-50 active:bg-stone-100 transition-colors text-left"
                    >
                      {/* アバター + 絵文字バッジ */}
                      <div className="relative flex-shrink-0">
                        <Avatar
                          src={actor?.avatar_url}
                          name={actor?.display_name ?? '?'}
                          size="sm"
                        />
                        <span className="absolute -bottom-1 -right-1 text-sm leading-none">
                          {cfg.emoji}
                        </span>
                      </div>

                      {/* テキスト */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-stone-800 leading-snug">
                          <span className="font-bold">{actor?.display_name ?? '誰か'}</span>
                          {' '}
                          <span className="text-stone-500">{cfg.label}</span>
                        </p>
                        <p className="text-xs text-stone-400 mt-0.5">{timeAgo(n.created_at)}</p>
                      </div>

                      {/* 未読ドット */}
                      {!n.is_read && (
                        <span className="w-2 h-2 bg-brand-500 rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
