'use client'

import { useState, useEffect, useRef } from 'react'
import React from 'react'
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

// ─── 開封シアター ────────────────────────────────────────────────
function BottleOpeningTheater({
  bottle, villageName, villageId, onClose, onReply,
  isMember, canPost, userId,
}: {
  bottle:      Bottle
  villageName: string
  villageId:   string
  onClose:     () => void
  onReply:     (bottleId: string, text: string) => Promise<void>
  isMember:    boolean
  canPost:     boolean
  userId:      string
}) {
  const [phase,      setPhase]      = useState<'floating' | 'cracking' | 'reading'>('floating')
  const [replyText,  setReplyText]  = useState('')
  const [replying,   setReplying]   = useState(false)
  const [replied,    setReplied]    = useState(false)
  const [shared,     setShared]     = useState(false)

  const days = Math.max(1, Math.ceil(
    (Date.now() - new Date(bottle.created_at).getTime()) / 86400000
  ))
  const sv = bottle.sender_village

  function handleTap() {
    if (phase !== 'floating') return
    setPhase('cracking')
    setTimeout(() => setPhase('reading'), 700)
  }

  async function handleShare(replyText?: string | React.MouseEvent) {
    if (typeof replyText !== 'string') replyText = undefined
    const shareText = replyText
      ? `🍶 漂流瓶に答えました\n\n「${replyText}」\n\n#VILLIA #漂流瓶`
      : `🍶 漂流瓶が届きました\n\n「${bottle.message}」\n\n📍 ${sv ? `${sv.icon}${sv.name}` : 'どこかの村'} → ${villageName}\n⏱ ${days}日間の旅\n\n#VILLIA`
    const url = `https://nowmatejapan.com/villages/${villageId}`
    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText + '\n' + url)}`
    window.open(xUrl, '_blank', 'noopener,noreferrer')
    setShared(true)
    setTimeout(() => setShared(false), 2000)
  }

  async function submitReply() {
    if (!replyText.trim() || replying) return
    setReplying(true)
    await onReply(bottle.id, replyText.trim())
    setReplying(false)
    setReplied(true)
    setReplyText('')
  }

  return (
    <>
      <style>{`
        @keyframes bottleFloat {
          0%,100% { transform: translateY(0px) rotate(-4deg); }
          50%      { transform: translateY(-18px) rotate(4deg); }
        }
        @keyframes waveSlow {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes waveMid {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes crack {
          0%   { transform: scale(1) rotate(0deg);   opacity: 1; }
          30%  { transform: scale(1.3) rotate(-8deg); opacity: 1; }
          60%  { transform: scale(0.9) rotate(5deg);  opacity: 0.8; }
          100% { transform: scale(1.5) rotate(0deg);  opacity: 0; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes starTwinkle {
          0%,100% { opacity: 0.2; }
          50%     { opacity: 1; }
        }
        .bottle-float { animation: bottleFloat 3s ease-in-out infinite; }
        .bottle-crack { animation: crack 0.7s ease-in-out forwards; }
        .fade-up      { animation: fadeUp 0.6s ease-out forwards; }
        .fade-up-1    { animation: fadeUp 0.6s ease-out 0.1s both; }
        .fade-up-2    { animation: fadeUp 0.6s ease-out 0.25s both; }
        .fade-up-3    { animation: fadeUp 0.6s ease-out 0.4s both; }
        .fade-up-4    { animation: fadeUp 0.6s ease-out 0.55s both; }
      `}</style>

      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-between overflow-hidden">

        {/* ── 海の背景 ── */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg,#060d1f 0%,#0a1e3d 45%,#0c2d50 100%)' }} />

        {/* 星 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[
            { top: '8%',  left: '15%', size: 2, delay: '0s' },
            { top: '12%', left: '72%', size: 1.5, delay: '0.8s' },
            { top: '5%',  left: '45%', size: 1, delay: '1.2s' },
            { top: '20%', left: '88%', size: 2, delay: '0.4s' },
            { top: '15%', left: '33%', size: 1.5, delay: '1.6s' },
            { top: '3%',  left: '60%', size: 1, delay: '2s' },
            { top: '25%', left: '5%',  size: 1.5, delay: '0.6s' },
            { top: '30%', left: '55%', size: 1, delay: '1.4s' },
          ].map((s, i) => (
            <div key={i}
              className="absolute rounded-full bg-white"
              style={{
                top: s.top, left: s.left,
                width: s.size, height: s.size,
                animation: `starTwinkle ${2 + i * 0.3}s ease-in-out ${s.delay} infinite`,
              }}
            />
          ))}
        </div>

        {/* 波レイヤー1（遅い・深い） */}
        <div className="absolute bottom-0 left-0 w-full h-40 pointer-events-none overflow-hidden">
          <div
            className="absolute bottom-0 h-full"
            style={{
              width: '200%',
              background: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 1200 120\'%3E%3Cpath d=\'M0 60 C200 20 400 100 600 60 C800 20 1000 100 1200 60 L1200 120 L0 120 Z\' fill=\'rgba(10,50,100,0.6)\'/%3E%3C/svg%3E") repeat-x bottom',
              backgroundSize: '600px 80px',
              animation: 'waveSlow 8s linear infinite',
            }}
          />
        </div>
        {/* 波レイヤー2（速い・浅い） */}
        <div className="absolute bottom-0 left-0 w-full h-32 pointer-events-none overflow-hidden">
          <div
            className="absolute bottom-0 h-full"
            style={{
              width: '200%',
              background: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 1200 120\'%3E%3Cpath d=\'M0 80 C150 40 350 110 600 80 C850 40 1050 110 1200 80 L1200 120 L0 120 Z\' fill=\'rgba(15,70,140,0.5)\'/%3E%3C/svg%3E") repeat-x bottom',
              backgroundSize: '600px 60px',
              animation: 'waveMid 5s linear infinite',
            }}
          />
        </div>

        {/* ── 閉じるボタン ── */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center z-10 active:scale-90 transition-all"
          style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          <X size={16} className="text-white/80" />
        </button>

        {/* ── 上部ラベル ── */}
        <div className="pt-14 pb-2 text-center px-4 fade-up">
          <p className="text-[11px] font-bold tracking-widest text-blue-300/60 uppercase">
            Drift Bottle
          </p>
        </div>

        {/* ── 中央コンテンツ ── */}
        <div className="flex-1 flex flex-col items-center justify-center px-5 w-full max-w-md">

          {/* PHASE: floating */}
          {phase === 'floating' && (
            <button
              onClick={handleTap}
              className="flex flex-col items-center gap-6 active:scale-95 transition-all"
            >
              <div className="bottle-float text-[88px] select-none leading-none drop-shadow-2xl">
                🍶
              </div>
              <div className="text-center space-y-1">
                <p className="text-white font-bold text-base">
                  {sv ? `${sv.icon} ${sv.name}からの瓶` : '知らない村からの瓶'}
                </p>
                <p className="text-blue-300/60 text-xs">
                  タップして開封する
                </p>
              </div>
              {/* 波紋エフェクト */}
              <div className="relative w-24 h-2">
                <div className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping" />
                <div className="absolute inset-0 rounded-full bg-blue-400/10" />
              </div>
            </button>
          )}

          {/* PHASE: cracking */}
          {phase === 'cracking' && (
            <div className="bottle-crack text-[88px] leading-none">
              🍶
            </div>
          )}

          {/* PHASE: reading */}
          {phase === 'reading' && (
            <div className="w-full space-y-4">

              {/* メッセージカード */}
              <div className="fade-up-1 rounded-3xl p-5 relative overflow-hidden"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(20px)',
                }}>
                <div className="absolute -top-3 -left-2 text-5xl opacity-20 select-none rotate-[-15deg]">🍶</div>
                <p className="text-white/90 text-sm leading-relaxed relative z-10 font-medium">
                  {bottle.message}
                </p>
              </div>

              {/* 旅路カード */}
              <div className="fade-up-2 rounded-2xl px-4 py-3 flex items-center gap-3"
                style={{
                  background: 'rgba(59,130,246,0.12)',
                  border: '1px solid rgba(59,130,246,0.2)',
                }}>
                <div className="text-2xl flex-shrink-0">🗺️</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-blue-200 font-bold">
                    {sv ? `${sv.icon} ${sv.name}` : 'どこかの村'}
                    <span className="text-blue-400/60 mx-1.5">→</span>
                    {villageName}
                  </p>
                  <p className="text-[11px] text-blue-400/60 mt-0.5">
                    {days}日間の旅をしてきました
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-black text-blue-300">{days}</p>
                  <p className="text-[9px] text-blue-400/50">日間</p>
                </div>
              </div>

              {/* シェアボタン */}
              <div className="fade-up-3">
                <button
                  onClick={handleShare}
                  className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all active:scale-95"
                  style={{
                    background: shared
                      ? 'linear-gradient(135deg,#10b981,#059669)'
                      : 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                    boxShadow: shared
                      ? '0 4px 20px rgba(16,185,129,0.4)'
                      : '0 4px 20px rgba(59,130,246,0.4)',
                    color: '#fff',
                  }}
                >
                  {shared ? (
                    <><span>✓</span><span>コピーしました</span></>
                  ) : (
                    <><Share2 size={14} /><span>この旅をシェアする</span></>
                  )}
                </button>
              </div>

              {/* 返事フォーム */}
              {isMember && canPost && !replied && bottle.status !== 'replied' && (
                <div className="fade-up-4 space-y-2">
                  <p className="text-[11px] text-blue-300/50 text-center">村として返事を書く（任意）</p>
                  <div className="flex gap-2">
                    <textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="返事を書く…"
                      rows={2}
                      maxLength={200}
                      className="flex-1 px-3 py-2 rounded-xl text-xs resize-none focus:outline-none text-white placeholder-blue-400/30"
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(100,140,255,0.2)' }}
                    />
                    <button
                      onClick={submitReply}
                      disabled={!replyText.trim() || replying}
                      className="w-11 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-90 transition-all"
                      style={{ background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' }}
                    >
                      {replying
                        ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Send size={13} className="text-white" />}
                    </button>
                  </div>
                </div>
              )}
              {replied && (
                <div className="fade-up text-center">
                  <p className="text-emerald-400 text-xs font-bold">💬 返事を送りました！</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 下部スペース（波に隠れる） */}
        <div className="h-28" />
      </div>
    </>
  )
}

// ─── メインコンポーネント ─────────────────────────────────────────
export default function DriftBottle({ villageId, villageName, userId, style, isMember, canPost }: Props) {
  const [bottles,        setBottles]        = useState<Bottle[]>([])
  const [loading,        setLoading]        = useState(true)
  const [expanded,       setExpanded]       = useState(false)
  const [showMore,       setShowMore]       = useState(false)
  const [replyId,        setReplyId]        = useState<string | null>(null)
  const [replyText,      setReplyText]      = useState('')
  const [replying,       setReplying]       = useState(false)
  const [showSendModal,  setShowSendModal]  = useState(false)
  const [showOnboard,    setShowOnboard]    = useState(false)
  const [theaterBottle,  setTheaterBottle]  = useState<Bottle | null>(null)
  const didCheckOnboard  = useRef(false)

  useEffect(() => { load() }, [villageId])

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

  async function submitReply(bottleId: string, text?: string) {
    const msg = text ?? replyText
    if (!msg.trim() || replying) return
    setReplying(true)
    const supabase = createClient()
    await supabase.from('drift_bottle_replies').insert({
      bottle_id: bottleId, village_id: villageId, user_id: userId, message: msg.trim(),
    })
    await supabase.from('drift_bottles').update({ status: 'replied' }).eq('id', bottleId)
    setReplyText(''); setReplyId(null); setReplying(false)
    await load()
  }

  function dismissOnboard() {
    localStorage.setItem(ONBOARD_KEY, '1')
    setShowOnboard(false)
  }

  if (loading) return null

  const hasBottles  = bottles.length > 0
  const displayList = showMore ? bottles : bottles.slice(0, PREVIEW)

  return (
    <>
      {/* ── 開封シアター ── */}
      {theaterBottle && (
        <BottleOpeningTheater
          bottle={theaterBottle}
          villageName={villageName}
          villageId={villageId}
          onClose={() => setTheaterBottle(null)}
          onReply={submitReply}
          isMember={isMember}
          canPost={canPost}
          userId={userId}
        />
      )}

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
              : <ChevronDown size={13} className="text-blue-400/50" />}
          </div>
        </button>

        {/* ── 展開パネル ── */}
        {expanded && (
          <div className="border-t border-white/5 p-3.5 space-y-3">

            {isMember && canPost && (
              <button onClick={() => setShowSendModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
                style={{ background: 'rgba(100,140,255,0.15)', border: '1px solid rgba(100,160,255,0.25)', color: '#93c5fd' }}>
                <span>🌊</span><span>海に流す</span>
              </button>
            )}

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
                  const sv = bottle.sender_village
                  return (
                    <button
                      key={bottle.id}
                      onClick={() => setTheaterBottle(bottle)}
                      className="w-full rounded-xl overflow-hidden text-left active:scale-[0.98] transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(120,160,255,0.12)' }}
                    >
                      <div className="px-3 py-2.5 flex items-start gap-2.5">
                        <span className="text-lg flex-shrink-0 mt-0.5">🍶</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white/80 leading-relaxed line-clamp-2">{bottle.message}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-blue-400/50">
                              {sv ? `${sv.icon} ${sv.name}より` : 'どこかの村より'}
                            </span>
                            <span className="text-[10px] text-blue-500/30">{timeAgo(bottle.created_at)}</span>
                            {bottle.status === 'replied' && (
                              <span className="text-[10px] text-blue-300/60">💬 返事済み</span>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] text-blue-300/50 flex-shrink-0 pt-0.5">開く →</span>
                      </div>
                    </button>
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

// ─── 送るモーダル ────────────────────────────────────────────────
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
