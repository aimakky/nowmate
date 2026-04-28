'use client'

import { useState } from 'react'

const CARDS = [
  {
    icon:    '🏡',
    title:   'ここは何をする場所？',
    tagline: '安心して、本音を話せる。それだけでいい。',
    body:    '悩みでも、日常のひとことでも、匿名の質問でも。知らない誰かが話を聞いてくれます。答えが返ってくることもあります。',
    bg:      'linear-gradient(135deg,#1a1a2e 0%,#16213e 100%)',
    accent:  '#818cf8',
  },
  {
    icon:    '🗣️',
    title:   '何を投稿してもいい？',
    tagline: '全部OK。うまくまとめなくていい。',
    body:    '「なんか今日しんどい」でも「これどう思う？」でも「ただ聞いてほしい」でも。ここでは言葉の上手さより、気持ちが大事。',
    bg:      'linear-gradient(135deg,#0c1445 0%,#1a3a6b 100%)',
    accent:  '#60a5fa',
  },
  {
    icon:    '🤝',
    title:   '誰かが困っていたら？',
    tagline: '答えなくていい。「いたよ」だけでいい。',
    body:    '漂流瓶の質問に答えると「人助けカウント」が増えます。助けた事実がプロフィールに残ります。ここでは人助けが実績になります。',
    bg:      'linear-gradient(135deg,#064e3b 0%,#065f46 100%)',
    accent:  '#6ee7b7',
  },
  {
    icon:    '🛡️',
    title:   '一つだけ守ってください',
    tagline: '人を傷つけるための言葉は使わない。',
    body:    'それだけです。意見は言っていい。批判もいい。反論もいい。でも「人格を壊すため」の言葉は使わない。それだけで、ここは安全になります。',
    bg:      'linear-gradient(135deg,#450a0a 0%,#7f1d1d 100%)',
    accent:  '#fca5a5',
  },
  {
    icon:    '🌿',
    title:   'あなたは今日から住民です',
    tagline: 'この村には、あなたの居場所があります。',
    body:    '気が向いたときに来ればいい。毎日来なくてもいい。でも来たとき、誰かがいます。あなたがここにいることで、誰かが助かります。',
    bg:      'linear-gradient(135deg,#1e1b4b 0%,#312e81 100%)',
    accent:  '#c4b5fd',
    isLast:  true,
  },
]

interface Props {
  onAgree: () => void
}

export default function CultureCards({ onAgree }: Props) {
  const [current, setCurrent] = useState(0)
  const card    = CARDS[current]
  const isLast  = current === CARDS.length - 1
  const isFirst = current === 0

  function next() {
    if (isLast) { onAgree(); return }
    setCurrent(c => c + 1)
  }

  function prev() {
    if (isFirst) return
    setCurrent(c => c - 1)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-end px-4 pb-6"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>

      {/* カード */}
      <div className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl mb-4"
        style={{ border: `1px solid ${card.accent}30` }}>

        {/* カード本体 */}
        <div className="px-6 pt-8 pb-6 text-center" style={{ background: card.bg }}>

          {/* ドットインジケーター */}
          <div className="flex justify-center gap-1.5 mb-6">
            {CARDS.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className="rounded-full transition-all"
                style={{
                  width:  i === current ? 20 : 6,
                  height: 6,
                  background: i <= current ? card.accent : 'rgba(255,255,255,0.2)',
                }} />
            ))}
          </div>

          <div className="text-5xl mb-4 select-none">{card.icon}</div>

          <h3 className="font-extrabold text-white text-lg leading-snug mb-2">
            {card.title}
          </h3>
          <p className="font-bold mb-4 text-sm" style={{ color: card.accent }}>
            「{card.tagline}」
          </p>
          <p className="text-white/70 text-xs leading-relaxed">
            {card.body}
          </p>
        </div>

        {/* アクションエリア */}
        <div className="px-5 py-4 bg-white space-y-2">
          <button onClick={next}
            className="w-full py-3.5 rounded-2xl font-extrabold text-sm text-white active:scale-95 transition-all"
            style={{ background: isLast
              ? 'linear-gradient(135deg,#7c3aed,#4f46e5)'
              : 'linear-gradient(135deg,#1e1b4b,#312e81)',
              boxShadow: isLast ? '0 8px 24px rgba(124,58,237,0.4)' : 'none',
            }}>
            {isLast ? '✅ 同意してvilliaを始める' : `次へ → (${current + 1}/${CARDS.length})`}
          </button>

          {!isFirst && (
            <button onClick={prev}
              className="w-full py-2 text-xs text-stone-400 font-medium">
              ← 前に戻る
            </button>
          )}
        </div>
      </div>

      {/* 下部注記 */}
      <p className="text-white/30 text-[10px] text-center">
        同意することで<a href="/terms" className="underline">利用規約</a>と<a href="/privacy" className="underline">プライバシーポリシー</a>に同意したものとみなされます
      </p>
    </div>
  )
}

// ローカルストレージ管理
const STORAGE_KEY = 'villia_culture_agreed'
export function markCultureAgreed() {
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, '1')
}
export function hasCultureAgreed() {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem(STORAGE_KEY)
}
