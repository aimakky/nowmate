'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Header from '@/components/layout/Header'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ProfileCompletionBanner from '@/components/features/ProfileCompletionBanner'
import FindByIdModal from '@/components/features/FindByIdModal'
import { createClient } from '@/lib/supabase/client'
import { PURPOSES, NATIONALITIES } from '@/lib/constants'
import { getNationalityFlag } from '@/lib/utils'
import type { Profile } from '@/types'

interface Stats {
  likes_sent: number
  likes_received: number
  matches: number
  messages_sent: number
}

export default function MyPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<Stats>({ likes_sent: 0, likes_received: 0, matches: 0, messages_sent: 0 })
  const [loading, setLoading] = useState(true)
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [showFindById, setShowFindById] = useState(false)
  const [idCopied, setIdCopied] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: p }, { count: ls }, { count: lr }, { count: mc }, { count: ms }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('likes').select('id', { count: 'exact', head: true }).eq('from_user_id', user.id),
        supabase.from('likes').select('id', { count: 'exact', head: true }).eq('to_user_id', user.id),
        supabase.from('matches').select('id', { count: 'exact', head: true })
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
        supabase.from('messages').select('id', { count: 'exact', head: true }).eq('sender_id', user.id),
      ])

      if (!p) { router.push('/onboarding'); return }
      setProfile(p)
      setStats({ likes_sent: ls ?? 0, likes_received: lr ?? 0, matches: mc ?? 0, messages_sent: ms ?? 0 })
      setLoading(false)
    }
    load()
  }, [router])

  async function handleLogout() {
    await createClient().auth.signOut()
    router.push('/')
  }

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const purposes = PURPOSES.filter(p => profile.purposes.includes(p.value))
  const nationality = NATIONALITIES.find(n => n.code === profile.nationality)

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen">
      <Header title="My Profile" right={
        <Link href="/settings" className="text-sm text-brand-500 font-bold px-2 py-1 rounded-xl hover:bg-brand-50 transition">
          Edit
        </Link>
      } />

      {/* Cover gradient */}
      <div className="relative bg-gradient-to-br from-brand-400 via-brand-500 to-brand-600 h-28">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Ccircle cx=\'30\' cy=\'30\' r=\'4\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}
        />
      </div>

      {/* Avatar overlap */}
      <div className="relative px-5 -mt-12 mb-4">
        <div className="flex items-end justify-between">
          <div className="w-24 h-24 rounded-3xl border-4 border-white overflow-hidden bg-brand-100 shadow-lg flex-shrink-0">
            {profile.avatar_url
              ? <Image src={profile.avatar_url} alt={profile.display_name} width={96} height={96} className="object-cover w-full h-full" />
              : <div className="w-full h-full flex items-center justify-center text-brand-300 text-4xl">👤</div>
            }
          </div>
          <div className="mb-1">
            {profile.is_online
              ? <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full font-semibold">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Online
                </span>
              : <span className="text-xs text-gray-400 bg-white border border-gray-200 px-2.5 py-1 rounded-full">Offline</span>
            }
          </div>
        </div>
      </div>

      <div className="px-5 space-y-4 pb-8">
        {/* Name & info */}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-extrabold text-gray-900">{profile.display_name}</h2>
            <span className="text-2xl">{getNationalityFlag(profile.nationality)}</span>
            <span className="text-gray-400 text-lg">{profile.age}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <Badge>{nationality?.name || profile.nationality}</Badge>
            <Badge variant="brand">{profile.area}</Badge>
          </div>
          {profile.bio && (
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">{profile.bio}</p>
          )}
        </div>

        {/* Profile completion */}
        <ProfileCompletionBanner profile={profile} />

        {/* Stats (Ava's KPIs visible to user) */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Your Activity</p>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { value: stats.likes_sent,     label: 'Likes\nSent',     color: 'text-rose-500' },
              { value: stats.likes_received, label: 'Likes\nReceived', color: 'text-brand-500' },
              { value: stats.matches,        label: 'Matches',         color: 'text-green-500' },
              { value: stats.messages_sent,  label: 'Messages',        color: 'text-purple-500' },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center">
                <span className={`text-xl font-extrabold ${s.color}`}>{s.value}</span>
                <span className="text-[9px] text-gray-400 font-medium whitespace-pre-line leading-tight mt-0.5">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Purposes */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Looking For</p>
          <div className="flex flex-wrap gap-1.5">
            {purposes.map(p => (
              <span key={p.value} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold ${p.color}`}>
                {p.icon} {p.value}
              </span>
            ))}
          </div>
        </div>

        {/* Languages */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Languages</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {profile.spoken_languages.map(l => <Badge key={l} variant="brand">{l}</Badge>)}
          </div>
          {profile.learning_languages.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center mt-1">
              <span className="text-xs text-gray-400">Learning:</span>
              {profile.learning_languages.map(l => (
                <Badge key={l} className="bg-purple-100 text-purple-700">{l}</Badge>
              ))}
            </div>
          )}
        </div>

        {/* My Samee ID Card */}
        {profile.samee_id && (
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">My Samee ID</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
                <span className="font-mono font-bold text-gray-800 text-lg tracking-widest">#{profile.samee_id}</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(profile.samee_id!)
                  setIdCopied(true)
                  setTimeout(() => setIdCopied(false), 2000)
                }}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition ${idCopied ? 'bg-green-500 text-white' : 'bg-brand-500 text-white hover:bg-brand-600'}`}
              >
                {idCopied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <div className="flex gap-2 mt-2.5">
              <button
                onClick={() => setShowFindById(true)}
                className="flex-1 py-2.5 border-2 border-brand-200 text-brand-600 rounded-xl text-xs font-bold hover:bg-brand-50 transition"
              >
                🔍 Find friend by ID
              </button>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Find me on Samee! My ID: #${profile.samee_id}\n\nJapan survival app for expats 🗾\ngetsamee.com`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 bg-black text-white rounded-xl text-xs font-bold text-center hover:bg-gray-900 transition"
              >
                Share on X
              </a>
            </div>
          </div>
        )}

        {/* Premium teaser (Daniel's revenue model) */}
        <button
          onClick={() => setShowPremiumModal(true)}
          className="w-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl p-4 text-left hover:opacity-95 active:scale-[0.99] transition-all shadow-sm shadow-orange-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-lg">⚡</span>
                <span className="font-extrabold text-white text-sm">Samee Premium</span>
              </div>
              <p className="text-orange-100 text-xs">Unlimited likes · See who liked you · Top of list</p>
            </div>
            <div className="text-right flex-shrink-0 ml-3">
              <div className="text-white font-black text-lg">¥980</div>
              <div className="text-orange-100 text-xs">/month</div>
            </div>
          </div>
        </button>

        {/* Menu */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
          {[
            { href: '/upgrade',   icon: '👑', label: 'Go Premium' },
            { href: '/likes-me',  icon: '❤️', label: 'Who Liked Me' },
            { href: '/settings',  icon: '⚙️', label: 'Edit Profile & Settings' },
            { href: '/invite',    icon: '🤝', label: 'Invite a Friend' },
            { href: '/terms',    icon: '📄', label: 'Terms of Use' },
            { href: '/privacy',  icon: '🔒', label: 'Privacy Policy' },
            { href: '/contact',  icon: '✉️', label: 'Contact Support' },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-base">{item.icon}</span>
                <span className="text-sm text-gray-700 font-medium">{item.label}</span>
              </div>
              <span className="text-gray-300 text-sm">›</span>
            </Link>
          ))}
        </div>

        <Button variant="ghost" fullWidth onClick={handleLogout}
          className="text-red-400 hover:bg-red-50 hover:text-red-500 border border-gray-200">
          Sign Out
        </Button>
      </div>

      {/* Find by ID Modal */}
      {showFindById && profile && (
        <FindByIdModal
          currentUserId={profile.id}
          onClose={() => setShowFindById(false)}
        />
      )}

      {/* Premium Modal */}
      {showPremiumModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 animate-slide-up">
            <div className="text-center mb-5">
              <div className="text-4xl mb-2">⚡</div>
              <h3 className="text-xl font-extrabold text-gray-900">Samee Premium</h3>
              <p className="text-gray-500 text-sm mt-1">Unlock the full experience</p>
            </div>
            <div className="space-y-3 mb-5">
              {[
                { icon: '❤️', label: 'Unlimited likes per day' },
                { icon: '👀', label: 'See who liked your profile' },
                { icon: '🔝', label: 'Appear at top of Discover' },
                { icon: '🔍', label: 'Advanced search filters' },
                { icon: '✓',  label: 'Read receipts in chat' },
              ].map(f => (
                <div key={f.label} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center text-sm flex-shrink-0">
                    {f.icon}
                  </div>
                  <span className="text-sm text-gray-700 font-medium">{f.label}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 border border-gray-200" onClick={() => setShowPremiumModal(false)}>
                Maybe later
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500"
                onClick={() => setShowPremiumModal(false)}
              >
                ¥980/month →
              </Button>
            </div>
            <p className="text-center text-xs text-gray-400 mt-3">Cancel anytime. No hidden fees.</p>
          </div>
        </div>
      )}
    </div>
  )
}
