// /guild 空状態用：紫ネオン発光コントローラー
//
// 参考：ユーザー提示のシールドアイコン（明るいエッジ・縦割り2トーン・強いグロー）
// と同じ "光ったイメージ" を、紫のゲームパッド形状に適用したもの。
//
// 既存の lucide / heroicons / Gamepad / Gamepad2 / 過去の Samee/EmptyState/GameControllerIcon
// は使用していない。ゼロからの新規 SVG。

interface Props {
  /** 描画サイズ（px）。デフォルト 144。viewBox 比率 200:130 を維持。 */
  size?: number
  className?: string
}

export default function GuildHeroGamepad({ size = 144, className }: Props) {
  const width = size
  const height = size * (130 / 200)
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 200 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      style={{
        display: 'block',
        margin: '0 auto',
        // 多層グロー：内側の明るい紫 + 外側のやわらかい紫 + 黒シャドウ
        filter:
          'drop-shadow(0 0 14px rgba(196,181,253,0.55)) ' +
          'drop-shadow(0 0 32px rgba(124,58,237,0.45)) ' +
          'drop-shadow(0 10px 24px rgba(0,0,0,0.35))',
        flexShrink: 0,
      }}
    >
      <defs>
        {/* 左半分：明るい "光が当たる側" */}
        <linearGradient id="ghg-left" x1="0.3" y1="0" x2="0.6" y2="1">
          <stop offset="0%"   stopColor="#d8c8ff" />
          <stop offset="45%"  stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#4c1d95" />
        </linearGradient>
        {/* 右半分：影側、やや深い紫 */}
        <linearGradient id="ghg-right" x1="0.4" y1="0" x2="0.7" y2="1">
          <stop offset="0%"   stopColor="#9f7dff" />
          <stop offset="45%"  stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#2e1065" />
        </linearGradient>
        {/* エッジ：白 → 薄紫 → 紫の光るアウトライン */}
        <linearGradient id="ghg-edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#f5f3ff" />
          <stop offset="55%"  stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        {/* 上面ハイライト（光の反射） */}
        <linearGradient id="ghg-top-hi" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%"  stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        {/* 右半分のクリップ */}
        <clipPath id="ghg-right-clip">
          <rect x="100" y="0" width="100" height="130" />
        </clipPath>
      </defs>

      {/* === ボディシルエット（横長＋左右に丸グリップ＋下中央に浅い谷） === */}
      {/* 左半分の塗り（全体に塗ってから右半分を上書き） */}
      <path
        d="M 35,22
           L 165,22
           C 182,22 192,32 193,55
           C 195,90 180,112 158,112
           C 138,112 130,100 124,88
           L 76,88
           C 70,100 62,112 42,112
           C 20,112 5,90 7,55
           C 8,32 18,22 35,22
           Z"
        fill="url(#ghg-left)"
      />
      {/* 右半分（クリップで右だけ上書き、2トーン） */}
      <path
        d="M 35,22
           L 165,22
           C 182,22 192,32 193,55
           C 195,90 180,112 158,112
           C 138,112 130,100 124,88
           L 76,88
           C 70,100 62,112 42,112
           C 20,112 5,90 7,55
           C 8,32 18,22 35,22
           Z"
        fill="url(#ghg-right)"
        clipPath="url(#ghg-right-clip)"
      />
      {/* 上面の光反射 */}
      <path
        d="M 35,22
           L 165,22
           C 182,22 192,32 193,55
           L 7,55
           C 8,32 18,22 35,22
           Z"
        fill="url(#ghg-top-hi)"
      />
      {/* 明るいエッジアウトライン */}
      <path
        d="M 35,22
           L 165,22
           C 182,22 192,32 193,55
           C 195,90 180,112 158,112
           C 138,112 130,100 124,88
           L 76,88
           C 70,100 62,112 42,112
           C 20,112 5,90 7,55
           C 8,32 18,22 35,22
           Z"
        fill="none"
        stroke="url(#ghg-edge)"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* 中央分割線（控えめな立体感） */}
      <line x1="100" y1="22" x2="100" y2="88" stroke="#ffffff" strokeOpacity="0.16" strokeWidth="1" />

      {/* === 操作部（グローに溶け込むよう控えめ） === */}

      {/* 左：明るい白っぽい十字キー（光って見える） */}
      <g transform="translate(48, 56)">
        <rect x="-9" y="-3" width="18" height="6" rx="1.5" fill="#f5f3ff" opacity="0.95" />
        <rect x="-3" y="-9" width="6" height="18" rx="1.5" fill="#f5f3ff" opacity="0.95" />
      </g>

      {/* 右：ABXY 4色ボタン（小さめ、ハイライト付き） */}
      {/* 上：黄 */}
      <circle cx="152" cy="42" r="4.6" fill="#FFD93D" />
      <circle cx="151" cy="41" r="1.4" fill="#FFF6CC" />
      {/* 右：赤 */}
      <circle cx="170" cy="58" r="4.6" fill="#FF4D4D" />
      <circle cx="169" cy="57" r="1.4" fill="#FFD9D9" />
      {/* 下：青 */}
      <circle cx="152" cy="74" r="4.6" fill="#4DA6FF" />
      <circle cx="151" cy="73" r="1.4" fill="#D5EBFF" />
      {/* 左：緑 */}
      <circle cx="134" cy="58" r="4.6" fill="#4DFF88" />
      <circle cx="133" cy="57" r="1.4" fill="#D5FFE3" />
    </svg>
  )
}
