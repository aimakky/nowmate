'use client'

import { Heart, MessageCircle, Share2 } from 'lucide-react'

// 2026-05-08 マッキーさん指示: 投稿カード下部のアクション行を全画面で完全統一する
// ための共通コンポーネント。timeline / mypage / profile (他人マイページ) のすべての
// 投稿カードでこの 1 ファイルを使うことで、今後アクション行のデザイン変更は
// 必ずここ 1 箇所だけ修正すれば全画面に伝播する。
//
// 配置: Heart (左) / MessageCircle / Share2 (右 ml-auto)
// 区切り: borderTop = 緑半透明
// サイズ: Heart=15 / MessageCircle=15 / Share2=14 (timeline PostCard 由来)
//
// 呼び出し側が決めるべき動作:
// - liked          : ハートが「自分が押した」状態か
// - reactionCount  : ハート横に出す総数 (0 のとき非表示)
// - replyCount     : コメント横に出す数 (省略可、0 のとき非表示)
// - canInteract    : 操作不可なら disabled 表示。Share だけは常に押せる
// - onHeart        : Heart タップ動作 (DB upsert / 村遷移など呼出側裁量)
// - onComment      : Comment タップ動作 (詳細遷移など)
// - onShare        : Share タップ動作 (X 共有起動など)

interface Props {
  liked: boolean
  reactionCount: number
  replyCount?: number
  canInteract?: boolean
  onHeart: () => void
  onComment: () => void
  onShare: () => void
}

export default function PostActions({
  liked,
  reactionCount,
  replyCount,
  canInteract = true,
  onHeart,
  onComment,
  onShare,
}: Props) {
  return (
    <div
      className="flex items-center gap-4 mt-3 pt-2.5"
      style={{ borderTop: '1px solid rgba(57,255,136,0.1)' }}
    >
      <button
        onClick={() => canInteract && onHeart()}
        disabled={!canInteract}
        className="flex items-center gap-1.5 active:scale-90 transition-all disabled:opacity-50"
        style={{ color: liked ? '#FF4D90' : 'rgba(240,238,255,0.35)' }}
        aria-label="ハート"
      >
        <Heart
          size={15}
          fill={liked ? '#FF4D90' : 'none'}
          strokeWidth={liked ? 0 : 1.8}
        />
        {reactionCount > 0 && (
          <span className="text-xs font-semibold">{reactionCount}</span>
        )}
      </button>

      <button
        onClick={() => canInteract && onComment()}
        disabled={!canInteract}
        className="flex items-center gap-1.5 active:scale-90 transition-all disabled:opacity-50"
        style={{ color: 'rgba(240,238,255,0.35)' }}
        aria-label="コメント"
      >
        <MessageCircle size={15} strokeWidth={1.8} />
        {(replyCount ?? 0) > 0 && (
          <span className="text-xs font-semibold">{replyCount}</span>
        )}
      </button>

      <button
        onClick={onShare}
        className="flex items-center gap-1.5 active:scale-90 transition-all ml-auto"
        style={{ color: 'rgba(240,238,255,0.35)' }}
        aria-label="共有"
      >
        <Share2 size={14} strokeWidth={1.8} />
      </button>
    </div>
  )
}
