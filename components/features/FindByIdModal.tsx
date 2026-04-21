'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getNationalityFlag } from '@/lib/utils'
import type { Profile } from '@/types'

interface Props {
  currentUserId: string
  onClose: () => void
}

export default function FindByIdModal({ currentUserId, onClose }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<Profile | null | 'not_found'>(null)
  const [searching, setSearching] = useState(false)
  const [liked, setLiked] = useState(false)

  async function handleSearch() {
    const id = query.trim().toLowerCase()
    if (!id) return
    setSearching(true)
    setResult(null)
    setLiked(false)
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('samee_id', id)
      .eq('is_active', true)
      .single()
    setResult(data ?? 'not_found')
    setSearching(false)
  }

  async function handleSendLike(profile: Profile) {
    const supabase = createClient()
    await supabase.from('likes').upsert({ from_user_id: currentUserId, to_user_id: profile.id })
    setLiked(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-extrabold text-gray-900">🔍 Find by Samee ID</div>
            <div className="text-xs text-gray-400 mt-0.5">Enter their 8-character ID</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            value={query}
            onChange={e => setQuery(e.target.value.toLowerCase().slice(0, 8))}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="e.g. abc12345"
            autoFocus
            className="flex-1 px-4 py-3 rounded-2xl border-2 border-gray-200 text-sm font-mono focus:outline-none focus:border-brand-400 transition"
          />
          <button
            onClick={handleSearch}
            disabled={!query.trim() || searching}
            className="px-5 py-3 bg-brand-500 text-white rounded-2xl font-bold text-sm disabled:opacity-50 hover:bg-brand-600 transition"
          >
            {searching ? '...' : 'Search'}
          </button>
        </div>

        {result === 'not_found' && (
          <div className="text-center py-6 text-gray-400">
            <div className="text-3xl mb-2">🤔</div>
            <p className="text-sm font-semibold">No user found with that ID</p>
            <p className="text-xs mt-1">Check the ID and try again</p>
          </div>
        )}

        {result && result !== 'not_found' && (
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-100 overflow-hidden flex-shrink-0 flex items-center justify-center text-2xl">
                {result.avatar_url
                  ? <img src={result.avatar_url} className="w-full h-full object-cover" alt="" />
                  : '👤'}
              </div>
              <div className="flex-1">
                <div className="font-bold text-gray-900">
                  {result.display_name} {getNationalityFlag(result.nationality)}
                </div>
                <div className="text-xs text-gray-500">{result.area} · {result.age}歳</div>
                <div className="text-xs text-gray-400 font-mono mt-0.5">#{result.samee_id}</div>
              </div>
            </div>
            {result.id === currentUserId ? (
              <p className="text-xs text-center text-gray-400 py-2">これはあなた自身のプロフィールです</p>
            ) : liked ? (
              <div className="w-full py-3 bg-green-50 border border-green-200 rounded-2xl text-center">
                <span className="text-sm font-bold text-green-600">✓ Like sent! Waiting for match...</span>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => { router.push(`/profile/${result.id}`); onClose() }}
                  className="flex-1 py-2.5 border-2 border-gray-200 rounded-2xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition"
                >
                  View Profile
                </button>
                <button
                  onClick={() => handleSendLike(result as Profile)}
                  className="flex-1 py-2.5 bg-brand-500 text-white rounded-2xl text-sm font-bold hover:bg-brand-600 transition"
                >
                  ❤️ Send Like
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
