'use client'
//
// useDelayedSkeleton (2026-05-09 マッキーさん指示「skeleton 状態から本表示への切替時に
// 若干ずれる」対応)
//
// 目的: ページ切替時の skeleton flash を「速い読込なら出さない」設計にする。
//
// 動作:
//   - loading=true になっても、最初の delayMs (デフォルト 200ms) は skeleton を出さない
//     (= 何も描画しない、PageHeader だけ見える状態)
//   - delayMs 経過しても loading=true なら skeleton を表示
//   - 多くの読込は <200ms で完了するため、結果的に skeleton はほぼ出ない
//   - もしレイアウトズレが skeleton ↔ loaded の差分から来ているなら、
//     skeleton 自体を出さない事でズレが見えなくなる
//
// 使い方:
//   const showSkeleton = useDelayedSkeleton(loading)
//   {loading && showSkeleton ? <Skeleton/> : loading ? null : <Content/>}
//
// CLAUDE.md「skeleton ≠ loaded 高さ揃え」の補完として、
// PR #67 のキャッシュと併用すると:
//   - 1 回目訪問 + 速い読込: skeleton 出ず、即座に loaded 表示
//   - 1 回目訪問 + 遅い読込: 200ms 後に skeleton → loaded
//   - 2 回目以降訪問: cached を即時表示 (skeleton 不要)

import { useEffect, useState } from 'react'

export function useDelayedSkeleton(active: boolean, delayMs: number = 200): boolean {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (!active) {
      // loading が終わったら即座に skeleton 非表示にする
      setShown(false)
      return
    }
    // loading 開始から delayMs 経過したら skeleton 表示
    const t = setTimeout(() => setShown(true), delayMs)
    return () => clearTimeout(t)
  }, [active, delayMs])
  return shown
}
