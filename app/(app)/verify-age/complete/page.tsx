'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShieldCheck, XCircle, Loader2 } from 'lucide-react'

type Status = 'loading' | 'verified' | 'underage' | 'processing' | 'error'

function CompleteContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const sessionId    = searchParams.get('session_id')
  const [status, setStatus] = useState<Status>('loading')
  const [age,    setAge]    = useState<number | null>(null)
  const [polls,  setPolls]  = useState(0)

  useEffect(() => {
    if (!sessionId) { setStatus('error'); return }
    checkStatus()
  }, [sessionId])

  // processing 中はポーリング（最大5回 × 3秒）
  useEffect(() => {
    if (status !== 'processing' || polls >= 5) return
    const t = setTimeout(() => { setPolls(p => p + 1); checkStatus() }, 3000)
    return () => clearTimeout(t)
  }, [status, polls])

  async function checkStatus() {
    try {
      const res  = await fetch(`/api/stripe/verify-age/status?session_id=${sessionId}`)
      const data = await res.json()
      if (data.status === 'verified') { setAge(data.age); setStatus('verified') }
      else if (data.status === 'underage') { setAge(data.age); setStatus('underage') }
      else if (data.status === 'processing' || data.status === 'requires_input') { setStatus('processing') }
      else { setStatus('error') }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'loading' || status === 'processing') return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-birch px-6">
      <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
      <p className="font-extrabold text-stone-800 text-lg text-center">確認中...</p>
      <p className="text-stone-400 text-sm text-center">書類を確認しています。<br />しばらくお待ちください。</p>
    </div>
  )

  if (status === 'verified') return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-birch px-6">
      <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
        <ShieldCheck size={48} className="text-green-500" />
      </div>
      <div className="text-center">
        <h1 className="font-extrabold text-stone-900 text-2xl mb-2">認証完了！🎉</h1>
        <p className="text-stone-500 text-sm leading-relaxed">
          年齢確認が完了しました。<br />
          sameeのすべての機能をご利用いただけます。
        </p>
      </div>
      <button
        onClick={() => router.push('/guild')}
        className="w-full max-w-sm py-4 rounded-2xl font-extrabold text-white text-base active:scale-[0.98] transition-all"
        style={{ background: 'linear-gradient(135deg,#8b5cf6 0%,#6d28d9 100%)', boxShadow: '0 8px 24px rgba(139,92,246,0.4)' }}
      >🎮 ゲームギルドへ</button>
    </div>
  )

  if (status === 'underage') return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-birch px-6">
      <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center">
        <XCircle size={48} className="text-red-400" />
      </div>
      <div className="text-center">
        <h1 className="font-extrabold text-stone-900 text-2xl mb-2">ご利用いただけません</h1>
        <p className="text-stone-500 text-sm leading-relaxed">
          sameeは20歳以上限定のコミュニティです。<br />
          {age !== null && age > 0 ? `確認された年齢: ${age}歳` : ''}
        </p>
      </div>
      <button
        onClick={() => router.push('/')}
        className="w-full max-w-sm py-4 rounded-2xl font-bold text-stone-600 text-base bg-white border border-stone-200"
      >トップページへ</button>
    </div>
  )

  // error
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-birch px-6">
      <div className="text-5xl">😓</div>
      <div className="text-center">
        <h1 className="font-extrabold text-stone-900 text-xl mb-2">確認できませんでした</h1>
        <p className="text-stone-500 text-sm leading-relaxed">
          書類の確認に失敗しました。<br />
          もう一度お試しいただくか、別の書類を使用してください。
        </p>
      </div>
      <button
        onClick={() => router.push('/verify-age')}
        className="w-full max-w-sm py-4 rounded-2xl font-extrabold text-white text-base active:scale-[0.98] transition-all"
        style={{ background: 'linear-gradient(135deg,#8b5cf6 0%,#6d28d9 100%)' }}
      >もう一度試す</button>
    </div>
  )
}

export default function VerifyAgCompletePage() {
  return <Suspense><CompleteContent /></Suspense>
}
