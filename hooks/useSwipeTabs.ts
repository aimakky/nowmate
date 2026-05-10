'use client'
//
// useSwipeTabs (2026-05-10 マッキーさん指示「YVOICE のページ内タブを X のように
// タップ + 横スワイプの両方で切り替えられるように」対応)
//
// 目的: 既存の「タップで切り替え」ロジックを壊さず、追加で「横スワイプでも切り替え」
// できるようにする共通フック。タップ用 state とスワイプ用 state を分けず、
// 同じ activeTab state を更新する。
//
// 使い方:
//   const TABS = ['all', 'following'] as const
//   type Tab = typeof TABS[number]
//   const [tab, setTab] = useState<Tab>('all')
//   const swipe = useSwipeTabs(TABS, tab, setTab)
//   return (
//     <div {...swipe}>
//       {/* タブ + コンテンツ */}
//     </div>
//   )
//
// スワイプ判定 (誤操作防止):
//   - touchstart で開始位置 (x, y, time) を保存
//   - touchend で終了位置との差分を計算
//   - |dx| >= 50px (短い指の動きでは切り替えない)
//   - |dx| > |dy| * 1.5 (縦方向より明確に横方向が大きい場合のみ — 縦スクロール誤作動防止)
//   - dt < 500ms (ゆっくりした指動かしは無視 — 長押しドラッグ誤作動防止)
//   - 端のタブではそれ以上切り替えない
//
// 設計上の注意:
//   - touchmove は使わない (preventDefault しないので縦スクロールは普通に動く)
//   - passive: true 相当 (React の onTouchStart/onTouchEnd は React 17+ で passive)
//   - 端のタブでスワイプしても何もしない (循環しない、X と同じ挙動)
//   - 入力欄やボタンの touchstart も bubble するが、dx=0/dt 短いので発火しない
//
// AppLayout の `key={pathname}` 配下で動作するため毎ページ remount されるが、
// state はページの `useState` 側に持たせるのでフック自体は副作用なし。

import { useRef } from 'react'
import type { TouchEvent as ReactTouchEvent } from 'react'

interface SwipeOptions {
  /** 横スワイプとして判定する最小距離 (px)。デフォルト 50。 */
  thresholdPx?: number
  /** |dx| > |dy| * ratio で「明確に横方向」と判定。デフォルト 1.5。 */
  ratio?: number
  /** これ以上時間がかかったらスワイプとして無視 (ms)。デフォルト 500。 */
  maxMs?: number
}

export function useSwipeTabs<T extends string>(
  tabs: readonly T[],
  current: T,
  onChange: (next: T) => void,
  options: SwipeOptions = {},
) {
  const thresholdPx = options.thresholdPx ?? 50
  const ratio       = options.ratio       ?? 1.5
  const maxMs       = options.maxMs       ?? 500
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null)

  function onTouchStart(e: ReactTouchEvent) {
    const t = e.touches[0]
    if (!t) return
    startRef.current = { x: t.clientX, y: t.clientY, t: Date.now() }
  }

  function onTouchEnd(e: ReactTouchEvent) {
    const start = startRef.current
    startRef.current = null
    if (!start) return
    const t = e.changedTouches[0]
    if (!t) return

    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    const dt = Date.now() - start.t

    if (dt > maxMs) return                                  // ゆっくり動かした → 無視
    if (Math.abs(dx) < thresholdPx) return                  // 距離が短すぎる → 無視
    if (Math.abs(dx) < Math.abs(dy) * ratio) return         // 縦の方が大きい → 縦スクロール扱い

    const idx = tabs.indexOf(current)
    if (idx === -1) return

    if (dx < 0 && idx < tabs.length - 1) {
      // 左スワイプ = 次のタブへ
      onChange(tabs[idx + 1])
    } else if (dx > 0 && idx > 0) {
      // 右スワイプ = 前のタブへ
      onChange(tabs[idx - 1])
    }
    // 端のタブで端方向にスワイプしても何もしない (循環しない)
  }

  return { onTouchStart, onTouchEnd }
}
