'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'

// ── 初投稿テンプレ ────────────────────────────────────────────
const TEMPLATES = [
  { icon: '👋', label: '自己紹介',   text: 'はじめまして！今日から参加します。' },
  { icon: '💭', label: '今日の気分', text: '今日は' },
  { icon: '🎯', label: '好きなこと', text: '最近ハマっていること：' },
]

interface Props {
  villageName: string
  onSelectTemplate: (text: string) => void
  onDismiss: () => void
}

export default function FirstPostPrompt({ villageName, onSelectTemplate, onDismiss }: Props) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  function handleDismiss() {
    setDismissed(true)
    onDismiss()
  }

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm mb-3"
      style={{ background: 'linear-gradient(135deg, #f0f7f3 0%, #fdf4ef 100%)', border: '1px solid rgba(74,124,89,0.15)' }}>

      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
            <span className="text-lg">🌱</span>
          </div>
          <div>
            <p className="text-xs font-extrabold text-brand-700">{villageName}へようこそ</p>
            <p className="text-[10px] text-stone-500 mt-0.5">最初の一言を残してみましょう</p>
          </div>
        </div>
        <button onClick={handleDismiss}
          className="text-stone-300 hover:text-stone-500 transition-colors mt-0.5 text-sm font-bold">
          ✕
        </button>
      </div>

      {/* テンプレ選択 */}
      <div className="px-4 pb-2 space-y-2">
        {TEMPLATES.map(t => (
          <button key={t.icon} onClick={() => onSelectTemplate(t.text)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all active:scale-[0.99]"
            style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(74,124,89,0.12)' }}>
            <span className="text-base flex-shrink-0">{t.icon}</span>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-brand-600 block">{t.label}</span>
              <span className="text-xs text-stone-600 truncate block">{t.text}...</span>
            </div>
            <Pencil size={12} className="text-stone-300 flex-shrink-0" />
          </button>
        ))}
      </div>

      {/* フッター */}
      <div className="px-4 pb-3.5">
        <p className="text-[10px] text-stone-400 text-center">
          一言でもOK。最初の投稿で村に根が張られます 🌿
        </p>
      </div>
    </div>
  )
}
