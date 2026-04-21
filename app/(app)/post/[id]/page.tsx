'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getNationalityFlag } from '@/lib/utils'
import { ArrowLeft, Send } from 'lucide-react'

const TAG_EMOJIS: Record<string, string> = {
  Drinks: '🍻', Food: '🍜', Coffee: '☕', Sightseeing: '🗺️',
  Culture: '🎌', Talk: '💬', Help: '🆘', Other: '✨',
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export default function PostChatPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [post, setPost] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [participants, setParticipants] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [hasJoined, setHasJoined] = useState(false)
  const [joining, setJoining] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id)
    })
  }, [])

  useEffect(() => {
    if (!id) return
    const supabase = createClient()

    supabase.from('posts')
      .select('*, profiles(display_name, nationality)')
      .eq('id', id).single()
      .then(({ data }) => setPost(data))

    supabase.from('post_messages')
      .select('*, profiles(display_name, nationality)')
      .eq('post_id', id)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages(data || []))

    supabase.from('post_joins')
      .select('*, profiles(display_name, nationality)')
      .eq('post_id', id)
      .then(({ data }) => {
        setParticipants(data || [])
        if (currentUserId) {
          setHasJoined((data || []).some((j: any) => j.user_id === currentUserId))
        }
      })

    const channel = supabase.channel(`post_chat_${id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'post_messages',
        filter: `post_id=eq.${id}`
      }, payload => {
        supabase.from('post_messages')
          .select('*, profiles(display_name, nationality)')
          .eq('id', payload.new.id).single()
          .then(({ data }) => { if (data) setMessages(prev => [...prev, data]) })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id, currentUserId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleJoin() {
    if (!currentUserId || !id) return
    setJoining(true)
    const supabase = createClient()
    await supabase.from('post_joins').upsert({ post_id: id, user_id: currentUserId })
    setHasJoined(true)
    setJoining(false)
    const { data } = await supabase.from('post_joins')
      .select('*, profiles(display_name, nationality)')
      .eq('post_id', id)
    setParticipants(data || [])
  }

  async function handleSend() {
    if (!input.trim() || !currentUserId || sending || !hasJoined) return
    setSending(true)
    const supabase = createClient()
    await supabase.from('post_messages').insert({
      post_id: id, user_id: currentUserId, content: input.trim()
    })
    setInput('')
    setSending(false)
  }

  async function handleClose() {
    if (!post || post.user_id !== currentUserId) return
    const supabase = createClient()
    await supabase.from('posts').update({ status: 'closed' }).eq('id', id)
    router.push('/home')
  }

  if (!post) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9]">
      <span className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const isOwn = post.user_id === currentUserId
  const flag = post.profiles ? getNationalityFlag(post.profiles.nationality || '') : ''

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-[#FAFAF9]">
      {/* Header */}
      <div className="bg-white border-b border-stone-100 px-4 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center gap-3 mb-2.5">
          <button onClick={() => router.back()} className="p-1 -ml-1 text-stone-500">
            <ArrowLeft size={20} />
          </button>
          <span className="text-xl">{TAG_EMOJIS[post.tag] ?? '✨'}</span>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-stone-900 text-sm leading-snug truncate">{post.content}</p>
            <p className="text-xs text-stone-400 mt-0.5">
              {flag} {post.profiles?.display_name} · {post.area} · 👥 {participants.length}
            </p>
          </div>
          {isOwn && post.status === 'active' && (
            <button onClick={handleClose}
              className="text-xs text-stone-400 font-semibold px-2.5 py-1.5 rounded-xl hover:bg-stone-100 flex-shrink-0">
              Close
            </button>
          )}
        </div>
        {/* Participant flags */}
        {participants.length > 0 && (
          <div className="flex items-center gap-1.5 ml-1">
            <span className="text-xs text-stone-400 mr-1">Who's in:</span>
            {participants.slice(0, 10).map((p: any, i: number) => (
              <span key={i} className="text-lg">{getNationalityFlag(p.profiles?.nationality || '')}</span>
            ))}
            {participants.length > 10 && (
              <span className="text-xs text-stone-400">+{participants.length - 10}</span>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <p className="text-3xl mb-2">👋</p>
            <p className="text-sm text-stone-500 font-medium">Say hi to the group!</p>
          </div>
        )}
        {messages.map(msg => {
          const isMine = msg.user_id === currentUserId
          const msgFlag = getNationalityFlag(msg.profiles?.nationality || '')
          return (
            <div key={msg.id} className={`flex gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
              {!isMine && <span className="text-lg flex-shrink-0 mt-1">{msgFlag}</span>}
              <div className={`max-w-[78%] flex flex-col gap-0.5 ${isMine ? 'items-end' : 'items-start'}`}>
                {!isMine && (
                  <p className="text-[10px] text-stone-400 font-medium px-1">{msg.profiles?.display_name}</p>
                )}
                <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isMine
                    ? 'bg-brand-500 text-white rounded-tr-sm'
                    : 'bg-white border border-stone-100 text-stone-800 shadow-sm rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
                <p className="text-[9px] text-stone-300 px-1">{timeAgo(msg.created_at)}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Join banner or input */}
      {!hasJoined && !isOwn ? (
        <div className="bg-white border-t border-stone-100 px-4 py-4">
          <button onClick={handleJoin} disabled={joining}
            className="w-full h-12 bg-brand-500 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all shadow-md shadow-brand-200">
            {joining
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : '🙋 Join this group'}
          </button>
        </div>
      ) : (
        <div className="bg-white border-t border-stone-100 px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="Say something..."
              className="flex-1 px-4 py-2.5 rounded-2xl border-2 border-stone-200 text-sm focus:outline-none focus:border-brand-400 transition bg-stone-50"
            />
            <button onClick={handleSend} disabled={!input.trim() || sending}
              className="w-10 h-10 bg-brand-500 text-white rounded-2xl flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all flex-shrink-0">
              <Send size={15} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
