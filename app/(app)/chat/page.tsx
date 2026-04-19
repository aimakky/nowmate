'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Avatar from '@/components/ui/Avatar'
import { createClient } from '@/lib/supabase/client'
import { getNationalityFlag, timeAgo } from '@/lib/utils'
import type { Profile, Message } from '@/types'

interface ChatPreview {
  matchId: string
  other: Profile
  lastMessage: Message | null
  unread: boolean
}

export default function ChatListPage() {
  const [chats, setChats] = useState<ChatPreview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: matchData } = await supabase
        .from('matches')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (!matchData?.length) { setLoading(false); return }

      const otherIds = matchData.map(m => m.user1_id === user.id ? m.user2_id : m.user1_id)
      const matchIds = matchData.map(m => m.id)

      const [{ data: profileData }, { data: msgData }] = await Promise.all([
        supabase.from('profiles').select('*').in('id', otherIds),
        supabase.from('messages')
          .select('*')
          .in('match_id', matchIds)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false }),
      ])

      const profileMap = new Map((profileData || []).map(p => [p.id, p]))
      const lastMsgMap = new Map<string, Message>()
      ;(msgData || []).forEach(msg => {
        if (!lastMsgMap.has(msg.match_id)) lastMsgMap.set(msg.match_id, msg)
      })

      setChats(matchData.map(m => {
        const otherId = m.user1_id === user.id ? m.user2_id : m.user1_id
        return {
          matchId: m.id,
          other: profileMap.get(otherId)!,
          lastMessage: lastMsgMap.get(m.id) || null,
          unread: false,
        }
      }).filter(c => c.other)
        .sort((a, b) => {
          const ta = a.lastMessage?.created_at ?? a.matchId
          const tb = b.lastMessage?.created_at ?? b.matchId
          return tb.localeCompare(ta)
        })
      )
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div>
      <Header title="Messages" />
      <div className="px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-3xl p-4 animate-pulse flex gap-3">
                <div className="w-14 h-14 bg-gray-200 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : chats.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">💬</div>
            <p className="font-semibold text-gray-700">No messages yet</p>
            <p className="text-sm text-gray-500 mt-1">Match with someone to start chatting!</p>
            <Link href="/home" className="inline-block mt-4 text-brand-500 text-sm font-semibold">
              Discover People →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {chats.map(c => (
              <Link key={c.matchId} href={`/chat/${c.matchId}`}>
                <div className="bg-white rounded-3xl p-4 flex items-center gap-3 hover:shadow-sm transition border border-gray-100 active:bg-gray-50">
                  <Avatar
                    src={c.other.avatar_url}
                    name={c.other.display_name}
                    size="md"
                    isOnline={c.other.is_online}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-gray-900 truncate">{c.other.display_name}</span>
                        <span className="text-sm">{getNationalityFlag(c.other.nationality)}</span>
                      </div>
                      {c.lastMessage && (
                        <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(c.lastMessage.created_at)}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate mt-0.5">
                      {c.lastMessage ? c.lastMessage.content : 'Say hello! 👋'}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
