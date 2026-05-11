'use client'

// ─── 自分の repost を localStorage で永続化 ──────────────────────
//
// 2026-05-10 マッキーさん指示「リポスト機能を実装」恒久対策の一部。
// 2026-05-10 (2 回目): 村投稿リポスト対応のため tweet/village 両対応に拡張。
//
// 背景:
//   tweets テーブル / village_posts テーブルそれぞれに repost_of (FK) を
//   入れて INSERT/DELETE する設計でリポストを管理。
//   「自分が既にリポストしたか」を毎回 DB query で確認するのは効率が悪い
//   ので、self-likes と同じ pattern で localStorage に永続化する。
//
// 解決:
//   localStorage キー: yvoice:selfReposts:<userId>:<table>
//   Map<postId, repostedAtISO> 形式で保存。
//   table = 'tweet' (tweets テーブル) | 'village' (village_posts テーブル)
//   ページ移動 / リロード でも reposted 状態が即時復元される。
//
// 注意:
//   この LS データは DB の真値とずれる可能性がある (別端末で undo 等)。
//   その場合は DB の真値が優先される (各カード側で merge ロジック)。

const KEY_PREFIX = 'yvoice:selfReposts:'

export type SelfRepostTable = 'tweet' | 'village'

function getKey(userId: string, table: SelfRepostTable): string {
  return `${KEY_PREFIX}${userId}:${table}`
}

function readMap(userId: string, table: SelfRepostTable): Map<string, string> {
  if (typeof window === 'undefined') return new Map()
  try {
    const raw = window.localStorage.getItem(getKey(userId, table))
    if (!raw) return new Map()
    const obj = JSON.parse(raw) as Record<string, string>
    return new Map(Object.entries(obj))
  } catch {
    return new Map()
  }
}

function writeMap(userId: string, table: SelfRepostTable, map: Map<string, string>): void {
  if (typeof window === 'undefined') return
  try {
    const obj = Object.fromEntries(map)
    window.localStorage.setItem(getKey(userId, table), JSON.stringify(obj))
  } catch {
    // localStorage 満杯 / 無効 / プライベートブラウズ等で例外。表示優先順は
    // DB → LS なので壊れない。
  }
}

export function addSelfRepost(userId: string, table: SelfRepostTable, postId: string): void {
  if (!userId || !postId) return
  const map = readMap(userId, table)
  if (!map.has(postId)) {
    map.set(postId, new Date().toISOString())
    writeMap(userId, table, map)
  }
}

export function removeSelfRepost(userId: string, table: SelfRepostTable, postId: string): void {
  if (!userId || !postId) return
  const map = readMap(userId, table)
  if (map.has(postId)) {
    map.delete(postId)
    writeMap(userId, table, map)
  }
}

export function isSelfReposted(userId: string, table: SelfRepostTable, postId: string): boolean {
  if (!userId || !postId) return false
  return readMap(userId, table).has(postId)
}

export function getSelfReposts(userId: string, table: SelfRepostTable): Map<string, string> {
  return readMap(userId, table)
}
