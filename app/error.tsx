'use client'

// アプリ全域のエラーバウンダリ（root layout 配下のレンダリングエラー）。
// 何も置かないと Next.js のデフォルト白画面が出る。
// `error.tsx` は同じセグメントのレイアウトの内側で描画されるため、ヘッダー等を
// 残したまま「何か問題が起きた → 再試行」の体験になる。

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
    // Sentry に送信。DSN 未設定 (dev / E2E スモーク) なら no-op で何も起きない。
    Sentry.captureException(error)
    console.error('[app/error] uncaught render error:', error)
  }, [error])

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: '#080812' }}
    >
      <div className="max-w-sm w-full text-center space-y-4">
        <p className="text-5xl">🌫️</p>
        <h1 className="text-lg font-extrabold" style={{ color: '#F0EEFF' }}>
          一時的に問題が発生しました
        </h1>
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(240,238,255,0.5)' }}>
          時間をおいてもう一度お試しください。<br />
          問題が続く場合はお問い合わせください。
        </p>

        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={reset}
            className="w-full py-3 rounded-2xl text-sm font-bold text-white active:scale-95 transition-all"
            style={{
              background: 'linear-gradient(135deg,#9D5CFF,#7B3FE4)',
              boxShadow: '0 4px 18px rgba(157,92,255,0.4)',
            }}
          >
            もう一度試す
          </button>
          <a
            href="/"
            className="w-full py-3 rounded-2xl text-sm font-bold active:scale-95 transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(240,238,255,0.7)',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'block',
            }}
          >
            トップに戻る
          </a>
        </div>

        {/* digest があるとサーバーログと突合できる */}
        {error?.digest && (
          <p className="text-[10px]" style={{ color: 'rgba(240,238,255,0.25)' }}>
            参照コード: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
