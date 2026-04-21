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

// ─── Supported Countries (geo-gate) ────────────────────────────────────────
export const SUPPORTED_COUNTRIES = [
  { code: 'JP', name: 'Japan',       flag: '🇯🇵', latMin: 24,   latMax: 46,  lngMin: 122,  lngMax: 154  },
  { code: 'KR', name: 'Korea',       flag: '🇰🇷', latMin: 33,   latMax: 39,  lngMin: 124,  lngMax: 132  },
  { code: 'CN', name: 'China',       flag: '🇨🇳', latMin: 18,   latMax: 54,  lngMin: 73,   lngMax: 135  },
  { code: 'VN', name: 'Vietnam',     flag: '🇻🇳', latMin: 8,    latMax: 24,  lngMin: 102,  lngMax: 110  },
  { code: 'BR', name: 'Brazil',      flag: '🇧🇷', latMin: -34,  latMax: 6,   lngMin: -74,  lngMax: -34  },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', latMin: 4,    latMax: 21,  lngMin: 116,  lngMax: 127  },
  { code: 'US', name: 'USA',         flag: '🇺🇸', latMin: 24,   latMax: 50,  lngMin: -125, lngMax: -66  },
  { code: 'DE', name: 'Germany',     flag: '🇩🇪', latMin: 47,   latMax: 56,  lngMin: 6,    lngMax: 15   },
  { code: 'AU', name: 'Australia',   flag: '🇦🇺', latMin: -44,  latMax: -10, lngMin: 113,  lngMax: 154  },
]

export function detectCountry(lat: number, lng: number) {
  return SUPPORTED_COUNTRIES.find(c =>
    lat >= c.latMin && lat <= c.latMax && lng >= c.lngMin && lng <= c.lngMax
  ) ?? null
}

// Returns: 'supported' | 'outside' | 'denied'
export async function checkSupportedLocation(): Promise<'supported' | 'outside' | 'denied'> {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve('denied'); return }
    navigator.geolocation.getCurrentPosition(
      pos => resolve(
        detectCountry(pos.coords.latitude, pos.coords.longitude) ? 'supported' : 'outside'
      ),
      () => resolve('denied'),
      { timeout: 8000, maximumAge: 300000 }
    )
  })
}

// Returns country code string (e.g. 'JP') or null
export async function detectCurrentCountryCode(): Promise<string | null> {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const country = detectCountry(pos.coords.latitude, pos.coords.longitude)
        resolve(country?.code ?? null)
      },
      () => resolve(null),
      { timeout: 8000, maximumAge: 300000 }
    )
  })
}

// Legacy alias kept for zero-diff imports
export const checkJapanLocation = checkSupportedLocation

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
