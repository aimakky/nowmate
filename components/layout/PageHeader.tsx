'use client'
//
// PageHeader (2026-05-09 マッキーさん指示「全ページ共通のレイアウト設計」対応)
//
// TL / グループ / 通知 / チャット の 4 ページ上部ヘッダーを共通化するためのコンポーネント。
// 旧:
//   - TL: pt-12 pb-0 (非 sticky / 緑グラデ)
//   - グループ: pt-5 pb-3 (非 sticky / アクセント色なし / label/subtitle なし)
//   - 通知: sticky pt-12 pb-3 (黄)
//   - チャット: sticky pt-12 pb-0 (桃 / タブ内蔵)
// 新: 全 4 ページで以下の構造を共通化:
//   - sticky top-0 z-10 + backdrop-blur-md
//   - pt-12 pb-3 (bottomTab がある時は pb-0 で内部タブが pb 役を担う)
//   - bg: rgba(8,8,18,0.92)
//   - border-bottom: 1px solid rgba(accent, 0.2)
//
// アクセント色 (世界観・ネオン感) は引数 accentColor で各ページが指定する:
//   - TL: #39FF88 (緑)
//   - グループ: #3B82F6 (青)
//   - 通知: #FFC928 (黄)
//   - チャット: #FF4FD8 (桃)
//
// ゲーム村は「タブが最上部」設計を維持するため、本コンポーネントは使わない。

import { useEffect } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type PageHeaderProps = {
  /** 大文字英字ラベル (例: "TIMELINE"). 必須 */
  label: string
  /** 日本語タイトル (例: "タイムライン"). 必須 */
  title: string
  /** タイトル左に出す Lucide アイコン (例: Layers / Bell / MessageSquare / Users) */
  icon: LucideIcon
  /** アクセントカラー HEX (例: "#39FF88"). label の文字色 / icon 色 / border-bottom 色 */
  accentColor: string
  /** 任意の subtitle (例: "みんなの声が流れる場所"). NULL 可 */
  subtitle?: string
  /** タイトル行の右側に出す要素 (Refresh ボタン / 未読バッジ / 探す+編集 など) */
  actions?: ReactNode
  /** タイトル行の下に出す要素 (タブ列など、TL / チャット用). bottomTab がある時は outer pb=0 */
  bottomTab?: ReactNode
  /** 背景色オーバーライド (default: rgba(8,8,18,0.92)) */
  bgColor?: string
}

export default function PageHeader({
  label, title, icon: Icon, accentColor,
  subtitle, actions, bottomTab,
  bgColor = 'rgba(8,8,18,0.92)',
}: PageHeaderProps) {
  // bottomTab がある時はタブが pb 役 (= 視覚的下余白) を担うので outer pb-0、
  // ない時は outer pb-3 で同じ視覚密度を担保
  const pbClass = bottomTab ? 'pb-0' : 'pb-3'

  // DEBUG (2026-05-09 マッキーさん指示「実描画ファイル証明」)
  // 確認後、次 commit で除去予定 (CLAUDE.md「最短ライフサイクル」)。
  useEffect(() => {
    console.log('[PAGE_HEADER_DEBUG_2026-05-09] mount label=', label,
      'file=components/layout/PageHeader.tsx',
      'accentColor=', accentColor)
  }, [label, accentColor])

  return (
    <div
      className={`sticky top-0 z-10 px-4 pt-12 ${pbClass} backdrop-blur-md`}
      style={{
        background: bgColor,
        borderBottom: `1px solid ${hexToRgba(accentColor, 0.2)}`,
      }}
      data-page-header
    >
      <div className={`flex items-start justify-between gap-2 ${bottomTab ? 'mb-3' : ''}`}>
        <div className="min-w-0 flex-1">
          <p
            className="text-[10px] font-bold tracking-widest uppercase mb-0.5"
            style={{ color: hexToRgba(accentColor, 0.7) }}
          >
            {label}
          </p>
          <h1
            className="font-extrabold text-2xl leading-tight flex items-center gap-2"
            style={{ color: '#F0EEFF' }}
          >
            <Icon size={22} strokeWidth={2.2} style={{ color: accentColor }} />
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs mt-0.5" style={{ color: 'rgba(240,238,255,0.3)' }}>
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex-shrink-0 self-start mt-1">{actions}</div>}
      </div>
      {bottomTab}
    </div>
  )
}

/** #RRGGBB → rgba(R,G,B,A) 変換 (PageHeader 内部のみ使用) */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
