import { ImageResponse } from 'next/og'

// Next.js App Router の規約: app/apple-icon.tsx は
// <link rel="apple-touch-icon"> として自動配信される。180x180 は iOS が
// ホーム画面追加時に使うサイズ。マイクのグリル線 (3 本) も含めて
// ディテールある描画に。

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
            <rect x="-4.5" y="-19" width="9" height="1.1" rx="0.55" fill="#0a0a18" opacity="0.55" />
            <rect x="-4.5" y="-16.5" width="9" height="1.1" rx="0.55" fill="#0a0a18" opacity="0.55" />
            <rect x="-4.5" y="-14" width="9" height="1.1" rx="0.55" fill="#0a0a18" opacity="0.55" />
          </g>
          <g transform="translate(32 32) rotate(25)">
            <rect x="-2.5" y="-8" width="5" height="14" rx="1.2" fill="url(#p)" />
            <rect x="-8" y="-22" width="16" height="16" rx="8" fill="url(#p)" />
            <rect x="-4.5" y="-19" width="9" height="1.1" rx="0.55" fill="#0a0a18" opacity="0.55" />
            <rect x="-4.5" y="-16.5" width="9" height="1.1" rx="0.55" fill="#0a0a18" opacity="0.55" />
            <rect x="-4.5" y="-14" width="9" height="1.1" rx="0.55" fill="#0a0a18" opacity="0.55" />
          </g>
        </svg>
      </div>
    ),
    { ...size }
  )
}
