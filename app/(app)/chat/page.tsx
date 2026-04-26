'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/ui/Avatar'
import { createClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/utils'
import { getOccupationBadge } from '@/lib/occupation'
import { MessageCircle } from 'lucide-react'

interface DirectChat {
  matchId: string
  other: {
    id: string
    display_name: string
    avatar_url: string | null
    is_online: boolean
    occupation?: string | null
  }
  lastMessage: { content: string; created_at: string; sender_id: string } | null
}

export default function ChatListPage() {
  const router = useRouter()
  const [directs,  setDirects]  = useState<DirectChat[]>([])
  const [loading,  setLoading]  = useState(true)
  const [userId,   setUserId]   = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      // マッチ一覧取得
      const { data: matchData } = await supabase
        .from('matches')
        .select('id, user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (!matchData || matchData.length === 0) {
        setLoading(false)
        return
      }

      const otherIds  = matchData.map((m: any) => m.user1_id === user.id ? m.user2_id : m.user1_id)
      const matchIds  = matchData.map((m: any) => m.id)

      const [{ data: profileData }, { data: msgData }] = await Promise.all([
        supabase.from('profiles')
          .select('id, display_name, avatar_url, is_online, occupation')
          .in('id', otherIds),
        supabase.from('messages')
          .select('match_id, content, created_at, sender_id')
          .in('match_id', matchIds)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false }),
      ])

      const profileMap = new Map((profileData || []).map((p: any) => [p.id, p]))
      const lastMsgMap = new Map<string, any>()
      ;(msgData || []).forEach((msg: any) => {
        if (!lastMsgMap.has(msg.match_id)) lastMsgMap.set(msg.match_id, msg)
      })

      const directData: DirectChat[] = matchData
        .map((m: any) => {
          const otherId = m.user1_id === user.id ? m.user2_id : m.user1_id
          const other   = profileMap.get(otherId)
          if (!other) return null
          return { matchId: m.id, other, lastMessage: lastMsgMap.get(m.id) ?? null }
        })
        .filter(Boolean) as DirectChat[]

      // 最終メッセージ時刻でソート
      directData.sort((a, b) => {
        const ta = a.lastMessage?.created_at ?? '0'
        const tb = b.lastMessage?.created_at ?? '0'
        return tb.localeCompare(ta)
      })

      setDirects(directData)
      setLoading(false)
    }
    load()
  }, [router])

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9]">

      {/* ヘッダー */}
      <div className="px-4 pt-12 pb-4"
        style={{ background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)' }}>
        <h1 className="font-extrabold text-white text-2xl">チャット</h1>
        <p className="text-xs text-white/50 mt-0.5">マッチした相手とのメッセージ</p>
      </div>

      <div className="px-4 pt-4 pb-28">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-stone-100 p-4 animate-pulse flex gap-3">
                <div className="w-12 h-12 bg-stone-200 rounded-2xl flex-shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3.5 bg-stone-200 rounded w-1/3" />
                  <div className="h-3 bg-stone-100 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : directs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-3xl bg-stone-100 flex items-center justify-center mb-4">
              <MessageCircle size={36} className="text-stone-300" />
            </div>
            <p className="font-extrabold text-stone-700 text-base">まだチャットがありません</p>
            <p className="text-sm text-stone-400 mt-1.5 leading-relaxed max-w-[220px]">
              他のユーザーとマッチするとここに表示されます
            </p>
            <button onClick={() => router.push('/villages')}
              className="mt-5 px-6 py-3 bg-brand-500 text-white rounded-2xl text-sm font-bold shadow-md shadow-brand-200 active:scale-95 transition-all">
              村を探す →
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {directs.map(c => {
              const occBadge = getOccupationBadge(c.other.occupation)
              const isMine   = c.lastMessage?.sender_id === userId
              return (
                <Link key={c.matchId} href={`/chat/${c.matchId}`}>
                  <div className="bg-white border border-stone-100 rounded-2xl p-4 flex items-center gap-3 active:bg-stone-50 transition-all shadow-sm">
                    <div className="flex-shrink-0">
                      <Avatar
                        src={c.other.avatar_url}
                        name={c.other.display_name}
                        size="md"
                        isOnline={c.other.is_online}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-bold text-stone-900 text-sm truncate">
                            {c.other.display_name}
                          </span>
                          {occBadge && (
                            <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 whitespace-nowrap">
                              {occBadge.emoji} {occBadge.label}
                            </span>
                          )}
                        </div>
                        {c.lastMessage && (
                          <span className="text-[10px] text-stone-400 flex-shrink-0 ml-2">
                            {timeAgo(c.lastMessage.created_at)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 truncate">
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
  )
}
