'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) localStorage.setItem('nm_invite_ref', ref)
  }, [searchParams])

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/onboarding` },
    })
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="text-5xl mb-4">📧</div>
        <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Check your email</h2>
        <p className="text-gray-500 text-center text-sm leading-relaxed max-w-xs">
          We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account and set up your profile.
        </p>
        <Link href="/" className="mt-8 text-sm text-brand-500 hover:text-brand-600">← Back to home</Link>
      </div>
    )
  }

  async function handleGoogle() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/onboarding` },
    })
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="px-5 py-4">
        <Link href="/" className="text-sm text-brand-500 hover:text-brand-600">← Back</Link>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 max-w-sm mx-auto w-full">
        <div className="mb-8 text-center">
          <div className="w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md shadow-brand-200">
            <span className="text-white font-extrabold text-2xl">N</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">Join nowjp</h1>
          <p className="text-gray-500 text-sm mt-1">Free forever. For foreigners in Japan.</p>
        </div>

        {/* Google Signup */}
        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 py-3.5 border-2 border-gray-200 rounded-2xl font-semibold text-gray-700 text-sm hover:bg-gray-50 active:scale-[0.98] transition-all mb-4"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400">or sign up with email</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@email.com"
            required
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Min 8 characters"
            required
            autoComplete="new-password"
            hint="At least 8 characters"
          />
          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-4 py-2.5 rounded-2xl">{error}</p>
          )}
          <Button type="submit" fullWidth size="lg" loading={loading} className="mt-2">
            Create Account
          </Button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4 leading-relaxed">
          By signing up, you agree to our{' '}
          <Link href="/terms" className="text-brand-500">Terms of Use</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-brand-500">Privacy Policy</Link>.
          Must be 18 or older.
        </p>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-brand-500 hover:text-brand-600">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
