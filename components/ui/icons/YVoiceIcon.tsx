// YVOICE 公式ブランドアイコン (Y + 2 つのマイクが Y を形成するシンボル)。
// LP / アプリ内ヘッダー / ログイン / 新規登録 等、全画面のブランドマークは
// このコンポーネントに統一する。古い "s" 四角アイコン (samee 由来) や
// 絵文字 (✦ / 🏕️) を全部これで置換する。
//
// 同一の SVG を public/yvoice-icon.svg にも置き、manifest.json と
// app/icon.tsx / app/apple-icon.tsx がそれを参照する。
//
// size: 表示サイズ (px)。viewBox は 64x64 固定なのでサイズ可変。
// withBackground: 背景の角丸黒板を含めるか (LP / favicon は true、
//   既に色付き丸の中で使う場合 = ヘッダーの 6x6 / 8x8 のような小箱では
//   false にしてマイクシンボルだけを描く)
// rounded: 背景の角丸量 (default 12 = 64 viewBox の 19%、iOS 風)

type Props = {
  size?: number
  withBackground?: boolean
  rounded?: number
  className?: string
}

export default function YVoiceIcon({
  size = 32,
  withBackground = true,
  rounded = 12,
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
        <linearGradient id="yvoiceIconPurple" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c4b5fd" />
          <stop offset="0.55" stopColor="#9D5CFF" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>

      {withBackground && (
        <rect width="64" height="64" rx={rounded} fill="#0a0a18" />
      )}

      {/* Y center stem (vertical) */}
      <rect
        x="29.5"
        y="32"
        width="5"
        height="22"
        rx="1.2"
        fill="url(#yvoiceIconPurple)"
      />

      {/* Left mic + arm */}
      <g transform="translate(32 32) rotate(-25)">
        {/* arm */}
        <rect x="-2.5" y="-8" width="5" height="14" rx="1.2" fill="url(#yvoiceIconPurple)" />
        {/* mic capsule */}
        <rect x="-8" y="-22" width="16" height="16" rx="8" fill="url(#yvoiceIconPurple)" />
        {/* grills */}
        <rect x="-4.5" y="-19" width="9" height="1.1" rx="0.55" fill="#0a0a18" opacity="0.55" />
        <rect x="-4.5" y="-16.5" width="9" height="1.1" rx="0.55" fill="#0a0a18" opacity="0.55" />
        <rect x="-4.5" y="-14" width="9" height="1.1" rx="0.55" fill="#0a0a18" opacity="0.55" />
      </g>

      {/* Right mic + arm (mirror) */}
      <g transform="translate(32 32) rotate(25)">
        <rect x="-2.5" y="-8" width="5" height="14" rx="1.2" fill="url(#yvoiceIconPurple)" />
        <rect x="-8" y="-22" width="16" height="16" rx="8" fill="url(#yvoiceIconPurple)" />
        <rect x="-4.5" y="-19" width="9" height="1.1" rx="0.55" fill="#0a0a18" opacity="0.55" />
        <rect x="-4.5" y="-16.5" width="9" height="1.1" rx="0.55" fill="#0a0a18" opacity="0.55" />
        <rect x="-4.5" y="-14" width="9" height="1.1" rx="0.55" fill="#0a0a18" opacity="0.55" />
      </g>
    </svg>
  )
}
