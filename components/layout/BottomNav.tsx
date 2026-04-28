'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Compass, Layers, Bell, MessageCircle, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/timeline',      label: 'TL',      icon: Layers         },
  { href: '/villages',      label: '自由村',  icon: Compass        },
  { href: '/guild',         label: '仕事村',  icon: Briefcase      },
  { href: '/notifications', label: '通知',    icon: Bell           },
  { href: '/chat',          label: 'チャット', icon: MessageCircle },
]

export default function BottomNav() {
  const pathname   = usePathname()
  const [notifCount,  setNotifCount]  = useState(0)
  const [chatCount,   setChatCount]   = useState(0)

  useEffect(() => {
    async function fetchBadges() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // 未読通知数
        const { count: nc } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false)
        setNotifCount(nc ?? 0)

        // 未読チャット数
        const { data: matches } = await supabase
          .from('matches')
          .select('id')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        if (matches && matches.length > 0) {
          const matchIds = matches.map((m: any) => m.id)
          const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
          const { count: mc } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .in('match_id', matchIds)
            .neq('sender_id', user.id)
            .gte('created_at', since48h)
          setChatCount(mc ?? 0)
        }


      } catch {
        // silent
      }
    }
    fetchBadges()
    const interval = setInterval(fetchBadges, 30_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (pathname === '/notifications') setNotifCount(0)
    if (pathname === '/chat' || pathname.startsWith('/chat/')) setChatCount(0)
  }, [pathname])

  const badges: Record<string, number> = { '/notifications': notifCount }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-stone-100 safe-area-pb">
      <div className="max-w-[430px] mx-auto flex items-center h-16">

        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          const badge  = badges[href] ?? 0
          return (
            <Link key={href} href={href}
              className={cn('flex-1 flex flex-col items-center justify-center py-1.5 gap-0 relative transition-colors',
                active ? 'text-stone-900' : 'text-stone-400')}>
              <div className="relative">
                {Icon && <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />}
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-brand-500 rounded-full flex items-center justify-center px-1">
                    <span className="text-[9px] font-extrabold text-white leading-none">{badge > 99 ? '99+' : badge}</span>
                  </span>
                )}
              </div>
              <span className={cn('text-[9px] font-bold tracking-wide mt-0.5',
                active ? 'text-stone-900' : 'text-stone-400')}>{label}</span>
              {active && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-stone-900 rounded-full" />}
            </Link>
          )
        })}

      </div>
    </nav>
  )
}
