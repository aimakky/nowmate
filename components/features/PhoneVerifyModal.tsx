'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { awardPoints } from '@/lib/trust'
import { X, Phone, ShieldCheck } from 'lucide-react'

interface Props {
  onClose: () => void
  onVerified: () => void
}

export default function PhoneVerifyModal({ onClose, onVerified }: Props) {
  const [step,    setStep]    = useState<'intro' | 'phone' | 'success'>('intro')
  const [phone,   setPhone]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // ─── 電話番号フォーマット ──────────────────────────────────
  function formatPhone(raw: string): string {
    let n = raw.replace(/[^0-9+]/g, '')
    if (n.startsWith('0'))  n = '+81' + n.slice(1)
    else if (!n.startsWith('+')) n = '+81' + n
    return n
  }

  // ─── 電話番号保存 + 認証完了 ────────────────────────────────
  async function submitPhone() {
    if (!phone.trim()) return
    setLoading(true)
    setError('')
    const supabase  = createClient()
    const formatted = formatPhone(phone)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('ログインが必要です')
      setLoading(false)
      return
    }

    // 電話番号を profiles に保存 + 信頼ポイント付与（phone_verified フラグも自動更新）
    await supabase.from('profiles').update({ phone_number: formatted }).eq('id', user.id)
    await awardPoints('phone_verified')

    setStep('success')
    setTimeout(() => { onVerified(); onClose() }, 1500)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* ── Intro ── */}
        {step === 'intro' && (
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center">
                <ShieldCheck size={24} className="text-sky-500" />
              </div>
              <button onClick={onClose} className="text-stone-400 hover:text-stone-600 p-1">
                <X size={20} />
              </button>
            </div>

            <h3 className="font-extrabold text-stone-900 text-lg mb-1">
              電話番号を認証する
            </h3>
            <p className="text-sm text-stone-500 leading-relaxed mb-5">
              電話番号認証で「住民」の立場になり、投稿・通話ができるようになります。<br />
              <span className="font-bold text-sky-600">+30pt 獲得</span>
            </p>

            {/* Benefits */}
            <div className="space-y-2.5 mb-5">
              {[
                { icon: '💬', text: '村に投稿できる' },
                { icon: '🎙️', text: '通話で話せる' },
                { icon: '🌿', text: '村の住民として認められる' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-2.5">
                  <span className="text-base">{icon}</span>
                  <span className="text-sm text-stone-700 font-medium">{text}</span>
                </div>
              ))}
            </div>

            <div className="text-xs text-stone-400 bg-stone-50 rounded-xl px-3 py-2 mb-5 leading-relaxed">
              📋 電話番号は本人確認のみに使用します。他のユーザーには表示されません。
            </div>

            <button
              onClick={() => setStep('phone')}
              className="w-full py-3.5 bg-brand-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-md shadow-brand-200 active:scale-95 transition-all"
            >
              <Phone size={16} /> 認証を始める
            </button>
          </div>
        )}

        {/* ── Phone input ── */}
        {step === 'phone' && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <button onClick={() => setStep('intro')} className="text-stone-400 p-1">
                ←
              </button>
              <h3 className="font-extrabold text-stone-900">電話番号を入力</h3>
            </div>

            <p className="text-sm text-stone-500 mb-4">
              電話番号を登録して「住民」になりましょう
            </p>

            <div className="flex gap-2 mb-2">
              <div className="bg-stone-100 border border-stone-200 rounded-xl px-3 py-3 text-sm font-bold text-stone-600 flex-shrink-0">
                🇯🇵 +81
              </div>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="090-1234-5678"
                className="flex-1 px-4 py-3 rounded-2xl border-2 border-stone-200 text-sm focus:outline-none focus:border-brand-400"
                autoFocus
              />
            </div>
            <p className="text-[10px] text-stone-400 mb-5">
              ※ 日本の携帯番号。海外番号の場合は国番号から入力してください。
            </p>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2 mb-4">{error}</p>
            )}

            <button
              onClick={submitPhone}
              disabled={!phone.trim() || loading}
              className="w-full py-3.5 bg-brand-500 text-white rounded-2xl font-bold disabled:opacity-40 flex items-center justify-center gap-2 shadow-md shadow-brand-200 active:scale-95 transition-all"
            >
              {loading
                ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : '認証する'}
            </button>
          </div>
        )}

        {/* ── Success ── */}
        {step === 'success' && (
          <div className="p-8 text-center">
            <div className="text-5xl mb-4">🏡</div>
            <h3 className="font-extrabold text-stone-900 text-lg mb-2">認証完了！</h3>
            <p className="text-sm text-stone-500 mb-3">
              あなたは「住民」になりました
            </p>
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold px-4 py-2 rounded-full">
              ✨ +30pt 獲得しました
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
