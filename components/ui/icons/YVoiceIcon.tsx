// YVOICE 公式ブランドアイコン v4 — スタイリッシュな紫の Y。
// マッキーさん指示 (2026-05-08): 「Y の文字をもっとスタイリッシュにして実装してください。色はそのまま」
//
// v3 の 3 ストロークの極限ミニマル Y から、ひとつなぎの filled path に刷新。
// - 上部は鋭い V カット (モダンなブランドモノグラム風)
// - 各アーム先端は angled cut で立体感を演出 (鋭角 chevron)
// - アーム先端から junction にかけて緩やかにテーパー (動きと重心)
// - stem は均一幅で安定感、下端は丸角で視覚的な完結感
// 色は v3 と同じフラット #9D5CFF (YVoiceLogo の文字「Y」と完全一致)。
//
// path 構造 (時計回り、viewBox 64x64):
//   M ( 6,  8)                  ← 左アーム外側 上端 (鋭角)
//   L (18,  8)                  ← 左アーム内側 上端
//   L (32, 26)                  ← V vertex (junction の中心)
//   L (46,  8)                  ← 右アーム内側 上端
//   L (58,  8)                  ← 右アーム外側 上端 (鋭角)
//   L (56, 16)                  ← 右アーム外側 下端 (angled cut)
//   L (37, 32)                  ← 右アーム → stem 右上
//   L (37, 54)                  ← stem 右下 (curve 開始点)
//   Q (37, 58) (33, 58)         ← stem 底辺右 丸角
//   L (31, 58)                  ← stem 底辺中央
//   Q (27, 58) (27, 54)         ← stem 底辺左 丸角
//   L (27, 32)                  ← stem 左上
//   L ( 8, 16)                  ← stem → 左アーム外側 下端 (angled cut)
//   Z                            ← (6, 8) に戻り左アーム先端を closing
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

      <path
        d="M 6 8 L 18 8 L 32 26 L 46 8 L 58 8 L 56 16 L 37 32 L 37 54 Q 37 58 33 58 L 31 58 Q 27 58 27 54 L 27 32 L 8 16 Z"
        fill="#9D5CFF"
      />
    </svg>
  )
}
