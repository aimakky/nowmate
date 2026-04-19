import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function getNationalityFlag(code: string): string {
  const map: Record<string, string> = {
    US:'🇺🇸', CN:'🇨🇳', KR:'🇰🇷', VN:'🇻🇳', PH:'🇵🇭',
    IN:'🇮🇳', BR:'🇧🇷', NP:'🇳🇵', ID:'🇮🇩', TH:'🇹🇭',
    MY:'🇲🇾', MM:'🇲🇲', BD:'🇧🇩', PK:'🇵🇰', LK:'🇱🇰',
    MN:'🇲🇳', DE:'🇩🇪', FR:'🇫🇷', GB:'🇬🇧', AU:'🇦🇺',
    CA:'🇨🇦', MX:'🇲🇽', NG:'🇳🇬', GH:'🇬🇭',
  }
  return map[code] ?? '🌍'
}
