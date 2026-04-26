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

export default function Avatar({ src, name, size = 'md', isOnline, occupation, className }: AvatarProps) {
  const { px, cls } = sizeMap[size]
  const dotSize = size === 'xl' ? 'w-4 h-4 border-[3px]' : size === 'lg' ? 'w-3.5 h-3.5 border-2' : 'w-2.5 h-2.5 border-2'
  const badge = getOccupationBadge(occupation)

  return (
    <div className={cn('relative flex-shrink-0 flex flex-col items-center gap-0.5', className)}>
      {/* アバター画像 */}
      <div className="relative flex-shrink-0">
        <div className={cn(cls, 'rounded-full overflow-hidden bg-brand-100 flex items-center justify-center font-bold text-brand-600')}>
          {src ? (
            <Image src={src} alt={name} width={px} height={px} className="object-cover w-full h-full" />
          ) : (
            <span>{getInitials(name)}</span>
          )}
        </div>
        {isOnline !== undefined && (
          <span className={cn(
            dotSize,
            'absolute bottom-0 right-0 rounded-full border-white',
            isOnline ? 'bg-green-400' : 'bg-gray-300'
          )} />
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
