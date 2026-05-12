'use client'

// global-error.tsx は root layout 自体の例外を捕捉する最後の砦。
// このファイルだけは <html><body> を自前で出す必要がある（layout が壊れているため）。
// app/error.tsx で吸収されない致命的エラーがここに落ちてくる。

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Sentry に致命エラーとして送信。DSN 未設定なら no-op。
    Sentry.captureException(error)
    console.error('[global-error] fatal error:', error)
  }, [error])

  return (
    <html lang="ja">
      <body style={{ margin: 0, background: '#080812', color: '#F0EEFF', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 24px',
          }}
        >
          <div style={{ maxWidth: 360, textAlign: 'center' }}>
            <p style={{ fontSize: 48, margin: 0 }}>🌫️</p>
            <h1 style={{ fontSize: 18, fontWeight: 800, margin: '16px 0 8px' }}>
              一時的に問題が発生しました
            </h1>
            <p style={{ fontSize: 12, color: 'rgba(240,238,255,0.55)', lineHeight: 1.7, margin: 0 }}>
              時間をおいてもう一度お試しください。<br />
              問題が続く場合はお問い合わせください。
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: 24,
                width: '100%',
                padding: '12px 16px',
                borderRadius: 16,
                background: 'linear-gradient(135deg,#9D5CFF,#7B3FE4)',
                color: 'white',
                fontWeight: 800,
                fontSize: 14,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              もう一度試す
            </button>
            {error?.digest && (
              <p style={{ fontSize: 10, color: 'rgba(240,238,255,0.3)', marginTop: 16 }}>
                参照コード: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  )
}
