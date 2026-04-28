'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Compass, Layers, Bell, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// チャットを外して中央に🌊漂流瓶FABを配置
const LEFT_ITEMS = [
  { href: '/villages',  label: '村',          icon: Compass },
  { href: '/timeline',  label: 'タイムライン', icon: Layers  },
]
const RIGHT_ITEMS = [
  { href: '/notifications', label: '通知',      icon: Bell },
  { href: '/mypage',        label: 'マイページ', icon: User },
]

export default function BottomNav() {
  const pathname   = usePathname()
  const [notifCount, setNotifCount] = useState(0)
  const [bottleCount, setBottleCount] = useState(0)

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

        // 拾える漂流瓶数（自分が参加している村の・自分以外が送った瓶）
        const { data: myVillages } = await supabase
          .from('village_members')
          .select('village_id')
          .eq('user_id', user.id)
        if (myVillages && myVillages.length > 0) {
          const vIds = myVillages.map((v: any) => v.village_id)
          const { count: bc } = await supabase
            .from('drift_bottles')
            .select('*', { count: 'exact', head: true })
            .in('village_id', vIds)
            .neq('sender_id', user.id)
            .is('deleted_at', null)
          setBottleCount(bc ?? 0)
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
  }, [pathname])

  const badges: Record<string, number> = { '/notifications': notifCount }
  const bottleActive = pathname === '/bottle' || pathname.startsWith('/bottle/')

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-stone-100 safe-area-pb">
      <div className="max-w-[430px] mx-auto flex items-center h-16">

        {/* 左2つ */}
        {LEFT_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href}
              className={cn('flex-1 flex flex-col items-center justify-center py-1.5 gap-0 relative transition-colors',
                active ? 'text-stone-900' : 'text-stone-400')}>
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className={cn('text-[9px] font-bold tracking-wide mt-0.5',
                active ? 'text-stone-900' : 'text-stone-400')}>{label}</span>
              {active && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-stone-900 rounded-full" />}
            </Link>
          )
        })}

        {/* 中央：🌊 漂流瓶 FABボタン */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
          <Link href="/bottle"
            className="flex flex-col items-center justify-center w-14 h-14 rounded-full -mt-5 shadow-lg active:scale-90 transition-all relative"
            style={{
              background: bottleActive
                ? 'linear-gradient(135deg,#0c1445 0%,#1a3a6b 100%)'
                : 'linear-gradient(135deg,#1e40af 0%,#1d4ed8 100%)',
              boxShadow: '0 4px 16px rgba(29,78,216,0.45)',
            }}>
            <span className="text-2xl leading-none">🌊</span>
            <span className="text-[8px] font-extrabold text-white/90 mt-0.5 leading-none">流す</span>
            {bottleCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center px-1 border-2 border-white">
                <span className="text-[9px] font-extrabold text-white leading-none">
                  {bottleCount > 99 ? '99+' : bottleCount}
                </span>
              </span>
            )}
          </Link>
        </div>

        {/* 右2つ */}
        {RIGHT_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          const badge  = badges[href] ?? 0
          return (
            <Link key={href} href={href}
              className={cn('flex-1 flex flex-col items-center justify-center py-1.5 gap-0 relative transition-colors',
                active ? 'text-stone-900' : 'text-stone-400')}>
              <div className="relative">
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
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
