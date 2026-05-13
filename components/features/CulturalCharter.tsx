'use client'

import { useState } from 'react'

// YVOICE の5つの約束 — 民度設計の中核
// 投稿前初回 + 週1リマインダーとして表示
const RULES = [
  {
    icon: '🗣️',
    title: '意見は言っていい。人格攻撃はダメ。',
    desc: '考えに反論することと、人を否定することは違います。',
  },
  {
    icon: '🔒',
    title: '本名・顔写真・連絡先を要求しない',
    desc: 'プライバシーは誰もが守られるべきものです。',
  },
  {
    icon: '🚫',
    title: '勧誘・広告・営業は禁止',
    desc: 'ここは商業目的のための場所ではありません。',
  },
  {
    icon: '💬',
    title: 'DMは断られたら即引く',
    desc: 'しつこい連絡は、相手への脅威になります。',
  },
  {
    icon: '🌱',
    title: '弱さや悩みを笑わない',
    desc: '誰もが安心して本音を話せる場所を、一緒に守りましょう。',
  },
]

interface Props {
  onAgree: () => void
  onClose?: () => void
  isReminder?: boolean  // true=週次リマインダー, false=初回同意
}

export default function CulturalCharter({ onAgree, onClose, isReminder = false }: Props) {
  const [checked, setChecked] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-safe">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden mb-4">

        {/* ヘッダー */}
        <div
          className="px-5 pt-5 pb-4"
          style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)' }}
        >
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">🏕️</span>
            <div>
              <p className="font-extrabold text-white text-base leading-tight">
                {isReminder ? 'YVOICEの約束、覚えてますか？' : 'YVOICEへようこそ'}
              </p>
              <p className="text-white/50 text-xs mt-0.5">
                {isReminder
                  ? '投稿する前に確認してください'
                  : '投稿する前に、この村の約束を確認してください'}
              </p>
            </div>
          </div>
        </div>

        {/* ルール一覧 */}
        <div className="px-4 pt-4 pb-2 space-y-3 max-h-[55vh] overflow-y-auto">
          {RULES.map((r, i) => (
            <div
              key={i}
              className="flex items-start gap-3 bg-stone-50 border border-stone-100 rounded-2xl px-3.5 py-3"
            >
              <span className="text-xl flex-shrink-0 mt-0.5">{r.icon}</span>
              <div>
                <p className="text-sm font-bold text-stone-800 leading-snug">{r.title}</p>
                <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{r.desc}</p>
              </div>
            </div>
          ))}

          {/* 通報について */}
          <div className="bg-red-50 border border-red-100 rounded-2xl px-3.5 py-3 flex items-start gap-3">
            <span className="text-xl flex-shrink-0 mt-0.5">🚨</span>
            <div>
              <p className="text-sm font-bold text-red-700 leading-snug">違反したら通報されます</p>
              <p className="text-xs text-red-500 mt-0.5 leading-relaxed">
                複数の通報でアカウントが停止されます。悪意あるユーザーはいなくなります。
              </p>
            </div>
          </div>
        </div>

        {/* 同意エリア */}
        <div className="px-4 pb-5 pt-3 border-t border-stone-100">
          {!isReminder && (
            <label className="flex items-center gap-3 mb-3 cursor-pointer">
              <div
                onClick={() => setChecked(!checked)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  checked
                    ? 'bg-brand-500 border-brand-500'
                    : 'bg-white border-stone-300'
                }`}
              >
                {checked && <span className="text-white text-xs font-bold">✓</span>}
              </div>
              <span className="text-sm text-stone-700 font-medium leading-snug">
                この約束を守って投稿します
              </span>
            </label>
          )}

          <button
            onClick={onAgree}
            disabled={!isReminder && !checked}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: (!isReminder && !checked)
                ? '#d6d3d1'
                : 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
            }}
          >
            {isReminder ? '確認しました、投稿します' : '同意して投稿する'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ローカルストレージで「初回同意済み」「最終表示日」を管理 ──
const STORAGE_KEY_AGREED  = '自由村_charter_agreed'
const STORAGE_KEY_LAST    = '自由村_charter_last_shown'
const WEEKLY_MS           = 7 * 24 * 60 * 60 * 1000

export function shouldShowCharter(): 'first' | 'weekly' | null {
  if (typeof window === 'undefined') return null
  const agreed = localStorage.getItem(STORAGE_KEY_AGREED)
  if (!agreed) return 'first'

  const last = Number(localStorage.getItem(STORAGE_KEY_LAST) ?? '0')
  if (Date.now() - last > WEEKLY_MS) return 'weekly'

  return null
}

export function markCharterShown() {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY_AGREED, '1')
  localStorage.setItem(STORAGE_KEY_LAST, String(Date.now()))
}
