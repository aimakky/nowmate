// samee custom controller icon
// 紫ベース + カラフルボタン（赤・黄・緑・青）固定 SVG
// プラットフォーム依存の 🎮 絵文字描画を回避するため、本番で常にこのデザインを表示する。
// 詳細仕様: memory/feedback_controller_icon.md

interface Props {
  /** 描画サイズ（px）。デフォルト 96。 */
  size?: number
  /** ネオン風グロー（drop-shadow）を付与するか。デフォルト true。 */
  glow?: boolean
  /** ラッパーに付けたい className（任意） */
  className?: string
}

export default function SameeGamepad({ size = 96, glow = true, className }: Props) {
  // SVG 内の <defs> id 衝突を避けるための一意キー
  const uid = `sg-${size}`
  return (
    <svg
      width={size}
      height={size * 0.82}
      viewBox="0 0 100 82"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      style={{
        filter: glow ? 'drop-shadow(0 0 16px rgba(139,92,246,0.55))' : undefined,
        flexShrink: 0,
      }}
    >
      <defs>
        {/* メインボディ：紫グラデーション */}
        <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="55%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#5b21b6" />
        </linearGradient>
        {/* 上部ハイライト */}
        <linearGradient id={`${uid}-hi`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        {/* スティック窪みグラデ */}
        <radialGradient id={`${uid}-stick`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#3b1f7a" />
          <stop offset="100%" stopColor="#1c0d3d" />
        </radialGradient>
      </defs>

      {/* メインボディ（左右に握り部、中央にやわらかな上辺） */}
      <path
        d="M22 18
           C12 18 6 26 5 38
           L4 56
           C4 70 14 76 24 76
           C34 76 39 70 42 64
           L58 64
           C61 70 66 76 76 76
           C86 76 96 70 96 56
           L95 38
           C94 26 88 18 78 18
           Z"
        fill={`url(#${uid}-body)`}
      />
      {/* 上部のハイライト（光沢感） */}
      <path
        d="M22 18
           C12 18 6 26 5 38
           L94 38
           C92 26 88 18 78 18
           Z"
        fill={`url(#${uid}-hi)`}
      />

      {/* D-pad（左上、ダーク紫の十字） */}
      <g transform="translate(24 38)">
        <rect x="-10" y="-3" width="20" height="6" rx="2" fill="#1f1438" />
        <rect x="-3" y="-10" width="6" height="20" rx="2" fill="#1f1438" />
        <circle cx="0" cy="0" r="1.6" fill="#3a2470" />
      </g>

      {/* ABXY 4 カラーボタン（右上、ダイヤ配置） */}
      {/* 上：黄 */}
      <circle cx="76" cy="29" r="4.2" fill="#fbbf24" />
      <circle cx="76" cy="29" r="1.4" fill="#fde68a" />
      {/* 右：赤 */}
      <circle cx="84" cy="38" r="4.2" fill="#ef4444" />
      <circle cx="84" cy="38" r="1.4" fill="#fecaca" />
      {/* 下：緑 */}
      <circle cx="76" cy="47" r="4.2" fill="#10b981" />
      <circle cx="76" cy="47" r="1.4" fill="#a7f3d0" />
      {/* 左：青 */}
      <circle cx="68" cy="38" r="4.2" fill="#3b82f6" />
      <circle cx="68" cy="38" r="1.4" fill="#bfdbfe" />

      {/* 中央 START/SELECT */}
      <rect x="44" y="36" width="5" height="2.2" rx="1.1" fill="#1f1438" />
      <rect x="51" y="36" width="5" height="2.2" rx="1.1" fill="#1f1438" />

      {/* 下部：左右アナログスティック */}
      <circle cx="34" cy="55" r="6.5" fill={`url(#${uid}-stick)`} stroke="#3a2470" strokeWidth="1.2" />
      <circle cx="34" cy="55" r="3" fill="#5b3fa8" />
      <circle cx="66" cy="55" r="6.5" fill={`url(#${uid}-stick)`} stroke="#3a2470" strokeWidth="1.2" />
      <circle cx="66" cy="55" r="3" fill="#5b3fa8" />
    </svg>
  )
}
