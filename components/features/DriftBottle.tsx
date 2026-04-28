'use client'

import { useState, useEffect, useRef } from 'react'
import React from 'react'
import { Send, X, ChevronDown, ChevronUp, Share2, Flag, CheckCircle, Star, HelpCircle, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/utils'
import {
  detectNgWords,
  detectCrisisKeywords,
  getBottleSendCount,
  incrementBottleSendCount,
  BOTTLE_DAILY_LIMIT,
} from '@/lib/moderation'

const CRISIS_HOTLINES = [
  { name: 'よりそいホットライン', tel: '0120-279-338',            note: '24時間' },
  { name: 'いのちの電話',         tel: '0570-783-556',            note: '16時〜21時' },
  { name: 'よりそいSNS相談',      url: 'https://yorisoi-chat.jp', note: 'チャット相談' },
]

interface AnswererProfile {
  display_name: string
  avatar_url:   string | null
  helped_count: number
}

interface Reply {
  id:             string
  bottle_id:      string
  message:        string
  created_at:     string
  is_best_answer: boolean
  user_id:        string | null
  profile:        AnswererProfile | null
}

interface Bottle {
  id:             string
  message:        string
  created_at:     string
  status:         string
  is_question:    boolean
  is_resolved:    boolean
  sender_user_id: string | null
  sender_village: { id: string; name: string; icon: string } | null
  replies:        Reply[]
}

interface Props {
  villageId:   string
  villageName: string
  userId:      string
  style:       { accent: string; gradient: string }
  isMember:    boolean
  canPost:     boolean
  canReply:    boolean
}

const ONBOARD_KEY = 'drift_bottle_onboarded'
const PREVIEW     = 2

// ─── 危機サポートモーダル ─────────────────────────────────────
function CrisisModal({ onContinue, onClose }: { onContinue: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center px-5">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: 'linear-gradient(180deg,#1a1a2e 0%,#0f1629 100%)', border: '1px solid rgba(255,255,255,0.12)' }}>
        <div className="p-6 text-center space-y-4">
          <div className="text-4xl">🤝</div>
          <h3 className="font-extrabold text-white text-base leading-snug">あなたの気持ち、大切に受け取りました</h3>
          <p className="text-xs text-white/60 leading-relaxed">
            今、つらい気持ちでいるのかもしれません。<br />もし話を聞いてほしいなら、専門の相談窓口があります。
          </p>
          <div className="space-y-2 text-left">
            {CRISIS_HOTLINES.map(h => (
              <div key={h.name} className="rounded-xl px-3 py-2.5"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="text-xs font-bold text-white">{h.name}</p>
                <div className="flex items-center justify-between mt-0.5">
                  {h.tel
                    ? <a href={`tel:${h.tel}`} className="text-xs text-blue-300 font-bold">{h.tel}</a>
                    : <a href={h.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-300 font-bold">{h.url}</a>}
                  <span className="text-[10px] text-white/30">{h.note}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold border"
              style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)' }}>閉じる</button>
            <button onClick={onContinue}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white"
              style={{ background: 'rgba(100,140,255,0.25)', border: '1px solid rgba(100,140,255,0.3)' }}>このまま流す</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 回答者アバター ───────────────────────────────────────────
function AnswererAvatar({ profile }: { profile: AnswererProfile | null }) {
  if (profile?.avatar_url) {
    return <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
  }
  return (
    <div className="w-8 h-8 rounded-full bg-blue-800/60 flex items-center justify-center flex-shrink-0 text-sm font-bold text-blue-200">
      {profile?.display_name?.slice(0, 1) ?? '?'}
    </div>
  )
}

// ─── 開封シアター ─────────────────────────────────────────────
function BottleOpeningTheater({
  bottle, villageName, villageId, userId, onClose, onReply, onResolve, onBestAnswer,
  isMember, canReply,
}: {
  bottle:        Bottle
  villageName:   string
  villageId:     string
  userId:        string
  onClose:       () => void
  onReply:       (bottleId: string, text: string) => Promise<void>
  onResolve:     (bottleId: string) => Promise<void>
  onBestAnswer:  (replyId: string, bottleId: string) => Promise<void>
  isMember:      boolean
  canReply:      boolean
}) {
  const [phase,      setPhase]      = useState<'floating' | 'cracking' | 'reading'>('floating')
  const [replyText,  setReplyText]  = useState('')
  const [replying,   setReplying]   = useState(false)
  const [replied,    setReplied]    = useState(false)
  const [replyError, setReplyError] = useState('')
  const [reported,   setReported]   = useState(false)
  const [reporting,  setReporting]  = useState(false)
  const [resolving,  setResolving]  = useState(false)

  const isMyBottle = bottle.sender_user_id === userId
  const isSolved   = bottle.is_resolved
  const days = Math.max(1, Math.ceil((Date.now() - new Date(bottle.created_at).getTime()) / 86400000))
  const sv = bottle.sender_village

  function handleTap() {
    if (phase !== 'floating') return
    setPhase('cracking')
    setTimeout(() => setPhase('reading'), 700)
  }

  function handleShare() {
    const shareText = `🍶 villiaで誰かの言葉が届きました\n\n📍 ${sv ? `${sv.icon}${sv.name}` : 'どこかの村'} → ${villageName}\n⏱ ${days}日間の旅\n\n#villia #漂流瓶`
    const url = `https://nowmatejapan.com/villages/${villageId}`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText + '\n' + url)}`, '_blank', 'noopener,noreferrer')
  }

  async function submitReply() {
    if (!replyText.trim() || replying) return
    const ng = detectNgWords(replyText)
    if (ng) { setReplyError(`「${ng}」という言葉はvilliaでは使えません`); return }
    setReplying(true)
    setReplyError('')
    await onReply(bottle.id, replyText.trim())
    setReplying(false)
    if (!bottle.is_question) setReplied(true)
    setReplyText('')
  }

  async function handleResolve() {
    setResolving(true)
    await onResolve(bottle.id)
    setResolving(false)
  }

  async function reportBottle() {
    if (reporting || reported) return
    setReporting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: existing } = await supabase.from('reports').select('id')
        .eq('reporter_id', user.id).eq('reported_id', bottle.id).limit(1)
      if (!existing || existing.length === 0) {
        await supabase.from('reports').insert({
          reporter_id: user.id, reported_id: bottle.id,
          reason: '漂流瓶の不適切なコンテンツ', description: bottle.message.slice(0, 200),
        })
      }
    }
    setReporting(false)
    setReported(true)
  }

  const bestReply = bottle.replies.find(r => r.is_best_answer)
  const myReply   = bottle.replies.find(r => r.user_id === userId)
  const canAnswer = isMember && canReply && !isMyBottle && !isSolved && !myReply

  return (
    <>
      <style>{`
        @keyframes bottleFloat { 0%,100%{transform:translateY(0)rotate(-4deg)}50%{transform:translateY(-18px)rotate(4deg)} }
        @keyframes waveSlow    { 0%{transform:translateX(0)}100%{transform:translateX(-50%)} }
        @keyframes waveMid     { 0%{transform:translateX(0)}100%{transform:translateX(-50%)} }
        @keyframes crack       { 0%{transform:scale(1)rotate(0);opacity:1}30%{transform:scale(1.3)rotate(-8deg);opacity:1}60%{transform:scale(.9)rotate(5deg);opacity:.8}100%{transform:scale(1.5)rotate(0);opacity:0} }
        @keyframes fadeUp      { from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)} }
        @keyframes starTwinkle { 0%,100%{opacity:.2}50%{opacity:1} }
        .bottle-float{animation:bottleFloat 3s ease-in-out infinite}
        .bottle-crack{animation:crack .7s ease-in-out forwards}
        .fade-up  {animation:fadeUp .6s ease-out forwards}
        .fade-up-1{animation:fadeUp .6s ease-out .1s both}
        .fade-up-2{animation:fadeUp .6s ease-out .25s both}
        .fade-up-3{animation:fadeUp .6s ease-out .4s both}
        .fade-up-4{animation:fadeUp .6s ease-out .55s both}
      `}</style>

      <div className="fixed inset-0 z-[200] flex flex-col items-center overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,#060d1f 0%,#0a1e3d 45%,#0c2d50 100%)' }} />

        {/* 星 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[{top:'8%',left:'15%',size:2,delay:'0s'},{top:'12%',left:'72%',size:1.5,delay:'.8s'},
            {top:'5%',left:'45%',size:1,delay:'1.2s'},{top:'20%',left:'88%',size:2,delay:'.4s'},
            {top:'15%',left:'33%',size:1.5,delay:'1.6s'},{top:'3%',left:'60%',size:1,delay:'2s'},
            {top:'25%',left:'5%',size:1.5,delay:'.6s'},{top:'30%',left:'55%',size:1,delay:'1.4s'},
          ].map((s, i) => (
            <div key={i} className="absolute rounded-full bg-white"
              style={{ top:s.top, left:s.left, width:s.size, height:s.size,
                animation:`starTwinkle ${2+i*.3}s ease-in-out ${s.delay} infinite` }} />
          ))}
        </div>

        {/* 波 */}
        <div className="absolute bottom-0 left-0 w-full h-40 pointer-events-none overflow-hidden">
          <div className="absolute bottom-0 h-full" style={{ width:'200%',
            background:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120'%3E%3Cpath d='M0 60 C200 20 400 100 600 60 C800 20 1000 100 1200 60 L1200 120 L0 120 Z' fill='rgba(10,50,100,0.6)'/%3E%3C/svg%3E") repeat-x bottom`,
            backgroundSize:'600px 80px', animation:'waveSlow 8s linear infinite' }} />
        </div>
        <div className="absolute bottom-0 left-0 w-full h-32 pointer-events-none overflow-hidden">
          <div className="absolute bottom-0 h-full" style={{ width:'200%',
            background:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120'%3E%3Cpath d='M0 80 C150 40 350 110 600 80 C850 40 1050 110 1200 80 L1200 120 L0 120 Z' fill='rgba(15,70,140,0.5)'/%3E%3C/svg%3E") repeat-x bottom`,
            backgroundSize:'600px 60px', animation:'waveMid 5s linear infinite' }} />
        </div>

        {/* ヘッダーボタン */}
        <button onClick={reportBottle} disabled={reported || reporting}
          className="absolute top-5 left-5 w-9 h-9 rounded-full flex items-center justify-center z-10 active:scale-90 transition-all disabled:opacity-40"
          style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)' }}>
          <Flag size={14} className={reported ? 'text-red-400' : 'text-white/40'} />
        </button>

        {/* Q&Aバッジ */}
        {bottle.is_question && (
          <div className="absolute top-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background:'rgba(251,191,36,0.15)', border:'1px solid rgba(251,191,36,0.3)' }}>
            <HelpCircle size={11} className="text-amber-400" />
            <span className="text-[10px] font-extrabold text-amber-300">
              {isSolved ? '✅ 解決済み' : '❓ 匿名質問'}
            </span>
          </div>
        )}

        <button onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center z-10 active:scale-90 transition-all"
          style={{ background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.15)' }}>
          <X size={16} className="text-white/80" />
        </button>

        <div className="pt-14 pb-2 text-center px-4 fade-up flex-shrink-0">
          <p className="text-[11px] font-bold tracking-widest text-blue-300/60 uppercase">Drift Bottle</p>
        </div>

        {/* スクロール可能コンテンツ */}
        <div className="flex-1 w-full max-w-md overflow-y-auto px-5 pb-32">

          {phase === 'floating' && (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <button onClick={handleTap} className="flex flex-col items-center gap-6 active:scale-95 transition-all">
                <div className="bottle-float text-[88px] select-none leading-none drop-shadow-2xl">🍶</div>
                <div className="text-center space-y-1">
                  <p className="text-white font-bold text-base">
                    {sv ? `${sv.icon} ${sv.name}からの${bottle.is_question ? '質問' : '瓶'}` : `知らない村からの${bottle.is_question ? '質問' : '瓶'}`}
                  </p>
                  <p className="text-blue-300/60 text-xs">タップして開封する</p>
                </div>
                <div className="relative w-24 h-2">
                  <div className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping" />
                  <div className="absolute inset-0 rounded-full bg-blue-400/10" />
                </div>
              </button>
            </div>
          )}

          {phase === 'cracking' && (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="bottle-crack text-[88px] leading-none">🍶</div>
            </div>
          )}

          {phase === 'reading' && (
            <div className="space-y-4 py-2">

              {/* メッセージカード */}
              <div className="fade-up-1 rounded-3xl p-5 relative overflow-hidden"
                style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', backdropFilter:'blur(20px)' }}>
                <div className="absolute -top-3 -left-2 text-5xl opacity-20 select-none rotate-[-15deg]">
                  {bottle.is_question ? '❓' : '🍶'}
                </div>
                <p className="text-white/90 text-sm leading-relaxed relative z-10 font-medium">{bottle.message}</p>
              </div>

              {/* 旅路 */}
              <div className="fade-up-2 rounded-2xl px-4 py-3 flex items-center gap-3"
                style={{ background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.2)' }}>
                <div className="text-2xl flex-shrink-0">🗺️</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-blue-200 font-bold">
                    {sv ? `${sv.icon} ${sv.name}` : 'どこかの村'}
                    <span className="text-blue-400/60 mx-1.5">→</span>
                    {villageName}
                  </p>
                  <p className="text-[11px] text-blue-400/60 mt-0.5">{days}日間の旅をしてきました</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-black text-blue-300">{days}</p>
                  <p className="text-[9px] text-blue-400/50">日間</p>
                </div>
              </div>

              {/* ── Q&Aモード専用UI ── */}
              {bottle.is_question && (
                <>
                  {/* 回答一覧 */}
                  <div className="fade-up-3 space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-xs font-bold text-blue-200">
                        💬 回答 ({bottle.replies.length}件)
                      </p>
                      {isMyBottle && !isSolved && bottle.replies.length > 0 && (
                        <button onClick={handleResolve} disabled={resolving}
                          className="flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold disabled:opacity-50 active:scale-95 transition-all"
                          style={{ background:'rgba(34,197,94,0.2)', border:'1px solid rgba(34,197,94,0.3)', color:'#86efac' }}>
                          <CheckCircle size={10} />
                          {resolving ? '...' : '解決した'}
                        </button>
                      )}
                      {isSolved && (
                        <span className="flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold"
                          style={{ background:'rgba(34,197,94,0.15)', color:'#86efac' }}>
                          <CheckCircle size={10} />解決済み
                        </span>
                      )}
                    </div>

                    {bottle.replies.length === 0 ? (
                      <div className="rounded-2xl px-4 py-5 text-center"
                        style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
                        <p className="text-2xl mb-1">🌊</p>
                        <p className="text-xs text-blue-300/40">まだ回答がありません</p>
                        {canReply && !isMyBottle && (
                          <p className="text-[10px] text-blue-400/30 mt-1">最初に答えてみよう</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {bottle.replies.map(reply => (
                          <div key={reply.id} className="rounded-2xl p-3 relative"
                            style={reply.is_best_answer
                              ? { background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.3)' }
                              : { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}>
                            {reply.is_best_answer && (
                              <div className="flex items-center gap-1 mb-2">
                                <Star size={10} className="text-amber-400 fill-amber-400" />
                                <span className="text-[9px] font-extrabold text-amber-300">ベストアンサー</span>
                              </div>
                            )}
                            <div className="flex items-start gap-2.5">
                              <AnswererAvatar profile={reply.profile ?? null} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold text-white/80">
                                    {reply.profile?.display_name ?? '匿名'}
                                  </span>
                                  {(reply.profile?.helped_count ?? 0) > 0 && (
                                    <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                      style={{ background:'rgba(34,197,94,0.15)', color:'#86efac', border:'1px solid rgba(34,197,94,0.2)' }}>
                                      🤝 {reply.profile!.helped_count}人助けた
                                    </span>
                                  )}
                                  <span className="text-[10px] text-blue-400/30">{timeAgo(reply.created_at)}</span>
                                </div>
                                <p className="text-xs text-white/70 leading-relaxed mt-1">{reply.message}</p>
                              </div>
                              {/* ベストアンサー選択（送信者のみ） */}
                              {isMyBottle && !isSolved && !reply.is_best_answer && !bestReply && (
                                <button
                                  onClick={() => onBestAnswer(reply.id, bottle.id)}
                                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-all"
                                  style={{ background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.2)' }}
                                  title="ベストアンサーに選ぶ">
                                  <Star size={12} className="text-amber-400" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 回答フォーム */}
                  {canAnswer && (
                    <div className="fade-up-4 space-y-2">
                      <p className="text-[11px] text-blue-300/50 text-center">
                        {myReply ? '回答済みです' : '回答を書く（名前が表示されます）'}
                      </p>
                      <div className="flex gap-2">
                        <textarea
                          value={replyText}
                          onChange={e => { setReplyText(e.target.value); setReplyError('') }}
                          placeholder="この質問に答える…"
                          rows={2} maxLength={300}
                          className="flex-1 px-3 py-2 rounded-xl text-xs resize-none focus:outline-none text-white placeholder-blue-400/30"
                          style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(100,140,255,0.2)' }}
                        />
                        <button onClick={submitReply} disabled={!replyText.trim() || replying}
                          className="w-11 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-90 transition-all"
                          style={{ background:'linear-gradient(135deg,#3b82f6,#1d4ed8)' }}>
                          {replying
                            ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <Send size={13} className="text-white" />}
                        </button>
                      </div>
                      {replyError && <p className="text-[10px] text-red-400 px-1">⚠️ {replyError}</p>}
                    </div>
                  )}
                  {replied && (
                    <div className="text-center fade-up">
                      <p className="text-emerald-400 text-xs font-bold">💬 回答を送りました！</p>
                    </div>
                  )}
                  {isMember && !canReply && !isMyBottle && (
                    <div className="fade-up-4 rounded-xl px-4 py-3 text-center"
                      style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}>
                      <p className="text-[11px] text-blue-300/50">🌿 「常連」になると回答できます</p>
                    </div>
                  )}
                  {isMyBottle && (
                    <div className="rounded-xl px-4 py-3 text-center"
                      style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)' }}>
                      <p className="text-[11px] text-blue-400/40">あなたが流した質問です</p>
                    </div>
                  )}
                </>
              )}

              {/* ── 相談モード（既存）── */}
              {!bottle.is_question && (
                <>
                  <div className="fade-up-3">
                    <button onClick={handleShare}
                      className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all active:scale-95"
                      style={{ background:'linear-gradient(135deg,#3b82f6,#1d4ed8)', boxShadow:'0 4px 20px rgba(59,130,246,0.4)', color:'#fff' }}>
                      <Share2 size={14} /><span>この旅をシェアする</span>
                    </button>
                  </div>

                  {isMember && canReply && !replied && bottle.status !== 'replied' && (
                    <div className="fade-up-4 space-y-2">
                      <p className="text-[11px] text-blue-300/50 text-center">村として返事を書く（任意）</p>
                      <div className="flex gap-2">
                        <textarea
                          value={replyText}
                          onChange={e => { setReplyText(e.target.value); setReplyError('') }}
                          placeholder="返事を書く…"
                          rows={2} maxLength={200}
                          className="flex-1 px-3 py-2 rounded-xl text-xs resize-none focus:outline-none text-white placeholder-blue-400/30"
                          style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(100,140,255,0.2)' }}
                        />
                        <button onClick={submitReply} disabled={!replyText.trim() || replying}
                          className="w-11 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-90 transition-all"
                          style={{ background:'linear-gradient(135deg,#3b82f6,#1d4ed8)' }}>
                          {replying
                            ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <Send size={13} className="text-white" />}
                        </button>
                      </div>
                      {replyError && <p className="text-[10px] text-red-400 px-1">⚠️ {replyError}</p>}
                    </div>
                  )}
                  {isMember && !canReply && bottle.status !== 'replied' && (
                    <div className="fade-up-4 rounded-xl px-4 py-3 text-center"
                      style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}>
                      <p className="text-[11px] text-blue-300/50">🌿 「常連」になると返事を書けます</p>
                    </div>
                  )}
                  {replied && (
                    <div className="fade-up text-center">
                      <p className="text-emerald-400 text-xs font-bold">💬 返事を送りました！</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── メインコンポーネント ─────────────────────────────────────
export default function DriftBottle({ villageId, villageName, userId, style, isMember, canPost, canReply }: Props) {
  const [bottles,       setBottles]       = useState<Bottle[]>([])
  const [loading,       setLoading]       = useState(true)
  const [expanded,      setExpanded]      = useState(false)
  const [showMore,      setShowMore]      = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [showOnboard,   setShowOnboard]   = useState(false)
  const [theaterBottle, setTheaterBottle] = useState<Bottle | null>(null)
  const didCheckOnboard = useRef(false)

  useEffect(() => { load() }, [villageId])

  useEffect(() => {
    if (didCheckOnboard.current) return
    didCheckOnboard.current = true
    if (typeof window !== 'undefined' && !localStorage.getItem(ONBOARD_KEY)) setShowOnboard(true)
  }, [])

  async function load() {
    setLoading(true)
    const supabase = createClient()
    const { data: bottleData } = await supabase
      .from('drift_bottles')
      .select('id, message, created_at, status, is_question, is_resolved, sender_user_id, sender_village:sender_village_id(id, name, icon)')
      .eq('recipient_village_id', villageId)
      .in('status', ['delivered', 'replied'])
      .order('created_at', { ascending: false })
      .limit(20)

    if (!bottleData) { setLoading(false); return }

    const ids = bottleData.map(b => b.id)
    const { data: replyData } = ids.length
      ? await supabase
          .from('drift_bottle_replies')
          .select('id, bottle_id, message, created_at, is_best_answer, user_id, profile:user_id(display_name, avatar_url, helped_count)')
          .in('bottle_id', ids)
          .order('created_at', { ascending: true })
      : { data: [] }

    const replyMap: Record<string, Reply[]> = {}
    for (const r of (replyData ?? [])) {
      const profile = Array.isArray(r.profile) ? (r.profile[0] ?? null) : (r.profile as any ?? null)
      const reply: Reply = {
        id:             r.id,
        bottle_id:      r.bottle_id,
        message:        r.message,
        created_at:     r.created_at,
        is_best_answer: r.is_best_answer ?? false,
        user_id:        r.user_id,
        profile,
      }
      ;(replyMap[r.bottle_id] ??= []).push(reply)
    }

    setBottles(bottleData.map(b => ({
      id:             b.id,
      message:        b.message,
      created_at:     b.created_at,
      status:         b.status,
      is_question:    b.is_question ?? false,
      is_resolved:    b.is_resolved ?? false,
      sender_user_id: b.sender_user_id,
      sender_village: Array.isArray(b.sender_village) ? (b.sender_village[0] ?? null) : (b.sender_village as any),
      replies:        replyMap[b.id] ?? [],
    })))
    setLoading(false)
  }

  async function submitReply(bottleId: string, text: string) {
    const supabase = createClient()
    await supabase.from('drift_bottle_replies').insert({
      bottle_id: bottleId, village_id: villageId, user_id: userId, message: text,
    })
    // 相談モードのみ「replied」にする（Q&Aは複数回答OKなのでstatusは変えない）
    const bottle = bottles.find(b => b.id === bottleId)
    if (bottle && !bottle.is_question) {
      await supabase.from('drift_bottles').update({ status: 'replied' }).eq('id', bottleId)
    }
    await load()
    // theaterBottle を更新
    setTheaterBottle(prev => prev ? { ...prev, replies: [...prev.replies] } : null)
    const updated = bottles.find(b => b.id === bottleId)
    if (updated) setTheaterBottle({ ...updated })
  }

  async function resolveBottle(bottleId: string) {
    await createClient().from('drift_bottles').update({ is_resolved: true, status: 'replied' }).eq('id', bottleId)
    await load()
    setTheaterBottle(prev => prev ? { ...prev, is_resolved: true } : null)
  }

  async function setBestAnswer(replyId: string, bottleId: string) {
    const supabase = createClient()
    await supabase.from('drift_bottle_replies').update({ is_best_answer: false }).eq('bottle_id', bottleId)
    await supabase.from('drift_bottle_replies').update({ is_best_answer: true }).eq('id', replyId)
    await load()
    setTheaterBottle(prev => {
      if (!prev) return null
      return { ...prev, replies: prev.replies.map(r => ({ ...r, is_best_answer: r.id === replyId })) }
    })
  }

  function dismissOnboard() {
    localStorage.setItem(ONBOARD_KEY, '1')
    setShowOnboard(false)
  }

  if (loading) return null

  const hasBottles  = bottles.length > 0
  const displayList = showMore ? bottles : bottles.slice(0, PREVIEW)
  const qaCount     = bottles.filter(b => b.is_question && !b.is_resolved).length

  return (
    <>
      {theaterBottle && (
        <BottleOpeningTheater
          bottle={theaterBottle}
          villageName={villageName}
          villageId={villageId}
          userId={userId}
          onClose={() => { setTheaterBottle(null); load() }}
          onReply={submitReply}
          onResolve={resolveBottle}
          onBestAnswer={setBestAnswer}
          isMember={isMember}
          canReply={canReply}
        />
      )}

      {/* オンボーディング */}
      {showOnboard && expanded && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={dismissOnboard} />
          <div className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
            style={{ background:'linear-gradient(180deg,#0c1445 0%,#0a2540 100%)', border:'1px solid rgba(100,140,255,0.3)' }}>
            <div className="p-6 text-center space-y-3">
              <div className="text-5xl">🍶</div>
              <h3 className="font-extrabold text-white text-base">漂流瓶とは？</h3>
              <div className="text-xs text-blue-200/80 leading-relaxed space-y-2 text-left">
                <p>📨 <strong className="text-white">他の村から流れてきたメッセージ</strong>です。誰が書いたかは分からない、でも読むのは自由。</p>
                <p>❓ <strong className="text-white">質問モードなら複数人が回答できます。</strong>お悩みや疑問をみんなで解決。</p>
                <p>💬 <strong className="text-white">返事・回答は「常連」以上が書けます。</strong>信頼された住民だけが答えます。</p>
                <p>🤝 <strong className="text-white">助けた回数がプロフィールに表示されます。</strong>人助けが実績になります。</p>
              </div>
              <button onClick={dismissOnboard}
                className="w-full py-3 rounded-2xl font-bold text-sm text-white mt-2 active:scale-95 transition-all"
                style={{ background:'linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%)' }}>
                わかった！
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl overflow-hidden"
        style={{ background:'rgba(12,20,69,0.85)', border:'1px solid rgba(100,140,255,0.2)' }}>

        {/* コンパクト帯 */}
        <button
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 active:bg-white/5 transition-all"
          onClick={() => {
            const opening = !expanded
            setExpanded(opening)
            if (opening && !localStorage.getItem(ONBOARD_KEY)) setShowOnboard(true)
          }}>
          <span className="text-xl flex-shrink-0">🍶</span>
          <div className="flex-1 text-left min-w-0">
            <span className="text-xs font-bold text-blue-200">
              {hasBottles ? `${bottles.length}本の瓶が届いています` : '漂流瓶'}
            </span>
            {!hasBottles && <span className="text-[10px] text-blue-400/50 ml-2">まだ届いていません</span>}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* 未解決Q&Aバッジ */}
            {qaCount > 0 && (
              <span className="flex items-center gap-0.5 text-[9px] font-bold px-2 py-0.5 rounded-full"
                style={{ background:'rgba(251,191,36,0.15)', color:'#fbbf24', border:'1px solid rgba(251,191,36,0.25)' }}>
                <HelpCircle size={9} /> {qaCount}件の質問
              </span>
            )}
            {hasBottles && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/20">開く</span>}
            {isMember && canPost && !hasBottles && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                style={{ background:'rgba(100,140,255,0.15)', color:'#93c5fd', borderColor:'rgba(100,140,255,0.25)' }}>流してみる</span>
            )}
            {expanded ? <ChevronUp size={13} className="text-blue-400/50" /> : <ChevronDown size={13} className="text-blue-400/50" />}
          </div>
        </button>

        {/* 展開パネル */}
        {expanded && (
          <div className="border-t border-white/5 p-3.5 space-y-3">
            {isMember && canPost && (
              <button onClick={() => setShowSendModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
                style={{ background:'rgba(100,140,255,0.15)', border:'1px solid rgba(100,160,255,0.25)', color:'#93c5fd' }}>
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
                    <button key={bottle.id} onClick={() => setTheaterBottle(bottle)}
                      className="w-full rounded-xl overflow-hidden text-left active:scale-[0.98] transition-all"
                      style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${bottle.is_question ? 'rgba(251,191,36,0.2)' : 'rgba(120,160,255,0.12)'}` }}>
                      <div className="px-3 py-2.5 flex items-start gap-2.5">
                        <span className="text-lg flex-shrink-0 mt-0.5">{bottle.is_question ? '❓' : '🍶'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                            {bottle.is_question && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full"
                                style={bottle.is_resolved
                                  ? { background:'rgba(34,197,94,0.15)', color:'#86efac' }
                                  : { background:'rgba(251,191,36,0.15)', color:'#fbbf24' }}>
                                {bottle.is_resolved ? '✅ 解決済み' : '❓ 質問'}
                              </span>
                            )}
                            {bottle.is_question && bottle.replies.length > 0 && (
                              <span className="text-[9px] text-blue-400/50 flex items-center gap-0.5">
                                <MessageCircle size={8} /> {bottle.replies.length}件の回答
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-white/80 leading-relaxed line-clamp-2">{bottle.message}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-blue-400/50">{sv ? `${sv.icon} ${sv.name}より` : 'どこかの村より'}</span>
                            <span className="text-[10px] text-blue-500/30">{timeAgo(bottle.created_at)}</span>
                            {!bottle.is_question && bottle.status === 'replied' && (
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

// ─── 送るモーダル ─────────────────────────────────────────────
// 漂流瓶 = 感情を流す体験。質問したい場合は質問村へ。
function SendModal({ villageId, userId, onClose, onSent }:
  { villageId: string; userId: string; onClose: () => void; onSent: () => void }) {
  const [message,    setMessage]    = useState('')
  const [sending,    setSending]    = useState(false)
  const [sent,       setSent]       = useState(false)
  const [showCrisis, setShowCrisis] = useState(false)
  const sendCount    = getBottleSendCount()
  const limitReached = sendCount >= BOTTLE_DAILY_LIMIT
  const MAX_CHARS    = 140

  async function handleSend() {
    if (!message.trim() || limitReached) return
    if (detectCrisisKeywords(message)) { setShowCrisis(true); return }
    await doSend()
  }

  async function doSend() {
    setSending(true)
    const { error } = await createClient().rpc('send_drift_bottle', {
      p_village_id:  villageId,
      p_user_id:     userId,
      p_message:     message.trim(),
      p_is_question: false,
    })
    setSending(false)
    if (!error) {
      incrementBottleSendCount()
      setSent(true)
      setTimeout(onSent, 2200)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {showCrisis && (
        <CrisisModal
          onContinue={() => { setShowCrisis(false); doSend() }}
          onClose={() => { setShowCrisis(false); onClose() }}
        />
      )}

      <div className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
        style={{ background:'linear-gradient(180deg,#0c1445 0%,#0a2540 100%)', border:'1px solid rgba(100,140,255,0.25)' }}>

        {sent ? (
          /* ── 送信後演出 ── */
          <div className="p-10 text-center">
            <style>{`
              @keyframes floatAway {
                0%   { transform: translateY(0) scale(1); opacity: 1 }
                60%  { transform: translateY(-30px) scale(1.2); opacity: 1 }
                100% { transform: translateY(-60px) scale(0.6); opacity: 0 }
              }
              @keyframes waveRise {
                0%   { transform: translateY(20px); opacity: 0 }
                100% { transform: translateY(0);    opacity: 1 }
              }
              .float-away { animation: floatAway 1.2s ease-in forwards }
              .wave-rise  { animation: waveRise  .8s ease-out .4s both }
            `}</style>
            <div className="float-away text-6xl mb-2">🌊</div>
            <div className="wave-rise">
              <h3 className="font-extrabold text-white text-lg mb-2">流れていきました</h3>
              <p className="text-xs text-blue-300/60 leading-relaxed">
                どこかの村の誰かに、<br />あなたの気持ちが届きますように。
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* ヘッダー */}
            <div className="px-5 pt-5 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background:'rgba(59,130,246,0.15)', border:'1px solid rgba(59,130,246,0.25)' }}>
                  🍶
                </div>
                <div className="flex-1">
                  <h3 className="font-extrabold text-white text-sm">気持ちを海に流す</h3>
                  <p className="text-[10px] text-blue-300/50 mt-0.5">匿名 · どこかの村に届く · 誰かが拾う</p>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 active:scale-90 transition-all">
                  <X size={15} className="text-blue-200/60" />
                </button>
              </div>

              {/* 質問村へのヒント */}
              <div className="mt-3 px-3 py-2 rounded-xl flex items-center gap-2"
                style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-base flex-shrink-0">💬</span>
                <p className="text-[10px] text-blue-300/50 leading-relaxed">
                  答えを求めるなら<strong className="text-blue-300/80">質問村</strong>へ。
                  漂流瓶は「受け止めてほしい気持ち」を流す場所です。
                </p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {limitReached ? (
                <div className="rounded-2xl px-4 py-4 text-center"
                  style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)' }}>
                  <p className="text-2xl mb-2">🌙</p>
                  <p className="text-xs font-bold text-white/60">今日の送信上限（{BOTTLE_DAILY_LIMIT}通）に達しました</p>
                  <p className="text-[10px] text-white/30 mt-1">明日また流せます</p>
                </div>
              ) : (
                <>
                  <div>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value.slice(0, MAX_CHARS))}
                      placeholder={'今の気持ちを、ひとことだけ…\n\n例）今日もなんとか生きた\n　　誰かに話したいことがある\n　　ありがとうって言いたかった'}
                      rows={6}
                      className="w-full px-4 py-3 rounded-2xl border text-sm resize-none focus:outline-none text-white leading-relaxed placeholder-blue-400/25"
                      style={{ background:'rgba(255,255,255,0.07)', borderColor:'rgba(100,140,255,0.25)', caretColor:'#93c5fd' }}
                    />
                    <div className="flex items-center justify-between mt-1.5 px-1">
                      <p className="text-[10px] text-blue-400/30">今日あと{BOTTLE_DAILY_LIMIT - sendCount}回流せます</p>
                      <p className={`text-[10px] font-bold transition-colors ${message.length > MAX_CHARS * 0.9 ? 'text-amber-400/70' : 'text-blue-400/30'}`}>
                        {message.length}/{MAX_CHARS}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={onClose}
                      className="flex-1 py-3 rounded-2xl border text-sm font-bold transition-all"
                      style={{ borderColor:'rgba(100,140,255,0.2)', color:'rgba(148,163,184,0.7)', background:'transparent' }}>
                      やめる
                    </button>
                    <button onClick={handleSend} disabled={!message.trim() || sending}
                      className="flex-[2] py-3 rounded-2xl text-white text-sm font-extrabold disabled:opacity-40 active:scale-95 transition-all flex items-center justify-center gap-2"
                      style={{ background:'linear-gradient(135deg,#1d4ed8 0%,#2563eb 50%,#3b82f6 100%)', boxShadow:'0 6px 20px rgba(29,78,216,0.5)' }}>
                      {sending
                        ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <><span className="text-lg">🌊</span><span>流す</span></>}
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
