// 紫のゲームコントローラーアイコン（手書き SVG）
//
// 仕様：
//   - viewBox 200x120（横:縦 ≒ 1.6:1）
//   - 横長ゲームパッド型・左右に丸グリップ・下中央に浅い谷
//   - 本体：linear-gradient（左→右）#6D5BFF → #7C4DFF → #9C6BFF
//   - 左：黒の十字キー（#2A2A2A、約18px）
//   - 中央やや下：黒の小ボタン×2（#2A2A2A、約6px）
//   - 右：4色のダイヤ配置（黄/赤/青/緑）
//   - 左下：薄紫のアナログスティック（#AFA8FF、約14px）
//   - 紫グロー（#7C4DFF, ~0.45）+ 黒シャドウ
//
// 既存の lucide / heroicons / Gamepad / Gamepad2 / Joystick は使用していない。

interface Props {
  /** デフォルト 120px。`height` は viewBox 比率で自動算出。 */
  width?: number
  className?: string
}

export default function GameControllerIcon({ width = 120, className }: Props) {
  // viewBox 200x120 のアスペクトを維持
  const height = width * (120 / 200)
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 200 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      style={{
        display: 'block',
        margin: '0 auto',
        // 紫ネオングロー + 黒シャドウ
        filter:
          'drop-shadow(0 0 16px rgba(124,77,255,0.45)) ' +
          'drop-shadow(0 8px 22px rgba(0,0,0,0.22))',
        flexShrink: 0,
      }}
    >
      <defs>
        {/* 本体：横方向の紫グラデ */}
        <linearGradient id="gci-body" x1="0" y1="0.5" x2="1" y2="0.5">
          <stop offset="0%"   stopColor="#6D5BFF" />
          <stop offset="50%"  stopColor="#7C4DFF" />
          <stop offset="100%" stopColor="#9C6BFF" />
        </linearGradient>
        {/* ボディ上面のソフトハイライト */}
        <linearGradient id="gci-hi" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%"  stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/*
        本体パス：
          - 上辺は y=20、x=30 → 170 でほぼ水平
          - 左右は外に向かってふくらみ、下端 y=108 で丸グリップ
          - 中央下は y=86 の浅い谷（throat）
      */}
      <path
        d="M 30,20
           L 170,20
           C 185,20 195,30 195,55
           C 195,90 180,108 160,108
           C 140,108 130,98 124,86
           L 76,86
           C 70,98 60,108 40,108
           C 20,108 5,90 5,55
           C 5,30 15,20 30,20
           Z"
        fill="url(#gci-body)"
      />

      {/* 上面ハイライト */}
      <path
        d="M 30,20
           L 170,20
           C 185,20 195,30 195,55
           L 5,55
           C 5,30 15,20 30,20
           Z"
        fill="url(#gci-hi)"
      />

      {/* アナログスティック（左下、薄紫） */}
      <circle cx="58" cy="78" r="7"   fill="#AFA8FF" />
      <circle cx="58" cy="78" r="4.2" fill="#C9C3FF" />

      {/* 十字キー（左、約25%地点、黒に近いグレー、十字＝＋） */}
      <g transform="translate(48, 50)">
        <rect x="-9" y="-3" width="18" height="6" rx="1.5" fill="#2A2A2A" />
        <rect x="-3" y="-9" width="6" height="18" rx="1.5" fill="#2A2A2A" />
      </g>

      {/* 中央ボタン×2（中央よりやや下、横並び、小） */}
      <circle cx="92"  cy="60" r="3" fill="#2A2A2A" />
      <circle cx="108" cy="60" r="3" fill="#2A2A2A" />

      {/* ABXY 4色ボタン（右側 ~75%、ダイヤ配置） */}
      {/* 上：黄 */}
      <circle cx="155" cy="40" r="5.2" fill="#FFD93D" />
      {/* 右：赤 */}
      <circle cx="172" cy="60" r="5.2" fill="#FF4D4D" />
      {/* 下：青 */}
      <circle cx="155" cy="80" r="5.2" fill="#4DA6FF" />
      {/* 左：緑 */}
      <circle cx="138" cy="60" r="5.2" fill="#4DFF88" />
    </svg>
  )
}
