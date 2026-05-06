// 白カードUI への段階移行用の共通プリミティブ。
// マッキーさん指示「白基調・大きめ角丸・余白広め・余計な装飾なし」に準拠。
// ダークテーマの既存画面を一気に変えるリスクを下げるため、
// 「画面ごとに opt-in で SimpleCard を使う」運用にする。
//
// 残す YVOICE らしさ:
//   - 紫アクセント (#9D5CFF)
//   - 重要ボタンのみ紫塗り
//   - オンライン中の薄い緑グロー (任意)
// 過剰なネオン・強グローは入れない。

import { ReactNode } from 'react'

type SimpleCardProps = {
  onClick?: () => void
  className?: string
  children: ReactNode
  /** 押せる感を出す active scale. デフォルト false (静的カード) */
  pressable?: boolean
  /** カード内パディング。デフォルト 14px (= p-3.5 相当) */
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
        'block w-full text-left rounded-3xl overflow-hidden transition-all',
        pressable || onClick ? 'active:scale-[0.99]' : '',
        className ?? '',
      ].filter(Boolean).join(' ')}
      style={{
        background: '#ffffff',
        border: '1px solid rgba(15,23,42,0.06)',
        boxShadow: '0 1px 3px rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.03)',
        padding,
      }}
    >
      {children}
    </Tag>
  )
}

// セクション見出し (薄字 + 細い区切り線)。SimpleCard の上に配置する想定
export function SimpleSectionHeader({
  label,
  right,
}: { label: string; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-1 mb-2">
      <p className="text-[11px] font-extrabold tracking-wider uppercase"
        style={{ color: 'rgba(15,23,42,0.5)' }}>
        {label}
      </p>
      <div className="flex-1 h-px" style={{ background: 'rgba(15,23,42,0.08)' }} />
      {right}
    </div>
  )
}

// アバター/アイコン用の角丸正方形コンテナ (既存の絵文字/アイコンを中に置く)
export function SimpleAvatarTile({
  size = 56,
  background = 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
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
        border: '1px solid rgba(15,23,42,0.06)',
      }}
    >
      {children}
    </div>
  )
}

// 共通カラーパレット (light theme)。他画面の段階移行で参照しやすいように export
export const SIMPLE_COLORS = {
  pageBg:        '#f5f5f7',
  cardBg:        '#ffffff',
  cardBorder:    'rgba(15,23,42,0.06)',
  cardShadow:    '0 1px 3px rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.03)',
  textPrimary:   '#0f172a',
  textSecondary: 'rgba(15,23,42,0.6)',
  textTertiary:  'rgba(15,23,42,0.35)',
  accent:        '#9D5CFF',         // YVOICE 紫
  accentBg:      'rgba(157,92,255,0.10)',
  accentBorder:  'rgba(157,92,255,0.32)',
  accentDeep:    '#7c3aed',
} as const
