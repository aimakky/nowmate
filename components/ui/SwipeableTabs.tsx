'use client'
//
// SwipeableTabs — X (Twitter) 風の指追従横スライドタブ
//
// 2026-05-10 マッキーさん指示「タブ画面 A と B を横並びに配置し、指で左右に
// スワイプすると画面コンテンツ自体が横に追従して動く X 風 UX を実現」対応。
//
// 設計:
//   - 親コンテナ: overflow-x: clip (sticky を壊さない) + overflow-y: visible
//     ※ overflow-x: hidden だと scroll container 化して内部 sticky が page scroll
//        に追従しなくなる事故があるため clip を採用 (Safari 16+ / Chrome 90+ /
//        FF 81+)。Tailwind の overflow-x-clip 相当。
//   - 内側 flex: width = N * 100% (= 親幅 × タブ数)、各 pane = 100/N% (= 親幅)
//   - translateX で active を中央に表示。drag 中は指追従 (px → % 変換)。
//   - touchstart/touchmove/touchend で指追従ドラッグを実装。touchmove は
//     React 17+ で passive listener なので preventDefault しない。
//
// スワイプ判定 (誤操作防止):
//   - 開始位置 (x, y, t) を保存
//   - touchmove で 8px 以上動いた時点で direction を 'h' or 'v' に lock
//   - |dx| > |dy| * 1.2 で 'h' (横スワイプ確定) → drag offset を反映
//   - 'v' なら何もしない (縦スクロール native 処理にお任せ)
//   - 端のタブで端方向に dx が出たら 0.3 倍の rubber-band 抵抗
//   - touchend: |dx| >= max(50px, 親幅 × 18%) または velocity > 0.45px/ms で
//     隣タブへコミット。それ以下は元の位置にスナップバック。
//   - 端のタブで端方向にスワイプしてもコミットしない (循環しない)
//
// 内部に overflow-x: auto なジャンルタブ等がある場合 (guild 'instant' タブの
// ジャンルタブなど)、touchstart 時にそれを検出して ignore = true にし、
// horizontal swipe を発火させない (native 横スクロールにお任せ)。
//
// Multi-touch (pinch zoom 等) は touch 数 != 1 で abort。
//
// 注意:
//   - 全 pane が常時 mount される。各 pane は独立 fetch / state を持つ前提。
//     timeline は TimelineFeedPane に分離、guild は元々分離済み。
//   - overscroll-behavior-x: contain で iOS 端末の edge swipe による戻る
//     ナビゲーションを抑制 (左端からのスワイプで back されないように)。
//

import {
  Children,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
} from 'react'

interface Props<T extends string> {
  /** 表示順のタブキー配列 (左 → 右) */
  tabs: readonly T[]
  /** 現在 active なタブキー */
  active: T
  /** タブ切替 callback (タップ / スワイプ共通) */
  onChange: (next: T) => void
  /** 各 tab に対応する pane を tabs と同じ順序で渡す */
  children: ReactNode
  /** snap 時の transition 時間 (ms)。デフォルト 320。 */
  durationMs?: number
  /**
   * 外側コンテナの min-height。
   * 2026-05-10: ゲーム村ページで「カードが少ないと空白部分でスワイプが反応しない」
   * 事象を解消するため追加。viewport から fixed 要素 (上部タブバー等) を引いた
   * 値を渡すと、コンテンツが短くても画面下部の空白まで touch 検知領域になる。
   * 例: `calc(100dvh - 44px)` (TOP_TAB_HEIGHT 44px を引く)
   * 未指定時は従来通りコンテンツの自然高 (timeline は影響なし)。
   */
  minHeight?: string | number
}

