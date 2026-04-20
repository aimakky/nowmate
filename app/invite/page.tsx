'use client'

import { useState } from 'react'
import Link from 'next/link'

const SHARE_MESSAGES = [
  "Just found this app for foreigners in Japan 🇯🇵 — it's called nowjp and it actually works for making real friends here. Check it out!",
  "If you're living in Japan and want to meet people, nowjp is the best I've found. Free and no weird vibes 👍",
  "Moved to Japan and felt alone? nowjp changed that for me. Give it a try 🙌",
]

export default function InvitePage() {
  const [copied, setCopied] = useState(false)
  const [msgIndex, setMsgIndex] = useState(0)
  const shareUrl = 'https://nowjpjapan.com'
  const message = SHARE_MESSAGES[msgIndex]

  function copyLink() {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function copyMessage() {
    navigator.clipboard.writeText(`${message}\n\n${shareUrl}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(shareUrl)}`
  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(message)}`
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-[430px] mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-black text-sm">N</span>
          </div>
          <span className="font-extrabold text-gray-900 text-lg tracking-tight">nowjp</span>
        </Link>
      </header>

      {/* Hero */}
      <section className="px-5 pt-8 pb-8 text-center">
        <div className="text-6xl mb-4">🤝</div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">
          Know someone who needs this?
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed max-w-[280px] mx-auto">
          Share nowjp with a friend who's living in Japan. Help them find their people.
        </p>
      </section>

      {/* Share URL */}
      <section className="px-5 pb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Share the link</p>
        <div className="flex gap-2">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-600 font-mono truncate">
            nowjpjapan.com
          </div>
          <button
            onClick={copyLink}
            className={`px-4 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95 ${
              copied
                ? 'bg-green-500 text-white'
                : 'bg-brand-500 text-white hover:bg-brand-600'
            }`}
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
      </section>

      {/* Message picker */}
      <section className="px-5 pb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Or share a message</p>
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-3">
          <p className="text-sm text-gray-700 leading-relaxed">{message}</p>
          <p className="text-xs text-brand-500 font-medium mt-2">{shareUrl}</p>
        </div>
        <div className="flex gap-2 mb-3">
          {SHARE_MESSAGES.map((_, i) => (
            <button key={i} onClick={() => setMsgIndex(i)}
              className={`flex-1 py-1.5 rounded-xl text-xs font-medium border transition ${
                msgIndex === i ? 'bg-brand-500 text-white border-brand-500' : 'border-gray-200 text-gray-500 hover:border-brand-300'
              }`}>
              #{i + 1}
            </button>
          ))}
        </div>
        <button onClick={copyMessage}
          className="w-full py-3 bg-gray-100 text-gray-700 rounded-2xl text-sm font-semibold hover:bg-gray-200 active:scale-95 transition-all">
          Copy message + link
        </button>
      </section>

      {/* Social share */}
      <section className="px-5 pb-8">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Share on social</p>
        <div className="grid grid-cols-3 gap-2">
          <a href={twitterUrl} target="_blank" rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 py-4 bg-black text-white rounded-2xl text-xs font-semibold hover:opacity-90 active:scale-95 transition-all">
            <span className="text-2xl">𝕏</span>
            Twitter/X
          </a>
          <a href={lineUrl} target="_blank" rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 py-4 bg-[#06C755] text-white rounded-2xl text-xs font-semibold hover:opacity-90 active:scale-95 transition-all">
            <span className="text-2xl">💬</span>
            LINE
          </a>
          <a href={facebookUrl} target="_blank" rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 py-4 bg-[#1877F2] text-white rounded-2xl text-xs font-semibold hover:opacity-90 active:scale-95 transition-all">
            <span className="text-2xl">f</span>
            Facebook
          </a>
        </div>
      </section>

      {/* Why share */}
      <section className="bg-brand-50 mx-5 rounded-3xl p-5 mb-8">
        <p className="font-bold text-brand-800 text-sm mb-3">Why share nowjp?</p>
        <div className="space-y-2">
          {[
            '100% free — no hidden costs for your friends',
            'No spam, no fake profiles — real people only',
            'Japan-specific — built for people living here',
          ].map(r => (
            <div key={r} className="flex items-start gap-2">
              <span className="text-brand-500 font-bold text-sm flex-shrink-0">✓</span>
              <p className="text-xs text-brand-700 leading-relaxed">{r}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Back to app */}
      <div className="px-5 pb-10">
        <Link href="/home"
          className="block w-full py-3.5 border-2 border-brand-200 text-brand-600 rounded-2xl font-semibold text-sm text-center hover:bg-brand-50 active:scale-[0.98] transition-all">
          ← Back to nowjp
        </Link>
      </div>
    </div>
  )
}
