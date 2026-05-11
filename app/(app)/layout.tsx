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
import { backfillSelfLikes } from '@/lib/self-likes'

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

        // 2026-05-10 マッキーさん指示「いいね数が画面で 0 表示される」恒久対策:
        // どのページでも TweetCard が selfLikedInLs を正しく判定できるよう、
        // AppLayout 起動時に DB の自分の like 一覧を localStorage に backfill。
        // これで TL / mypage / 他人プロフィール / tweet 詳細 のすべてで
        // pink heart + count >= 1 が正しく表示される。
        // .eq('user_id', me) は RLS で 0 件返すケースもあるが取れる分は取る。
        try {
          const { data: myLikes } = await supabase
            .from('tweet_reactions')
            .select('tweet_id, created_at')
            .eq('user_id', user.id)
          if (myLikes) {
            backfillSelfLikes(user.id, 'tweet', (myLikes as any[]).map(r => ({
              postId: r.tweet_id, createdAt: r.created_at ?? null,
            })))
          }
        } catch {
          // silent — backfill 失敗しても TweetCard は LS なしで動く (count=0 になるだけ)
        }

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
        {/* ── 共通上部エリア (sticky 1 wrapper、2 段構成) ──────────────
            1 段目: 操作ヘッダー (左=マイページアバター / 右=友達追加)
            2 段目: 友達アイコン列 (FriendAvatarRail)
            両段を 1 つの sticky 親に入れることで、スクロール時も両方が
            画面上部に追従する。z-index / position の二重競合を排除し、
            旧 fixed 配置 + rail 内 sticky の重なり問題を解消。
            参考画像のように行が明確に分離される。

            適用範囲:
              hideAvatar=false → 1 段目を表示 (TL / 通知 / 設定 等)
              hideAvatar=true  → 1 段目を非表示 (mypage / 村詳細 / DM 詳細)
              showFriendRail=true → 2 段目を表示 (TL / グループ / ゲーム村 /
                チャット一覧 / 通知 / マイページ)
              showFriendRail=false → 2 段目を非表示 (設定 / 使い方 / 安心 等) */}
        {(!hideAvatar || showFriendRail) && (
          <div
            className="sticky top-0 z-40"
            style={{
              background: 'rgba(8,8,18,0.92)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            {/* 1 段目: 操作ヘッダー (高さ固定で全ページ統一) */}
            {!hideAvatar && (
              <div
                className="flex items-center justify-between px-4"
                style={{
                  paddingTop: 'max(12px, env(safe-area-inset-top, 12px))',
                  paddingBottom: '12px',
                  borderBottom: showFriendRail
                    ? '1px solid rgba(255,255,255,0.04)'
                    : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {/* 左: マイページアバター */}
                <Link
                  href="/mypage"
                  className="w-10 h-10 rounded-full overflow-hidden active:scale-90 transition-all flex-shrink-0"
                  style={{
                    border: '2px solid rgba(196,181,253,0.85)',
                    boxShadow:
                      '0 0 14px rgba(157,92,255,0.6), 0 0 28px rgba(157,92,255,0.22), 0 2px 6px rgba(0,0,0,0.5)',
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
                        background:
                          'linear-gradient(135deg, rgba(157,92,255,0.45), rgba(124,58,237,0.55))',
                      }}
                    >
                      <User size={20} style={{ color: '#F0EEFF' }} strokeWidth={2.4} />
                    </div>
                  )}
                </Link>

                {/* 右: フレンドを追加 (遷移先 /users) */}
                <Link
                  href="/users"
                  className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center active:scale-90 transition-all flex-shrink-0"
                  style={{
                    border: '2px solid rgba(196,181,253,0.85)',
                    boxShadow:
                      '0 0 14px rgba(157,92,255,0.6), 0 0 28px rgba(157,92,255,0.22), 0 2px 6px rgba(0,0,0,0.5)',
                    background:
                      'linear-gradient(135deg, rgba(157,92,255,0.45), rgba(124,58,237,0.55))',
                  }}
                  aria-label="フレンドを追加"
                  title="フレンドを追加"
                >
                  <UserPlus size={20} style={{ color: '#F0EEFF' }} strokeWidth={2.4} />
                </Link>
              </div>
            )}

            {/* 2 段目: 友達アイコン列 */}
            {showFriendRail && <FriendAvatarRail />}
          </div>
        )}

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
