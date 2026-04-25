'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Send, MoreVertical, ChevronLeft } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import ChatBubble from '@/components/features/ChatBubble'
import ReportModal from '@/components/features/ReportModal'
import { createClient } from '@/lib/supabase/client'
import { getNationalityFlag } from '@/lib/utils'
import type { Profile, Message } from '@/types'

const ICEBREAKERS = [
  "How long have you been in Japan? 🇯🇵",
  "Where are you from originally? 🌍",
  "What do you like most about living here? 😊",
  "Any good food spots you'd recommend? 🍜",
]

export default function ChatDetailPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [other, setOther] = useState<Profile | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [showIcebreakers, setShowIcebreakers] = useState(false)
  // reactions[messageId][userId] = emoji
  const [reactionsMap, setReactionsMap] = useState<Record<string, Record<string, string>>>({})
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)

      const { data: match } = await supabase
        .from('matches').select('*').eq('id', matchId)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`).single()
      if (!match) { router.push('/chat'); return }

      const otherId = match.user1_id === user.id ? match.user2_id : match.user1_id
      const [{ data: profile }, { data: msgs }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', otherId).single(),
        supabase.from('messages').select('*').eq('match_id', matchId)
          .order('created_at', { ascending: true }),
      ])
      setOther(profile)
      setMessages(msgs || [])
      setShowIcebreakers((msgs || []).length === 0)

      // Load reactions for all messages in this match
      if (msgs && msgs.length > 0) {
        const { data: allRxns } = await supabase
          .from('message_reactions')
          .select('*')
          .in('message_id', msgs.map((m: Message) => m.id))
        if (allRxns) {
          const map: Record<string, Record<string, string>> = {}
          for (const r of allRxns) {
            if (!map[r.message_id]) map[r.message_id] = {}
            map[r.message_id][r.user_id] = r.emoji
          }
          setReactionsMap(map)
        }
      }
      setLoading(false)
    }
    load()
  }, [matchId, router])

  useEffect(() => { scrollToBottom(false) }, [loading, scrollToBottom])
  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`chat:${matchId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `match_id=eq.${matchId}`,
      }, payload => {
        setMessages(prev => {
          if (prev.some(m => m.id === (payload.new as Message).id)) return prev
          return [...prev, payload.new as Message]
        })
        setShowIcebreakers(false)
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'message_reactions',
      }, payload => {
        const r = payload.new as { message_id: string; user_id: string; emoji: string }
        setReactionsMap(prev => ({
          ...prev,
          [r.message_id]: { ...(prev[r.message_id] || {}), [r.user_id]: r.emoji },
        }))
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'message_reactions',
      }, payload => {
        const r = payload.new as { message_id: string; user_id: string; emoji: string }
        setReactionsMap(prev => ({
          ...prev,
          [r.message_id]: { ...(prev[r.message_id] || {}), [r.user_id]: r.emoji },
        }))
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'message_reactions',
      }, payload => {
        const r = payload.old as { message_id: string; user_id: string }
        setReactionsMap(prev => {
          const updated = { ...(prev[r.message_id] || {}) }
          delete updated[r.user_id]
          return { ...prev, [r.message_id]: updated }
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [matchId])

  async function sendMessage(text: string) {
    if (!text.trim() || !currentUserId || sending) return
    setSending(true)
    setShowIcebreakers(false)
    const supabase = createClient()

    // Optimistic update
    const optimisticMsg: Message = {
      id: `opt-${Date.now()}`,
      match_id: matchId,
      sender_id: currentUserId,
      content: text.trim(),
      created_at: new Date().toISOString(),
      is_deleted: false,
    }
    setMessages(prev => [...prev, optimisticMsg])
    setInput('')

    const { data: realMsg } = await supabase.from('messages').insert({
      match_id: matchId,
      sender_id: currentUserId,
      content: text.trim(),
      is_deleted: false,
    }).select().single()

    // Replace optimistic with real
    if (realMsg) {
      setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? realMsg : m))
    }
    setSending(false)
    inputRef.current?.focus()
  }

  async function handleReact(messageId: string, emoji: string) {
    if (!currentUserId) return
    const supabase = createClient()
    const existing = reactionsMap[messageId]?.[currentUserId]
    if (existing === emoji) {
      // Toggle off
      await supabase.from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', currentUserId)
      setReactionsMap(prev => {
        const updated = { ...(prev[messageId] || {}) }
        delete updated[currentUserId]
        return { ...prev, [messageId]: updated }
      })
    } else {
      // Upsert
      await supabase.from('message_reactions')
        .upsert({ message_id: messageId, user_id: currentUserId, emoji })
      setReactionsMap(prev => ({
        ...prev,
        [messageId]: { ...(prev[messageId] || {}), [currentUserId]: emoji },
      }))
    }
  }

  async function handleBlock() {
    if (!other || !currentUserId) return
    const supabase = createClient()
    await supabase.from('blocks').insert({ blocker_id: currentUserId, blocked_id: other.id })
    router.push('/chat')
  }

  if (loading || !other) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-3 py-2.5 flex items-center gap-2.5 sticky top-0 z-20 shadow-sm">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-xl text-gray-500 hover:bg-gray-100 transition"
        >
          <ChevronLeft size={22} />
        </button>

        <button
          onClick={() => router.push(`/profile/${other.id}`)}
          className="flex items-center gap-2.5 flex-1 min-w-0"
        >
          <Avatar src={other.avatar_url} name={other.display_name} size="sm" isOnline={other.is_online} />
          <div className="text-left min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-gray-900 text-sm truncate">{other.display_name}</span>
              <span className="text-xs flex-shrink-0">{getNationalityFlag(other.nationality)}</span>
            </div>
            <span className={`text-xs ${other.is_online ? 'text-green-500' : 'text-gray-400'}`}>
              {other.is_online ? '● Online' : 'Offline'}
            </span>
          </div>
        </button>

        {/* Languages spoken (Sofia's design: show language at top) */}
        <div className="hidden sm:flex gap-1 flex-shrink-0">
          {other.spoken_languages.slice(0, 2).map(l => (
            <span key={l} className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full font-medium">
              {l}
            </span>
          ))}
        </div>

        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowMenu(m => !m)}
            className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-500 transition"
          >
            <MoreVertical size={18} />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 bg-white rounded-2xl shadow-xl border border-gray-100 py-1 w-44 z-30">
                <button
                  onClick={() => { setShowReport(true); setShowMenu(false) }}
                  className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                >
                  🚩 Report User
                </button>
                <button
                  onClick={() => { handleBlock(); setShowMenu(false) }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                >
                  🚫 Block User
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Icebreakers (Ava's fix: reduce drop-off after match) */}
        {showIcebreakers && (
          <div className="mb-6">
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-2 bg-white border border-gray-100 rounded-2xl px-4 py-2 shadow-sm">
                <span className="text-lg">👋</span>
                <span className="text-sm text-gray-600 font-medium">
                  Say hello to {other.display_name}!
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center mb-2">Or try a conversation starter:</p>
            <div className="grid grid-cols-2 gap-2">
              {ICEBREAKERS.map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left text-xs bg-white border border-gray-200 rounded-2xl px-3 py-2.5 text-gray-700 hover:border-brand-300 hover:bg-brand-50 transition active:scale-95 leading-relaxed"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => {
          const msgReactions = reactionsMap[msg.id] || {}
          const counts: Record<string, number> = {}
          for (const emoji of Object.values(msgReactions)) {
            counts[emoji] = (counts[emoji] || 0) + 1
          }
          const reactionList = Object.entries(counts).map(([emoji, count]) => ({
            emoji,
            count,
            isMine: msgReactions[currentUserId!] === emoji,
          }))
          return (
            <ChatBubble
              key={msg.id}
              message={msg}
              isMine={msg.sender_id === currentUserId}
              reactions={reactionList}
              onReact={handleReact}
            />
          )
        })}
        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Input */}
      <form
        onSubmit={e => { e.preventDefault(); sendMessage(input) }}
        className="bg-white border-t border-gray-100 px-3 py-2.5 flex items-center gap-2 safe-area-pb shadow-sm"
      >
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={`Message ${other.display_name}...`}
          className="flex-1 px-4 py-2.5 rounded-2xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-white transition"
          autoComplete="off"
          maxLength={1000}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="w-10 h-10 bg-brand-500 rounded-2xl flex items-center justify-center text-white disabled:opacity-40 transition-all active:scale-90 flex-shrink-0 shadow-sm shadow-brand-200"
        >
          <Send size={16} />
        </button>
      </form>

      {showReport && (
        <ReportModal
          reportedId={other.id}
          reportedName={other.display_name}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  )
}
