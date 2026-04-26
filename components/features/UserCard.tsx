'use client'

import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import { PURPOSES, ARRIVAL_STAGES } from '@/lib/constants'
import { getNationalityFlag } from '@/lib/utils'
import { getOccupationBadge } from '@/lib/occupation'
import type { Profile } from '@/types'

interface UserCardProps {
  profile: Profile
  onLike?: (userId: string) => void
  liked?: boolean
}

export default function UserCard({ profile, onLike, liked }: UserCardProps) {
  const purposes = PURPOSES.filter(p => profile.purposes.includes(p.value))
  const stage = profile.arrival_stage ? ARRIVAL_STAGES.find(s => s.value === profile.arrival_stage) : null
  const occBadge = getOccupationBadge((profile as any).occupation)

  return (
    <Link href={`/profile/${profile.id}`} className="block">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow active:scale-[0.98]">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center gap-1">
            <Avatar
              src={profile.avatar_url}
              name={profile.display_name}
              size="lg"
              isOnline={profile.is_online}
            />
            {occBadge && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 whitespace-nowrap">
                {occBadge.emoji} {occBadge.label}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-gray-900 truncate">{profile.display_name}</span>
              <span className="text-sm">{getNationalityFlag(profile.nationality)}</span>
              <span className="text-sm text-gray-400 ml-auto flex-shrink-0">{profile.age}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <p className="text-sm text-gray-500">{profile.area}</p>
              {stage && (
                <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${stage.color}`}>
                  {stage.emoji} {stage.label}
                </span>
              )}
              {profile.is_mentor && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                  🤝 Mentor
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {purposes.slice(0, 3).map(p => (
                <span key={p.value} className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${p.color}`}>
                  {p.icon} {p.label}
                </span>
              ))}
            </div>
            {profile.bio && (
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{profile.bio}</p>
            )}
          </div>
        </div>

        {onLike && (
          <div className="flex justify-end mt-3">
            <button
              onClick={e => { e.preventDefault(); onLike(profile.id) }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-semibold transition-all active:scale-95 ${
                liked
                  ? 'bg-rose-100 text-rose-500'
                  : 'bg-gray-100 text-gray-500 hover:bg-rose-50 hover:text-rose-400'
              }`}
            >
              <span className="text-base">{liked ? '❤️' : '🤍'}</span>
              {liked ? 'Liked' : 'Like'}
            </button>
          </div>
        )}
      </div>
    </Link>
  )
}
