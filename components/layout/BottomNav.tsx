'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Layers, Bell, Gamepad2, Shield, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/timeline',      label: 'TL',      icon: Layers,        live: false, activeColor: '#39FF88' },
  { href: '/guilds',        label: 'ギルド',   icon: Shield,        live: false, activeColor: '#27DFFF' },
  { href: '/guild',         label: 'ゲーム村', icon: Gamepad2,      live: true,  activeColor: '#8B5CF6' },
  { href: '/chat',          label: 'チャット', icon: MessageSquare, live: false, activeColor: '#FF4FD8' },
  { href: '/notifications', label: '通知',    icon: Bell,          live: false, activeColor: '#FFC928' },
]

export default function BottomNav() {
  const pathname    = usePathname()
  const [notifCount, setNotifCount] = useState(0)

  useEffect(() => {
    async function fetchBadges() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { count: nc } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false)
        setNotifCount(nc ?? 0)
      } catch { /* silent */ }
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
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 safe-area-pb"
      style={{
        background: 'rgba(8,8,18,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(157,92,255,0.18)',
        boxShadow: '0 -4px 30px rgba(0,0,0,0.4)',
      }}
    >
      <div className="max-w-[430px] mx-auto flex items-center h-16">

        {NAV_ITEMS.map(({ href, label, icon: Icon, live, activeColor }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          const badge  = badges[href] ?? 0

          if (live) {
            return (
              <Link key={href} href={href}
                className="flex-1 flex flex-col items-center justify-center py-1 gap-0 relative">
                {/* Active glow bg */}
                {active && (
                  <div className="absolute inset-x-2 inset-y-1 rounded-2xl"
                    style={{ background: `${activeColor}1F`, border: `1px solid ${activeColor}33` }} />
                )}
                <div className="relative z-10">
                  <Gamepad2
                    size={20}
                    strokeWidth={active ? 2.5 : 1.8}
                    style={{ color: active ? activeColor : `${activeColor}80` }}
                  />
                  {/* LIVE badge */}
                  <span className="absolute -top-2 -right-4 flex items-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40"
                      style={{ background: activeColor }} />
                    <span className="relative text-[7px] font-extrabold tracking-widest px-1 py-px rounded-full leading-none"
                      style={{ background: 'linear-gradient(135deg,#8B5CF6,#FF4D90)', color: '#fff' }}>
                      LIVE
                    </span>
                  </span>
                </div>
                <span className="text-[9px] font-extrabold tracking-wide mt-0.5 z-10"
                  style={{ color: active ? activeColor : `${activeColor}80` }}>
                  {label}
                </span>
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                    style={{ background: activeColor, boxShadow: `0 0 8px ${activeColor}CC` }} />
                )}
              </Link>
            )
          }

          return (
            <Link key={href} href={href}
              className="flex-1 flex flex-col items-center justify-center py-1.5 gap-0 relative transition-colors">
              <div className="relative">
                {Icon && (
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.5 : 1.8}
                    style={{ color: active ? activeColor : `${activeColor}59` }}
                  />
                )}
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full flex items-center justify-center px-1"
                    style={{ background: activeColor }}>
                    <span className="text-[9px] font-extrabold text-white leading-none">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  </span>
                )}
              </div>
              <span className="text-[9px] font-bold tracking-wide mt-0.5"
                style={{ color: active ? activeColor : `${activeColor}59` }}>
                {label}
              </span>
              {active && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full"
                  style={{ background: activeColor, boxShadow: `0 0 8px ${activeColor}CC` }} />
              )}
            </Link>
          )
        })}

      </div>
    </nav>
  )
}
