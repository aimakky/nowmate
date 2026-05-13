'use client'

// /guide — 「使い方ガイド」スタンドアロンページ。
// 旧版はマイページの "使い方" タブに同梱していた FeaturesTab を、
// マイページタブ整理 (投稿/動画/画像 構成への統一) に伴い分離。
// 設定画面 (/settings) からこのページにリンクする。

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import FeaturesTab from '@/components/features-guide/FeaturesTab'

export default function GuidePage() {
  const router = useRouter()

  return (
    <div className="max-w-md mx-auto min-h-screen" style={{ background: '#080812' }}>
      {/* ── Header ── */}
      <div
        className="px-4 pt-4 pb-3 flex items-center gap-3 sticky top-0 z-20"
        style={{
          background: 'rgba(8,8,18,0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(157,92,255,0.18)',
        }}
      >
        <button
          onClick={() => router.back()}
          className="p-1 -ml-1 active:opacity-60 transition-opacity"
          style={{ color: 'rgba(240,238,255,0.7)' }}
          aria-label="戻る"
        >
          <ArrowLeft size={20} />
        </button>
        <p className="font-extrabold text-base" style={{ color: '#F0EEFF' }}>
          使い方ガイド
        </p>
      </div>

      <div className="pb-32">
        <FeaturesTab />
      </div>
    </div>
  )
}
