// YVOICE 公式ブランドアイコン v3 — シンプルな紫の Y。
// マッキーさん指示: 「やっぱりロゴはシンプルな紫の Y にして」
//
// v2 の Y + 2 マイクのデザインから、3 ストロークだけの極限ミニマル Y へ。
// マイク / グリル / edge highlight / 斜めグラデは全部削除。
// 紫はフラット #9D5CFF (YVoiceLogo の文字「Y」と同じ色なので、文字版と
// マーク版の紫が完全に揃う)。
//
// 文字 (YVOICE) は YVoiceLogo.tsx 側で確定版を維持。マークのみ刷新。

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
      {withBackground && (
        <rect width="64" height="64" rx={rounded} fill="#0a0a18" />
      )}

      {/* Y を 3 ストロークで構成。
          Junction (32, 30) を中心に
          - 中央のステムが下方向 (32, 30) → (32, 52)
          - 左アームが上左方向 (32, 30) → (16, 14)
          - 右アームが上右方向 (32, 30) → (48, 14)
          stroke-linecap="round" でアームの先端と stem の下端が丸くなる。 */}
      <g
        stroke="#9D5CFF"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <line x1="32" y1="30" x2="32" y2="52" />
        <line x1="32" y1="30" x2="16" y2="14" />
        <line x1="32" y1="30" x2="48" y2="14" />
      </g>
    </svg>
  )
}
