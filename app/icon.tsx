import { ImageResponse } from 'next/og'

// Next.js App Router 規約: app/icon.tsx は <link rel="icon"> として
// 自動配信される。ブラウザタブの favicon が新 YVOICE アイコン v2 に。
// グリル線は 32x32 では潰れるため省略 (YVoiceIcon v2 の方針と一致)。

export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
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
          borderRadius: 7,
        }}
      >
        <svg width="32" height="32" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="p" x1="0" y1="0" x2="0.7" y2="1">
              <stop offset="0" stopColor="#d8b4fe" />
              <stop offset="0.5" stopColor="#a855f7" />
              <stop offset="1" stopColor="#6d28d9" />
            </linearGradient>
          </defs>
          <rect x="29.75" y="32" width="4.5" height="22" rx="1.5" fill="url(#p)" />
          <g transform="translate(32 32) rotate(-25)">
            <rect x="-2.25" y="-8" width="4.5" height="14" rx="1.5" fill="url(#p)" />
            <rect x="-7" y="-22" width="14" height="16" rx="7" fill="url(#p)" />
          </g>
          <g transform="translate(32 32) rotate(25)">
            <rect x="-2.25" y="-8" width="4.5" height="14" rx="1.5" fill="url(#p)" />
            <rect x="-7" y="-22" width="14" height="16" rx="7" fill="url(#p)" />
          </g>
        </svg>
      </div>
    ),
    { ...size }
  )
}
