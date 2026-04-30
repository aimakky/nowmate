// 空状態専用の横長ゲームパッド SVG
// 仕様：左右に丸いグリップ、紫グラデ、左に十字キー、
//       右に赤・黄・青・緑の ABXY ボタン、中央に黒い START/SELECT ×2。
// 既存の SameeGamepad / Gamepad2 とは別物。/guild の空状態の中央でのみ使う。

interface Props {
  /** 描画幅 px。viewBox は 200x140（アスペクト 10:7） */
  size?: number
  className?: string
}

export default function EmptyStateGamepad({ size = 140, className }: Props) {
  return (
    <svg
      width={size}
      height={size * 0.7}
      viewBox="0 0 200 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      style={{
        filter: 'drop-shadow(0 0 28px rgba(124,58,237,0.55))',
        flexShrink: 0,
      }}
    >
      <defs>
        {/* メインボディ：紫〜青紫グラデ */}
        <linearGradient id="esg-body" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%"   stopColor="#b39bff" />
          <stop offset="45%"  stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#312e81" />
        </linearGradient>
        {/* 上面ハイライト */}
        <linearGradient id="esg-hi" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%"  stopColor="#ffffff" stopOpacity="0.32" />
          <stop offset="65%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* 本体（横長＋左右に丸グリップ＋下中央に浅い谷） */}
      <path
        d="M 38,40
           L 162,40
           Q 188,40 192,64
           L 192,90
           Q 192,124 160,124
           Q 134,124 128,104
           Q 126,98 118,98
           L 82,98
           Q 74,98 72,104
           Q 66,124 40,124
           Q 8,124 8,90
           L 8,64
           Q 12,40 38,40
           Z"
        fill="url(#esg-body)"
      />

      {/* 上面ハイライト */}
      <path
        d="M 38,40
           L 162,40
           Q 188,40 192,64
           L 8,64
           Q 12,40 38,40
           Z"
        fill="url(#esg-hi)"
      />

      {/* 左：黒い十字キー */}
      <g transform="translate(50, 79)">
        <rect x="-15" y="-5" width="30" height="10" rx="2.5" fill="#08041a" />
        <rect x="-5" y="-15" width="10" height="30" rx="2.5" fill="#08041a" />
        <circle r="2.6" fill="#1f1438" />
      </g>

      {/* 右：ABXY 4 ボタン（黄／赤／緑／青、ハイライト付き） */}
      {/* 上：黄 */}
      <circle cx="150" cy="63" r="7.6" fill="#fbbf24" />
      <circle cx="150" cy="63" r="2.7" fill="#fde68a" />
      {/* 右：赤 */}
      <circle cx="166" cy="79" r="7.6" fill="#ef4444" />
      <circle cx="166" cy="79" r="2.7" fill="#fecaca" />
      {/* 下：緑 */}
      <circle cx="150" cy="95" r="7.6" fill="#10b981" />
      <circle cx="150" cy="95" r="2.7" fill="#a7f3d0" />
      {/* 左：青 */}
      <circle cx="134" cy="79" r="7.6" fill="#3b82f6" />
      <circle cx="134" cy="79" r="2.7" fill="#bfdbfe" />

      {/* 中央：黒い小さな START / SELECT ×2 */}
      <rect x="87"  y="76" width="10" height="4" rx="2" fill="#08041a" />
      <rect x="103" y="76" width="10" height="4" rx="2" fill="#08041a" />
    </svg>
  )
}
