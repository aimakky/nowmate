'use client'

import { useEffect } from 'react'
import { X, Shield, Mic, MessageSquare, Lock } from 'lucide-react'

export type GateType = 'post' | 'voice_join' | 'voice_create' | 'dm' | 'bottle'

interface Props {
  type: GateType
  villageCommStyle?: string   // 'text' | 'voice' | 'both'
  villageName?: string
  onClose: () => void
  onVerify: () => void        // PhoneVerifyModal を開く
}

const GATE_CONFIG: Record<GateType, {
  icon:    string
  title:   string
  body:    string
  cta:     string
  accent:  string
  benefits: string[]
}> = {
  post: {
    icon:    '💬',
    title:   '投稿するには安心認証が必要です',
    body:    'sameeは本物の大人が話す場所です。\n認証は30秒で完了します。',
    cta:     '安心認証をする',
    accent:  '#3b82f6',
    benefits: ['チャット村への投稿・返信', '漂流瓶の送受信', '通話村の聴き専参加', '安心認証バッジ獲得'],
  },
  voice_join: {
    icon:    '🎙️',
    title:   'この通話村は確認済みメンバーだけが入れる\n安心の声空間です',
    body:    '声で話す前に、あなたが本物の大人であることを確認させてください。',
    cta:     '安心認証をして参加する',
    accent:  '#f97316',
    benefits: ['通話村への入室・発言', 'ルームの作成', '安心認証バッジ獲得（シルバー）', '女性ユーザーから信頼される'],
  },
  voice_create: {
    icon:    '🎙️',
    title:   '広場を開くには安心認証が必要です',
    body:    '確認済みメンバーだけがルームを作れます。\nあなたのコミュニティを安心で守ります。',
    cta:     '安心認証をして広場を開く',
    accent:  '#f97316',
    benefits: ['通話ルームの作成', '村の管理権限', '安心認証バッジ獲得', '信頼スコアの向上'],
  },
  dm: {
    icon:    '✉️',
    title:   'DMを送るには安心認証が必要です',
    body:    '確認済みメンバーだけがDMを送れます。\n迷惑メッセージ・業者を防ぐための仕組みです。',
    cta:     '安心認証をする',
    accent:  '#8b5cf6',
    benefits: ['DM送受信（月10件）', '通話村への参加', '安心認証バッジ獲得', 'すべての村で投稿可能'],
  },
  bottle: {
    icon:    '🍶',
    title:   '漂流瓶を送るには安心認証が必要です',
    body:    '認証すると誰かの悩みに答えたり、\n自分の気持ちを流せるようになります。',
    cta:     '安心認証をする',
    accent:  '#3b82f6',
    benefits: ['漂流瓶の送受信・返信', '人助けカウントの獲得', '安心認証バッジ獲得', '信頼スコアの向上'],
  },
}

export default function VerificationGate({ type, villageCommStyle, villageName, onClose, onVerify }: Props) {
  const cfg = GATE_CONFIG[type]
  const isVoice = type === 'voice_join' || type === 'voice_create'

  // スクロール防止
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-t-3xl overflow-hidden w-full max-w-md mx-auto"
        style={{ background: '#fff' }}
        onClick={e => e.stopPropagation()}
      >
        {/* カラーバー */}
        <div
          className="h-1 w-full"
          style={{
            background: isVoice
              ? 'linear-gradient(90deg, #fb923c 0%, #ea580c 100%)'
              : 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
          }}
        />

        {/* ヘッダー */}
        <div
          className="px-5 pt-5 pb-4"
          style={{
            background: isVoice
              ? 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)'
              : 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
                style={{ background: isVoice ? '#fff7ed' : '#eff6ff', border: `1px solid ${cfg.accent}30` }}
              >
                {cfg.icon}
              </div>
              <div className="flex items-center gap-1.5">
                <Shield size={12} style={{ color: cfg.accent }} />
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: cfg.accent }}>
                  安心認証が必要です
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-all"
              style={{ background: 'rgba(0,0,0,0.06)' }}
            >
              <X size={14} className="text-stone-500" />
            </button>
          </div>

          <h2
            className="font-extrabold text-stone-900 text-[15px] leading-snug mb-1.5 whitespace-pre-line"
          >
            {cfg.title}
          </h2>
          {villageName && (
            <p className="text-[11px] font-medium mb-1.5" style={{ color: cfg.accent }}>
              {isVoice ? '🎙️' : '💬'} {villageName}
            </p>
          )}
          <p className="text-xs text-stone-500 leading-relaxed whitespace-pre-line">{cfg.body}</p>
        </div>

        {/* 特典リスト */}
        <div className="px-5 py-4 space-y-2.5">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">認証すると使えるもの</p>
          <div className="grid grid-cols-2 gap-2">
            {cfg.benefits.map((b, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: `${cfg.accent}08`, border: `1px solid ${cfg.accent}15` }}
              >
                <span className="text-emerald-500 flex-shrink-0">✓</span>
                <span className="text-[11px] font-medium text-stone-700 leading-tight">{b}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 安心メッセージ */}
        <div className="px-5 pb-4">
          <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-stone-50 border border-stone-100">
            <Lock size={12} className="text-stone-400 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-stone-400 leading-relaxed">
              認証は電話番号のSMS確認のみです。個人情報は第三者に提供しません。荒らし・業者防止のために使用します。
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="px-5 pb-8 space-y-2.5">
          <button
            onClick={onVerify}
            className="w-full py-4 rounded-2xl font-extrabold text-white text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            style={{
              background: isVoice
                ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              boxShadow: isVoice
                ? '0 8px 24px rgba(249,115,22,0.35)'
                : '0 8px 24px rgba(6,182,212,0.35)',
            }}
          >
            <Shield size={15} />
            {cfg.cta}
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 text-xs font-medium text-stone-400"
          >
            あとで
          </button>
        </div>
      </div>
    </div>
  )
}
