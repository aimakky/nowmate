'use client'

// /safety — 「安心・安全ガイド」スタンドアロンページ。
// 旧版はマイページの "安心" タブに同梱していた GuideTab を、
// マイページタブ整理 (投稿/動画/画像 構成への統一) に伴い分離。
// 設定画面 (/settings) からこのページにリンクする。
//
// 内容: コミュニティルール / 通報・ブロックの考え方 / 本人確認・年齢確認 等。
// (実体は components/rules/GuideTab に集約)

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import GuideTab from '@/components/rules/GuideTab'

export default function SafetyPage() {
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
          安心・安全ガイド
        </p>
      </div>

      <div className="pb-32">
        <GuideTab />
      </div>
    </div>
  )
}
