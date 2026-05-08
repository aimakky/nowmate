'use client'

// ReAuthModal — 再認証 (reauth) のためのモーダル UI
//
// 使い方は hooks/useReauth.ts のヘッダコメントを参照。
//
// 設計方針:
//   - 既存 PremiumModal / ReportModal と同じ「下からせり上がる」style
//     ではなく、画面中央の「ダイアログ」スタイル (重要操作の前段なので
//     ユーザーの注意を引きたい)。
//   - パスワード入力 1 つのシンプルな form。
//   - OAuth 専用ユーザー向けに「Google で再認証」リンクも併設 (将来 OAuth
//     再認証フロー実装時に有効化、PR1 では UI のみ表示)。
//   - YVOICE のダークテーマ (#080812 ベース、紫グロー) に揃える。
//
// このモーダルは UI コンポーネントであり、reauth ロジック (パスワード検証
// API 呼出 / TTL 管理) は持たない。それは hooks/useReauth.ts と lib/reauth.ts
// の責務。

import { useEffect, useState } from 'react'
import { Lock, X, Loader2 } from 'lucide-react'
import { startOAuthReauth } from '@/lib/reauth'

interface ReAuthModalProps {
  /** モーダルの表示状態 */
  isOpen: boolean
  /** verify 処理中フラグ (button を disable + spinner 表示) */
  loading?: boolean
  /** verify 失敗時のエラーメッセージ */
  error?: string | null
  /** 何のために再認証するかの説明文 (例: '退会するためには本人確認が必要です') */
  description?: string | null
  /** 閉じる (キャンセル) */
  onClose: () => void
  /** 入力されたパスワードで verify する */
  onSubmit: (password: string) => void | Promise<void>
}

export default function ReAuthModal({
  isOpen,
  loading = false,
  error = null,
  description,
  onClose,
  onSubmit,
}: ReAuthModalProps) {
  const [password, setPassword] = useState('')

  // モーダルを閉じるたびに入力をクリア (前回の入力を残さない)
  useEffect(() => {
    if (!isOpen) setPassword('')
  }, [isOpen])

  // body scroll lock (モーダル open 中は背景スクロール禁止)
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isOpen])

  if (!isOpen) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    onSubmit(password)
  }

  async function handleGoogleReauth() {
    if (loading) return
    await startOAuthReauth('google')
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={loading ? undefined : onClose}
        aria-hidden
      />

      {/* ダイアログ本体 */}
      <div
        className="relative w-full max-w-sm rounded-3xl overflow-hidden"
        style={{
          background: '#0f0820',
          border: '1px solid rgba(157,92,255,0.25)',
          boxShadow: '0 8px 40px rgba(157,92,255,0.18), 0 0 0 1px rgba(157,92,255,0.05)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full active:opacity-60 transition-opacity disabled:opacity-30"
          style={{ color: 'rgba(240,238,255,0.55)', background: 'rgba(255,255,255,0.05)' }}
          aria-label="閉じる"
        >
          <X size={16} />
        </button>

        <div className="px-6 pt-7 pb-6">
          {/* アイコン */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: 'linear-gradient(135deg, #9D5CFF 0%, #7B3FE4 100%)',
              boxShadow: '0 4px 20px rgba(157,92,255,0.4)',
            }}
          >
            <Lock size={22} className="text-white" />
          </div>

          <h2
            className="font-extrabold text-center text-lg mb-1.5"
            style={{ color: '#F0EEFF' }}
          >
            本人確認が必要です
          </h2>
          <p
            className="text-center text-xs leading-relaxed mb-5"
            style={{ color: 'rgba(240,238,255,0.55)' }}
          >
            {description ?? '重要な操作を行うため、もう一度パスワードを入力してください。'}
          </p>

          {/* パスワード入力 */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label
                className="block text-[11px] font-bold mb-1.5"
                style={{ color: 'rgba(240,238,255,0.5)' }}
              >
                パスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
                disabled={loading}
                placeholder="パスワード"
                className="w-full px-4 py-3 rounded-2xl text-sm transition-all disabled:opacity-50"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(157,92,255,0.25)',
                  color: '#F0EEFF',
                  outline: 'none',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(157,92,255,0.6)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(157,92,255,0.25)')}
              />
            </div>

            {error && (
              <p
                className="text-xs px-3 py-2 rounded-xl"
                style={{
                  color: '#FF84B0',
                  background: 'rgba(255,77,144,0.1)',
                  border: '1px solid rgba(255,77,144,0.25)',
                }}
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3 rounded-2xl font-bold text-white text-sm disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #9D5CFF 0%, #7B3FE4 100%)',
                boxShadow: '0 4px 20px rgba(157,92,255,0.4)',
              }}
            >
              {loading
                ? <Loader2 size={18} className="animate-spin" />
                : '本人確認する'}
            </button>
          </form>

          {/* OAuth ユーザー向け代替 */}
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(157,92,255,0.15)' }}>
            <p className="text-[11px] text-center mb-2" style={{ color: 'rgba(240,238,255,0.4)' }}>
              Googleでログインしている方はこちら
            </p>
            <button
              type="button"
              onClick={handleGoogleReauth}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-2xl font-semibold text-xs active:opacity-70 transition-opacity disabled:opacity-50"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#F0EEFF',
              }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Googleで再認証する
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
