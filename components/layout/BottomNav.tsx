'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Compass, Scroll, Bell, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/villages',      label: '村',       labelEn: 'Villages', icon: Compass },
  { href: '/timeline',      label: 'つぶやき',  labelEn: 'Feed',     icon: Scroll  },
  { href: '/notifications', label: '通知',      labelEn: 'Alerts',   icon: Bell    },
  { href: '/mypage',        label: 'マイページ', labelEn: 'My Page',  icon: User    },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    async function fetchUnread() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      setUnread(count ?? 0)
    }
    fetchUnread()

    // 通知ページを開いたら未読をリセット
    if (pathname === '/notifications') setUnread(0)
  }, [pathname])

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-stone-100 safe-area-pb">
      <div className="max-w-[430px] mx-auto flex items-center h-16">
        {NAV_ITEMS.map(({ href, label, labelEn, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          const isBell = href === '/notifications'
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-1.5 gap-0 relative transition-colors',
                active ? 'text-stone-900' : 'text-stone-400 hover:text-stone-500'
              )}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                {isBell && unread > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center px-0.5 leading-none">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </div>
              <span className={cn(
                'text-[9px] font-bold tracking-wide mt-0.5',
                active ? 'text-stone-900' : 'text-stone-400'
              )}>
                {label}
              </span>
              <span className={cn(
                'text-[7px] font-medium',
                active ? 'text-stone-400' : 'text-stone-300'
              )}>
                {labelEn}
              </span>
              {active && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-stone-900 rounded-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
