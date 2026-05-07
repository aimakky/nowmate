'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

// 紫グロー丸型アイコンボタン (40x40)
//
// 採用箇所:
//   - app/(app)/layout.tsx 右上「フレンドを追加」(UserPlus)
//   - app/(app)/mypage/page.tsx 上部「設定 / フレンドを追加」(Settings / UserPlus)
//
// 「同じボタンコンポーネント、icon だけ差し替え」要件を満たすため、
// 共通の見た目 (border / boxShadow / background) はここで一元管理し、
// 利用側は href / icon / label のみ指定する。
//
// layout.tsx 側はまだ inline 実装のままだが、見た目は本コンポーネントと
// 同一に揃えている。将来 layout 側も置き換えれば完全な単一ソース化になる。
type Props = {
  href: string
  icon: LucideIcon
  ariaLabel: string
  title?: string
}

export default function PurpleIconButton({ href, icon: Icon, ariaLabel, title }: Props) {
  return (
    <Link
      href={href}
      className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center active:scale-90 transition-all flex-shrink-0"
      style={{
        border: '2px solid rgba(196,181,253,0.85)',
        boxShadow:
          '0 0 14px rgba(157,92,255,0.6), 0 0 28px rgba(157,92,255,0.22), 0 2px 6px rgba(0,0,0,0.5)',
        background:
          'linear-gradient(135deg, rgba(157,92,255,0.45), rgba(124,58,237,0.55))',
      }}
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
    >
      <Icon size={20} style={{ color: '#F0EEFF' }} strokeWidth={2.4} />
    </Link>
  )
}
