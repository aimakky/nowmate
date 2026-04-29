'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Layers, Bell, Gamepad2, Shield, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/timeline',      label: 'TL',      icon: Layers,        live: false },
  { href: '/guilds',        label: 'ギルド',   icon: Shield,        live: false },
  { href: '/guild',         label: 'ゲーム村', icon: Gamepad2,      live: true  },
  { href: '/chat',          label: 'チャット', icon: MessageSquare, live: false },
  { href: '/notifications', label: '通知',    icon: Bell,          live: false },
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
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-stone-100 safe-area-pb">
      <div className="max-w-[430px] mx-auto flex items-center h-16">

        {NAV_ITEMS.map(({ href, label, icon: Icon, live }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          const badge  = badges[href] ?? 0

          if (live) {
            // ── ゲーム村: LIVEエフェクト付き特別タブ ──
            return (
              <Link key={href} href={href}
                className="flex-1 flex flex-col items-center justify-center py-1 gap-0 relative">
                {/* 背景グロー（常時） */}
                <div className={cn(
                  'absolute inset-x-1 inset-y-0.5 rounded-2xl transition-all',
                  active
                    ? 'opacity-100'
                    : 'opacity-60'
                )}
                  style={{ background: 'linear-gradient(135deg,#8b5cf620,#6d28d920)' }}
                />
                {/* アイコン + LIVEドット */}
                <div className="relative z-10">
                  <Gamepad2
                    size={20}
                    strokeWidth={active ? 2.5 : 1.8}
                    className={active ? 'text-violet-600' : 'text-violet-400'}
                  />
                  {/* 右上に紫パルスドット */}
                  <span className="absolute -top-1 -right-1.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-600" />
                  </span>
                </div>
                {/* LIVE バッジ */}
                <div className="flex items-center gap-0.5 mt-0.5 z-10">
                  <span className={cn('text-[9px] font-extrabold tracking-wide',
                    active ? 'text-violet-600' : 'text-violet-400')}>{label}</span>
                </div>
                {active && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-violet-600" />}
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
