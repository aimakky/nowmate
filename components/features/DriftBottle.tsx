'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, X, ChevronDown, ChevronUp, Share2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/utils'

interface Bottle {
  id: string
  message: string
  created_at: string
  status: string
  sender_village: { id: string; name: string; icon: string } | null
  replies: Reply[]
}

interface Reply {
  id: string
  bottle_id: string
  message: string
  created_at: string
}

interface Props {
  villageId:   string
  villageName: string
  userId:      string
  style:       { accent: string; gradient: string }
  isMember:    boolean
  canPost:     boolean
}

const ONBOARD_KEY = 'drift_bottle_onboarded'
const PREVIEW     = 2

export default function DriftBottle({ villageId, villageName, userId, style, isMember, canPost }: Props) {
  const [bottles,         setBottles]         = useState<Bottle[]>([])
  const [loading,         setLoading]         = useState(true)
  const [expanded,        setExpanded]        = useState(false)       // パネル全体の開閉
  const [expandedIds,     setExpandedIds]     = useState<Set<string>>(new Set())
  const [showMore,        setShowMore]        = useState(false)       // 3本目以降
  const [replyId,         setReplyId]         = useState<string | null>(null)
  const [replyText,       setReplyText]       = useState('')
  const [replying,        setReplying]        = useState(false)
  const [showSendModal,   setShowSendModal]   = useState(false)
  const [showOnboard,     setShowOnboard]     = useState(false)
  const didCheckOnboard   = useRef(false)

  useEffect(() => { load() }, [villageId])

  // 初回オンボーディング判定
  useEffect(() => {
    if (didCheckOnboard.current) return
    didCheckOnboard.current = true
    if (typeof window !== 'undefined' && !localStorage.getItem(ONBOARD_KEY)) {
      setShowOnboard(true)
    }
  }, [])

  async function load() {
    setLoading(true)
    const supabase = createClient()

    const { data: bottleData } = await supabase
      .from('drift_bottles')
      .select(`id, message, created_at, status,
        sender_village:sender_village_id(id, name, icon)`)
      .eq('recipient_village_id', villageId)
      .in('status', ['delivered', 'replied'])
      .order('created_at', { ascending: false })
      .limit(20)

    if (!bottleData) { setLoading(false); return }

    const ids = bottleData.map(b => b.id)
    const { data: replyData } = ids.length
      ? await supabase
          .from('drift_bottle_replies')
          .select('id, bottle_id, message, created_at')
          .in('bottle_id', ids)
          .order('created_at', { ascending: true })
      : { data: [] }

    const replyMap: Record<string, Reply[]> = {}
    for (const r of (replyData ?? [])) {
      ;(replyMap[r.bottle_id] ??= []).push(r)
    }

    setBottles(bottleData.map(b => ({
      id:             b.id,
      message:        b.message,
      created_at:     b.created_at,
      status:         b.status,
      sender_village: Array.isArray(b.sender_village) ? (b.sender_village[0] ?? null) : (b.sender_village as any),
      replies:        replyMap[b.id] ?? [],
    })))
    setLoading(false)
  }

  async function submitReply(bottleId: string) {
    if (!replyText.trim() || replying) return
    setReplying(true)
    const supabase = createClient()
    await supabase.from('drift_bottle_replies').insert({
      bottle_id: bottleId, village_id: villageId, user_id: userId, message: replyText.trim(),
    })
    await supabase.from('drift_bottles').update({ status: 'replied' }).eq('id', bottleId)
    setReplyText(''); setReplyId(null); setReplying(false)
    await load()
  }

  function toggleBottle(id: string) {
    setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function dismissOnboard() {
    localStorage.setItem(ONBOARD_KEY, '1')
    setShowOnboard(false)
  }

  function handleShare() {
    const text = `知らない村から🍶漂流瓶が届きました！ #samee`
    const url  = `https://nowmatejapan.com/villages/${villageId}`
    if (navigator.share) navigator.share({ text, url }).catch(() => {})
    else navigator.clipboard.writeText(`${text}\n${url}`)
  }

  if (loading) return null

  const hasBottles   = bottles.length > 0
  const displayList  = showMore ? bottles : bottles.slice(0, PREVIEW)

  return (
    <>
      {/* ════ オンボーディングオーバーレイ ════ */}
      {showOnboard && expanded && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={dismissOnboard} />
          <div className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
            style={{ background: 'linear-gradient(180deg,#0c1445 0%,#0a2540 100%)', border: '1px solid rgba(100,140,255,0.3)' }}>
            <div className="p-6 text-center space-y-3">
              <div className="text-5xl">🍶</div>
              <h3 className="font-extrabold text-white text-base">漂流瓶とは？</h3>
              <div className="text-xs text-blue-200/80 leading-relaxed space-y-2 text-left">
                <p>📨 <strong className="text-white">他の村から流れてきたメッセージ</strong>です。<br />誰が書いたかは分からない、でも読むのは自由。</p>
                <p>🌊 <strong className="text-white">あなたも海に流せます。</strong><br />どこかの村に届くかもしれません。返事が来ることも。</p>
                <p>💬 <strong className="text-white">返事を書くのも自由。</strong><br />村全体で1つの返事を書けます。</p>
              </div>
              <button onClick={dismissOnboard}
                className="w-full py-3 rounded-2xl font-bold text-sm text-white mt-2 active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%)' }}>
                わかった！
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(12,20,69,0.85)', border: '1px solid rgba(100,140,255,0.2)' }}>

        {/* ── コンパクト帯 ── */}
        <button
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 active:bg-white/5 transition-all"
          onClick={() => {
            const opening = !expanded
            setExpanded(opening)
            if (opening && !localStorage.getItem(ONBOARD_KEY)) setShowOnboard(true)
          }}
        >
          <span className="text-xl flex-shrink-0">🍶</span>

          <div className="flex-1 text-left min-w-0">
            <span className="text-xs font-bold text-blue-200">
              {hasBottles ? `${bottles.length}本の瓶が届いています` : '漂流瓶'}
            </span>
            {!hasBottles && (
              <span className="text-[10px] text-blue-400/50 ml-2">まだ届いていません</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {hasBottles && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/20">
                開く
              </span>
            )}
            {isMember && canPost && !hasBottles && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                style={{ background: 'rgba(100,140,255,0.15)', color: '#93c5fd', borderColor: 'rgba(100,140,255,0.25)' }}>
                流してみる
              </span>
            )}
            {expanded
              ? <ChevronUp size={13} className="text-blue-400/50" />
              : <ChevronDown size={13} className="text-blue-400/50" />
            }
          </div>
        </button>

        {/* ── 展開パネル ── */}
        {expanded && (
          <div className="border-t border-white/5 p-3.5 space-y-3">

            {/* 送るボタン */}
            {isMember && canPost && (
              <button onClick={() => setShowSendModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
                style={{ background: 'rgba(100,140,255,0.15)', border: '1px solid rgba(100,160,255,0.25)', color: '#93c5fd' }}>
                <span>🌊</span><span>海に流す</span>
              </button>
            )}

            {/* ボトル一覧 */}
            {!hasBottles ? (
              <div className="text-center py-5">
                <p className="text-2xl mb-2">🌊</p>
                <p className="text-xs text-blue-400/50">
                  {isMember ? 'まずメッセージを流してみよう' : '村に参加すると瓶を流せます'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {displayList.map(bottle => {
                  const isOpen = expandedIds.has(bottle.id)
                  const hasReplied = bottle.status === 'replied'
                  return (
                    <div key={bottle.id} className="rounded-xl overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(120,160,255,0.12)' }}>

                      {/* 瓶ヘッダー */}
                      <button className="w-full px-3 py-2.5 flex items-start gap-2.5 text-left active:bg-white/5 transition-all"
                        onClick={() => toggleBottle(bottle.id)}>
                        <span className="text-lg flex-shrink-0 mt-0.5">🍶</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white/80 leading-relaxed line-clamp-2">{bottle.message}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-blue-400/50">
                              {bottle.sender_village
                                ? `${bottle.sender_village.icon} ${bottle.sender_village.name}より`
                                : 'どこかの村より'}
                            </span>
                            <span className="text-[10px] text-blue-500/30">{timeAgo(bottle.created_at)}</span>
                            {hasReplied && <span className="text-[10px] text-blue-300/60">💬 返事済み</span>}
                          </div>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-1 mt-0.5">
                          {/* シェアボタン */}
                          <button
                            onClick={e => { e.stopPropagation(); handleShare() }}
                            className="w-6 h-6 rounded-lg flex items-center justify-center active:scale-90 transition-all"
                            style={{ background: 'rgba(100,140,255,0.15)' }}>
                            <Share2 size={10} className="text-blue-300/60" />
                          </button>
                          {isOpen ? <ChevronUp size={13} className="text-blue-400/40" /> : <ChevronDown size={13} className="text-blue-400/40" />}
                        </div>
                      </button>

                      {/* 展開：返事一覧＋返事フォーム */}
                      {isOpen && (
                        <div className="px-3 pb-3 pt-1 border-t border-white/5 space-y-2">
                          {bottle.replies.map(r => (
                            <div key={r.id} className="rounded-lg px-3 py-2"
                              style={{ background: 'rgba(100,140,255,0.1)', border: '1px solid rgba(100,140,255,0.12)' }}>
                              <p className="text-xs text-blue-100/80 leading-relaxed">{r.message}</p>
                              <p className="text-[9px] text-blue-400/40 mt-1">{timeAgo(r.created_at)}</p>
                            </div>
                          ))}

                          {isMember && canPost && (
                            replyId === bottle.id ? (
                              <div className="flex gap-2 items-end pt-1">
                                <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                                  placeholder="この瓶に返事を書く…" rows={2} maxLength={200}
                                  className="flex-1 px-3 py-2 rounded-xl border text-xs resize-none focus:outline-none text-white bg-white/8 border-blue-400/20 placeholder-blue-400/30"
                                  style={{ background: 'rgba(255,255,255,0.05)' }} />
                                <div className="flex flex-col gap-1">
                                  <button onClick={() => submitReply(bottle.id)}
                                    disabled={!replyText.trim() || replying}
                                    className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all"
                                    style={{ background: 'linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%)' }}>
                                    {replying
                                      ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                      : <Send size={12} className="text-white" />}
                                  </button>
                                  <button onClick={() => { setReplyId(null); setReplyText('') }}
                                    className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90"
                                    style={{ background: 'rgba(255,255,255,0.08)' }}>
                                    <X size={12} className="text-blue-300/50" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => setReplyId(bottle.id)}
                                className="text-xs text-blue-300/50 hover:text-blue-300 transition-colors">
                                ↩ 返事を書く
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                {bottles.length > PREVIEW && (
                  <button onClick={() => setShowMore(m => !m)}
                    className="w-full text-xs text-blue-400/50 py-1.5 text-center hover:text-blue-300 transition-colors">
                    {showMore ? '▲ 閉じる' : `▼ 残り${bottles.length - PREVIEW}本を見る`}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 送るモーダル */}
      {showSendModal && (
        <SendModal
          villageId={villageId}
          userId={userId}
          onClose={() => setShowSendModal(false)}
          onSent={() => { setShowSendModal(false); load() }}
        />
      )}
    </>
  )
}

// ─── 送るモーダル ────────────────────────────────────────────
function SendModal({ villageId, userId, onClose, onSent }:
  { villageId: string; userId: string; onClose: () => void; onSent: () => void }) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(false)

  async function handleSend() {
    if (!message.trim()) return
    setSending(true)
    const { error } = await createClient().rpc('send_drift_bottle', {
      p_village_id: villageId, p_user_id: userId, p_message: message.trim(),
    })
    setSending(false)
    if (!error) { setSent(true); setTimeout(onSent, 1800) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: 'linear-gradient(180deg,#0c1445 0%,#0a2540 100%)', border: '1px solid rgba(100,140,255,0.25)' }}>
        {sent ? (
          <div className="p-8 text-center">
            <div className="text-5xl mb-3 animate-bounce">🍶</div>
            <h3 className="font-extrabold text-white text-base mb-1">瓶を流しました！</h3>
            <p className="text-xs text-blue-300/70 leading-relaxed">どこかの村に届くかもしれません。<br />返事が来るといいですね。</p>
          </div>
        ) : (
          <>
            <div className="px-5 pt-5 pb-4 flex items-center gap-3 border-b border-white/10">
              <span className="text-2xl">🍶</span>
              <div className="flex-1">
                <h3 className="font-extrabold text-white text-sm">メッセージを海に流す</h3>
                <p className="text-[10px] text-blue-300/60 mt-0.5">ランダムな村に届きます · 村名は表示されます</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 active:scale-90">
                <X size={15} className="text-blue-200/60" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <textarea value={message} onChange={e => setMessage(e.target.value)}
                  placeholder={"誰かに届けたい言葉を…\n日常のひとこと、悩み、感謝など何でも。"}
                  rows={5} maxLength={300}
                  className="w-full px-4 py-3 rounded-2xl border text-sm resize-none focus:outline-none text-white leading-relaxed"
                  style={{ background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(100,140,255,0.25)', caretColor: '#93c5fd' }} />
                <p className="text-right text-[10px] text-blue-400/40 mt-1">{message.length}/300</p>
              </div>
              <div className="flex gap-2">
                <button onClick={onClose}
                  className="flex-1 py-3 rounded-2xl border text-sm font-bold"
                  style={{ borderColor: 'rgba(100,140,255,0.25)', color: '#60a5fa', background: 'transparent' }}>
                  キャンセル
                </button>
                <button onClick={handleSend} disabled={!message.trim() || sending}
                  className="flex-1 py-3 rounded-2xl text-white text-sm font-bold disabled:opacity-40 active:scale-95 transition-all flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%)', boxShadow: '0 4px 15px rgba(59,130,246,0.4)' }}>
                  {sending
                    ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <><span>🌊</span><span>流す</span></>}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
