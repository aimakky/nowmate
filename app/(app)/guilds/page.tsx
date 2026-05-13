'use client'

// 旧 /guilds ページ。本体は components/features/GuildsContent.tsx に extract され、
// /guild ページの「ギルド」タブからも同じコンポーネントが利用される。
// このルート自体は互換性維持のためそのまま動く（外部リンク・古いブックマーク対応）。

import GuildsContent from '@/components/features/GuildsContent'

export default function GuildsPage() {
  return (
    <div className="max-w-md mx-auto min-h-screen pb-28" style={{ background: '#080812' }}>
      <GuildsContent />
    </div>
  )
}
