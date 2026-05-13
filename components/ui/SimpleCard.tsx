// シンプル一覧表示用の共通プリミティブ。
//
// 重要: 配色はダーク紫基調 (YVOICE 既存世界観) を維持。
// 「白基調にする」前回方針は撤回した。今回からは「色はダーク紫のまま、
// 表示方法だけシンプル化 (大きめカード + 余白広め + アイコン + 名前 + 人数)」。
// SIMPLE_COLORS を import している全画面が自動的にダーク基調に追従する。

import { ReactNode } from 'react'

type SimpleCardProps = {
  onClick?: () => void
  className?: string
  children: ReactNode
  pressable?: boolean
  padding?: number | string
}

export function SimpleCard({
  onClick,
  className,
  children,
  pressable = false,
  padding = 14,
}: SimpleCardProps) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={[
        'block w-full text-left rounded-2xl overflow-hidden transition-all',
        pressable || onClick ? 'active:scale-[0.99]' : '',
        className ?? '',
      ].filter(Boolean).join(' ')}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(157,92,255,0.18)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        padding,
      }}
    >
      {children}
    </Tag>
  )
}

// セクション見出し (薄字 + 細い区切り線)
export function SimpleSectionHeader({
  label,
  right,
}: { label: string; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-1 mb-2">
      <p className="text-[11px] font-extrabold tracking-wider uppercase"
        style={{ color: 'rgba(240,238,255,0.45)' }}>
        {label}
      </p>
      <div className="flex-1 h-px" style={{ background: 'rgba(157,92,255,0.15)' }} />
      {right}
    </div>
  )
}

// アバター/アイコン用の角丸正方形コンテナ
export function SimpleAvatarTile({
  size = 56,
  background = 'linear-gradient(135deg, rgba(157,92,255,0.22), rgba(124,58,237,0.18))',
  children,
}: {
  size?: number
  background?: string
  children: ReactNode
}) {
  return (
    <div
      className="flex-shrink-0 rounded-2xl flex items-center justify-center"
      style={{
        width: size,
        height: size,
        background,
        border: '1px solid rgba(157,92,255,0.22)',
      }}
    >
      {children}
    </div>
  )
}

// 共通カラーパレット (DARK theme)。他画面のシンプル化で参照する。
// 元々 light 版だったが、ユーザー方針撤回でダーク紫基調に戻した。
export const SIMPLE_COLORS = {
  pageBg:        '#0a0a18',                    // ダーク紫黒 (YVOICE base)
  cardBg:        'rgba(255,255,255,0.04)',     // ほぼ透明の白 (ダーク bg に薄く乗る)
  cardBorder:    'rgba(157,92,255,0.18)',      // 薄紫の枠線
  cardShadow:    '0 4px 16px rgba(0,0,0,0.25)',
  textPrimary:   '#F0EEFF',                     // 純白寄り
  textSecondary: 'rgba(240,238,255,0.55)',
  textTertiary:  'rgba(240,238,255,0.35)',
  accent:        '#9D5CFF',                     // YVOICE 紫 (主アクセント)
  accentBg:      'rgba(157,92,255,0.20)',       // 紫アクティブ背景
  accentBorder:  'rgba(157,92,255,0.45)',
  accentDeep:    '#c4b5fd',                     // 紫アクティブ文字 (ダーク bg 用)
} as const

// シンプル一覧アイテム (右画像参考: アイコン + 名前(N) + 任意の右側要素)。
// 色はダーク紫のまま、レイアウトだけ「ごちゃつかない大きめカード」に
// 統一するための共通行。
//
// 利用先: ゲーム村 / ギルド / グループ / 通話ルーム / チャット 等の一覧。
export function SimpleListRow({
  icon,
  title,
  count,
  right,
  onClick,
}: {
  icon: ReactNode
  title: string
  count?: number | string
  right?: ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 active:scale-[0.99] transition-all text-left"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(157,92,255,0.18)',
      }}
    >
      <div
        className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, rgba(157,92,255,0.22), rgba(124,58,237,0.16))',
          border: '1px solid rgba(157,92,255,0.25)',
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-extrabold truncate" style={{ color: '#F0EEFF' }}>
          {title}
          {count !== undefined && (
            <span className="ml-1.5 font-bold" style={{ color: 'rgba(240,238,255,0.6)' }}>
              ({count})
            </span>
          )}
        </p>
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </button>
  )
}
