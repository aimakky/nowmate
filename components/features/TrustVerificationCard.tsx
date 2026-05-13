'use client'

// ─── 安心認証カード ────────────────────────────────────────────
// マイページに表示する認証ステータス集約。
// データソース（既存スキーマのみ・新カラム追加なし）:
//   - 電話番号認証: user_trust.phone_verified (boolean)
//   - 本人確認 + 年齢確認: profiles.age_verification_status
//     ('unverified' | 'pending' | 'age_verified' | 'rejected')
//     ※ Stripe Identity が本人確認と年齢確認を 1 回で同時に処理する設計のため、
//       UI 上 2 行に分けて表示するが、内部状態は同じカラムを参照する。
//
// 拡張ポイント:
//   - 「本人確認済み限定機能」のゲートは lib/permissions.ts の canX 系関数に
//     既存の age_verified / age_verification_status を読ませることで、
//     このカードと同じ真偽値で判定できる。

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, ChevronRight, Phone, FileText, Loader2 } from 'lucide-react'
import PhoneVerifyModal from '@/components/features/PhoneVerifyModal'
import VerifiedBadge from '@/components/ui/VerifiedBadge'

export type AgeVerificationStatus = 'unverified' | 'pending' | 'age_verified' | 'rejected' | string

interface Props {
  userId: string
  phoneVerified: boolean
  ageVerificationStatus: AgeVerificationStatus
  onChanged?: () => void  // 認証完了後に親側で再取得したいときに使う
}

type StatusVariant = 'verified' | 'pending' | 'rejected' | 'unverified'

function statusBadgeStyle(v: StatusVariant): { color: string; bg: string; border: string } {
  switch (v) {
    case 'verified':  return { color: '#7CFF82', bg: 'rgba(124,255,130,0.12)', border: 'rgba(124,255,130,0.35)' }
    case 'pending':   return { color: '#FCD34D', bg: 'rgba(252,211,77,0.12)',  border: 'rgba(252,211,77,0.35)' }
    case 'rejected':  return { color: '#FF7D7D', bg: 'rgba(255,125,125,0.12)', border: 'rgba(255,125,125,0.35)' }
    case 'unverified':
    default:          return { color: 'rgba(240,238,255,0.45)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(234,242,255,0.12)' }
  }
}

function StatusRow({ label, variant, text }: { label: string; variant: StatusVariant; text: string }) {
  const s = statusBadgeStyle(variant)
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] font-medium" style={{ color: 'rgba(240,238,255,0.75)' }}>{label}</span>
      <span
        className="text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 flex-shrink-0"
        style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
      >
        {variant === 'verified' && <span>✓</span>}
        {variant === 'pending'  && <span>⏳</span>}
        {variant === 'rejected' && <span>✕</span>}
        <span>{text}</span>
      </span>
    </div>
  )
}

