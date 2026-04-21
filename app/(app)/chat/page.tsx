'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Avatar from '@/components/ui/Avatar'
import { createClient } from '@/lib/supabase/client'
import { getNationalityFlag, timeAgo } from '@/lib/utils'
import type { Profile, Message } from '@/types'

const TAG_EMOJIS: Record<string, string> = {
  Drinks: '🍻', Food: '🍜', Coffee: '☕', Sightseeing: '🗺️',
  Culture: '🎌', Talk: '💬', Help: '🆘', Other: '✨',
}

interface GroupChat {
  postId: string
  content: string
  tag: string
  area: string
  participantCount: number
  lastActivity: string
  flags: string[]
}

interface DirectChat {
  matchId: string
  other: Profile
  lastMessage: Message | null
}

export default function ChatListPage() {
  const router = useRouter()
  const [groups, setGroups] = useState<GroupChat[]>([])
  const [directs, setDirects] = useState<DirectChat[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'groups' | 'direct'>('groups')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Group chats — posts the user joined
      const { data: joins } = await supabase
        .from('post_joins')
        .select('post_id, posts(id, content, tag, area, created_at, status, post_joins(user_id, profiles(nationality)), post_messages(id, created_at))')
        .eq('user_id', user.id)

      const groupData: GroupChat[] = (joins || [])
        .map((j: any) => j.posts)
        .filter((p: any) => p && p.status === 'active')
        .map((p: any) => {
          const msgs = p.post_messages || []
          const lastMsg = msgs.sort((a: any, b: any) => b.created_at.localeCompare(a.created_at))[0]
          const flags = (p.post_joins || [])
            .slice(0, 5)
            .map((pj: any) => getNationalityFlag(pj.profiles?.nationality || ''))
          return {
            postId: p.id,
            content: p.content,
            tag: p.tag,
            area: p.area,
            participantCount: p.post_joins?.length ?? 0,
            lastActivity: lastMsg?.created_at ?? p.created_at,
            flags,
          }
        })
        .sort((a: GroupChat, b: GroupChat) => b.lastActivity.localeCompare(a.lastActivity))

      setGroups(groupData)

      // Direct chats (1on1 from matches)
      const { data: matchData } = await supabase
        .from('matches')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (matchData?.length) {
        const otherIds = matchData.map(m => m.user1_id === user.id ? m.user2_id : m.user1_id)
        const matchIds = matchData.map(m => m.id)
        const [{ data: profileData }, { data: msgData }] = await Promise.all([
          supabase.from('profiles').select('*').in('id', otherIds),
          supabase.from('messages').select('*').in('match_id', matchIds)
            .eq('is_deleted', false).order('created_at', { ascending: false }),
        ])
        const profileMap = new Map((profileData || []).map(p => [p.id, p]))
        const lastMsgMap = new Map<string, Message>()
        ;(msgData || []).forEach((msg: Message) => {
          if (!lastMsgMap.has(msg.match_id)) lastMsgMap.set(msg.match_id, msg)
        })
        const directData = matchData.map(m => {
          const otherId = m.user1_id === user.id ? m.user2_id : m.user1_id
          return { matchId: m.id, other: profileMap.get(otherId)!, lastMessage: lastMsgMap.get(m.id) || null }
        }).filter(c => c.other)
        setDirects(directData)
      }

      setLoading(false)
    }
    load()
  }, [])

  const totalGroups = groups.length
  const totalDirects = directs.length

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9]">
      <Header title="Messages" />

      {/* Tab toggle */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex gap-1 bg-stone-100 rounded-xl p-1">
          <button onClick={() => setTab('groups')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              tab === 'groups' ? 'bg-white text-brand-600 shadow-sm' : 'text-stone-500'
            }`}>
            🎯 Groups {totalGroups > 0 && `(${totalGroups})`}
          </button>
          <button onClick={() => setTab('direct')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              tab === 'direct' ? 'bg-white text-brand-600 shadow-sm' : 'text-stone-500'
            }`}>
            💬 Direct {totalDirects > 0 && `(${totalDirects})`}
          </button>
        </div>
      </div>

      <div className="px-4 pb-24 space-y-2">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-stone-100 p-4 animate-pulse flex gap-3">
              <div className="w-12 h-12 bg-stone-200 rounded-2xl flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-stone-200 rounded w-1/2" />
                <div className="h-3 bg-stone-100 rounded w-3/4" />
              </div>
            </div>
          ))
        ) : tab === 'groups' ? (
          groups.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">🎯</div>
              <p className="font-bold text-stone-700">No group chats yet</p>
              <p className="text-sm text-stone-400 mt-1.5 mb-4">Join someone's activity to start chatting</p>
              <button onClick={() => router.push('/home')}
                className="px-5 py-2.5 bg-brand-500 text-white rounded-2xl text-sm font-bold shadow-sm">
                Explore posts →
              </button>
            </div>
          ) : (
            groups.map(g => (
              <Link key={g.postId} href={`/post/${g.postId}`}>
                <div className="bg-white border border-stone-100 rounded-2xl p-4 flex items-center gap-3 hover:shadow-sm transition active:bg-stone-50">
                  <div className="w-12 h-12 bg-brand-50 border border-brand-100 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl">
                    {TAG_EMOJIS[g.tag] ?? '✨'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="font-bold text-stone-900 text-sm truncate">{g.content}</p>
                      <span className="text-[10px] text-stone-400 flex-shrink-0 ml-1">{timeAgo(g.lastActivity)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">{g.flags.map((f, i) => <span key={i} className="text-sm">{f}</span>)}</div>
                      <span className="text-xs text-stone-400">👥 {g.participantCount}</span>
                      {g.area && <span className="text-xs text-stone-400">· 📍 {g.area}</span>}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )
        ) : (
          directs.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">💬</div>
              <p className="font-bold text-stone-700">No direct messages yet</p>
              <p className="text-sm text-stone-400 mt-1.5">Messages from matches appear here</p>
            </div>
          ) : (
            directs.map(c => (
              <Link key={c.matchId} href={`/chat/${c.matchId}`}>
                <div className="bg-white rounded-2xl p-4 flex items-center gap-3 border border-stone-100 hover:shadow-sm transition active:bg-stone-50">
                  <Avatar src={c.other.avatar_url} name={c.other.display_name} size="md" isOnline={c.other.is_online} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-stone-900 text-sm truncate">{c.other.display_name}</span>
                        <span className="text-sm">{getNationalityFlag(c.other.nationality)}</span>
                      </div>
                      {c.lastMessage && (
                        <span className="text-xs text-stone-400 flex-shrink-0">{timeAgo(c.lastMessage.created_at)}</span>
                      )}
                    </div>
                    <p className="text-sm text-stone-500 truncate mt-0.5">
                      {c.lastMessage ? c.lastMessage.content : 'Say hello! 👋'}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          )
        )}
      </div>
    </div>
  )
}
