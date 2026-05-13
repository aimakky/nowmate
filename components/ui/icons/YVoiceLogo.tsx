// YVOICE 公式ロゴ (Y マーク + 「YVOICE」文字)。
// 大きい場所 (LP メインヒーロー / login・signup hero など) に使う。
// マッキーさん指定の正式ロゴ画像 (Y + 2 本マイク + 下に YVOICE) を
// CSS で再現したもの。
//
// 小さい場所 (favicon / app ヘッダーの 24-32px サイズ / 携帯モック等) では
// 文字が潰れるので、こちらではなく <YVoiceIcon /> を使うこと。
//
// variant:
//   'stacked'    → 縦並び (アイコン上、文字下)。login/signup hero 向け
//   'horizontal' → 横並び (アイコン左、文字右)。LP top header の代替に
//
// markSize: 上に乗る Y マーク (YVoiceIcon) の表示サイズ
// 文字サイズは markSize から自動算出 (markSize * 0.32 程度で視覚的に揃う)

import YVoiceIcon from './YVoiceIcon'

type Props = {
  variant?: 'stacked' | 'horizontal'
  markSize?: number
  className?: string
}

export default function YVoiceLogo({
  variant = 'stacked',
  markSize = 64,
  className,
}: Props) {
  // テキストサイズはマークサイズに比例 (画像のバランスから 0.32 を採用)
  const textSize = Math.round(markSize * 0.32)
  const gap = variant === 'stacked' ? Math.round(markSize * 0.18) : Math.round(markSize * 0.22)

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: variant === 'stacked' ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap,
      }}
    >
      <YVoiceIcon size={markSize} rounded={Math.round(markSize * 0.28)} />
      <span
        style={{
          fontWeight: 900,
          fontSize: textSize,
          letterSpacing: '0.06em',
          color: '#F0EEFF',
          // 「Y」だけ紫、「VOICE」は白の 2 色構成 (添付画像の再現)。
          // CSS では span を 2 つに分けて色付け。
          lineHeight: 1,
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        }}
      >
        <span style={{ color: '#9D5CFF' }}>Y</span>VOICE
      </span>
    </div>
  )
}
