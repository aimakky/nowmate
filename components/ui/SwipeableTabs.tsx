'use client'
//
// SwipeableTabs
//
// 2026-05-10 マッキーさん指示「YVOICE のタイムライン / ゲーム村のタブを X のように
// 画面コンテンツ自体が横にスライドして切り替わるように」対応。
//
// 既存の useSwipeTabs (PR #71) は touchend 時点で setTab する「即時切替」のみだった。
// このコンポーネントは: 全タブを横並びに DOM 配置し、active が変わると CSS transition
// で translateX をアニメーションする。これにより、隣の画面が一瞬見えながら横スライドで
// 切り替わる X 風 UX を実現する。
//
// 設計方針:
//   - 親コンテナは overflow-x: clip (sticky を壊さない) + overflow-y: visible
//     ※ overflow-x: hidden だと scroll container 化して内部 sticky が page scroll に
//        追従しなくなる事故があるため clip を採用 (Safari 16+ / Chrome 90+ / FF 81+)
//   - 内側 flex container: 全 N タブを横並びに配置 (width: ${N * 100}%)
//   - 各 pane: width: ${100/N}% (= 親の 100%) + flex-shrink: 0
//   - translateX: -activeIndex * (100/N)% で active pane を中央に
//   - transition: transform 320ms cubic-bezier (X / iOS 風スプリング)
//   - touchstart/touchend は useSwipeTabs を再利用 (touchmove での live drag は
//     入れない: 内部の overflow-x-auto なジャンルタブ等と干渉するリスクを避ける)
//
// 既存 button onClick (タップ切替) はそのまま動く。タップ → setTab → activeIndex 更新
// → translateX が transition でアニメする → スライド表示。
//
// 注意:
//   - 全 pane が常時 mount される。各 pane は独立して fetch / state を持つ前提で
//     設計すること。timeline は TimelineFeedPane に分離、guild は元々分離済み。
//   - 縦スクロール位置は page スクロールなので tab 切替で勝手にリセットされない。
//   - skeleton ↔ loaded の高さ揃えは各 pane 側 (既存ルール) で対応。
//

import { Children, type ReactNode } from 'react'
import { useSwipeTabs } from '@/hooks/useSwipeTabs'

interface Props<T extends string> {
  /** 表示順のタブキー配列 (左 → 右) */
  tabs: readonly T[]
  /** 現在 active なタブキー */
  active: T
  /** タブ切替 callback (タップ / スワイプ共通) */
  onChange: (next: T) => void
  /** 各 tab に対応する pane を tabs と同じ順序で渡す */
  children: ReactNode
  /** transition 時間 (ms)。デフォルト 320。 */
  durationMs?: number
}

export function SwipeableTabs<T extends string>({
  tabs,
  active,
  onChange,
  children,
  durationMs = 320,
}: Props<T>) {
  const count = tabs.length
  const idx = Math.max(0, tabs.indexOf(active))

  // useSwipeTabs を再利用: touchend で dx/dy を見て setTab する
  const swipe = useSwipeTabs(tabs, active, onChange)

  // children を配列化して順序を保証
  const panes = Children.toArray(children)

  return (
    <div
      style={{
        // Safari 16+ / Chrome 90+ / FF 81+ で sticky を壊さない overflow
        overflowX: 'clip',
        overflowY: 'visible',
        width: '100%',
      }}
      onTouchStart={swipe.onTouchStart}
      onTouchEnd={swipe.onTouchEnd}
    >
      <div
        className="flex"
        style={{
          width: `${count * 100}%`,
          transform: `translateX(-${(idx * 100) / count}%)`,
          transition: `transform ${durationMs}ms cubic-bezier(0.32, 0.72, 0, 1)`,
          willChange: 'transform',
        }}
      >
        {panes.map((pane, i) => (
          <div
            key={tabs[i] ?? i}
            style={{
              width: `${100 / count}%`,
              flexShrink: 0,
            }}
            aria-hidden={i !== idx}
          >
            {pane}
          </div>
        ))}
      </div>
    </div>
  )
}
