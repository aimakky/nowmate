import { ImageResponse } from 'next/og'

// Next.js App Router の規約: app/icon.tsx は <link rel="icon"> として
// 自動配信される。これによりブラウザタブの favicon が新 YVOICE アイコンに
// なる。同じデザインを components/ui/icons/YVoiceIcon.tsx と
// public/yvoice-icon.svg にも持っており、Source of truth は同一。

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
          borderRadius: 6,
        }}
      >
        <svg width="32" height="32" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="p" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#c4b5fd" />
              <stop offset="0.55" stopColor="#9D5CFF" />
              <stop offset="1" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
          <rect x="29.5" y="32" width="5" height="22" rx="1.2" fill="url(#p)" />
          <g transform="translate(32 32) rotate(-25)">
            <rect x="-2.5" y="-8" width="5" height="14" rx="1.2" fill="url(#p)" />
            <rect x="-8" y="-22" width="16" height="16" rx="8" fill="url(#p)" />
          </g>
          <g transform="translate(32 32) rotate(25)">
            <rect x="-2.5" y="-8" width="5" height="14" rx="1.2" fill="url(#p)" />
            <rect x="-8" y="-22" width="16" height="16" rx="8" fill="url(#p)" />
          </g>
        </svg>
      </div>
    ),
    { ...size }
  )
}
