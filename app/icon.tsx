import { ImageResponse } from 'next/og'

// Next.js App Router 規約: app/icon.tsx は <link rel="icon"> として
// 自動配信される。シンプルな紫の Y (3 ストローク) のみ。

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
          <g
            stroke="#9D5CFF"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          >
            <line x1="32" y1="30" x2="32" y2="52" />
            <line x1="32" y1="30" x2="16" y2="14" />
            <line x1="32" y1="30" x2="48" y2="14" />
          </g>
        </svg>
      </div>
    ),
    { ...size }
  )
}
