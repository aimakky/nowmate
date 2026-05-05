'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Phone, ShieldCheck, Mail, AlertCircle, Check } from 'lucide-react'

interface Props {
  onClose: () => void
  onVerified: () => void
}

// ─── 電話番号エラーの種類（ログ・分岐・UX用） ────────────────────
//  format         : クライアント側バリデーション NG（送信前）
//  not_configured : サーバ側 Twilio env 未設定（503）
//  send_failed    : Twilio 経由の SMS 送信失敗（500/400 系・samee 内側）
//  provider_error : Twilio 自身が返したエラー（番号 BAN など）
//  rate_limited   : 短時間に複数回叩いた（429）
//  unauthenticated: ログイン切れ（401）
//  network        : fetch 自体が失敗（オフライン等）
//  unknown        : 上記以外
type ErrKind =
  | 'format'
  | 'not_configured'
  | 'send_failed'
  | 'provider_error'
  | 'rate_limited'
  | 'unauthenticated'
  | 'network'
  | 'invalid_otp'
  | 'expired_otp'
  | 'unknown'
  | null

interface ErrState {
  kind: ErrKind
  message: string
}

// 内部 kind を運用ログ用の UPPER_SNAKE_CASE コードに変換。
// 監視ツール（Sentry 等）に流す際もこのコードで揃える。
function toErrorCode(kind: ErrKind): string {
  switch (kind) {
    case 'format':          return 'INVALID_PHONE_FORMAT'
    case 'send_failed':     return 'SMS_SEND_FAILED'
    case 'provider_error':  return 'PROVIDER_ERROR'
    case 'rate_limited':    return 'RATE_LIMITED'
    case 'not_configured':  return 'ENV_NOT_CONFIGURED'
    case 'unauthenticated': return 'UNAUTHENTICATED'
    case 'network':         return 'NETWORK_ERROR'
    case 'invalid_otp':     return 'INVALID_OTP'
    case 'expired_otp':     return 'EXPIRED_OTP'
    case 'unknown':
    default:                return 'UNKNOWN_ERROR'
  }
}

const RESEND_COOLDOWN_SEC = 60   // SMS 再送のクールダウン

/** 入力された電話番号を E.164 (+81...) 形式に正規化。 */
export function normalizePhoneJP(raw: string): string {
  // 1) 数字と + 以外を全部捨てる（ハイフン・スペース・カッコ等）
  let n = raw.replace(/[^\d+]/g, '')

  // 2) 国番号判定
  if (n.startsWith('+81')) {
    // 国番号付き入力 — 後ろの先頭 0 を落として +81 と重複させない
    let rest = n.slice(3)
    while (rest.startsWith('0')) rest = rest.slice(1)
    return '+81' + rest
  }
  if (n.startsWith('00810') || n.startsWith('0081')) {
    // 国際プレフィックス 00 を含む変則入力
    const rest = n.replace(/^0+81?/, '').replace(/^0+/, '')
    return '+81' + rest
  }
  if (n.startsWith('+')) {
    // 海外番号などはそのまま返す（バリデーションで弾く）
    return n
  }
  if (n.startsWith('0')) {
    // 国内表記 → 先頭 0 を捨てて +81 を付与
    return '+81' + n.slice(1)
  }
  // 0 も + も無い数字列 — 念のため +81 補完（バリデーションで再判定）
  return '+81' + n
}

/** 日本の携帯番号として妥当か（070/080/090 + 8 桁）。 */
export function isValidJPMobile(e164: string): boolean {
  return /^\+81[789]0\d{8}$/.test(e164)
}

