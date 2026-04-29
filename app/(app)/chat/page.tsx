'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/ui/Avatar'
import TrustBadge from '@/components/ui/TrustBadge'
import { createClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/utils'
import { Edit2 } from 'lucide-react'

interface DirectChat {
  matchId: string
  other: {
    id: string
    display_name: string
    avatar_url: string | null
    is_online: boolean
    trust_tier?: string | null
  }
  lastMessage: { content: string; created_at: string; sender_id: string } | null
}

interface OnlineUser {
  id: string
  display_name: string
  avatar_url: string | null
}

export default function ChatListPage() {
  const router = useRouter()
  const [directs, setDirects] = useState<DirectChat[]>([])
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        setUserId(user.id)

        const { data: matchData, error: matchErr } = await supabase
          .from('matches')
          .select('id, user1_id, user2_id')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .order('created_at', { ascending: false })

        if (matchErr || !matchData || matchData.length === 0) {
          setLoading(false)
          return
        }

        const otherIds = matchData.map((m: any) =>
          m.user1_id === user.id ? m.user2_id : m.user1_id
        )
        const matchIds = matchData.map((m: any) => m.id)

        const [{ data: profileData }, { data: trustData }, { data: msgData }] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, display_name, avatar_url, is_online')
            .in('id', otherIds),
          supabase
            .from('user_trust')
            .select('user_id, tier')
            .in('user_id', otherIds),
          supabase
            .from('messages')
            .select('match_id, content, created_at, sender_id')
            .in('match_id', matchIds)
            .order('created_at', { ascending: false }),
        ])

        const profileMap  = new Map((profileData || []).map((p: any) => [p.id, p]))
        const trustMap    = new Map((trustData   || []).map((t: any) => [t.user_id, t.tier]))
        const lastMsgMap  = new Map<string, any>()
        ;(msgData || []).forEach((msg: any) => {
          if (!lastMsgMap.has(msg.match_id)) lastMsgMap.set(msg.match_id, msg)
        })

        const directData: DirectChat[] = matchData
          .map((m: any) => {
            const otherId = m.user1_id === user.id ? m.user2_id : m.user1_id
            const other   = profileMap.get(otherId)
            if (!other) return null
            return {
              matchId: m.id,
              other: { ...other, trust_tier: trustMap.get(otherId) ?? null },
              lastMessage: lastMsgMap.get(m.id) ?? null,
            }
          })
          .filter(Boolean) as DirectChat[]

        directData.sort((a, b) => {
          const ta = a.lastMessage?.created_at ?? '0'
          const tb = b.lastMessage?.created_at ?? '0'
          return tb.localeCompare(ta)
        })

        setDirects(directData)

        // オンラインユーザーを抽出
        const online = (profileData || [])
          .filter((p: any) => p.is_online && otherIds.includes(p.id))
          .map((p: any) => ({ id: p.id, display_name: p.display_name, avatar_url: p.avatar_url }))
        setOnlineUsers(online)

      } catch (e) {
        console.error('chat load error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white">

      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-white border-b border-stone-100 px-4 pt-12 pb-3 flex items-center justify-between">
        <h1 className="font-extrabold text-stone-900 text-xl">チャット</h1>
        <button className="text-sm font-semibold text-brand-500 active:opacity-60 transition-opacity">
          編集
        </button>
      </div>

      <div className="pb-28">

        {/* オンライン中フレンド */}
        {!loading && onlineUsers.length > 0 && (
          <div className="px-4 pt-4 pb-3">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">
              オンライン中
            </p>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
              {onlineUsers.map(u => (
                <div key={u.id} className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-stone-100 ring-2 ring-white">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt={u.display_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-brand-100">
                          <span className="text-xl font-bold text-brand-500">
                            {u.display_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white" />
                  </div>
                  <span className="text-[10px] font-medium text-stone-600 max-w-[52px] truncate text-center">
                    {u.display_name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 区切り */}
        {!loading && onlineUsers.length > 0 && (
          <div className="h-px bg-stone-100 mx-4" />
        )}

        {/* チャットリスト */}
        <div className="pt-2">
          {loading ? (
            <div className="space-y-0">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-3 animate-pulse">
                  <div className="w-14 h-14 bg-stone-100 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-stone-100 rounded w-1/4" />
                    <div className="h-3 bg-stone-50 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : directs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
              <div className="w-20 h-20 rounded-full bg-stone-50 flex items-center justify-center mb-4">
                <span className="text-4xl">💬</span>
              </div>
              <p className="font-extrabold text-stone-700 text-base">まだチャットがありません</p>
              <p className="text-sm text-stone-400 mt-1.5 leading-relaxed max-w-[220px]">
                村で話した人とDMができます
              </p>
              <button onClick={() => router.push('/villages')}
                className="mt-5 px-6 py-3 bg-brand-500 text-white rounded-2xl text-sm font-bold shadow-md shadow-brand-200 active:scale-95 transition-all">
                村を探す →
              </button>
            </div>
          ) : (
            <div>
              {directs.map(c => {
                const isMine = c.lastMessage?.sender_id === userId
                return (
                  <Link key={c.matchId} href={`/chat/${c.matchId}`}>
                    <div className="px-4 py-3 flex items-center gap-3 active:bg-stone-50 transition-colors">
                      {/* アバター */}
                      <div className="relative flex-shrink-0">
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-stone-100">
                          {c.other.avatar_url ? (
                            <img src={c.other.avatar_url} alt={c.other.display_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-brand-100">
                              <span className="text-xl font-bold text-brand-500">
                                {c.other.display_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        {c.other.is_online && (
                          <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                        )}
                      </div>

                      {/* テキスト */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-bold text-stone-900 text-sm truncate">
                              {c.other.display_name}
                            </span>
                            {c.other.trust_tier && (
                              <TrustBadge tierId={c.other.trust_tier} size="xs" showLabel={false} />
                            )}
                          </div>
                          {c.lastMessage && (
                            <span className="text-[11px] text-stone-400 flex-shrink-0 ml-2">
                              {timeAgo(c.lastMessage.created_at)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-stone-400 truncate">
                          {c.lastMessage
                            ? `${isMine ? 'あなた: ' : ''}${c.lastMessage.content}`
                            : '👋 最初のメッセージを送ってみよう'}
                        </p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
