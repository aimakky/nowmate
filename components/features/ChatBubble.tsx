'use client'

import { useState } from 'react'
import { timeAgo } from '@/lib/utils'
import type { Message } from '@/types'

const REACTION_EMOJIS = ['❤️', '😂', '👍', '🙏', '😮']

interface ReactionCount {
  emoji: string
  count: number
  isMine: boolean
}

interface ChatBubbleProps {
  message: Message
  isMine: boolean
  reactions?: ReactionCount[]
  onReact?: (messageId: string, emoji: string) => void
}

export default function ChatBubble({ message, isMine, reactions = [], onReact }: ChatBubbleProps) {
  const [showPicker, setShowPicker] = useState(false)

  if (message.is_deleted) {
    return (
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2`}>
        <span className="text-xs text-gray-400 italic px-3 py-1.5">This message was deleted</span>
      </div>
    )
  }

  function handleReact(emoji: string) {
    onReact?.(message.id, emoji)
    setShowPicker(false)
  }

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1 group`}>
      <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
        <div className={`flex items-end gap-1.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Bubble */}
          <div
            onClick={() => setShowPicker(p => !p)}
            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed cursor-pointer select-none ${
              isMine
                ? 'bg-brand-500 text-white rounded-br-sm active:bg-brand-600'
                : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100 shadow-sm active:bg-gray-50'
            }`}
          >
            {message.content}
          </div>
        </div>

        {/* Emoji picker */}
        {showPicker && (
          <div className={`flex gap-1 bg-white border border-gray-200 rounded-2xl px-2 py-1.5 shadow-lg ${isMine ? 'self-end' : 'self-start'}`}>
            {REACTION_EMOJIS.map(e => (
              <button
                key={e}
                onClick={() => handleReact(e)}
                className="text-xl hover:scale-125 transition-transform active:scale-110"
              >
                {e}
              </button>
            ))}
          </div>
        )}

        {/* Reaction counts */}
        {reactions.length > 0 && (
          <div className={`flex gap-1 flex-wrap ${isMine ? 'justify-end' : 'justify-start'}`}>
            {reactions.map(r => (
              <button
                key={r.emoji}
                onClick={() => handleReact(r.emoji)}
                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs border transition-all ${
                  r.isMine
                    ? 'bg-brand-100 border-brand-300 text-brand-700 font-bold'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>{r.emoji}</span>
                <span>{r.count}</span>
              </button>
            ))}
          </div>
        )}

        <span className="text-[10px] text-gray-400 px-1">{timeAgo(message.created_at)}</span>
      </div>
    </div>
  )
}
