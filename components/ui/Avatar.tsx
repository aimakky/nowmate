import Image from 'next/image'
import { cn, getInitials } from '@/lib/utils'
import { getOccupationBadge } from '@/lib/occupation'

interface AvatarProps {
  src?: string | null
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  isOnline?: boolean
  occupation?: string | null
  className?: string
  tier?: string | null
}

const sizeMap = {
  sm:  { px: 32,  cls: 'w-8 h-8 text-xs' },
  md:  { px: 48,  cls: 'w-12 h-12 text-sm' },
  lg:  { px: 64,  cls: 'w-16 h-16 text-base' },
  xl:  { px: 96,  cls: 'w-24 h-24 text-xl' },
}

// バッジサイズ（アバターサイズに連動）
const badgeTextSize = {
  sm:  'text-[8px] px-1 py-0',
  md:  'text-[9px] px-1.5 py-0.5',
  lg:  'text-[10px] px-2 py-0.5',
  xl:  'text-[11px] px-2.5 py-1',
}

export default function Avatar({ src, name, size = 'md', isOnline, occupation, className, tier }: AvatarProps) {
  const { px, cls } = sizeMap[size]
  const dotSize = size === 'xl' ? 'w-4 h-4 border-[3px]' : size === 'lg' ? 'w-3.5 h-3.5 border-2' : 'w-2.5 h-2.5 border-2'
  const badge = getOccupationBadge(occupation)
  const isPillar = tier === 'pillar'

  return (
    <div className={cn('relative flex-shrink-0 flex flex-col items-center gap-0.5', className)}>
      {/* アバター画像 */}
      <div className="relative flex-shrink-0">
        {/* 村の柱 ゴールドフレーム */}
        {isPillar && (
          <div className="absolute inset-0 rounded-full z-10 pointer-events-none"
            style={{ padding: 2, background: 'linear-gradient(135deg,#f59e0b,#fbbf24,#f59e0b,#d97706)', borderRadius: '50%' }}>
            <div className="w-full h-full rounded-full" style={{ background: 'white' }} />
          </div>
        )}
        <div className={cn(cls, 'rounded-full overflow-hidden bg-brand-100 flex items-center justify-center font-bold text-brand-600 relative z-20',
          isPillar ? 'ring-2 ring-amber-400 ring-offset-1' : ''
        )}>
          {src ? (
            <Image src={src} alt={name} width={px} height={px} className="object-cover w-full h-full" />
          ) : (
            <span>{getInitials(name)}</span>
          )}
        </div>
        {isOnline !== undefined && (
          <span className={cn(
            dotSize,
            'absolute bottom-0 right-0 rounded-full border-white z-30',
            isOnline ? 'bg-green-400' : 'bg-gray-300'
          )} />
        )}
        {/* 村の柱 ✨ 右上バッジ */}
        {isPillar && (
          <span className="absolute -top-0.5 -right-0.5 text-[10px] z-30 leading-none">✨</span>
        )}
      </div>

      {/* 職業バッジ（画像の真下） */}
      {badge && (
        <span className={cn(
          'inline-flex items-center gap-0.5 rounded-full font-bold whitespace-nowrap',
          'bg-indigo-50 text-indigo-600 border border-indigo-100',
          badgeTextSize[size]
        )}>
          {badge.emoji} {badge.label}
        </span>
      )}
    </div>
  )
}
