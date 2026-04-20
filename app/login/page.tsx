'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }
    router.push('/home')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Back link */}
      <div className="px-5 py-4">
        <Link href="/" className="text-sm text-brand-500 hover:text-brand-600">← Back</Link>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 max-w-sm mx-auto w-full">
        <div className="mb-8 text-center">
          <div className="w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md shadow-brand-200">
            <span className="text-white font-extrabold text-2xl">N</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your nowjp account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
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
            placeholder="Your password"
            required
            autoComplete="current-password"
          />
          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-4 py-2.5 rounded-2xl">{error}</p>
          )}
          <Button type="submit" fullWidth size="lg" loading={loading} className="mt-2">
            Sign In
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{' '}
          <Link href="/signup" className="font-semibold text-brand-500 hover:text-brand-600">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  )
}
