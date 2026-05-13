'use client'

// (app) ルートグループ専用のエラーバウンダリ。
// AppLayout（BottomNav・AIガイド）の内側で描画されるため、
// 一画面分のエラーが起きても下部ナビは生きていて、ユーザーは他のタブに
// 逃げられる（ログイン状態が一発で吹き飛ばないようにするため）。

import { useEffect } from 'react'
import Link from 'next/link'

export default function AppGroupError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app-group/error] page error:', error)
  }, [error])

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: '#080812' }}
    >
      <div className="max-w-sm w-full text-center space-y-4">
        <p className="text-5xl">🌫️</p>
        <h1 className="text-base font-extrabold" style={{ color: '#F0EEFF' }}>
          このページの読み込みに失敗しました
        </h1>
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(240,238,255,0.5)' }}>
          時間をおいて再度お試しください。<br />
          下のタブから他の画面には移動できます。
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
          <Link
            href="/timeline"
            className="w-full py-3 rounded-2xl text-sm font-bold active:scale-95 transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(240,238,255,0.7)',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'block',
            }}
          >
            タイムラインに戻る
          </Link>
        </div>

        {error?.digest && (
          <p className="text-[10px]" style={{ color: 'rgba(240,238,255,0.25)' }}>
            参照コード: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
