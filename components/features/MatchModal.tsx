'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import type { Profile } from '@/types'

interface MatchModalProps {
  myProfile: Profile
  matchedProfile: Profile
  matchId: string
  onClose: () => void
}

export default function MatchModal({ myProfile, matchedProfile, matchId, onClose }: MatchModalProps) {
  const router = useRouter()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Trigger entrance animation after mount
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  function handleChat() {
    onClose()
    router.push(`/chat/${matchId}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Card */}
      <div className={`relative z-10 w-full max-w-sm transition-all duration-500 ease-out ${
        visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-8'
      }`}>

        {/* Confetti dots (CSS only) */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-confetti"
              style={{
                background: ['#0ea5e9','#f97316','#22c55e','#a855f7','#ec4899'][i % 5],
                left: `${8 + (i * 7.5) % 85}%`,
                top: `${10 + (i * 13) % 40}%`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>

        <div className="bg-gradient-to-br from-rose-500 via-pink-500 to-brand-500 rounded-3xl p-1 shadow-2xl">
          <div className="bg-white rounded-[20px] px-6 py-8 text-center">

            {/* Avatars */}
            <div className="flex items-center justify-center gap-0 mb-6">
              <div className="ring-4 ring-white rounded-full z-10">
                <Avatar src={myProfile.avatar_url} name={myProfile.display_name} size="xl" />
              </div>
              <div className="relative -mx-3 z-20 w-10 h-10 bg-rose-500 rounded-full flex items-center justify-center shadow-lg ring-4 ring-white">
                <span className="text-white text-lg">❤️</span>
              </div>
              <div className="ring-4 ring-white rounded-full z-10">
                <Avatar src={matchedProfile.avatar_url} name={matchedProfile.display_name} size="xl" />
              </div>
            </div>

            {/* Text */}
            <h2 className="text-2xl font-extrabold text-gray-900 mb-1">It's a Match! 🎉</h2>
            <p className="text-gray-500 text-sm mb-6">
              You and <strong>{matchedProfile.display_name}</strong> liked each other!
            </p>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <Button fullWidth size="lg" onClick={handleChat} className="bg-rose-500 hover:bg-rose-600 shadow-md shadow-rose-200">
                💬 Send First Message
              </Button>
              <button
                onClick={onClose}
                className="text-sm text-gray-400 hover:text-gray-600 py-1 transition"
              >
                Keep Browsing
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
