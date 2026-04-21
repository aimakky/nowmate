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

// Haversine distance in km between two lat/lng points
export function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`
  if (km < 10) return `${km.toFixed(1)}km`
  return `${Math.round(km)}km`
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
