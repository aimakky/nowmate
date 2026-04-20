'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Header from '@/components/layout/Header'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ReportModal from '@/components/features/ReportModal'
import { createClient } from '@/lib/supabase/client'
import { PURPOSES, NATIONALITIES, ARRIVAL_STAGES } from '@/lib/constants'
import { getNationalityFlag } from '@/lib/utils'
import type { Profile } from '@/types'

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [matched, setMatched] = useState(false)
  const [matchId, setMatchId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showReport, setShowReport] = useState(false)
  const [showBlockConfirm, setShowBlockConfirm] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)

      if (user.id === userId) { router.push('/mypage'); return }

      const [{ data: p }, { data: likeData }, { data: matchData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('likes').select('id').eq('from_user_id', user.id).eq('to_user_id', userId).single(),
        supabase.from('matches').select('id')
          .or(`and(user1_id.eq.${user.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${user.id})`)
          .single(),
      ])

      setProfile(p)
      setLiked(!!likeData)
      setMatched(!!matchData)
      setMatchId(matchData?.id || null)
      setLoading(false)
    }
    load()
  }, [userId, router])

  async function handleLike() {
    if (!currentUserId) return
    const supabase = createClient()
    if (liked) {
      await supabase.from('likes').delete().eq('from_user_id', currentUserId).eq('to_user_id', userId)
      setLiked(false)
      return
    }
    await supabase.from('likes').insert({ from_user_id: currentUserId, to_user_id: userId })
    setLiked(true)
    // Check mutual
    const { data: mutual } = await supabase
      .from('likes').select('id').eq('from_user_id', userId).eq('to_user_id', currentUserId).single()
    if (mutual) {
      const u1 = currentUserId < userId ? currentUserId : userId
      const u2 = currentUserId < userId ? userId : currentUserId
      const { data: newMatch } = await supabase
        .from('matches').insert({ user1_id: u1, user2_id: u2 }).select().single()
      if (newMatch) { setMatched(true); setMatchId(newMatch.id) }
    }
  }

  async function handleBlock() {
    if (!currentUserId) return
    const supabase = createClient()
    await supabase.from('blocks').insert({ blocker_id: currentUserId, blocked_id: userId })
    router.push('/home')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!profile) return <div className="text-center py-20 text-gray-500">User not found</div>

  const purposes = PURPOSES.filter(p => profile.purposes.includes(p.value))
  const nationality = NATIONALITIES.find(n => n.code === profile.nationality)
  const stage = profile.arrival_stage ? ARRIVAL_STAGES.find(s => s.value === profile.arrival_stage) : null

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      <Header showBack right={
        <button onClick={() => setShowReport(true)} className="text-xs text-red-400 px-2 py-1">Report</button>
      } />

      {/* Avatar */}
      <div className="relative">
        <div className="w-full h-64 bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center">
          {profile.avatar_url ? (
            <Image src={profile.avatar_url} alt={profile.display_name} fill className="object-cover" />
          ) : (
            <div className="text-8xl opacity-30">👤</div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Name & basic */}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-extrabold text-gray-900">{profile.display_name}</h1>
            <span className="text-2xl">{getNationalityFlag(profile.nationality)}</span>
            <span className="text-lg text-gray-400">{profile.age}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge>{nationality?.name || profile.nationality}</Badge>
            <Badge variant="brand">{profile.area}</Badge>
            {profile.is_online && <Badge variant="success">● Online</Badge>}
            {stage && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${stage.color}`}>
                {stage.emoji} {stage.label}
              </span>
            )}
          </div>
        </div>

        {/* Purposes */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Looking for</p>
          <div className="flex flex-wrap gap-2">
            {purposes.map(p => (
              <span key={p.value} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${p.color}`}>
                {p.icon} {p.value}
              </span>
            ))}
          </div>
        </div>

        {/* Languages */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Languages</p>
          <div className="flex flex-wrap gap-1.5">
            {profile.spoken_languages.map(l => (
              <Badge key={l} variant="brand">{l}</Badge>
            ))}
          </div>
          {profile.learning_languages.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <span className="text-xs text-gray-400">Learning:</span>
              {profile.learning_languages.map(l => (
                <Badge key={l} className="bg-purple-100 text-purple-700">{l}</Badge>
              ))}
            </div>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">About</p>
            <p className="text-sm text-gray-700 leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {/* Mentor Section */}
        {profile.is_mentor && profile.helper_categories?.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🤝</span>
              <div>
                <div className="font-bold text-sm text-emerald-800">Japan Mentor</div>
                <div className="text-xs text-emerald-600">Can help with:</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.helper_categories.map(c => (
                <span key={c} className="px-2.5 py-1 bg-white border border-emerald-200 rounded-full text-xs font-semibold text-emerald-700">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          {matched ? (
            <Button
              fullWidth
              size="lg"
              onClick={() => matchId && router.push(`/chat/${matchId}`)}
              className="bg-green-500 hover:bg-green-600"
            >
              💬 Send Message
            </Button>
          ) : (
            <Button
              fullWidth
              size="lg"
              variant={liked ? 'secondary' : 'primary'}
              onClick={handleLike}
            >
              {liked ? '❤️ Liked!' : '🤍 Like'}
            </Button>
          )}
        </div>

        {/* Block */}
        {showBlockConfirm ? (
          <div className="bg-red-50 rounded-2xl p-4 text-center">
            <p className="text-sm text-red-700 mb-3">Block {profile.display_name}? They won't be able to see you.</p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="flex-1" onClick={() => setShowBlockConfirm(false)}>Cancel</Button>
              <Button variant="danger" size="sm" className="flex-1" onClick={handleBlock}>Block</Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowBlockConfirm(true)}
            className="w-full text-center text-xs text-gray-400 hover:text-red-400 py-2"
          >
            Block this user
          </button>
        )}
      </div>

      {showReport && (
        <ReportModal
          reportedId={profile.id}
          reportedName={profile.display_name}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  )
}