export default function PhoneVerifyModal({ onClose, onVerified }: Props) {
  const [step,    setStep]    = useState<'intro' | 'phone' | 'otp' | 'success'>('intro')
  const [phone,   setPhone]   = useState('')
  const [otp,     setOtp]     = useState('')
  const [loading, setLoading] = useState(false)
  const [err,     setErr]     = useState<ErrState>({ kind: null, message: '' })
  const [hasSent, setHasSent] = useState(false)             // 一度送信を試みたか（ボタン文言切替に使用）
  const [cooldownSec, setCooldownSec] = useState(0)         // SMS 再送までの残秒数
  const [userId,  setUserId]  = useState<string | null>(null)  // 問い合わせ URL に同梱
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ─── ログイン中のユーザーID（問い合わせ導線に最低限の情報を載せる） ──
  useEffect(() => {
    let alive = true
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (alive && user) setUserId(user.id)
    })
    return () => { alive = false }
  }, [])

  // 問い合わせ URL を組み立てる。電話番号は下4桁のみ・原文は送らない。
  function buildContactUrl(): string {
    const code = toErrorCode(err.kind)
    const ts = new Date().toISOString()
    const last4 = phone.replace(/\D/g, '').slice(-4)
    const params = new URLSearchParams({
      reason: 'phone_verify',
      code,
      ts,
    })
    if (userId) params.set('uid', userId)
    if (last4 && last4.length === 4) params.set('phone_last4', last4)
    return `/contact?${params.toString()}`
  }

  // ─── クールダウンタイマー ────────────────────────────────────
  useEffect(() => {
    if (cooldownSec <= 0) {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current)
        cooldownTimerRef.current = null
      }
      return
    }
    if (cooldownTimerRef.current) return
    cooldownTimerRef.current = setInterval(() => {
      setCooldownSec(s => Math.max(0, s - 1))
    }, 1000)
    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current)
        cooldownTimerRef.current = null
      }
    }
  }, [cooldownSec])

  // サーバ短コードを ErrState に変換。message は UX 重視の長文。
  // not_configured（運営側の準備中）と send_failed（送信実行で失敗）は
  // ユーザーが取れるアクションが違うので文言も分ける。
  function classifyError(code: string | undefined, status: number): ErrState {
    if (code === 'sms_not_configured' || status === 503) {
      return {
        kind: 'not_configured',
        message:
          '電話認証は現在準備中です。\nしばらくお待ちいただくか、サポートまでご連絡ください。',
      }
    }
    if (status === 429 || code === 'rate_limited') {
      return {
        kind: 'rate_limited',
        message: '短時間に多くリクエストされました。1〜2分待ってから再度お試しください。',
      }
    }
    if (code === 'unauthenticated' || status === 401) {
      return { kind: 'unauthenticated', message: 'ログインし直してから再度お試しください。' }
    }
    if (code === 'invalid_phone') {
      return {
        kind: 'format',
        message: '電話番号の形式を確認してください。\n例：09012345678',
      }
    }
    if (code === 'sms_send_failed' || code === 'otp_save_failed') {
      return {
        kind: 'send_failed',
        message:
          'SMSの送信に失敗しました。\n電話番号・通信状況を確認して、1〜2分後にもう一度お試しください。',
      }
    }
    if (code === 'invalid_otp') {
      return { kind: 'invalid_otp', message: '認証コードが正しくありません。' }
    }
    if (code === 'expired_otp') {
      return { kind: 'expired_otp', message: '認証コードの有効期限が切れました。再度送信してください。' }
    }
    return {
      kind: 'unknown',
      message: 'エラーが発生しました。しばらくしてから再度お試しください。',
    }
  }

  // ─── SMS送信 ──────────────────────────────────────────────
  async function sendOtp() {
    if (loading || cooldownSec > 0) return

    // 1) クライアント側バリデーション
    const e164 = normalizePhoneJP(phone)
    if (!isValidJPMobile(e164)) {
      const e: ErrState = {
        kind: 'format',
        message: '電話番号の形式を確認してください。\n例：09012345678',
      }
      console.warn('[phone-verify] format error', {
        code: toErrorCode('format'),
        ts:   new Date().toISOString(),
        // 入力原文は送らない。下4桁だけ・桁数だけ。
        digits_len:  phone.replace(/\D/g, '').length,
        last4:       phone.replace(/\D/g, '').slice(-4) || null,
      })
      setErr(e)
      setHasSent(true)
      return
    }

    setLoading(true)
    setErr({ kind: null, message: '' })

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/phone/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ phone: e164 }),
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok || json.error) {
        const e = classifyError(json.error, res.status)
        // 構造化ログ：監視ツール導入後に grep / Sentry で原因切り分けに使う
        console.error('[phone-verify] send failed', {
          code:        toErrorCode(e.kind),
          server_code: json.error ?? null,
          status:      res.status,
          ts:          new Date().toISOString(),
          uid:         userId ?? null,
        })
        setErr(e)
        setHasSent(true)
      } else {
        // 成功 → OTP 入力ステップへ + 60 秒クールダウン
        setStep('otp')
        setHasSent(true)
        setCooldownSec(RESEND_COOLDOWN_SEC)
      }
    } catch (netErr) {
      const e: ErrState = {
        kind: 'network',
        message: '通信に失敗しました。電波・回線をご確認のうえ再度お試しください。',
      }
      console.error('[phone-verify] send network error', {
        code: toErrorCode(e.kind),
        ts:   new Date().toISOString(),
        uid:  userId ?? null,
        err:  netErr instanceof Error ? netErr.message : String(netErr),
      })
      setErr(e)
      setHasSent(true)
    } finally {
      setLoading(false)
    }
  }

  // ─── OTP確認 ──────────────────────────────────────────────
  async function verifyOtp() {
    if (otp.length < 6 || loading) return
    setLoading(true)
    setErr({ kind: null, message: '' })

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/phone/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ phone: normalizePhoneJP(phone), otp }),
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok || json.error) {
        const e = classifyError(json.error, res.status)
        console.error('[phone-verify] verify failed', {
          code:        toErrorCode(e.kind),
          server_code: json.error ?? null,
          status:      res.status,
          ts:          new Date().toISOString(),
          uid:         userId ?? null,
        })
        setErr(e)
      } else {
        setStep('success')
        setTimeout(() => { onVerified(); onClose() }, 1500)
      }
    } catch (netErr) {
      const e: ErrState = {
        kind: 'network',
        message: '通信に失敗しました。電波・回線をご確認のうえ再度お試しください。',
      }
      console.error('[phone-verify] verify network error', {
        code: toErrorCode(e.kind),
        ts:   new Date().toISOString(),
        uid:  userId ?? null,
        err:  netErr instanceof Error ? netErr.message : String(netErr),
      })
      setErr(e)
    } finally {
      setLoading(false)
    }
  }

  // 「あとで認証する」 — モーダルだけ閉じる。投稿/通話など認証必須機能側で
  //   再度ゲートが効く設計なので、ここでは追加処理は不要。
  function dismissForLater() {
    onClose()
  }

  // ─── 共通スタイル（白モーダル + 紫アクセント・案A準拠） ─────────
  const sendButtonLabel = (() => {
    if (loading) return '送信中...'
    if (cooldownSec > 0) return `再送信まで ${cooldownSec}秒`
    if (hasSent && err.kind) return 'もう一度送信する'
    return '認証コードを送信'
  })()

  const sendButtonDisabled = loading || !phone.trim() || cooldownSec > 0

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden"
        style={{
          boxShadow: '0 24px 60px rgba(0,0,0,0.45), 0 0 0 1px rgba(139,92,246,0.18)',
        }}
      >
        {/* sameeらしい紫アクセントの帯（案A） */}
        <div
          className="h-1.5"
          style={{ background: 'linear-gradient(90deg, #8b5cf6 0%, #ec4899 100%)' }}
        />

        {/* ── Intro ── */}
        {step === 'intro' && (
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)' }}
              >
                <ShieldCheck size={22} style={{ color: '#7c3aed' }} />
              </div>
              <button onClick={onClose} className="text-stone-400 hover:text-stone-600 p-1" aria-label="閉じる">
                <X size={20} />
              </button>
            </div>

            <h3 className="font-extrabold text-stone-900 text-lg mb-1">
              電話番号を認証する
            </h3>
            <p className="text-sm text-stone-500 leading-relaxed mb-5">
              認証すると「村人」になれて、投稿・通話に参加できます。<br />
              <span className="font-bold" style={{ color: '#7c3aed' }}>+30pt 獲得</span>
            </p>

            <div className="space-y-2.5 mb-5">
              {[
                { icon: '💬', text: '村に投稿できる' },
                { icon: '🎙️', text: '通話で話せる' },
                { icon: '🌿', text: '村人として認められる' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-2.5">
                  <span className="text-base">{icon}</span>
                  <span className="text-sm text-stone-700 font-medium">{text}</span>
                </div>
              ))}
            </div>

            <div
              className="text-xs rounded-xl px-3 py-2.5 mb-5 leading-relaxed"
              style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.18)', color: '#6d28d9' }}
            >
              🔒 電話番号は公開されません。<br />
              本人確認と荒らし対策のために使用します。
            </div>

            <button
              onClick={() => setStep('phone')}
              className="w-full py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2 active:scale-95 transition-all"
              style={{
                background: 'linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%)',
                boxShadow: '0 4px 18px rgba(139,92,246,0.4)',
              }}
            >
              <Phone size={16} /> 認証を始める
            </button>
            <button
              onClick={dismissForLater}
              className="w-full py-2.5 mt-2 text-xs font-bold text-stone-500 active:opacity-60 transition-opacity"
            >
              あとで認証する
            </button>
            <p className="text-center text-[10px] mt-1" style={{ color: '#a8a29e' }}>
              ※ 通話・投稿には認証が必要です
            </p>
          </div>
        )}

        {/* ── Phone input ── */}
        {step === 'phone' && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <button onClick={() => { setStep('intro'); setErr({ kind: null, message: '' }) }}
                className="text-stone-400 p-1" aria-label="戻る">←</button>
              <h3 className="font-extrabold text-stone-900">電話番号を入力</h3>
            </div>

            <p className="text-sm text-stone-500 mb-3 leading-relaxed">
              SMSで6桁の認証コードを送信します（有効期限10分）
            </p>

            {/* 安心文言 — 入力欄付近に常設 */}
            <div
              className="rounded-xl px-3 py-2.5 mb-3 text-[11px] leading-relaxed"
              style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.18)', color: '#6d28d9' }}
            >
              🔒 電話番号は公開されません。<br />
              本人確認と荒らし対策のために使用します。
            </div>

            <div className="flex gap-2 mb-2">
              <div className="bg-stone-100 border border-stone-200 rounded-xl px-3 py-3 text-sm font-bold text-stone-600 flex-shrink-0">
                🇯🇵 +81
              </div>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                value={phone}
                onChange={e => { setPhone(e.target.value); if (err.kind === 'format') setErr({ kind: null, message: '' }) }}
                placeholder="090-1234-5678"
                className="flex-1 px-4 py-3 rounded-2xl border-2 text-sm focus:outline-none transition-colors"
                style={{
                  background: '#ffffff',
                  color: '#111827',
                  WebkitTextFillColor: '#111827',
                  caretColor: '#7c3aed',
                  borderColor: err.kind === 'format' ? '#ef4444' : '#e7e5e4',
                }}
                onFocus={e => { if (err.kind !== 'format') e.currentTarget.style.borderColor = '#a78bfa' }}
                onBlur={e => { if (err.kind !== 'format') e.currentTarget.style.borderColor = '#e7e5e4' }}
                autoFocus
              />
            </div>
            <p className="text-[10px] text-stone-400 mb-4">
              ※ 日本の携帯番号（070/080/090）。ハイフン・スペースありでも大丈夫です。
            </p>

            {/* エラー表示（赤を強くしすぎない・amber 寄りの柔らかい警告色に） */}
            {err.kind && (
              <div
                className="rounded-xl px-3 py-2.5 mb-4 text-xs leading-relaxed flex items-start gap-2"
                style={{
                  background: 'rgba(251,146,60,0.10)',
                  border: '1px solid rgba(251,146,60,0.30)',
                  color: '#9a3412',
                  whiteSpace: 'pre-line',
                }}
              >
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#ea580c' }} />
                <span>{err.message}</span>
              </div>
            )}

            {/* 送信ボタン（連打防止 + クールダウン表示） */}
            <button
              onClick={sendOtp}
              disabled={sendButtonDisabled}
              className="w-full py-3.5 rounded-2xl font-bold text-white disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95 transition-all"
              style={{
                background: 'linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%)',
                boxShadow: '0 4px 18px rgba(139,92,246,0.4)',
              }}
            >
              {loading
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> 送信中...</>
                : sendButtonLabel}
            </button>

            {/* エラー時の補助動線 — 主要 2 アクションを横並びチップ、問い合わせは
                テキストリンクに格下げ（スマホ幅で 3 個並べると詰まるため） */}
            {err.kind && err.kind !== 'format' && (
              <div className="mt-4">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setErr({ kind: null, message: '' }) }}
                    className="py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-95"
                    style={{ background: 'rgba(139,92,246,0.08)', borderColor: 'rgba(139,92,246,0.30)', color: '#7c3aed' }}
                  >
                    番号を修正
                  </button>
                  <button
                    onClick={dismissForLater}
                    className="py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-95"
                    style={{ background: 'rgba(120,113,108,0.06)', borderColor: 'rgba(120,113,108,0.20)', color: '#57534e' }}
                  >
                    あとで認証
                  </button>
                </div>
                <p className="text-center text-[10px] mt-2" style={{ color: '#a8a29e' }}>
                  ※ 通話・投稿には認証が必要です
                </p>
                <a
                  href={buildContactUrl()}
                  className="flex items-center justify-center gap-1 w-full py-2 mt-1 text-[11px] font-bold transition-opacity active:opacity-60"
                  style={{ color: '#7c3aed' }}
                >
                  <Mail size={11} /> 問い合わせる →
                </a>
              </div>
            )}
          </div>
        )}

        {/* ── OTP input ── */}
        {step === 'otp' && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <button onClick={() => { setStep('phone'); setErr({ kind: null, message: '' }) }}
                className="text-stone-400 p-1" aria-label="戻る">←</button>
              <h3 className="font-extrabold text-stone-900">認証コードを入力</h3>
            </div>

            <p className="text-sm text-stone-500 mb-5 leading-relaxed">
              <span className="font-bold text-stone-800">{normalizePhoneJP(phone)}</span> にSMSを送信しました。<br />
              6桁のコードを入力してください。
            </p>

            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              value={otp}
              onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); if (err.kind) setErr({ kind: null, message: '' }) }}
              placeholder="123456"
              className="w-full px-4 py-4 rounded-2xl border-2 text-2xl font-bold text-center tracking-[0.5em] focus:outline-none mb-2 transition-colors"
              style={{
                background: '#ffffff',
                color: '#111827',
                WebkitTextFillColor: '#111827',
                caretColor: '#7c3aed',
                borderColor: err.kind === 'invalid_otp' || err.kind === 'expired_otp' ? '#ef4444' : '#e7e5e4',
              }}
              autoFocus
            />

            {err.kind && (
              <div
                className="rounded-xl px-3 py-2.5 mb-4 text-xs leading-relaxed flex items-start gap-2"
                style={{
                  background: 'rgba(251,146,60,0.10)',
                  border: '1px solid rgba(251,146,60,0.30)',
                  color: '#9a3412',
                  whiteSpace: 'pre-line',
                }}
              >
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#ea580c' }} />
                <span>{err.message}</span>
              </div>
            )}

            <button
              onClick={verifyOtp}
              disabled={otp.length < 6 || loading}
              className="w-full py-3.5 rounded-2xl font-bold text-white disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95 transition-all mt-3"
              style={{
                background: 'linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%)',
                boxShadow: '0 4px 18px rgba(139,92,246,0.4)',
              }}
            >
              {loading
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> 確認中...</>
                : '確認する'}
            </button>

            {/* 再送（クールダウン中はカウントダウン表示で disable） */}
            <button
              onClick={sendOtp}
              disabled={loading || cooldownSec > 0}
              className="w-full py-2 text-xs font-medium mt-2 disabled:opacity-40 transition-opacity"
              style={{ color: cooldownSec > 0 ? '#a8a29e' : '#7c3aed' }}
            >
              {cooldownSec > 0 ? `再送信まで ${cooldownSec}秒` : 'コードを再送する'}
            </button>
          </div>
        )}

        {/* ── Success ── */}
        {step === 'success' && (
          <div className="p-8 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: 'linear-gradient(135deg,#10b981 0%,#059669 100%)', boxShadow: '0 0 30px rgba(16,185,129,0.4)' }}
            >
              <Check size={28} className="text-white" strokeWidth={3} />
            </div>
            <h3 className="font-extrabold text-stone-900 text-lg mb-2">認証完了！</h3>
            <p className="text-sm text-stone-500 mb-3">
              あなたは「村人」になりました
            </p>
            <div
              className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-full"
              style={{ background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.3)', color: '#7c3aed' }}
            >
              ✨ +30pt 獲得しました
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
