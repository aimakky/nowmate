'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Compass, MessageCircleQuestion, Mic, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/villages', label: '村',     labelEn: 'Villages', icon: Compass              },
  { href: '/qa',       label: '相談',   labelEn: 'Ask',      icon: MessageCircleQuestion },
  { href: '/voice',    label: '通話',   labelEn: 'Talk',     icon: Mic                  },
  { href: '/mypage',   label: 'マイページ', labelEn: 'My Page', icon: User              },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-stone-100 safe-area-pb">
      <div className="max-w-[430px] mx-auto flex items-center h-16">
        {NAV_ITEMS.map(({ href, label, labelEn, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
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
