'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  onClose: () => void
}

export default function FeedbackModal({ onClose }: Props) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSend() {
    if (!message.trim()) return
    setSending(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('feedback').insert({
      user_id: user?.id ?? null,
      message: message.trim(),
    })
    setSending(false)
    setSent(true)
    setTimeout(onClose, 1800)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        {sent ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">🙏</div>
            <div className="font-bold text-gray-800">Thanks! We read every message.</div>
            <p className="text-xs text-gray-400 mt-1">Your feedback helps us improve YVOICE for everyone.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-extrabold text-gray-900">💡 Share your idea</div>
                <div className="text-xs text-gray-400 mt-0.5">What would make YVOICE better?</div>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value.slice(0, 500))}
              placeholder="e.g. I wish I could filter by language... / It would be great if... / The hardest part for me was..."
              rows={4}
              autoFocus
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-400 mb-1"
            />
            <p className="text-xs text-gray-400 text-right mb-3">{message.length}/500</p>
            <button
              onClick={handleSend}
              disabled={!message.trim() || sending}
              className="w-full py-3.5 bg-brand-500 text-white rounded-2xl font-bold text-sm disabled:opacity-50 hover:bg-brand-600 transition"
            >
              {sending ? 'Sending...' : 'Send Feedback →'}
            </button>
            <p className="text-xs text-center text-gray-400 mt-2">Your feedback may be implemented within 48h</p>
          </>
        )}
      </div>
    </div>
  )
}
