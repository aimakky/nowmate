import { ImageResponse } from 'next/og'

// Next.js App Router 規約: <link rel="apple-touch-icon"> として
// 180x180 で自動配信。シンプルな紫の Y のみ。

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
