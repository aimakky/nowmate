import { timeAgo } from '@/lib/utils'
import type { Message } from '@/types'

interface ChatBubbleProps {
  message: Message
  isMine: boolean
}

export default function ChatBubble({ message, isMine }: ChatBubbleProps) {
  if (message.is_deleted) {
    return (
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2`}>
        <span className="text-xs text-gray-400 italic px-3 py-1.5">This message was deleted</span>
      </div>
    )
  }

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isMine
            ? 'bg-brand-500 text-white rounded-br-sm'
            : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100 shadow-sm'
        }`}>
          {message.content}
        </div>
        <span className="text-[10px] text-gray-400 px-1">{timeAgo(message.created_at)}</span>
      </div>
    </div>
  )
}
