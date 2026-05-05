'use client'
// v3
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import FeedbackModal from '@/components/features/FeedbackModal'
import OnboardingRulesModal from '@/components/rules/OnboardingRulesModal'
import { createClient } from '@/lib/supabase/client'
import { getAgreementStatus } from '@/lib/rules'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [showFeedback, setShowFeedback] = useState(false)
  const [avatarUrl, setAvatarUrl]       = useState<string | null>(null)
  const [userId, setUserId]             = useState<string | null>(null)
  const [needsRulesAgreement, setNeedsRulesAgreement] = useState(false)
  const pathname = usePathname()

  // オンボーディング中は下部ナビ・アバター・フィードバックボタンを全て隠す（CTAボタンと干渉するため）
  const isOnboarding = pathname === '/onboarding' || pathname.startsWith('/onboarding/')

  // ページ自体にヘッダーがある場合は重複を避けるため非表示にするパス
  const hideAvatar = isOnboarding || pathname.startsWith('/villages/') || pathname.startsWith('/chat/') || pathname === '/mypage'

  useEffect(() => {
    async function init() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setUserId(user.id)

        const { data } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single()
        if (data?.avatar_url) setAvatarUrl(data.avatar_url)

        // 安心ガイド同意チェック（version 変わってたら再同意）
        const status = await getAgreementStatus(user.id)
        setNeedsRulesAgreement(status.needsAgreement)
      } catch {
        // silent
      }
    }
    init()
  }, [])

  return (
    <div className="min-h-screen" style={{ background: '#080812' }}>
      {/* マイページ — 左上固定アバター */}
      {!hideAvatar && (
        <Link
          href="/mypage"
          className="fixed top-3 left-4 z-50 w-9 h-9 rounded-full overflow-hidden active:scale-90 transition-all"
          style={{
            top: 'max(12px, env(safe-area-inset-top, 12px))',
            border: '2px solid rgba(234,242,255,0.4)',
            boxShadow: '0 0 12px rgba(234,242,255,0.2), 0 0 24px rgba(184,199,217,0.1)',
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="マイページ" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: 'rgba(234,242,255,0.07)' }}>
              <User size={18} style={{ color: '#EAF2FF' }} />
            </div>
          )}
        </Link>
      )}

      {/*
        画面切り替え時に前ページの DOM・useState・skeleton が一瞬残る残像問題への対策。
        pathname を key にして child wrapper を route ごとに mount/unmount し、
        前ページの client state（`loading=true` の自前 skeleton 等）を確実にクリアする。
        layout 自身の state（avatarUrl 等）は保持される。
      */}
      <div
        key={pathname}
        style={{ paddingBottom: isOnboarding ? '0' : 'max(calc(4rem + env(safe-area-inset-bottom, 8px)), 5.5rem)' }}
      >
        {children}
      </div>
      {!isOnboarding && <BottomNav />}

      {/* AI ガイド — コンパクト版。コンテンツ越しでも邪魔にならないサイズと不透明度 */}
      {!isOnboarding && (
        <button
          onClick={() => setShowFeedback(true)}
          className="fixed left-3 z-30 flex items-center gap-1 pl-2 pr-2.5 py-1.5 rounded-full active:scale-95 transition-all"
          style={{
            // BottomNav (h-16=64px) + safe-area + 16px gap
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
            background: 'rgba(20,16,40,0.72)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(157,92,255,0.22)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
          }}
          title="AIガイド：困ったときの相談・使い方"
          aria-label="AIガイドを開く"
        >
          <span className="text-[13px] leading-none">💡</span>
          <span className="text-[10px] font-bold tracking-wide" style={{ color: 'rgba(234,242,255,0.9)' }}>
            AIガイド
          </span>
        </button>
      )}

      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}

      {/* 安心ガイド同意ゲート（未同意 / version 不一致時のみ） */}
      {needsRulesAgreement && userId && (
        <OnboardingRulesModal
          userId={userId}
          onAgreed={() => setNeedsRulesAgreement(false)}
        />
      )}
    </div>
  )
}
