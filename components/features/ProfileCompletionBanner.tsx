'use client'

import Link from 'next/link'
import type { Profile } from '@/types'

interface Props {
  profile: Profile
}

export default function ProfileCompletionBanner({ profile }: Props) {
  const steps = [
    { done: !!profile.avatar_url,                label: 'Photo',    icon: '📷' },
    { done: !!profile.bio && profile.bio.length > 10, label: 'Bio', icon: '✏️' },
    { done: profile.spoken_languages.length > 0,  label: 'Languages', icon: '🗣️' },
    { done: profile.purposes.length > 0,           label: 'Purpose',  icon: '🎯' },
  ]
  const completed = steps.filter(s => s.done).length
  const pct = Math.round((completed / steps.length) * 100)

  if (pct === 100) return null

  const missing = steps.filter(s => !s.done)

  return (
    <Link href="/settings">
      <div className="mx-4 mb-3 bg-gradient-to-r from-brand-50 to-accent-50 border border-brand-100 rounded-2xl px-4 py-3 flex items-center gap-3 hover:shadow-sm transition">
        <div className="relative w-10 h-10 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.9" fill="none"
              stroke="#0ea5e9" strokeWidth="3"
              strokeDasharray={`${pct} ${100 - pct}`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-brand-600">{pct}%</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">Complete your profile</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Add {missing.map(s => s.icon + s.label).join(' · ')} to get more likes
          </p>
        </div>
        <span className="text-brand-500 text-sm font-semibold flex-shrink-0">Edit →</span>
      </div>
    </Link>
  )
}
