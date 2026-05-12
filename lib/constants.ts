import type { Purpose, ArrivalStage } from '@/types'

export const AREAS = [
  'Tokyo', 'Osaka', 'Nagoya', 'Sapporo', 'Fukuoka',
  'Yokohama', 'Kobe', 'Kyoto', 'Sendai', 'Hiroshima',
  'Chiba', 'Saitama', 'Kawasaki', 'Naha (Okinawa)', 'Other',
]

export const NATIONALITIES: { code: string; name: string; flag: string }[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'MM', name: 'Myanmar', flag: '🇲🇲' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: 'MN', name: 'Mongolia', flag: '🇲🇳' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'OTHER', name: 'Other', flag: '🌍' },
]

export const LANGUAGES = [
  'English', 'Japanese', 'Chinese (Mandarin)', 'Chinese (Cantonese)',
  'Korean', 'Vietnamese', 'Filipino (Tagalog)', 'Hindi', 'Portuguese',
  'Nepali', 'Indonesian', 'Thai', 'Burmese', 'Bengali', 'Urdu',
  'Mongolian', 'Spanish', 'French', 'German', 'Arabic', 'Other',
]

export const PURPOSES: { value: Purpose; label: string; icon: string; color: string }[] = [
  { value: 'Friend',            label: 'Friend',           icon: '👫', color: 'bg-blue-100 text-blue-700' },
  { value: 'Drinks',            label: 'Drinks',           icon: '🍻', color: 'bg-amber-100 text-amber-700' },
  { value: 'Sightseeing',       label: 'Sightseeing',      icon: '🗺️', color: 'bg-teal-100 text-teal-700' },
  { value: 'Culture',           label: 'Culture',          icon: '🎌', color: 'bg-red-100 text-red-700' },
  { value: 'Chat',              label: 'Chat',             icon: '💬', color: 'bg-green-100 text-green-700' },
  { value: 'Language Exchange', label: '言語交流',         icon: '🗣️', color: 'bg-purple-100 text-purple-700' },
  { value: 'Dating',            label: 'Dating',           icon: '❤️', color: 'bg-rose-100 text-rose-700' },
]

export const ARRIVAL_STAGES: { value: ArrivalStage; label: string; emoji: string; desc: string; color: string }[] = [
  { value: 'new',      label: 'Just Arrived',   emoji: '✈️', desc: '0 – 6 months in Japan',    color: 'bg-blue-100 text-blue-700' },
  { value: 'settling', label: 'Getting Settled', emoji: '🏠', desc: '6 months – 2 years',        color: 'bg-green-100 text-green-700' },
  { value: 'local',    label: 'Japan Local',     emoji: '🗾', desc: '2+ years — know the ropes', color: 'bg-orange-100 text-orange-700' },
]

export const REPORT_REASONS = [
  'Inappropriate content',
  'Harassment or bullying',
  'Spam or scam',
  'Fake profile',
  'Underage user',
  'Other',
]

export const GENDERS = [
  { value: 'male',   label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other',  label: 'Non-binary / Other' },
]
