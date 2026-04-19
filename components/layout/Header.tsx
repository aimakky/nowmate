'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, MoreVertical } from 'lucide-react'
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
      transparent ? 'bg-transparent' : 'bg-white border-b border-gray-100',
      className
    )}>
      <div className="w-10">
        {showBack && (
          <button
            onClick={() => router.back()}
            className="p-1.5 -ml-1.5 rounded-xl text-gray-500 hover:bg-gray-100 transition"
          >
            <ArrowLeft size={22} />
          </button>
        )}
      </div>
      {title && (
        <h1 className="text-base font-semibold text-gray-800">{title}</h1>
      )}
      <div className="w-10 flex justify-end">
        {right}
      </div>
    </header>
  )
}
