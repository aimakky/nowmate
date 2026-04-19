'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

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
          <h1 className="text-2xl font-extrabold text-gray-900">Join nowmate</h1>
          <p className="text-gray-500 text-sm mt-1">Free forever. For foreigners in Japan.</p>
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
