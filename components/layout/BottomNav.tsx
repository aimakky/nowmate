'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Compass, Users, Heart, MessageCircle, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/home',     label: 'People',   icon: Users },
  { href: '/activity', label: 'Activity', icon: Compass },
  { href: '/matches',  label: 'Matches',  icon: Heart },
  { href: '/chat',     label: 'Chat',     icon: MessageCircle },
  { href: '/mypage',   label: 'Me',       icon: User },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [matchCount, setMatchCount] = useState(0)
  const [msgCount, setMsgCount] = useState(0)

  // Fetch unread counts (Noah's growth: badge = reason to open app)
  useEffect(() => {
    async function fetchCounts() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // New matches (last 24h)
      const yesterday = new Date(Date.now() - 86400000).toISOString()
      const { count: mc } = await supabase.from('matches').select('id', { count: 'exact', head: true })
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .gte('created_at', yesterday)
      setMatchCount(mc ?? 0)

      // Unread messages: matches with messages I haven't sent (approximation)
      const { data: matches } = await supabase.from('matches').select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      const matchIds = (matches || []).map(m => m.id)
      if (matchIds.length) {
        const { count: msgC } = await supabase.from('messages').select('id', { count: 'exact', head: true })
          .in('match_id', matchIds).neq('sender_id', user.id).gte('created_at', yesterday)
        setMsgCount(msgC ?? 0)
      }
    }
    fetchCounts()
  }, [pathname])

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-gray-100 safe-area-pb">
      <div className="max-w-[430px] mx-auto flex">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          const badge = href === '/matches' ? matchCount
                      : href === '/chat'    ? msgCount
                      : 0

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative transition-colors',
                active ? 'text-brand-500' : 'text-gray-400 hover:text-gray-500'
              )}
            >
              <div className="relative">
                <Icon size={21} strokeWidth={active ? 2.5 : 1.8} />
                {badge > 0 && !active && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className={cn(
                'text-[9px] font-semibold tracking-wide',
                active ? 'text-brand-500' : 'text-gray-400'
              )}>
                {label}
              </span>
              {active && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-brand-500 rounded-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
