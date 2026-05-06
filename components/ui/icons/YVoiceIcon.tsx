// YVOICE 公式ブランドアイコン v2 (Y + 2 つのマイクが Y を形成するシンボル)。
// LP / アプリ内ヘッダー / ログイン / 新規登録 等、全画面のブランドマーク。
//
// v2 リファインの方針:
//   - グリル線 (3 本) を削除し、シルエットだけで「マイク」を伝える
//     → 小サイズで潰れず、Claude Code 系の minimal で洗練された印象に
//   - 各マイクキャップ左側に細い highlight stripe を追加 (premium な depth)
//   - 紫グラデを単色 → 斜め lavender → violet → deep purple に
//   - 背景を flat → 微グラデ (#15102a → #0a0a18) で立体感
//   - アーム / キャップ幅を slim 化 (5 → 4.5 / 16 → 14)
//
// 文字 (YVOICE) は YVoiceLogo.tsx 側で確定版を維持。マークのみリファイン。
//
// 同一の SVG を public/yvoice-icon.svg にも置き、manifest.json と
// app/icon.tsx / app/apple-icon.tsx がそれを参照する。

type Props = {
  size?: number
  withBackground?: boolean
  rounded?: number
  className?: string
}

export default function YVoiceIcon({
  size = 32,
  withBackground = true,
  rounded = 14,
  className,
}: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="YVOICE"
    >
      <defs>
        {/* 背景: 黒に近い深紫から漆黒への縦グラデで立体感を出す */}
        <linearGradient id="yvoiceBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#15102a" />
          <stop offset="1" stopColor="#0a0a18" />
        </linearGradient>
        {/* 紫: 斜め lavender → violet → deep purple */}
        <linearGradient id="yvoicePurple" x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#d8b4fe" />
          <stop offset="0.5" stopColor="#a855f7" />
          <stop offset="1" stopColor="#6d28d9" />
        </linearGradient>
        {/* キャップ左側のエッジハイライト (depth 用、上から下へフェード) */}
        <linearGradient id="yvoiceHi" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {withBackground && (
        <rect width="64" height="64" rx={rounded} fill="url(#yvoiceBg)" />
      )}

      {/* Y center stem (vertical) — 中央に細めのバー */}
      <rect x="29.75" y="32" width="4.5" height="22" rx="1.5" fill="url(#yvoicePurple)" />

      {/* Left mic + arm (rotation -25°) */}
      <g transform="translate(32 32) rotate(-25)">
        {/* arm body */}
        <rect x="-2.25" y="-8" width="4.5" height="14" rx="1.5" fill="url(#yvoicePurple)" />
        {/* mic capsule (slim 14 × 16) */}
        <rect x="-7" y="-22" width="14" height="16" rx="7" fill="url(#yvoicePurple)" />
        {/* edge highlight (capsule 左側、premium な depth) */}
        <rect x="-6.5" y="-21" width="1.5" height="13" rx="0.75" fill="url(#yvoiceHi)" />
      </g>

      {/* Right mic + arm (rotation +25°、左右対称) */}
      <g transform="translate(32 32) rotate(25)">
        <rect x="-2.25" y="-8" width="4.5" height="14" rx="1.5" fill="url(#yvoicePurple)" />
        <rect x="-7" y="-22" width="14" height="16" rx="7" fill="url(#yvoicePurple)" />
        <rect x="-6.5" y="-21" width="1.5" height="13" rx="0.75" fill="url(#yvoiceHi)" />
      </g>
    </svg>
  )
}
