'use client'

import Link from 'next/link'
import { MoreHorizontal } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import VerifiedBadge from '@/components/ui/VerifiedBadge'
import { getTierById } from '@/lib/trust'
import { timeAgo } from '@/lib/utils'

// 投稿カードのヘッダー行 (アバター + 名前 + バッジ + 国旗 + 時刻 + 三点メニュー) を
// 1 ファイルに集約。timeline / mypage / profile/[userId] 配下の TweetCard /
// 村投稿カード (PostCard / MyVillagePostInline / ProfileVillagePostInline) すべて
// がこのヘッダーに揃う。今後ヘッダー内のレイアウト・サイズ・色・配置を変える時
// はこのファイル 1 つだけ直せば全画面に反映される。
//
// CLAUDE.md「全画面 UI 統一修正の鉄則」ルール 4 で明文化されていた
// 「PostCardHeader (今後の課題)」をここで実現。
//
// canonical 仕様 (村投稿カード側の値を採用):
//   - レイアウト:    flex items-start justify-between gap-2
//   - アバター:      w-10 h-10 rounded-full
//   - 名前ラベル:    text-sm font-bold leading-tight #F0EEFF
//   - tier バッジ:   text-[9px] 緑半透明 rounded-full
//   - 国旗:          text-base leading-none
//   - 時刻:          text-xs rgba(240,238,255,0.4)
//   - 三点メニュー:  w-6 h-6 / icon size 14 / rgba(240,238,255,0.25)
//   - ヘッダー下余白: mb-3 (本文との縦間隔 12px、CLAUDE.md「ルール 8」で揃える)
//
// 動作面:
//   - 名前 + アバター は profileHref への Link で 1 つの click target
//   - menu ボタンは onMenuClick が渡されたときだけ描画
//   - menu の挙動 (action sheet / 村遷移など) は呼出側に委譲

interface PostCardHeaderProps {
  /** プロフィールページへの遷移先 (例: '/mypage' '/profile/abc') */
  profileHref: string
  /** 表示名 */
  displayName: string
  /** アバター画像 URL (null/undefined のときはイニシャル文字を表示) */
  avatarUrl?: string | null
  /**
   * アバターの色味バリアント:
   *   default = 共有 Avatar コンポーネント (紫 brand-100)
   *   green   = タイムライン / マイページで PostCard と統一する緑グラデ + 緑リング
   */
  avatarVariant?: 'default' | 'green'
  /** 認証済みバッジを出すか */
  isVerified?: boolean
  /** Trust Tier (例: 'rookie' / 'novice' / ...)。指定があればラベルを表示 */
  trustTier?: string | null
  /** 国旗 emoji (例: '🌍' '🇯🇵')。空文字や undefined のときは非表示 */
  flag?: string
  /** ISO date string (created_at 等)。timeAgo() を通して表示 */
  timestamp: string
  /** 三点メニューボタンのクリックハンドラ。未指定なら menu ボタンを描画しない */
  onMenuClick?: () => void
  /** 三点メニューボタンの aria-label (例: '投稿メニュー' '村を開く') */
  menuLabel?: string
}

export default function PostCardHeader({
  profileHref,
  displayName,
  avatarUrl,
  avatarVariant = 'default',
  isVerified = false,
  trustTier,
  flag,
  timestamp,
  onMenuClick,
  menuLabel = 'メニュー',
}: PostCardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-2 mb-3">
      <Link
        href={profileHref}
        className="flex items-center gap-2.5 min-w-0 flex-1 active:opacity-70 transition-opacity"
      >
        {/* アバター */}
        {avatarVariant === 'green' ? (
          <div
            className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-sm font-bold text-white"
            style={{
              background: 'linear-gradient(135deg,#059669,#047857)',
              boxShadow: '0 0 0 2px rgba(57,255,136,0.3)',
            }}
          >
            {avatarUrl
              ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              : (displayName?.[0] ?? '?')}
          </div>
        ) : (
          <Avatar src={avatarUrl} name={displayName} size="sm" />
        )}

        {/* 名前 + バッジ + 国旗 + 時刻 (1 行 flex-wrap で時刻も inline 配置) */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="text-sm font-bold leading-tight"
              style={{ color: '#F0EEFF' }}
            >
              {displayName}
            </span>
            {isVerified && <VerifiedBadge verified size="sm" />}
            {trustTier && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 leading-none"
                style={{
                  background: 'rgba(57,255,136,0.12)',
                  color: '#39FF88',
                  border: '1px solid rgba(57,255,136,0.3)',
                }}
              >
                {getTierById(trustTier).label}
              </span>
            )}
            {flag && (
              <span className="text-base leading-none">{flag}</span>
            )}
            <span
              className="text-xs"
              style={{ color: 'rgba(240,238,255,0.4)' }}
            >
              {timeAgo(timestamp)}
            </span>
          </div>
        </div>
      </Link>

      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full active:bg-white/5 transition-all"
          style={{ color: 'rgba(240,238,255,0.25)' }}
          aria-label={menuLabel}
        >
          <MoreHorizontal size={14} />
        </button>
      )}
    </div>
  )
}
