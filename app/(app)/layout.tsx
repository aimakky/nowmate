'use client'
// v3
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, UserPlus } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import FriendAvatarRail from '@/components/layout/FriendAvatarRail'
import FeedbackModal from '@/components/features/FeedbackModal'
import OnboardingRulesModal from '@/components/rules/OnboardingRulesModal'
import { createClient } from '@/lib/supabase/client'
import { getAgreementStatus } from '@/lib/rules'

// FriendAvatarRail を表示する主要ページの whitelist。/chat/[matchId] や
// /voice/[roomId] などの詳細画面・通話中画面では邪魔になるので非表示。
// startsWith ではなく完全一致で判定する。
const FRIEND_RAIL_PATHS = new Set([
  '/timeline',
  '/group',
  '/guild',
  '/chat',
  '/notifications',
  '/mypage',
])

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [showFeedback, setShowFeedback] = useState(false)
  const [avatarUrl, setAvatarUrl]       = useState<string | null>(null)
  const [userId, setUserId]             = useState<string | null>(null)
  const [needsRulesAgreement, setNeedsRulesAgreement] = useState(false)
  const pathname = usePathname()
  // 直前に update_last_seen を呼んだ時刻 (ミリ秒)。60 秒スロットリング用。
  // タブを高頻度で切り替えても DB に書きすぎないための防御。
  const lastSeenSentAtRef = useRef<number>(0)

  // オンボーディング中は下部ナビ・アバター・フィードバックボタンを全て隠す（CTAボタンと干渉するため）
  const isOnboarding = pathname === '/onboarding' || pathname.startsWith('/onboarding/')

  // ページ自体にヘッダーがある場合は重複を避けるため非表示にするパス
  const hideAvatar = isOnboarding || pathname.startsWith('/villages/') || pathname.startsWith('/chat/') || pathname === '/mypage'

  // フレンド横スクロール表示判定 (主要ページの完全一致のみ)
  const showFriendRail = !isOnboarding && FRIEND_RAIL_PATHS.has(pathname)

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

  // ── iOS Safari bfcache (back-forward cache) 対策 ──
  // iOS Safari は Cache-Control: no-store を無視して、戻る/進む/タブ復帰時に
  // ページのスナップショットを再表示することがある (= UI 変更が反映されない
  // 真因のひとつ)。
  // pageshow イベントの event.persisted === true で bfcache 復帰を検知し、
  // 強制リロードして最新 HTML を再取得させる。
  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        // bfcache から復帰した = 古いスナップショット。強制再取得。
        window.location.reload()
      }
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  // ── プレゼンス精度向上: visibilitychange で update_last_seen を呼ぶ ──
  // 旧仕様: マイページを開いた時のみ update_last_seen が呼ばれていた
  // (mypage/page.tsx)。他画面メインで使うユーザーは last_seen_at が
  // 何時間〜何日も古いままで「最終ログイン 5 時間前」表示が実際の
  // 利用と乖離していた。
  //
  // 新仕様: AppLayout が認証ユーザー向けに常駐するため、ここで:
  //   - userId 確定時に 1 回 (アプリ起動 / ページ初回ロード)
  //   - document が visible に戻った時 (タブ復帰 / アプリ再前面化)
  // の 2 タイミングで update_last_seen RPC を呼ぶ。60 秒スロットリングで
  // 連続書き込みを防ぐ (タブを高速切替しても 1 分に 1 回に集約)。
  // ハートビート (定期 setInterval) は採用しない。電池消費・DB 書込量
  // に対してプレゼンス精度の改善が薄いため。
  useEffect(() => {
    if (!userId) return

    async function ping() {
      const now = Date.now()
      if (now - lastSeenSentAtRef.current < 60_000) return
      lastSeenSentAtRef.current = now
      try {
        const supabase = createClient()
        await supabase.rpc('update_last_seen', { p_user_id: userId })
      } catch (e) {
        // last_seen 更新は UX を止めない (fire-and-forget)。失敗は黙認。
      }
    }

    // 初回打刻
    ping()

    // タブ可視化時の打刻
    function onVisibility() {
      if (document.visibilityState === 'visible') ping()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [userId])

  return (
    <div className="min-h-screen" style={{ background: '#080812' }}>
      {/* マイページ — 左上固定アバター。
          視認性改善 (commit 修正版):
          - 旧: border 0.4 opacity の薄い銀 + pale silver グロー → 黒背景で
            埋もれていた
          - 新: 紫ベースのリング (#9D5CFF 0.7 opacity) + ネオン感のある
            ダブル glow + アバター無し時は紫の塗りで「押せるボタン」感を
            明確に。コントラストを強化しつつ YVOICE 紫の世界観を維持。 */}
      {/* 共通ヘッダー: 左=マイページアバター / 右=友達追加。
          段差レイアウト (asymmetric vertical offset):
            - 左マイページ: 安全領域 + 8px 下げて配置 (やや下寄せ)
            - 右友達追加: 安全領域基準で配置 (やや上寄せ)
            - 段差量 = 8px (subtle、押しやすさ・タップ領域は維持)
          → 一直線に見えず、参考画像のような自然な高低差を表現
          → 段差ルールは AppLayout 共通コンポーネントで管理し、ページごとの
            個別ズレを防止 (全ページで 8px 差固定)
          mypage / villages/ / chat/ 詳細では各ページが独自ヘッダーを
          持つため hideAvatar=true で両方非表示にする (衝突回避)。 */}
      {!hideAvatar && (
        <>
          <Link
            href="/mypage"
            className="fixed left-4 z-50 w-10 h-10 rounded-full overflow-hidden active:scale-90 transition-all"
            style={{
              // 左: 段差で「やや下寄せ」。右より +8px 下。
              top: 'calc(max(12px, env(safe-area-inset-top, 12px)) + 8px)',
              border: '2px solid rgba(196,181,253,0.85)',
              boxShadow: '0 0 14px rgba(157,92,255,0.6), 0 0 28px rgba(157,92,255,0.22), 0 2px 6px rgba(0,0,0,0.5)',
            }}
            aria-label="マイページ"
            title="マイページ"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="マイページ" className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(157,92,255,0.45), rgba(124,58,237,0.55))',
                }}
              >
                <User size={20} style={{ color: '#F0EEFF' }} strokeWidth={2.4} />
              </div>
            )}
          </Link>

          {/* 友達追加ボタン (右上)。サイズ・border・shadow は左と統一、
              top 位置のみ 8px 上寄せして段差感を作る。
              遷移先: /users (既存のユーザー検索 / フレンド申請ページ) */}
          <Link
            href="/users"
            className="fixed right-4 z-50 w-10 h-10 rounded-full overflow-hidden flex items-center justify-center active:scale-90 transition-all"
            style={{
              // 右: 段差で「やや上寄せ」。左より -8px 上 (= 安全領域基準)。
              top: 'max(12px, env(safe-area-inset-top, 12px))',
              border: '2px solid rgba(196,181,253,0.85)',
              boxShadow: '0 0 14px rgba(157,92,255,0.6), 0 0 28px rgba(157,92,255,0.22), 0 2px 6px rgba(0,0,0,0.5)',
              background: 'linear-gradient(135deg, rgba(157,92,255,0.45), rgba(124,58,237,0.55))',
            }}
            aria-label="フレンドを追加"
            title="フレンドを追加"
          >
            <UserPlus size={20} style={{ color: '#F0EEFF' }} strokeWidth={2.4} />
          </Link>
        </>
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
        {showFriendRail && <FriendAvatarRail />}
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
