// /guild 用：紫ネオン発光コントローラー（リアル系・PS5 DualSense 風）

interface Props {
  /** 描画サイズ（px）。デフォルト 144。viewBox 比率 220:150 を維持。 */
  size?: number
  className?: string
}

export default function GuildHeroGamepad({ size = 144, className }: Props) {
  const width = size
  const height = size * (150 / 220)
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 220 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      style={{
        display: 'block',
        margin: '0 auto',
        filter:
          'drop-shadow(0 0 14px rgba(196,181,253,0.55)) ' +
          'drop-shadow(0 0 32px rgba(124,58,237,0.45)) ' +
          'drop-shadow(0 12px 26px rgba(0,0,0,0.4))',
        flexShrink: 0,
      }}
    >
      <defs>
        {/* 本体：左半分（明側） */}
        <linearGradient id="ghg-bodyL" x1="0.2" y1="0" x2="0.6" y2="1">
          <stop offset="0%"   stopColor="#e0d4ff" />
          <stop offset="40%"  stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#3b1380" />
        </linearGradient>
        {/* 本体：右半分（影側） */}
        <linearGradient id="ghg-bodyR" x1="0.4" y1="0" x2="0.8" y2="1">
          <stop offset="0%"   stopColor="#a78bfa" />
          <stop offset="45%"  stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#240b5c" />
        </linearGradient>
        {/* グリップ底面：暗めの深い紫 */}
        <linearGradient id="ghg-gripShade" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%"   stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.55" />
        </linearGradient>
        {/* 上面ハイライト */}
        <linearGradient id="ghg-topHi" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%"  stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        {/* エッジライン（光るアウトライン） */}
        <linearGradient id="ghg-edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#f8f4ff" />
          <stop offset="55%"  stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
        {/* スティック：黒い凹み */}
        <radialGradient id="ghg-stickWell" cx="0.5" cy="0.5" r="0.55">
          <stop offset="0%"  stopColor="#1a0a3a" />
          <stop offset="80%" stopColor="#0a0418" />
          <stop offset="100%" stopColor="#000000" />
        </radialGradient>
        {/* スティック：トップ（凸） */}
        <radialGradient id="ghg-stickTop" cx="0.4" cy="0.4" r="0.6">
          <stop offset="0%"   stopColor="#5a3aa8" />
          <stop offset="55%"  stopColor="#3b1d7a" />
          <stop offset="100%" stopColor="#1a0a3a" />
        </radialGradient>
        {/* タッチパッド */}
        <linearGradient id="ghg-pad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#3a1f7a" />
          <stop offset="100%" stopColor="#1a0d3a" />
        </linearGradient>
        {/* トリガー（上から伸びる L2/R2） */}
        <linearGradient id="ghg-trig" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%"   stopColor="#5b2bb8" />
          <stop offset="100%" stopColor="#2a1066" />
        </linearGradient>
        {/* 右半分クリップ */}
        <clipPath id="ghg-rclip">
          <rect x="110" y="0" width="110" height="150" />
        </clipPath>
      </defs>

      {/* === トリガー (L2/R2) — 本体の上から少しのぞく === */}
      <path
        d="M 38,18 Q 42,6 58,8 L 78,12 Q 80,16 72,20 L 50,22 Q 38,22 38,18 Z"
        fill="url(#ghg-trig)"
      />
      <path
        d="M 182,18 Q 178,6 162,8 L 142,12 Q 140,16 148,20 L 170,22 Q 182,22 182,18 Z"
        fill="url(#ghg-trig)"
      />

      {/* === 本体シルエット（PS5風・深いグリップ） === */}
      {/*
        上は緩やかなアーチ、左右は外に膨らみつつ下に伸びるグリップ。
        中央下は浅い谷。
      */}
      {(() => {
        const body = `
          M 60,22
          L 160,22
          C 178,22 192,30 200,46
          C 212,72 214,108 196,128
          C 184,140 168,142 156,134
          C 146,128 138,118 132,108
          L 88,108
          C 82,118 74,128 64,134
          C 52,142 36,140 24,128
          C 6,108 8,72 20,46
          C 28,30 42,22 60,22
          Z
        `
        return (
          <>
            {/* 左半分（全体） */}
            <path d={body} fill="url(#ghg-bodyL)" />
            {/* 右半分（クリップで上書き） */}
            <path d={body} fill="url(#ghg-bodyR)" clipPath="url(#ghg-rclip)" />
            {/* グリップ下方の暗化（立体感） */}
            <path d={body} fill="url(#ghg-gripShade)" />
            {/* 上面ハイライト */}
            <path
              d="M 60,22 L 160,22 C 178,22 192,30 200,46 L 20,46 C 28,30 42,22 60,22 Z"
              fill="url(#ghg-topHi)"
            />
            {/* エッジ */}
            <path
              d={body}
              fill="none"
              stroke="url(#ghg-edge)"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </>
        )
      })()}

      {/* === L1/R1 バンパー（本体上端の細いライン） === */}
      <rect x="42"  y="20" width="32" height="3" rx="1.5" fill="#c4b5fd" opacity="0.85" />
      <rect x="146" y="20" width="32" height="3" rx="1.5" fill="#c4b5fd" opacity="0.85" />

      {/* === D-pad（左上） === */}
      <g transform="translate(56, 56)">
        {/* 凹み土台 */}
        <circle r="14" fill="#1a0a3a" opacity="0.55" />
        {/* 十字 */}
        <rect x="-11" y="-3.5" width="22" height="7" rx="1.5" fill="#f5f3ff" />
        <rect x="-3.5" y="-11" width="7" height="22" rx="1.5" fill="#f5f3ff" />
        {/* 中央くぼみ */}
        <circle r="2" fill="#3b1d7a" />
        {/* 上ハイライト */}
        <rect x="-10" y="-3" width="20" height="2" rx="1" fill="#ffffff" opacity="0.45" />
      </g>

      {/* === 4 face buttons（右上、PS5 風シンボル） === */}
      <g transform="translate(164, 56)">
        <circle r="14" fill="#1a0a3a" opacity="0.55" />
        {/* △ 上：緑 */}
        <circle cx="0" cy="-9" r="4.8" fill="#1a0a3a" />
        <polygon points="0,-12 -2.6,-7 2.6,-7" fill="#5dffa3" />
        {/* ○ 右：赤 */}
        <circle cx="9" cy="0" r="4.8" fill="#1a0a3a" />
        <circle cx="9" cy="0" r="2.2" fill="none" stroke="#ff5d6a" strokeWidth="1.4" />
        {/* × 下：青 */}
        <circle cx="0" cy="9" r="4.8" fill="#1a0a3a" />
        <line x1="-2.2" y1="6.8" x2="2.2" y2="11.2" stroke="#7ec3ff" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="2.2"  y1="6.8" x2="-2.2" y2="11.2" stroke="#7ec3ff" strokeWidth="1.4" strokeLinecap="round" />
        {/* □ 左：ピンク */}
        <circle cx="-9" cy="0" r="4.8" fill="#1a0a3a" />
        <rect x="-11.2" y="-2.2" width="4.4" height="4.4" fill="none" stroke="#ff9ad4" strokeWidth="1.4" />
      </g>

      {/* === 中央タッチパッド === */}
      <rect
        x="86" y="42" width="48" height="20" rx="3"
        fill="url(#ghg-pad)"
        stroke="#7c3aed"
        strokeOpacity="0.6"
        strokeWidth="0.8"
      />
      {/* タッチパッド上のかすかな反射 */}
      <rect x="88" y="44" width="44" height="4" rx="2" fill="#ffffff" opacity="0.08" />

      {/* === Share / Options（タッチパッド両脇の小さいボタン） === */}
      <rect x="78" y="46" width="5" height="2" rx="1" fill="#e0d4ff" opacity="0.9" />
      <rect x="137" y="46" width="5" height="2" rx="1" fill="#e0d4ff" opacity="0.9" />

      {/* === 中央 PS ボタン（タッチパッド下） === */}
      <circle cx="110" cy="74" r="3.2" fill="#0a0418" stroke="#c4b5fd" strokeWidth="0.7" />
      <circle cx="110" cy="74" r="1.2" fill="#c4b5fd" opacity="0.6" />

      {/* === アナログスティック（左右） === */}
      {/* 左スティック */}
      <g transform="translate(82, 92)">
        <ellipse cx="0" cy="2" rx="13" ry="11.5" fill="url(#ghg-stickWell)" />
        <circle cx="0" cy="0" r="9.5" fill="url(#ghg-stickTop)" stroke="#1a0a3a" strokeWidth="0.6" />
        <circle cx="0" cy="0" r="6.2" fill="#0a0418" />
        <circle cx="-2" cy="-2" r="2.4" fill="#c4b5fd" opacity="0.45" />
      </g>
      {/* 右スティック */}
      <g transform="translate(138, 92)">
        <ellipse cx="0" cy="2" rx="13" ry="11.5" fill="url(#ghg-stickWell)" />
        <circle cx="0" cy="0" r="9.5" fill="url(#ghg-stickTop)" stroke="#1a0a3a" strokeWidth="0.6" />
        <circle cx="0" cy="0" r="6.2" fill="#0a0418" />
        <circle cx="-2" cy="-2" r="2.4" fill="#c4b5fd" opacity="0.45" />
      </g>

      {/* === 中央分割線（控えめ） === */}
      <line x1="110" y1="64" x2="110" y2="108" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="0.8" />

      {/* === ライトバー（タッチパッド下端、淡い青紫の線） === */}
      <rect x="92" y="60" width="36" height="1.4" rx="0.7" fill="#a78bfa" opacity="0.7" />
    </svg>
  )
}