export function SwipeableTabs<T extends string>({
  tabs,
  active,
  onChange,
  children,
  durationMs = 320,
  minHeight,
}: Props<T>) {
  const count = tabs.length
  const idx = Math.max(0, tabs.indexOf(active))

  const containerRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<{
    x: number
    y: number
    t: number
    /** touchmove で 8px 動いた時点で 'h' (横) または 'v' (縦) に lock */
    direction: 'h' | 'v' | null
    /** touchstart が overflow-x スクローラ内 → swipe 無効化 */
    ignore: boolean
  } | null>(null)

  // 指追従ドラッグ中の px オフセット (right > 0, left < 0)
  const [drag, setDrag] = useState(0)
  // ドラッグ中フラグ。true なら CSS transition off (指に即追従)。
  const [isDragging, setIsDragging] = useState(false)

  const panes = Children.toArray(children)

  // touchstart が overflow-x: auto/scroll な祖先内 (e.g. guild の
  // ジャンルタブ) で発生したかを判定。true なら native 横スクロールに任せる。
  function isInsideHorizontalScroller(target: Element | null): boolean {
    let el: Element | null = target
    const root = containerRef.current
    while (el && el !== root && el !== document.body) {
      const style = window.getComputedStyle(el)
      if (
        (style.overflowX === 'auto' || style.overflowX === 'scroll') &&
        el.scrollWidth > el.clientWidth
      ) {
        return true
      }
      el = el.parentElement
    }
    return false
  }

  function reset() {
    startRef.current = null
    setDrag(0)
    setIsDragging(false)
  }

  function onTouchStart(e: ReactTouchEvent<HTMLDivElement>) {
    // multi-touch (pinch zoom 等) は無視
    if (e.touches.length !== 1) {
      reset()
      return
    }
    const t = e.touches[0]
    const ignore = isInsideHorizontalScroller(e.target as Element)
    startRef.current = {
      x: t.clientX,
      y: t.clientY,
      t: Date.now(),
      direction: null,
      ignore,
    }
  }

  function onTouchMove(e: ReactTouchEvent<HTMLDivElement>) {
    const start = startRef.current
    if (!start || start.ignore) return
    if (e.touches.length !== 1) {
      reset()
      return
    }
    const t = e.touches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y

    if (start.direction === null) {
      // 8px 以上動くまで方向判定を保留 (タップとの誤判定を避ける)
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      if (Math.abs(dx) > Math.abs(dy) * 1.2) {
        start.direction = 'h'
        setIsDragging(true)
      } else {
        start.direction = 'v'
        return
      }
    }

    if (start.direction !== 'h') return

    // 端のタブで端方向にスワイプしたら 0.3 倍の rubber-band 抵抗
    let constrainedDx = dx
    if ((idx === 0 && dx > 0) || (idx === count - 1 && dx < 0)) {
      constrainedDx = dx * 0.3
    }
    setDrag(constrainedDx)
  }

  function onTouchEnd(e: ReactTouchEvent<HTMLDivElement>) {
    const start = startRef.current
    if (!start || start.ignore || start.direction !== 'h') {
      reset()
      return
    }

    const t = e.changedTouches[0]
    if (!t) {
      reset()
      return
    }

    const dx = t.clientX - start.x
    const dt = Date.now() - start.t
    const width = containerRef.current?.offsetWidth ?? 320
    // 50px または 親幅の 18% のどちらか大きい方を距離しきい値に
    const distanceThreshold = Math.max(50, width * 0.18)
    // 速いフリックは距離が短くてもコミット (X / iOS と同じ感覚)
    const velocity = dt > 0 ? Math.abs(dx) / dt : 0  // px/ms
    const isFastFlick = velocity > 0.45

    let nextIdx = idx
    if (dx <= -distanceThreshold || (isFastFlick && dx < -10)) {
      if (idx < count - 1) nextIdx = idx + 1
    } else if (dx >= distanceThreshold || (isFastFlick && dx > 10)) {
      if (idx > 0) nextIdx = idx - 1
    }

    // ドラッグ解除 + transition 復活 → 自動で snap or commit 位置に animate
    setDrag(0)
    setIsDragging(false)
    startRef.current = null
    if (nextIdx !== idx) onChange(tabs[nextIdx])
  }

  // ── 表示位置の計算 ────────────────────────────────────────
  // 内側 flex container の width = N * 100% (= 親幅 × N)。
  // translateX を flex container の自身の幅に対する % で指定すると、
  // -100/N% で 1 pane 分シフト。
  const baseOffsetPercent = -(idx * 100) / count
  const containerWidth = containerRef.current?.offsetWidth ?? 0
  const dragPercent =
    containerWidth > 0 ? (drag / (containerWidth * count)) * 100 : 0
  const offsetPercent = baseOffsetPercent + dragPercent

  return (
    <div
      ref={containerRef}
      style={{
        // sticky 子要素の page scroll 追従を維持しつつ横はみ出しを抑制
        overflowX: 'clip',
        overflowY: 'visible',
        width: '100%',
        // iOS edge swipe (左端からの戻るナビ) を抑制
        overscrollBehaviorX: 'contain',
        // 2026-05-10: コンテンツが短い時に空白部分まで touch 検知領域にする
        // (ゲーム村ページの空白スワイプが反応しなかった事象の対策)
        ...(minHeight !== undefined ? { minHeight } : {}),
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <div
        className="flex"
        style={{
          width: `${count * 100}%`,
          transform: `translateX(${offsetPercent}%)`,
          // ドラッグ中は transition off で指に即追従
          // ドラッグ解除後は cubic-bezier (X / iOS 風スプリング) で snap
          transition: isDragging
            ? 'none'
            : `transform ${durationMs}ms cubic-bezier(0.32, 0.72, 0, 1)`,
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
