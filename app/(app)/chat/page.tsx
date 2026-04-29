'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/ui/Avatar'
import TrustBadge from '@/components/ui/TrustBadge'
import { createClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/utils'
import { Edit2, MessageSquareDashed, Check, X } from 'lucide-react'

interface DirectChat {
  matchId: string
  other: {
    id: string
    display_name: string
    avatar_url: string | null
    is_online: boolean
    trust_tier?: string | null
  }
  lastMessage: { content: string; created_at: string; sender_id: string } | null
  isRequest?: boolean
}

interface OnlineUser {
  id: string
  display_name: string
  avatar_url: string | null
}

export default function ChatListPage() {
  const router = useRouter()
  const [directs,   setDirects]   = useState<DirectChat[]>([])
  const [requests,  setRequests]  = useState<DirectChat[]>([])
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [loading,   setLoading]   = useState(true)
  const [userId,    setUserId]    = useState<string | null>(null)
  const [tab,       setTab]       = useState<'chat' | 'request'>('chat')

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        setUserId(user.id)

        const { data: matchData, error: matchErr } = await supabase
          .from('matches')
          .select('id, user1_id, user2_id, is_request, request_status')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .not('request_status', 'eq', 'declined')
          .order('created_at', { ascending: false })

        if (matchErr || !matchData || matchData.length === 0) {
          setLoading(false)
          return
        }

        const otherIds = matchData.map((m: any) =>
          m.user1_id === user.id ? m.user2_id : m.user1_id
        )
        const matchIds = matchData.map((m: any) => m.id)

        const [{ data: profileData }, { data: trustData }, { data: msgData }] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, display_name, avatar_url, is_online')
            .in('id', otherIds),
          supabase
            .from('user_trust')
            .select('user_id, tier')
            .in('user_id', otherIds),
          supabase
            .from('messages')
            .select('match_id, content, created_at, sender_id')
            .in('match_id', matchIds)
            .order('created_at', { ascending: false }),
        ])

        const profileMap  = new Map((profileData || []).map((p: any) => [p.id, p]))
        const trustMap    = new Map((trustData   || []).map((t: any) => [t.user_id, t.tier]))
        const lastMsgMap  = new Map<string, any>()
        ;(msgData || []).forEach((msg: any) => {
          if (!lastMsgMap.has(msg.match_id)) lastMsgMap.set(msg.match_id, msg)
        })

        const directData: DirectChat[] = matchData
          .map((m: any) => {
            const otherId = m.user1_id === user.id ? m.user2_id : m.user1_id
            const other   = profileMap.get(otherId)
            if (!other) return null
            return {
              matchId: m.id,
              other: { ...other, trust_tier: trustMap.get(otherId) ?? null },
              lastMessage: lastMsgMap.get(m.id) ?? null,
              isRequest: m.is_request && m.request_status === 'pending' && m.user2_id === user.id,
            }
          })
          .filter(Boolean) as DirectChat[]

        directData.sort((a, b) => {
          const ta = a.lastMessage?.created_at ?? '0'
          const tb = b.lastMessage?.created_at ?? '0'
          return tb.localeCompare(ta)
        })

        // 通常チャットとリクエストを分離
        const normalChats  = directData.filter(d => !d.isRequest)
        const requestChats = directData.filter(d => d.isRequest)
        setDirects(normalChats)
        setRequests(requestChats)

        // オンラインユーザーを抽出
        const online = (profileData || [])
          .filter((p: any) => p.is_online && otherIds.includes(p.id))
          .map((p: any) => ({ id: p.id, display_name: p.display_name, avatar_url: p.avatar_url }))
        setOnlineUsers(online)

      } catch (e) {
        console.error('chat load error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  async function handleRequest(matchId: string, accept: boolean) {
    const supabase = createClient()
    if (accept) {
      await supabase.from('matches').update({ request_status: 'accepted', is_request: false }).eq('id', matchId)
      const req = requests.find(r => r.matchId === matchId)
      if (req) {
        setRequests(prev => prev.filter(r => r.matchId !== matchId))
        setDirects(prev => [{ ...req, isRequest: false }, ...prev])
      }
    } else {
      await supabase.from('matches').update({ request_status: 'declined' }).eq('id', matchId)
      setRequests(prev => prev.filter(r => r.matchId !== matchId))
    }
  }

  return (
    <div className="max-w-md mx-auto min-h-screen" style={{ background: '#080812' }}>

      {/* ヘッダー */}
      <div className="sticky top-0 z-10 px-4 pt-12 pb-0 backdrop-blur-md"
        style={{ background: 'rgba(8,8,18,0.96)', borderBottom: '1px solid rgba(245,158,11,0.2)' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase mb-0.5" style={{ color: 'rgba(245,158,11,0.7)' }}>MESSAGES</p>
            <h1 className="font-extrabold text-xl" style={{ color: '#F0EEFF' }}>チャット</h1>
          </div>
          <button className="text-sm font-semibold active:opacity-60 transition-opacity" style={{ color: '#F59E0B' }}>
            編集
          </button>
        </div>
        {/* タブ */}
        <div className="flex">
          {[
            { id: 'chat',    label: 'メッセージ', count: 0 },
            { id: 'request', label: 'リクエスト', count: requests.length },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as 'chat' | 'request')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold relative transition-colors"
              style={{ color: tab === t.id ? '#F0EEFF' : 'rgba(240,238,255,0.3)' }}
            >
              {t.label}
              {t.count > 0 && (
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-extrabold text-white"
                  style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', boxShadow: '0 2px 8px rgba(245,158,11,0.4)' }}>
                  {t.count}
                </span>
              )}
              {tab === t.id && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full"
                  style={{ background: '#F59E0B' }} />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="pb-28">

        {/* ══ リクエストタブ ══ */}
        {tab === 'request' && (
          <div className="pt-4 px-4 space-y-3">
            {requests.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <MessageSquareDashed size={28} style={{ color: 'rgba(245,158,11,0.5)' }} />
                </div>
                <p className="font-bold" style={{ color: 'rgba(240,238,255,0.5)' }}>リクエストはありません</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(240,238,255,0.3)' }}>知らない人からのDMはここに届きます</p>
              </div>
            ) : (
              requests.map(r => (
                <div key={r.matchId} className="rounded-2xl overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  {/* ユーザー情報 */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg,#F59E0B,#D97706)',
                        boxShadow: '0 0 0 2px rgba(245,158,11,0.4)',
                      }}>
                      {r.other.avatar_url
                        ? <img src={r.other.avatar_url} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center">
                            <span className="text-lg font-bold text-white">{r.other.display_name[0]}</span>
                          </div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm" style={{ color: '#F0EEFF' }}>{r.other.display_name}</p>
                      {r.lastMessage && (
                        <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(240,238,255,0.4)' }}>{r.lastMessage.content}</p>
                      )}
                    </div>
                  </div>
                  {/* 注意書き */}
                  <div className="px-4 pb-2">
                    <p className="text-[10px] rounded-xl px-3 py-2"
                      style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(240,238,255,0.3)', border: '1px solid rgba(245,158,11,0.1)' }}>
                      🔒 承認するまで相手に既読はつきません。拒否しても相手には通知されません。
                    </p>
                  </div>
                  {/* アクション */}
                  <div className="grid grid-cols-2" style={{ borderTop: '1px solid rgba(245,158,11,0.12)' }}>
                    <button
                      onClick={() => handleRequest(r.matchId, false)}
                      className="flex items-center justify-center gap-1.5 py-3 text-sm font-bold active:opacity-60 transition-all"
                      style={{ color: 'rgba(240,238,255,0.35)', borderRight: '1px solid rgba(245,158,11,0.12)' }}
                    >
                      <X size={15} /> 拒否
                    </button>
                    <button
                      onClick={() => handleRequest(r.matchId, true)}
                      className="flex items-center justify-center gap-1.5 py-3 text-sm font-bold active:opacity-60 transition-all"
                      style={{ color: '#7CFF82' }}
                    >
                      <Check size={15} /> 承認
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'chat' && <>

        {/* オンライン中フレンド */}
        {!loading && onlineUsers.length > 0 && (
          <div className="px-4 pt-4 pb-3">
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'rgba(240,238,255,0.3)' }}>
              オンライン中
            </p>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
              {onlineUsers.map(u => (
                <div key={u.id} className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div className="relative">
                    {/* Purple ring for online users */}
                    <div className="w-14 h-14 rounded-full overflow-hidden"
                      style={{ border: '2px solid rgba(245,158,11,0.6)', boxShadow: '0 0 10px rgba(245,158,11,0.3)' }}>
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt={u.display_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"
                          style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)' }}>
                          <span className="text-xl font-bold text-white">
                            {u.display_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Green online dot */}
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full"
                      style={{
                        background: '#7CFF82',
                        border: '2px solid #080812',
                        boxShadow: '0 0 6px rgba(124,255,130,0.6)',
                      }} />
                  </div>
                  <span className="text-[10px] font-medium max-w-[52px] truncate text-center"
                    style={{ color: 'rgba(240,238,255,0.55)' }}>
                    {u.display_name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 区切り */}
        {!loading && onlineUsers.length > 0 && (
          <div className="h-px mx-4" style={{ background: 'rgba(245,158,11,0.1)' }} />
        )}

        {/* チャットリスト */}
        <div className="pt-2">
          {loading ? (
            <div className="space-y-2 px-4 pt-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3.5 rounded-2xl animate-pulse"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(245,158,11,0.08)' }}>
                  <div className="w-12 h-12 rounded-full flex-shrink-0" style={{ background: 'rgba(245,158,11,0.1)' }} />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 rounded w-1/4" style={{ background: 'rgba(245,158,11,0.1)' }} />
                    <div className="h-3 rounded w-2/3" style={{ background: 'rgba(245,158,11,0.07)' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : directs.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6" style={{ minHeight: 'calc(100vh - 200px)' }}>
              {/* Chat bubble icon with sparkles */}
              <div className="relative mb-6">
                <span className="absolute -top-2 -right-1 text-[10px] font-bold" style={{ color: 'rgba(245,158,11,0.7)' }}>+</span>
                <span className="absolute -bottom-1 -left-3 text-[10px] font-bold" style={{ color: 'rgba(245,158,11,0.5)' }}>+</span>
                <span className="absolute top-2 -left-4 text-[8px] font-bold" style={{ color: 'rgba(245,158,11,0.5)' }}>+</span>
                <div
                  className="w-[80px] h-[80px] rounded-[22px] flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(217,119,6,0.1) 100%)',
                    border: '1px solid rgba(245,158,11,0.3)',
                    boxShadow: '0 0 30px rgba(245,158,11,0.2)',
                  }}
                >
                  <span className="text-5xl">💬</span>
                </div>
              </div>

              <p className="font-extrabold text-xl mb-2 text-center" style={{ color: '#F0EEFF' }}>
                まだチャットがありません
              </p>
              <p className="text-sm text-center leading-relaxed mb-8" style={{ color: 'rgba(240,238,255,0.4)' }}>
                ギルドで知り合った仲間とDMができます
              </p>

              {/* Neon border CTA button */}
              <button
                onClick={() => router.push('/guilds')}
                className="relative w-full max-w-xs py-4 rounded-2xl font-bold text-base active:scale-[0.98] transition-all"
                style={{
                  background: 'rgba(245,158,11,0.12)',
                  border: '1px solid rgba(245,158,11,0.6)',
                  color: '#F0EEFF',
                  boxShadow: '0 0 20px rgba(245,158,11,0.2), inset 0 0 20px rgba(245,158,11,0.05)',
                }}
              >
                ギルドを探す →
              </button>
            </div>
          ) : (
            <div className="pt-2">
              {directs.map(c => {
                const isMine = c.lastMessage?.sender_id === userId
                return (
                  <Link key={c.matchId} href={`/chat/${c.matchId}`}>
                    <div className="px-4 py-3 flex items-center gap-3 transition-all"
                      style={{ borderBottom: '1px solid rgba(245,158,11,0.08)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,158,11,0.05)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      {/* アバター with purple ring for online users */}
                      <div className="relative flex-shrink-0">
                        <div className="w-[52px] h-[52px] rounded-full overflow-hidden"
                          style={{
                            background: 'linear-gradient(135deg,#F59E0B,#D97706)',
                            border: c.other.is_online
                              ? '2px solid rgba(245,158,11,0.6)'
                              : '2px solid rgba(245,158,11,0.2)',
                            boxShadow: c.other.is_online ? '0 0 10px rgba(245,158,11,0.25)' : 'none',
                          }}>
                          {c.other.avatar_url ? (
                            <img src={c.other.avatar_url} alt={c.other.display_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-lg font-bold text-white">
                                {c.other.display_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        {/* Green online dot */}
                        {c.other.is_online && (
                          <span className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full"
                            style={{
                              background: '#7CFF82',
                              border: '2px solid #080812',
                              boxShadow: '0 0 6px rgba(124,255,130,0.6)',
                            }} />
                        )}
                      </div>

                      {/* テキスト */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-bold text-sm truncate" style={{ color: '#F0EEFF' }}>
                              {c.other.display_name}
                            </span>
                            {c.other.trust_tier && (
                              <TrustBadge tierId={c.other.trust_tier} size="xs" showLabel={false} />
                            )}
                          </div>
                          {c.lastMessage && (
                            <span className="text-[11px] flex-shrink-0 ml-2" style={{ color: 'rgba(240,238,255,0.3)' }}>
                              {timeAgo(c.lastMessage.created_at)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm truncate" style={{ color: 'rgba(240,238,255,0.4)' }}>
                          {c.lastMessage
                            ? `${isMine ? 'あなた: ' : ''}${c.lastMessage.content}`
                            : '👋 最初のメッセージを送ってみよう'}
                        </p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        </> /* end tab === 'chat' */}
      </div>

    </div>
  )
}
