'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, ShieldCheck, FileText, Loader2 } from 'lucide-react'

export default function VerifyAgePage() {
  const router = useRouter()
  const [loading,   setLoading]   = useState(true)
  const [verified,  setVerified]  = useState(false)
  const [starting,  setStarting]  = useState(false)
  const [errMsg,    setErrMsg]    = useState<string | null>(null)

  useEffect(() => {
    async function check() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('age_verified').eq('id', user.id).single()
      setVerified(!!p?.age_verified)
      setLoading(false)
    }
    check()
  }, [router])

  async function startVerification() {
    setStarting(true)
    setErrMsg(null)
    try {
      const res = await fetch('/api/stripe/verify-age', { method: 'POST' })
      if (!res.ok) {
        const t = await res.text().catch(() => '')
        throw new Error(`API ${res.status}: ${t.slice(0, 120)}`)
      }
      const data = await res.json()
      if (data.already_verified) { setVerified(true); setStarting(false); return }
      if (data.url) { window.location.href = data.url; return }
      throw new Error('レスポンスに URL が含まれていません')
    } catch (e) {
      console.error('[verify-age] startVerification failed', e)
      setErrMsg(e instanceof Error ? e.message : '本人確認の開始に失敗しました。時間を置いて再度お試しください。')
      setStarting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-birch">
      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
    </div>
  )

  return (
    <div className="max-w-md mx-auto min-h-screen bg-birch">

      {/* ヘッダー */}
      <div className="bg-white border-b border-stone-100 px-4 pt-4 pb-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-stone-500">
          <ArrowLeft size={20} />
        </button>
        <p className="font-extrabold text-stone-900">年齢認証</p>
      </div>

      <div className="px-5 pt-6 pb-32 space-y-5">

        {verified ? (
          /* ── 認証済み ── */
          <div className="space-y-4">
            <div className="rounded-3xl p-8 text-center"
              style={{ background: 'linear-gradient(135deg,#052e16 0%,#14532d 100%)' }}>
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <ShieldCheck size={40} className="text-green-400" />
              </div>
              <h2 className="font-extrabold text-white text-xl mb-2">認証済み ✓</h2>
              <p className="text-green-300/70 text-sm">年齢認証が完了しています。<br />sameeのすべての機能をご利用いただけます。</p>
            </div>
            <button
              onClick={() => router.back()}
              className="w-full py-4 rounded-2xl font-bold text-white text-sm"
              style={{ background: 'linear-gradient(135deg,#6366f1 0%,#4f46e5 100%)' }}
            >戻る</button>
          </div>
        ) : (
          /* ── 未認証 ── */
          <div className="space-y-5">

            {/* メインカード */}
            <div className="rounded-3xl p-6 text-center"
              style={{ background: 'linear-gradient(135deg,#0f0f1a 0%,#1a1035 100%)' }}>
              <div className="text-5xl mb-3">🛡️</div>
              <h2 className="font-extrabold text-white text-xl mb-2">本人確認（年齢認証）</h2>
              <p className="text-white/60 text-xs leading-relaxed">
                sameeは<span className="text-purple-300 font-bold">20歳以上限定</span>のコミュニティです。<br />
                運転免許証・マイナンバーカード・パスポートで<br />
                本人確認を行います。
              </p>
            </div>

            {/* 必要書類 */}
            <div className="bg-white border border-stone-100 rounded-2xl p-5 space-y-3">
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">使用できる書類</p>
              {[
                { icon: '🪪', label: '運転免許証' },
                { icon: '📋', label: 'マイナンバーカード（個人番号カード）' },
                { icon: '📘', label: 'パスポート' },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xl">{icon}</span>
                  <span className="text-sm text-stone-700 font-medium">{label}</span>
                </div>
              ))}
            </div>

            {/* 手順 */}
            <div className="bg-white border border-stone-100 rounded-2xl p-5 space-y-4">
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">認証の流れ</p>
              {[
                { step: '1', text: '書類を手元に用意する' },
                { step: '2', text: '書類の写真を撮影する' },
                { step: '3', text: '自動で年齢を確認（数分以内）' },
                { step: '4', text: '認証完了 → 全機能が使えるように' },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-extrabold text-white"
                    style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' }}>
                    {step}
                  </div>
                  <span className="text-sm text-stone-700">{text}</span>
                </div>
              ))}
            </div>

            {/* プライバシー */}
            <div className="bg-purple-50 border border-purple-100 rounded-2xl px-4 py-3">
              <p className="text-xs text-purple-700 leading-relaxed">
                🔒 <span className="font-bold">プライバシー保護</span><br />
                書類の情報はStripe Identity（Stripe, Inc.）が処理します。sameeのサーバーには書類の画像は保存されません。確認されるのは年齢のみです。
              </p>
            </div>

            {/* エラー表示 */}
            {errMsg && (
              <div className="mb-3 rounded-2xl p-3 text-xs"
                style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', color: '#fecaca' }}>
                {errMsg}
              </div>
            )}

            {/* CTA */}
            <button
              onClick={startVerification}
              disabled={starting}
              className="w-full py-4 rounded-2xl font-extrabold text-white text-base disabled:opacity-60 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg,#8b5cf6 0%,#6d28d9 100%)',
                boxShadow: '0 8px 24px rgba(139,92,246,0.4)',
              }}
            >
              {starting
                ? <><Loader2 size={18} className="animate-spin" /> 準備中...</>
                : <><FileText size={18} /> 年齢認証を開始する</>
              }
            </button>

            <p className="text-center text-[11px] text-stone-400">
              認証はStripe Identity（Stripe, Inc.）が行います。<br />
              <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer"
                className="text-indigo-400 underline">Stripeプライバシーポリシー</a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
