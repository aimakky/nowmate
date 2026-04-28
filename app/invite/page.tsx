'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function InvitePage() {
  const [copied, setCopied] = useState(false)
  const [自由村Id, set自由村Id] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('VILLIA_id').eq('id', user.id).single()
      if (data?.VILLIA_id) set自由村Id(data.VILLIA_id)
    }
    load()
  }, [])

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://get自由村.com'
  const shareUrl = 自由村Id ? `${baseUrl}/signup?ref=${自由村Id}` : `${baseUrl}/signup`
  const tweetText = `Surviving Japan alone is hard 🗾 I use 自由村 — step-by-step setup guides + connect with expats who've been there. Join free 👇`

  function copy(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-[430px] mx-auto">
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <Link href="/mypage" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-black text-sm">N</span>
          </div>
          <span className="font-extrabold text-gray-900 text-lg tracking-tight">自由村</span>
        </Link>
      </header>

      <section className="px-5 pt-8 pb-6 text-center">
        <div className="text-6xl mb-4">🎁</div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">Invite a friend</h1>
        <p className="text-gray-500 text-sm leading-relaxed max-w-[280px] mx-auto">
          You <span className="font-bold text-brand-500">both</span> get <span className="font-bold text-brand-500">7 days Premium free</span> when they join with your link.
        </p>
      </section>

      {/* Reward explainer */}
      <section className="px-5 pb-6">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 space-y-2">
          {[
            { icon: '👤', text: 'Friend joins with your link' },
            { icon: '✅', text: 'They complete their profile' },
            { icon: '⚡', text: 'You BOTH get 7 days Premium free' },
          ].map(s => (
            <div key={s.text} className="flex items-center gap-3 text-sm text-gray-700">
              <span className="text-xl">{s.icon}</span>
              <span>{s.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Personal invite link */}
      <section className="px-5 pb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Your personal invite link</p>
        <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs text-gray-500 font-mono break-all mb-2">
          {shareUrl}
        </div>
        <button
          onClick={() => copy(shareUrl)}
          className={`w-full py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 ${copied ? 'bg-green-500 text-white' : 'bg-brand-500 text-white hover:bg-brand-600'}`}
        >
          {copied ? '✓ Copied!' : 'Copy invite link'}
        </button>
      </section>

      {/* Share buttons */}
      <section className="px-5 pb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Share directly</p>
        <div className="grid grid-cols-3 gap-2">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 py-4 bg-black text-white rounded-2xl text-xs font-semibold hover:opacity-90 active:scale-95 transition-all"
          >
            <span className="text-2xl">𝕏</span>
            Twitter/X
          </a>
          <a
            href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(tweetText)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 py-4 bg-[#06C755] text-white rounded-2xl text-xs font-semibold hover:opacity-90 active:scale-95 transition-all"
          >
            <span className="text-2xl">💬</span>
            LINE
          </a>
          <button
            onClick={() => copy(`${tweetText}\n\n${shareUrl}`)}
            className="flex flex-col items-center gap-1.5 py-4 bg-gray-100 text-gray-700 rounded-2xl text-xs font-semibold hover:bg-gray-200 active:scale-95 transition-all"
          >
            <span className="text-2xl">📋</span>
            Copy text
          </button>
        </div>
      </section>

      {自由村Id && (
        <section className="px-5 pb-6">
          <p className="text-xs text-center text-gray-400">Your 自由村 ID: <span className="font-mono font-bold text-gray-600">#{自由村Id}</span></p>
        </section>
      )}

      <div className="px-5 pb-10">
        <Link href="/mypage"
          className="block w-full py-3.5 border-2 border-brand-200 text-brand-600 rounded-2xl font-semibold text-sm text-center hover:bg-brand-50 active:scale-[0.98] transition-all">
          ← Back to profile
        </Link>
      </div>
    </div>
  )
}
