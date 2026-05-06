'use client'

// Vercel Edge cache 対策は middleware.ts で全レスポンスに no-store を
// 注入する方式に統一。'use client' ページでは route segment config
// (export const revalidate = 0 等) が build error を起こすため使わない。

// BUILD_VERSION: デプロイ反映確認用の visible マーカー。
const BUILD_VERSION = 'v3-2026-05-06-cache-fix'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import YVoiceIcon from '@/components/ui/icons/YVoiceIcon'
import YVoiceLogo from '@/components/ui/icons/YVoiceLogo'

export default function LoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: err } = await createClient().auth.signInWithPassword({ email, password })
    if (err) { setError('メールアドレスまたはパスワードが正しくありません'); setLoading(false); return }
    // 旧: '/villages'（旧 nowmate の「村を探す」一覧。samee の世界観と無関係）。
    // → 現在のメイン入口である /timeline へ統一。BottomNav の TL がここで active になる。
    router.push('/timeline')
    router.refresh()
  }

  async function handleGoogle() {
    // 旧: redirectTo=/onboarding 直行 → SSR cookie が書かれないリスク + 既存ユーザーも
    // オンボに飛ばされる。
    // → /auth/callback?next=/timeline 経由で server 側に session を確定させる。
    //   callback 側で「プロフィール有り → /timeline、無し → /onboarding」を分岐する。
    await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback?next=/timeline` },
    })
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: '#080812' }}>

      {/* デプロイ反映確認用の visible build marker。
          /login で {BUILD_VERSION} の文字が見えれば deploy 完了済。
          見えない場合は Vercel Edge cache が古いままという証拠。 */}
      <div
        className="fixed top-2 right-2 z-[200] text-[10px] font-mono px-2 py-0.5 rounded"
        style={{
          background: 'rgba(157,92,255,0.25)',
          color: '#F0EEFF',
          border: '1px solid rgba(157,92,255,0.6)',
        }}
      >
        BUILD: {BUILD_VERSION}
      </div>

      {/* ── 認証中の全画面ローディング（旧 UI が一瞬出るのを防ぐためのカバー） ── */}
      {loading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: 'rgba(8,8,18,0.92)', backdropFilter: 'blur(8px)' }}>
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-14 h-14 flex items-center justify-center"
              style={{ filter: 'drop-shadow(0 0 24px rgba(157,92,255,0.55))' }}
            >
              <YVoiceIcon size={56} rounded={16} />
            </div>
            <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'rgba(240,238,255,0.6)' }}>
              YVOICE
            </p>
            <span className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'rgba(157,92,255,0.6)', borderTopColor: 'transparent' }} />
          </div>
        </div>
      )}

      {/* Background grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(157,92,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(157,92,255,0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
      {/* Purple glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(157,92,255,0.15) 0%, transparent 70%)', filter: 'blur(40px)' }} />

      <div className="relative z-10 px-5 py-4">
        <Link href="/" className="text-sm font-medium" style={{ color: 'rgba(240,238,255,0.4)' }}>← 戻る</Link>
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 max-w-sm mx-auto w-full">
        <div className="mb-8 text-center">
          {/* Logo (stacked: Y マーク + YVOICE 文字) */}
          <div
            className="mx-auto mb-4 flex items-center justify-center"
            style={{ filter: 'drop-shadow(0 0 30px rgba(157,92,255,0.55)) drop-shadow(0 0 60px rgba(157,92,255,0.18))' }}
          >
            <YVoiceLogo variant="stacked" markSize={72} />
          </div>
          <h1 className="text-2xl font-extrabold mb-1" style={{ color: '#F0EEFF' }}>おかえりなさい</h1>
          <p className="text-sm" style={{ color: 'rgba(240,238,255,0.45)' }}>Your Voice Online にログイン</p>
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl font-semibold text-sm active:scale-[0.98] transition-all mb-4"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#F0EEFF',
          }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Googleでログイン
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ background: 'rgba(157,92,255,0.2)' }} />
          <span className="text-xs" style={{ color: 'rgba(240,238,255,0.35)' }}>またはメールで</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(157,92,255,0.2)' }} />
        </div>

        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: 'rgba(240,238,255,0.5)' }}>メールアドレス</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required autoComplete="email"
              className="w-full px-4 py-3 rounded-2xl text-sm transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(157,92,255,0.25)',
                color: '#F0EEFF',
                outline: 'none',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'rgba(157,92,255,0.6)'}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(157,92,255,0.25)'}
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: 'rgba(240,238,255,0.5)' }}>パスワード</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="パスワード" required autoComplete="current-password"
              className="w-full px-4 py-3 rounded-2xl text-sm transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(157,92,255,0.25)',
                color: '#F0EEFF',
                outline: 'none',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'rgba(157,92,255,0.6)'}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(157,92,255,0.25)'}
            />
          </div>
          {error && (
            <p className="text-sm px-4 py-2.5 rounded-2xl" style={{ color: '#FF84B0', background: 'rgba(255,77,144,0.1)', border: '1px solid rgba(255,77,144,0.25)' }}>
              {error}
            </p>
          )}
          <button
            type="submit" disabled={loading}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-sm disabled:opacity-50 active:scale-[0.98] transition-all mt-2 flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #9D5CFF 0%, #7B3FE4 100%)',
              boxShadow: '0 4px 20px rgba(157,92,255,0.4)',
            }}
          >
            {loading
              ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : 'ログイン'}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: 'rgba(240,238,255,0.4)' }}>
          アカウントをお持ちでない方は{' '}
          <Link href="/signup" className="font-bold" style={{ color: '#9D5CFF' }}>無料登録</Link>
        </p>
      </div>
    </div>
  )
}
