'use client'

// ─── 自分の repost を localStorage で永続化 ──────────────────────
//
// 2026-05-10 マッキーさん指示「リポスト機能を実装」恒久対策の一部。
//
// 背景:
//   tweets テーブルに repost_of (FK) を入れて INSERT/DELETE する設計で
//   リポストを管理。ただし「自分が既にリポストしたか」を毎回 DB query
//   で確認するのは効率が悪いので、self-likes と同じ pattern で localStorage
//   に永続化する。
//
// 解決:
//   localStorage キー: yvoice:selfReposts:<userId>
//   Map<tweetId, repostedAtISO> 形式で保存。
//   ページ移動 / リロード でも reposted 状態が即時復元される。
//
// 注意:
//   この LS データは DB の真値とずれる可能性がある (別端末で undo 等)。
//   その場合は DB の真値が優先される (TweetCard 側で merge ロジック)。

const KEY_PREFIX = 'yvoice:selfReposts:'

function getKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`
}

function readMap(userId: string): Map<string, string> {
  if (typeof window === 'undefined') return new Map()
  try {
    const raw = window.localStorage.getItem(getKey(userId))
    if (!raw) return new Map()
    const obj = JSON.parse(raw) as Record<string, string>
    return new Map(Object.entries(obj))
  } catch {
    return new Map()
  }
}

function writeMap(userId: string, map: Map<string, string>): void {
  if (typeof window === 'undefined') return
  try {
    const obj = Object.fromEntries(map)
    window.localStorage.setItem(getKey(userId), JSON.stringify(obj))
  } catch {
    // localStorage 満杯 / 無効 / プライベートブラウズ等で例外。表示優先順は
    // DB → LS なので壊れない。
  }
}

export function addSelfRepost(userId: string, tweetId: string): void {
  if (!userId || !tweetId) return
  const map = readMap(userId)
  if (!map.has(tweetId)) {
    map.set(tweetId, new Date().toISOString())
    writeMap(userId, map)
  }
}

export function removeSelfRepost(userId: string, tweetId: string): void {
  if (!userId || !tweetId) return
  const map = readMap(userId)
  if (map.has(tweetId)) {
    map.delete(tweetId)
    writeMap(userId, map)
  }
}

export function isSelfReposted(userId: string, tweetId: string): boolean {
  if (!userId || !tweetId) return false
  return readMap(userId).has(tweetId)
}

export function getSelfReposts(userId: string): Map<string, string> {
  return readMap(userId)
}
