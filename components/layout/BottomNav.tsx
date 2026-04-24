'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Compass, Mic, MessageCircle, User, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const LEFT_ITEMS = [
  { href: '/villages', label: '村',    icon: Compass },
  { href: '/voice',    label: 'Voice', icon: Mic },
]

const RIGHT_ITEMS = [
  { href: '/chat',   label: 'Chat', icon: MessageCircle },
  { href: '/mypage', label: 'Me',   icon: User },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [msgCount, setMsgCount] = useState(0)

  useEffect(() => {
    async function fetchCounts() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const yesterday = new Date(Date.now() - 86400000).toISOString()
      const { data: matches } = await supabase.from('matches').select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      const matchIds = (matches || []).map(m => m.id)
      if (matchIds.length) {
        const { count } = await supabase.from('messages').select('id', { count: 'exact', head: true })
          .in('match_id', matchIds).neq('sender_id', user.id).gte('created_at', yesterday)
        setMsgCount(count ?? 0)
      }
    }
    fetchCounts()
  }, [pathname])

  function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: any }) {
    const active = pathname === href || pathname.startsWith(href + '/')
    const badge = href === '/chat' ? msgCount : 0
    // voice: no badge for now (could add live room count later)
    return (
      <Link href={href}
        className={cn(
          'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative transition-colors',
          active ? 'text-brand-500' : 'text-stone-400 hover:text-stone-500'
        )}>
        <div className="relative">
          <Icon size={21} strokeWidth={active ? 2.5 : 1.8} />
          {badge > 0 && !active && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </div>
        <span className={cn('text-[9px] font-semibold tracking-wide', active ? 'text-brand-500' : 'text-stone-400')}>
          {label}
        </span>
        {active && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-brand-500 rounded-full" />}
      </Link>
    )
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-stone-100 safe-area-pb">
      <div className="max-w-[430px] mx-auto flex items-center h-16">
        {LEFT_ITEMS.map(item => <NavItem key={item.href} {...item} />)}

        {/* Center Post button */}
        <div className="flex-1 flex items-center justify-center">
          <Link href="/create"
            className="w-12 h-12 bg-brand-500 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-200 hover:bg-brand-600 active:scale-90 transition-all">
            <Plus size={24} strokeWidth={2.5} className="text-white" />
          </Link>
        </div>

        {RIGHT_ITEMS.map(item => <NavItem key={item.href} {...item} />)}
      </div>
    </nav>
  )
}
