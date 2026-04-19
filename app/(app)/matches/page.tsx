'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Avatar from '@/components/ui/Avatar'
import { createClient } from '@/lib/supabase/client'
import { getNationalityFlag, timeAgo } from '@/lib/utils'
import type { Match, Profile } from '@/types'

export default function MatchesPage() {
  const [matches, setMatches] = useState<(Match & { other: Profile })[]>([])
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
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', otherIds)

      const profileMap = new Map((profileData || []).map(p => [p.id, p]))

      setMatches(matchData.map(m => ({
        ...m,
        other: profileMap.get(m.user1_id === user.id ? m.user2_id : m.user1_id)!,
      })).filter(m => m.other))
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div>
      <Header title="Matches" />
      <div className="px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-3xl p-4 animate-pulse flex gap-3">
                <div className="w-14 h-14 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">❤️</div>
            <p className="font-semibold text-gray-700">No matches yet</p>
            <p className="text-sm text-gray-500 mt-1">Like someone — if they like you back, it's a match!</p>
            <Link href="/home" className="inline-block mt-4 text-brand-500 text-sm font-semibold">
              Start Discovering →
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-3">{matches.length} match{matches.length !== 1 ? 'es' : ''}</p>
            <div className="space-y-2">
              {matches.map(m => (
                <Link key={m.id} href={`/chat/${m.id}`}>
                  <div className="bg-white rounded-3xl p-4 flex items-center gap-3 hover:shadow-sm transition border border-gray-100">
                    <Avatar
                      src={m.other.avatar_url}
                      name={m.other.display_name}
                      size="md"
                      isOnline={m.other.is_online}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-gray-900">{m.other.display_name}</span>
                        <span className="text-sm">{getNationalityFlag(m.other.nationality)}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Matched {timeAgo(m.created_at)}
                      </p>
                    </div>
                    <div className="text-brand-500 text-sm font-semibold">Chat →</div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
