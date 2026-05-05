// 本人確認 / 20歳以上確認済みバッジ（Phase 1）
//
// 用途:
//   - 投稿カード横、プロフィール、通話 participants、検索結果 など
//   - 「本人確認済み・20歳以上」を控えめに伝える
//
// 設計:
//   - verified=false / undefined のときは何も描画しない（呼び出し側を破壊しない）
//   - sm / md / lg の 3 サイズ。サイズ別に文言を切り替える
//   - 出会い系っぽい派手色は避け、緑～エメラルド系で安心感
//   - title 属性で hover ツールチップ
//
// 既存の age_verified を読むだけなので DB 変更不要。

import { ShieldCheck } from 'lucide-react'
import type { VerificationBadgeSize } from '@/lib/identity-types'

interface Props {
  /** 認証済みなら true。false / undefined では何も描画しない。 */
  verified: boolean | null | undefined
  size?: VerificationBadgeSize
  /** 未確認の場合に薄く案内表示するか（デフォルト false：何も出さない）。 */
  showWhenUnverified?: boolean
  className?: string
}

const SIZE_PRESETS: Record<VerificationBadgeSize, {
  text:       string
  unverified: string
  iconSize:   number
  fontSize:   number
  paddingX:   number
  paddingY:   number
  gap:        number
  borderRadius: number
}> = {
  sm: { text: '✓',                       unverified: '未確認',         iconSize: 10, fontSize: 10, paddingX: 5, paddingY: 1, gap: 2, borderRadius: 999 },
  md: { text: '✓ 認証済み',              unverified: '未確認',         iconSize: 12, fontSize: 11, paddingX: 8, paddingY: 2, gap: 4, borderRadius: 999 },
  lg: { text: '✓ 本人確認済み・20歳以上', unverified: '本人確認 未完了', iconSize: 14, fontSize: 12, paddingX: 10, paddingY: 4, gap: 5, borderRadius: 999 },
}

const VERIFIED_COLOR = {
  fg:     '#34D399',
  bg:     'rgba(52,211,153,0.10)',
  border: 'rgba(52,211,153,0.30)',
}

const UNVERIFIED_COLOR = {
  fg:     'rgba(240,238,255,0.40)',
  bg:     'rgba(255,255,255,0.04)',
  border: 'rgba(240,238,255,0.12)',
}

export default function VerifiedBadge({
  verified,
  size = 'md',
  showWhenUnverified = false,
  className,
}: Props) {
  const isVerified = verified === true
  if (!isVerified && !showWhenUnverified) return null

  const preset = SIZE_PRESETS[size]
  const palette = isVerified ? VERIFIED_COLOR : UNVERIFIED_COLOR
  const text = isVerified ? preset.text : preset.unverified

  return (
    <span
      className={`inline-flex items-center font-bold whitespace-nowrap ${className ?? ''}`}
      title={isVerified ? '本人確認・20歳以上確認済み' : '本人確認 未完了'}
      aria-label={isVerified ? '本人確認・20歳以上確認済み' : '本人確認 未完了'}
      style={{
        gap:          preset.gap,
        padding:      `${preset.paddingY}px ${preset.paddingX}px`,
        fontSize:     preset.fontSize,
        color:        palette.fg,
        background:   palette.bg,
        border:       `1px solid ${palette.border}`,
        borderRadius: preset.borderRadius,
        lineHeight:   1,
      }}
    >
      {/* sm 以外はアイコンも併記 */}
      {size !== 'sm' && (
        <ShieldCheck size={preset.iconSize} strokeWidth={2.4} aria-hidden="true" />
      )}
      <span>{text}</span>
    </span>
  )
}
