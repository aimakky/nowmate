'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AREAS } from '@/lib/constants'

const TAGS = [
  { value: 'Drinks',      emoji: '🍻', label: 'Drinks' },
  { value: 'Food',        emoji: '🍜', label: 'Food' },
  { value: 'Coffee',      emoji: '☕', label: 'Coffee' },
  { value: 'Sightseeing', emoji: '🗺️', label: 'Sightseeing' },
  { value: 'Culture',     emoji: '🎌', label: 'Culture' },
  { value: 'Talk',        emoji: '💬', label: 'Talk' },
  { value: 'Help',        emoji: '🆘', label: 'Help' },
  { value: 'Other',       emoji: '✨', label: 'Other' },
]

const QUICK_PHRASES: Record<string, string[]> = {
  Drinks:      ['Anyone up for drinks now?', 'Looking for people to grab a beer in [area]', 'Who wants to check out an izakaya tonight?'],
  Food:        ['Anyone up for ramen now?', 'Looking for someone to try this restaurant with', 'Who wants to explore local food?'],
  Coffee:      ['Anyone want coffee nearby?', 'First time here — anyone for a café?', 'Looking for a good coffee shop buddy'],
  Sightseeing: ['Anyone want to explore together?', 'Looking for people to visit temples/shrines', 'Who wants to wander around [area]?'],
  Culture:     ['Anyone up for a festival or event?', 'Looking to explore Japanese culture together', 'Who wants to visit a museum?'],
  Talk:        ['Anyone want to just chat?', 'Looking for English conversation', 'Feeling lonely — anyone around?'],
  Help:        ['Need help with train tickets', 'Can someone help me read this sign?', 'Need advice on something in Japan'],
  Other:       ['Anyone free right now?', 'Looking for people to hang out with', 'What is everyone up to?'],
}

export default function CreatePage() {
  const router = useRouter()
  const [tag, setTag] = useState('')
  const [content, setContent] = useState('')
  const [area, setArea] = useState('Tokyo')
  const [posting, setPosting] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const { data } = await supabase.from('profiles').select('area').eq('id', user.id).single()
      if (data?.area) setArea(data.area)
    }
    init()
  }, [router])

  async function handlePost() {
    if (!userId || !tag || !content.trim()) return
    setPosting(true)
    const supabase = createClient()
    const { data } = await supabase.from('posts').insert({
      user_id: userId,
      content: content.trim(),
      tag,
      area,
    }).select().single()
    if (data) {
      await supabase.from('post_joins').insert({ post_id: data.id, user_id: userId })
      router.push(`/post/${data.id}`)
    } else {
      setPosting(false)
    }
  }

  const phrases = tag ? QUICK_PHRASES[tag] || [] : []

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-stone-100 bg-white">
        <button onClick={() => router.back()} className="text-stone-500 font-semibold text-sm px-1">
          Cancel
        </button>
        <span className="font-extrabold text-stone-900 text-base">What's up? 🌏</span>
        <div className="w-14" />
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6 pb-32">
        {/* Tag selection */}
        <div>
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">What do you want to do?</p>
          <div className="grid grid-cols-4 gap-2">
            {TAGS.map(t => (
              <button key={t.value} onClick={() => { setTag(t.value); setContent('') }}
                className={`flex flex-col items-center gap-1.5 py-3.5 rounded-2xl border-2 transition-all active:scale-95 ${
                  tag === t.value
                    ? 'bg-brand-500 text-white border-brand-500 shadow-md shadow-brand-200'
                    : 'bg-white border-stone-200 text-stone-600 hover:border-brand-300'
                }`}>
                <span className="text-2xl">{t.emoji}</span>
                <span className="text-[10px] font-bold">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick phrases */}
        {tag && (
          <div>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2.5">Quick start ⚡</p>
            <div className="space-y-2">
              {phrases.map(p => {
                const text = p.replace('[area]', area)
                return (
                  <button key={p} onClick={() => setContent(text)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-all ${
                      content === text
                        ? 'bg-brand-50 border-brand-300 text-brand-700 font-medium'
                        : 'bg-white border-stone-200 text-stone-600 hover:border-brand-300'
                    }`}>
                    "{text}"
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Text input */}
        {tag && (
          <div>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2.5">Or write your own</p>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value.slice(0, 140))}
              placeholder={`e.g. "Anyone up for ${tag.toLowerCase()} in ${area} now? 😊"`}
              rows={4}
              autoFocus
              className="w-full px-4 py-3 rounded-2xl border-2 border-stone-200 text-sm resize-none focus:outline-none focus:border-brand-400 transition bg-white"
            />
            <p className="text-xs text-stone-400 text-right mt-1">{content.length}/140</p>
          </div>
        )}

        {/* Area */}
        <div>
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2.5">📍 Where are you?</p>
          <div className="flex gap-2 flex-wrap">
            {AREAS.slice(0, 8).map(a => (
              <button key={a} onClick={() => setArea(a)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  area === a
                    ? 'bg-stone-800 text-white border-stone-800'
                    : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'
                }`}>
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Post button */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-5 py-4 bg-white border-t border-stone-100">
        <button
          onClick={handlePost}
          disabled={!tag || !content.trim() || posting}
          className="w-full h-14 bg-brand-500 text-white rounded-2xl font-extrabold text-base disabled:opacity-40 active:scale-[0.98] transition-all shadow-lg shadow-brand-200 flex items-center justify-center gap-2">
          {posting
            ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : '🚀 Post now'}
        </button>
      </div>
    </div>
  )
}
