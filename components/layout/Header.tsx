'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  title?: string
  showBack?: boolean
  right?: React.ReactNode
  className?: string
  transparent?: boolean
}

export default function Header({ title, showBack, right, className, transparent }: HeaderProps) {
  const router = useRouter()
  return (
    <header className={cn(
      'sticky top-0 z-30 flex items-center justify-between h-14 px-4',
      transparent
        ? 'bg-transparent'
        : 'bg-[rgba(8,8,18,0.85)] backdrop-blur-xl border-b border-[rgba(157,92,255,0.15)]',
      className
    )}>
      <div className="w-10">
        {showBack && (
          <button
            onClick={() => router.back()}
            className="p-1.5 -ml-1.5 rounded-xl transition-all active:scale-90"
            style={{ color: 'rgba(240,238,255,0.6)' }}
          >
            <ArrowLeft size={22} />
          </button>
        )}
      </div>
      {title && (
        <h1 className="text-sm font-bold tracking-wide" style={{ color: '#F0EEFF' }}>{title}</h1>
      )}
      <div className="w-10 flex justify-end">
        {right}
      </div>
    </header>
  )
}
