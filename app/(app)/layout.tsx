'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import FeedbackModal from '@/components/features/FeedbackModal'
import { createClient } from '@/lib/supabase/client'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [showFeedback, setShowFeedback] = useState(false)
  const [avatarUrl, setAvatarUrl]       = useState<string | null>(null)
  const pathname = usePathname()

  // ページ自体にヘッダーがある場合は重複を避けるため非表示にするパス
  const hideAvatar = pathname.startsWith('/villages/') || pathname.startsWith('/chat/')

  useEffect(() => {
    async function fetchAvatar() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single()
        if (data?.avatar_url) setAvatarUrl(data.avatar_url)
      } catch {
        // silent
      }
    }
    fetchAvatar()
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
            border: '2px solid rgba(157,92,255,0.5)',
            boxShadow: '0 0 10px rgba(157,92,255,0.3)',
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="マイページ" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: 'rgba(157,92,255,0.2)' }}>
              <User size={18} style={{ color: '#9D5CFF' }} />
            </div>
          )}
        </Link>
      )}

      <div style={{ paddingBottom: 'max(calc(4rem + env(safe-area-inset-bottom, 8px)), 5.5rem)' }}>
        {children}
      </div>
      <BottomNav />

      {/* Floating feedback button */}
      <button
        onClick={() => setShowFeedback(true)}
        className="fixed bottom-24 left-4 z-30 w-11 h-11 rounded-2xl flex items-center justify-center text-lg active:scale-95 transition-all"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(157,92,255,0.2)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        }}
        title="Share feedback"
      >
        💡
      </button>

      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </div>
  )
}
