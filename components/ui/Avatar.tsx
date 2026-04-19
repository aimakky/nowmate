import Image from 'next/image'
import { cn, getInitials } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  isOnline?: boolean
  className?: string
}

const sizeMap = {
  sm:  { px: 32,  cls: 'w-8 h-8 text-xs' },
  md:  { px: 48,  cls: 'w-12 h-12 text-sm' },
  lg:  { px: 64,  cls: 'w-16 h-16 text-base' },
  xl:  { px: 96,  cls: 'w-24 h-24 text-xl' },
}

export default function Avatar({ src, name, size = 'md', isOnline, className }: AvatarProps) {
  const { px, cls } = sizeMap[size]
  const dotSize = size === 'xl' ? 'w-4 h-4 border-[3px]' : size === 'lg' ? 'w-3.5 h-3.5 border-2' : 'w-2.5 h-2.5 border-2'

  return (
    <div className={cn('relative flex-shrink-0', className)}>
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
  )
}
