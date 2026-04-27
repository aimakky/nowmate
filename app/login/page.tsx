'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
    router.push('/villages')
    router.refresh()
  }

  async function handleGoogle() {
    await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/onboarding` },
    })
  }

  return (
    <div className="min-h-screen bg-birch flex flex-col">
      <div className="px-5 py-4">
        <Link href="/" className="text-sm text-stone-400 hover:text-stone-600">← 戻る</Link>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 max-w-sm mx-auto w-full">
        <div className="mb-8 text-center">
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
          >
            <span className="text-white font-extrabold text-2xl">🏕️</span>
          </div>
          <h1 className="text-2xl font-extrabold text-stone-900">おかえりなさい</h1>
          <p className="text-stone-400 text-sm mt-1">VILLIAにログインする</p>
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 py-3.5 border-2 border-stone-200 rounded-2xl font-semibold text-stone-700 text-sm hover:bg-stone-50 active:scale-[0.98] transition-all mb-4 bg-white"
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
          <div className="flex-1 h-px bg-stone-100" />
          <span className="text-xs text-stone-400">またはメールで</span>
          <div className="flex-1 h-px bg-stone-100" />
        </div>

        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-stone-500 mb-1.5">メールアドレス</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required autoComplete="email"
              className="w-full px-4 py-3 rounded-2xl border-2 border-stone-200 text-sm focus:outline-none focus:border-indigo-400 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-500 mb-1.5">パスワード</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="パスワード" required autoComplete="current-password"
              className="w-full px-4 py-3 rounded-2xl border-2 border-stone-200 text-sm focus:outline-none focus:border-indigo-400 bg-white"
            />
          </div>
          {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-2.5 rounded-2xl border border-red-100">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-sm disabled:opacity-50 active:scale-[0.98] transition-all mt-2 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
          >
            {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'ログイン'}
          </button>
        </form>

        <p className="text-center text-sm text-stone-400 mt-6">
          アカウントをお持ちでない方は{' '}
          <Link href="/signup" className="font-bold text-indigo-500 hover:text-indigo-600">無料登録</Link>
        </p>
      </div>
    </div>
  )
}
