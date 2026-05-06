import { ImageResponse } from 'next/og'

// Next.js App Router 規約: app/apple-icon.tsx は <link rel="apple-touch-icon">
// として 180x180 で自動配信。iOS ホーム画面追加時に使われる。
// 大サイズなので edge highlight (premium depth) も含めた v2 版。

export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a18',
        }}
      >
        <svg width="180" height="180" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#15102a" />
              <stop offset="1" stopColor="#0a0a18" />
            </linearGradient>
            <linearGradient id="p" x1="0" y1="0" x2="0.7" y2="1">
              <stop offset="0" stopColor="#d8b4fe" />
              <stop offset="0.5" stopColor="#a855f7" />
              <stop offset="1" stopColor="#6d28d9" />
            </linearGradient>
            <linearGradient id="hi" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.5" />
              <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.12" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" fill="url(#bg)" />
          <rect x="29.75" y="32" width="4.5" height="22" rx="1.5" fill="url(#p)" />
          <g transform="translate(32 32) rotate(-25)">
            <rect x="-2.25" y="-8" width="4.5" height="14" rx="1.5" fill="url(#p)" />
            <rect x="-7" y="-22" width="14" height="16" rx="7" fill="url(#p)" />
            <rect x="-6.5" y="-21" width="1.5" height="13" rx="0.75" fill="url(#hi)" />
          </g>
          <g transform="translate(32 32) rotate(25)">
            <rect x="-2.25" y="-8" width="4.5" height="14" rx="1.5" fill="url(#p)" />
            <rect x="-7" y="-22" width="14" height="16" rx="7" fill="url(#p)" />
            <rect x="-6.5" y="-21" width="1.5" height="13" rx="0.75" fill="url(#hi)" />
          </g>
        </svg>
      </div>
    ),
    { ...size }
  )
}
