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
// - reactionCount  : ハート横に出す総数 (0 でも常に表示する仕様)
// - replyCount     : コメント横に出す数 (0 でも常に表示する仕様)
// - canInteract    : 操作不可なら disabled 表示。Share だけは常に押せる
// - onHeart        : Heart タップ動作 (DB upsert / 村遷移など呼出側裁量)
// - onCountClick   : ハート横の数字タップ動作 (= いいねしたユーザー一覧を開く等、optional)
// - onComment      : Comment タップ動作 (詳細遷移など)
// - onShare        : Share タップ動作 (X 共有起動など)
//
// 2026-05-10 マッキーさん指示「いいね数を 0 でも必ず表示」: 全投稿カードで
// 数字 (0 / 1 / 2 …) を常に表示する仕様に統一。条件分岐 (> 0) は撤去。
//
// 2026-05-10 マッキーさん指示「いいねを押した人が見れる仕組み」:
// onCountClick が渡された場合は count 部分を独立 button にして separate な
// タップで「いいねしたユーザー一覧」を開けるようにする。
// onCountClick が未指定 (= 既存のシンプルな表示) なら count は heart button
// 内の表示テキストとして従来通り描画 (1 つのタップ領域)。

interface Props {
  liked: boolean
  reactionCount: number
  replyCount?: number
  canInteract?: boolean
  onHeart: () => void
  onCountClick?: () => void
  onComment: () => void
  onShare: () => void
}

export default function PostActions({
  liked,
  reactionCount,
  replyCount,
  canInteract = true,
  onHeart,
  onCountClick,
  onComment,
  onShare,
}: Props) {
  return (
    <div
      className="flex items-center gap-4 mt-3 pt-2.5"
      style={{ borderTop: '1px solid rgba(57,255,136,0.1)' }}
    >
      {/* Heart / Comment / Share の onClick で必ず e.preventDefault() と
          e.stopPropagation() を呼ぶ。CLAUDE.md 「投稿カード本体タップだけ
          仕様遷移を許可、ボタン操作は親へ伝播させない」原則。
          将来 PostCardShell や header が <Link> wrap される変更が入っても、
          ハート / コメント / 共有 タップで親 Link が誤発火しないよう防御的に
          書いておく。 */}
      {/* 2026-05-10 マッキーさん指示: ハート押下時に親要素 (Link / form submit /
          card onClick) が誤発火しないよう type="button" を明示。HTML 既定値の
          type="submit" だと、上位に form があった場合に submit 発火する。
          onPointerDown でも stopPropagation を入れて、scroll handler や touch
          gesture が捕捉する経路も塞ぐ。 */}
      {/* 2026-05-10: heart icon と count を別 button に分ける (onCountClick が
          渡された場合のみ)。これで「ハート押下 = like 切替」「数字押下 =
          いいねしたユーザー一覧」の 2 つのアクションを 1 つの行で両立できる。 */}
      <div
        className="flex items-center gap-1.5"
        style={{ color: liked ? '#FF4D90' : 'rgba(240,238,255,0.35)' }}
      >
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (canInteract) onHeart()
          }}
          disabled={!canInteract}
          className="flex items-center active:scale-90 transition-all disabled:opacity-50"
          style={{ color: 'inherit' }}
          aria-label="ハート"
        >
          <Heart
            size={15}
            fill={liked ? '#FF4D90' : 'none'}
            strokeWidth={liked ? 0 : 1.8}
          />
        </button>
        {onCountClick ? (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onCountClick()
            }}
            className="active:scale-90 transition-all"
            style={{ color: 'inherit' }}
            aria-label="いいねしたユーザーを表示"
          >
            <span className="text-xs font-semibold tabular-nums">{Math.max(0, reactionCount)}</span>
          </button>
        ) : (
          <span className="text-xs font-semibold tabular-nums">{Math.max(0, reactionCount)}</span>
        )}
      </div>

      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (canInteract) onComment()
        }}
        disabled={!canInteract}
        className="flex items-center gap-1.5 active:scale-90 transition-all disabled:opacity-50"
        style={{ color: 'rgba(240,238,255,0.35)' }}
        aria-label="コメント"
      >
        <MessageCircle size={15} strokeWidth={1.8} />
        <span className="text-xs font-semibold tabular-nums">{Math.max(0, Number(replyCount ?? 0))}</span>
      </button>

      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onShare()
        }}
        className="flex items-center gap-1.5 active:scale-90 transition-all ml-auto"
        style={{ color: 'rgba(240,238,255,0.35)' }}
        aria-label="共有"
      >
        <Share2 size={14} strokeWidth={1.8} />
      </button>
    </div>
  )
}
