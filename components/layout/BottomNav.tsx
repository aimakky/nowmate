'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Compass, Layers, Bell, Gamepad2, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/timeline',      label: 'TL',    icon: Layers   },
  { href: '/villages',      label: '休憩村', icon: Compass  },
  { href: '/guild',         label: 'ゲーム村', icon: Gamepad2 },
  { href: '/guilds',        label: 'ギルド', icon: Shield   },
  { href: '/notifications', label: '通知',  icon: Bell     },
]

export default function BottomNav() {
  const pathname   = usePathname()
  const [notifCount, setNotifCount] = useState(0)

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
  }, [pathname])

  const badges: Record<string, number> = { '/notifications': notifCount }


  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-stone-100 safe-area-pb overflow-visible">
      <div className="max-w-[430px] mx-auto flex items-center h-16 overflow-visible">

        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active  = pathname === href || pathname.startsWith(href + '/')
          const badge   = badges[href] ?? 0
          const isGame  = href === '/guild'

          if (isGame) {
            return (
              <Link key={href} href={href}
                className="flex-1 flex flex-col items-center justify-center gap-0 relative transition-all"
                style={{ marginTop: '-20px' }}>

                {/* グロウリング（外側） */}
                {!active && (
                  <span
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      width: 58, height: 58,
                      top: -7,
                      background: 'transparent',
                      border: '2px solid rgba(139,92,246,0.35)',
                      boxShadow: '0 0 12px rgba(139,92,246,0.25)',
                    }}
                  />
                )}

                {/* 浮き上がり円ボタン */}
                <div
                  className="flex items-center justify-center rounded-full transition-all active:scale-90"
                  style={{
                    width: 52, height: 52,
                    background: active
                      ? 'linear-gradient(135deg,#6d28d9,#a855f7)'
                      : 'linear-gradient(135deg,#7c3aed,#9333ea)',
                    boxShadow: active
                      ? '0 6px 20px rgba(109,40,217,0.6), 0 0 0 4px rgba(139,92,246,0.2)'
                      : '0 4px 16px rgba(124,58,237,0.45)',
                  }}
                >
                  <Icon size={24} strokeWidth={2.2} color="#fff" />
                </div>

                <span className="text-[9px] font-extrabold tracking-wide mt-1.5 text-violet-500">
                  {label}
                </span>
              </Link>
            )
          }

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
