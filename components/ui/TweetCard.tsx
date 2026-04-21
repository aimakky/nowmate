'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getNationalityFlag, timeAgo } from '@/lib/utils'
import { MessageCircle, Repeat2 } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'

export const REACTIONS = [
  { key: 'heart',   emoji: '❤️', label: 'Love' },
  { key: 'haha',    emoji: '😂', label: 'Haha' },
  { key: 'wow',     emoji: '😮', label: 'Wow' },
  { key: 'support', emoji: '🙌', label: 'Support' },
  { key: 'sad',     emoji: '😢', label: 'Sad' },
  { key: 'fire',    emoji: '🔥', label: 'Fire' },
]

export interface TweetData {
  id: string
  content: string
  created_at: string
  user_id: string
  reply_count: number
  repost_count: number
  repost_of: string | null
  profiles: { display_name: string; nationality: string; avatar_url: string | null }
  tweet_reactions: { user_id: string; reaction: string }[]
  tweet_replies?: { id: string }[]
  // original tweet (for reposts)
  original?: {
    content: string
    user_id: string
    profiles: { display_name: string; nationality: string }
  } | null
}

interface Props {
  tweet: TweetData
  myId: string | null
  onUpdate: () => void
  showBorder?: boolean
}

export default function TweetCard({ tweet, myId, onUpdate, showBorder = true }: Props) {
  const router = useRouter()
  const [showPicker, setShowPicker] = useState(false)
  const [reposting, setReposting] = useState(false)

  // Aggregate reactions by type
  const reactionMap = tweet.tweet_reactions.reduce((acc, r) => {
    acc[r.reaction] = (acc[r.reaction] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const myReaction = tweet.tweet_reactions.find(r => r.user_id === myId)?.reaction
  const activeReactions = REACTIONS.filter(r => reactionMap[r.key])
  const hasReactions = activeReactions.length > 0

  async function toggleReaction(key: string) {
    if (!myId) return
    const supabase = createClient()
    if (myReaction === key) {
      await supabase.from('tweet_reactions').delete()
        .eq('tweet_id', tweet.id).eq('user_id', myId)
    } else {
      await supabase.from('tweet_reactions').upsert(
        { tweet_id: tweet.id, user_id: myId, reaction: key },
        { onConflict: 'tweet_id,user_id' }
      )
    }
    setShowPicker(false)
    onUpdate()
  }

  async function handleRepost() {
    if (!myId || reposting) return
    // Check if already reposted
    const supabase = createClient()
    const { data: existing } = await supabase.from('tweets')
      .select('id').eq('user_id', myId).eq('repost_of', tweet.id).maybeSingle()
    if (existing) { setReposting(false); return }

    setReposting(true)
    await supabase.from('tweets').insert({
      user_id: myId,
      content: tweet.content,
      repost_of: tweet.id,
    })
    setReposting(false)
    onUpdate()
  }

  const flag = getNationalityFlag(tweet.profiles?.nationality || '')

  return (
    <div className={`bg-white px-4 py-4 ${showBorder ? 'border-b border-stone-100' : ''}`}>
      {/* Repost header */}
      {tweet.repost_of && (
        <div className="flex items-center gap-1.5 text-xs text-stone-400 font-semibold mb-2 ml-1">
          <Repeat2 size={12} />
          <span>{tweet.profiles?.display_name} reposted</span>
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Avatar */}
        <button onClick={() => router.push(`/profile/${tweet.user_id}`)} className="flex-shrink-0 mt-0.5">
          <Avatar src={tweet.profiles?.avatar_url} name={tweet.profiles?.display_name} size="sm" />
        </button>

        <div className="flex-1 min-w-0">
          {/* Name + time */}
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <button onClick={() => router.push(`/profile/${tweet.user_id}`)}
              className="font-extrabold text-stone-900 text-sm hover:underline leading-tight">
              {tweet.profiles?.display_name}
            </button>
            <span className="text-base leading-none">{flag}</span>
            <span className="text-xs text-stone-400">{timeAgo(tweet.created_at)}</span>
          </div>

          {/* Content */}
          <p className="text-sm text-stone-800 leading-relaxed mb-3 whitespace-pre-wrap">
            {tweet.content}
          </p>

          {/* Reaction summary */}
          {hasReactions && (
            <div className="flex items-center gap-1 mb-2 flex-wrap">
              {activeReactions.map(r => (
                <button key={r.key} onClick={() => toggleReaction(r.key)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold transition-all active:scale-90 ${
                    myReaction === r.key
                      ? 'bg-brand-100 text-brand-700 ring-1 ring-brand-300'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}>
                  <span>{r.emoji}</span>
                  <span>{reactionMap[r.key]}</span>
                </button>
              ))}
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-1 relative">
            {/* Reaction picker trigger */}
            <div className="relative">
              <button
                onClick={() => setShowPicker(p => !p)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-90 ${
                  myReaction
                    ? 'text-brand-600 bg-brand-50'
                    : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'
                }`}>
                {myReaction
                  ? <span>{REACTIONS.find(r => r.key === myReaction)?.emoji}</span>
                  : <span>＋ React</span>
                }
              </button>

              {/* Emoji picker popup */}
              {showPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
                  <div className="absolute bottom-9 left-0 z-50 bg-white border border-stone-200 rounded-2xl shadow-xl p-2 flex gap-1">
                    {REACTIONS.map(r => (
                      <button key={r.key}
                        onClick={() => toggleReaction(r.key)}
                        title={r.label}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all hover:scale-125 active:scale-95 ${
                          myReaction === r.key ? 'bg-brand-100 ring-2 ring-brand-300' : 'hover:bg-stone-100'
                        }`}>
                        {r.emoji}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Reply */}
            <button
              onClick={() => router.push(`/tweet/${tweet.id}`)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-all active:scale-90">
              <MessageCircle size={13} />
              {(tweet.reply_count ?? tweet.tweet_replies?.length ?? 0) > 0 && (
                <span>{tweet.reply_count ?? tweet.tweet_replies?.length}</span>
              )}
            </button>

            {/* Repost */}
            {tweet.repost_of === null && (
              <button
                onClick={handleRepost}
                disabled={reposting}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all active:scale-90 disabled:opacity-40">
                <Repeat2 size={13} />
                {(tweet.repost_count ?? 0) > 0 && <span>{tweet.repost_count}</span>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