export default function TrustVerificationCard({ userId, phoneVerified, ageVerificationStatus, onChanged }: Props) {
  const router = useRouter()
  const [showPhoneModal, setShowPhoneModal] = useState(false)

  // 本人確認 + 年齢確認は同じソース（Stripe Identity）から決まる
  const isAgeVerified = ageVerificationStatus === 'age_verified'
  const isAgePending  = ageVerificationStatus === 'pending'
  const isAgeRejected = ageVerificationStatus === 'rejected'

  // 電話番号認証ラベル（要望: 「未認証 / 認証済み」）
  const phoneVariant: StatusVariant = phoneVerified ? 'verified' : 'unverified'
  const phoneText = phoneVerified ? '認証済み' : '未認証'

  // 本人確認ラベル（要望: 「未確認 / 確認中 / 確認済み / 否認」）
  const identityVariant: StatusVariant =
    isAgeVerified ? 'verified' : isAgePending ? 'pending' : isAgeRejected ? 'rejected' : 'unverified'
  const identityText =
    isAgeVerified ? '確認済み' : isAgePending ? '確認中' : isAgeRejected ? '否認' : '未確認'

  // 年齢確認ラベル（要望: 「未確認 / 20歳以上確認済み / 否認」）
  // ※ 実年齢は絶対に出さない
  const ageVariant: StatusVariant = identityVariant
  const ageText =
    isAgeVerified ? '20歳以上確認済み' : isAgePending ? '確認中' : isAgeRejected ? '否認' : '未確認'

  // 全部完了しているか
  const allVerified = phoneVerified && isAgeVerified

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(234,242,255,0.12)' }}
    >
      {/* ── ヘッダー ── */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <ShieldCheck size={14} style={{ color: allVerified ? '#7CFF82' : '#EAF2FF' }} />
          <p className="text-[10px] font-extrabold uppercase tracking-widest"
            style={{ color: 'rgba(240,238,255,0.5)' }}>安心認証</p>
          {/* 全完了時は緑タグ、本人確認(20歳以上)単体完了時はバッジでも示す */}
          {allVerified ? (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ color: '#7CFF82', background: 'rgba(124,255,130,0.1)', border: '1px solid rgba(124,255,130,0.3)' }}>
              すべて確認済み
            </span>
          ) : isAgeVerified ? (
            <VerifiedBadge verified size="md" />
          ) : null}
        </div>

        {/* ── ステータス 3 行 ── */}
        <div className="space-y-2.5">
          <StatusRow label="電話番号認証" variant={phoneVariant}    text={phoneText} />
          <StatusRow label="本人確認"    variant={identityVariant} text={identityText} />
          <StatusRow label="年齢確認"    variant={ageVariant}      text={ageText} />
        </div>

        <p className="text-[10px] mt-3 leading-relaxed" style={{ color: 'rgba(240,238,255,0.35)' }}>
          🔒 認証情報は本人確認のためだけに使用されます。生年月日・実年齢は他のユーザーには表示されません。
        </p>
      </div>

      {/* ── CTA ── */}
      {!allVerified && (
        <div className="px-4 pb-4 pt-1 space-y-2"
          style={{ borderTop: '1px solid rgba(234,242,255,0.06)' }}>

          {!phoneVerified && (
            <button
              onClick={() => setShowPhoneModal(true)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left active:scale-[0.99] transition-all"
              style={{ background: 'rgba(234,242,255,0.06)', border: '1px solid rgba(234,242,255,0.15)' }}
            >
              <Phone size={15} style={{ color: '#EAF2FF', flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: '#F0EEFF' }}>電話番号を認証する</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(240,238,255,0.4)' }}>
                  SMS で 6 桁コードを受け取って 1 分で完了
                </p>
              </div>
              <ChevronRight size={14} style={{ color: 'rgba(240,238,255,0.3)' }} />
            </button>
          )}

          {!isAgeVerified && !isAgePending && (
            <button
              onClick={() => router.push('/verify-age')}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left active:scale-[0.99] transition-all"
              style={{
                background: 'rgba(139,92,246,0.10)',
                border: '1px solid rgba(139,92,246,0.30)',
              }}
            >
              <FileText size={15} style={{ color: '#c4b5fd', flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: '#c4b5fd' }}>
                  本人確認・年齢確認をする
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(196,181,253,0.6)' }}>
                  運転免許・マイナンバーカード・パスポートで 1 回完了
                </p>
              </div>
              <ChevronRight size={14} style={{ color: 'rgba(196,181,253,0.5)' }} />
            </button>
          )}

          {isAgePending && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ background: 'rgba(252,211,77,0.08)', border: '1px solid rgba(252,211,77,0.25)' }}
            >
              <Loader2 size={13} className="animate-spin" style={{ color: '#FCD34D', flexShrink: 0 }} />
              <p className="text-[11px] font-bold" style={{ color: '#FCD34D' }}>
                本人確認の処理中です。完了までしばらくお待ちください。
              </p>
            </div>
          )}

          {isAgeRejected && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ background: 'rgba(255,125,125,0.08)', border: '1px solid rgba(255,125,125,0.25)' }}
            >
              <p className="text-[11px] leading-relaxed" style={{ color: '#FF7D7D' }}>
                ⚠️ 本人確認が完了しませんでした。<br />
                <button onClick={() => router.push('/verify-age')}
                  className="font-bold underline mt-1"
                  style={{ color: '#FF9D9D' }}>
                  もう一度確認する →
                </button>
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── 電話番号認証モーダル ── */}
      {showPhoneModal && (
        <PhoneVerifyModal
          onClose={() => setShowPhoneModal(false)}
          onVerified={() => {
            setShowPhoneModal(false)
            onChanged?.()
          }}
        />
      )}
    </div>
  )
}
