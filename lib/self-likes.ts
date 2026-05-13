'use client'

// ─── 自分の self-like を localStorage で永続化 ──────────────────
//
// 2026-05-10 マッキーさん指示「自分の投稿へのいいねが保存・反映されない」恒久対策。
//
// 背景:
//   tweet_reactions の RLS policy が「自分の tweet 上の reactions は SELECT で
//   隠す」設定になっている。INSERT は通る (status 200) が SELECT で見えないので、
//   ハートを押した瞬間は optimistic 状態でピンクになるが、ページ移動 → 戻ると
//   tweet_reactions 配列に自分の heart 行が含まれず再びグレーに戻る。
//
//   いいね欄も同様で、self-like の tweet が一覧に含まれないバグが発生していた。
//
// 解決:
//   自分の self-like を localStorage に永続化し、データ取得側で「DB から取れた
//   reactions」に「localStorage に記録された self-like」を OR で合成する。
//   これにより RLS が SELECT を隠していても画面表示は維持される。
//
// 適用対象:
//   - tweet_reactions の self-like (主問題)
//   - village_reactions も将来同じ問題が出たときのため対応
//
// RLS 側の根本修正 (Supabase Studio で実行する SQL 案) は別タスク。
// 本ファイルはコード側だけで確実に表示を維持するための defensive 実装。

const KEY_PREFIX = 'yvoice:selfLikes:'

export type SelfLikeTable = 'tweet' | 'village'

function getKey(userId: string, table: SelfLikeTable): string {
  return `${KEY_PREFIX}${userId}:${table}`
}

function readMap(userId: string, table: SelfLikeTable): Map<string, string> {
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

function writeMap(userId: string, table: SelfLikeTable, map: Map<string, string>): void {
  if (typeof window === 'undefined') return
  try {
    const obj = Object.fromEntries(map)
    window.localStorage.setItem(getKey(userId, table), JSON.stringify(obj))
  } catch {
    // localStorage が満杯 / 無効 / プライベートブラウズ等で例外。表示は維持しないが
    // DB 側で正しく書き込まれているはずなので RLS が直れば復旧する。
  }
}

/** 自分の self-like を記録 (postId 重複時は created_at を上書きしない) */
export function addSelfLike(userId: string, table: SelfLikeTable, postId: string): void {
  if (!userId || !postId) return
  const map = readMap(userId, table)
  if (!map.has(postId)) {
    map.set(postId, new Date().toISOString())
    writeMap(userId, table, map)
  }
}

/** 自分の self-like を削除 (unlike 操作時) */
export function removeSelfLike(userId: string, table: SelfLikeTable, postId: string): void {
  if (!userId || !postId) return
  const map = readMap(userId, table)
  if (map.has(postId)) {
    map.delete(postId)
    writeMap(userId, table, map)
  }
}

/** 指定 postId が自分の self-like かどうか */
export function isSelfLiked(userId: string, table: SelfLikeTable, postId: string): boolean {
  if (!userId || !postId) return false
  return readMap(userId, table).has(postId)
}

/** 自分の self-like 全件取得 (Map<postId, likedAtISO>)
 *  いいね欄ソート用に likes.created_at desc 相当の情報も持つ */
export function getSelfLikes(userId: string, table: SelfLikeTable): Map<string, string> {
  return readMap(userId, table)
}

/** DB 由来の自己 like 一括 backfill (本人の過去 like を localStorage に同期)。
 *  2026-05-10 マッキーさん指示「いいねついてるのに 0 表示」恒久対策:
 *  PR #97 デプロイ前にいいねを押した投稿は localStorage に記録が無く、
 *  かつ RLS が SELECT を隠すため tweet_reactions enrich 経路でも取れない結果、
 *  ハート pink + count=0 という視覚不一致が発生していた。
 *  マイページ起動時に DB の `.eq('user_id', me)` で取れた tweet_id を
 *  すべて localStorage に push しておくことで、過去 like も新 like も同じ
 *  扱いになる。
 *  - 既存エントリは上書きしない (createdAt 優先順は最初に書き込んだもの)
 *  - DB から消えた tweet_id は LS に残るが害は無い (insert 時 dedup される) */
export function backfillSelfLikes(
  userId: string,
  table: SelfLikeTable,
  entries: { postId: string; createdAt?: string | null }[]
): void {
  if (!userId || entries.length === 0) return
  const map = readMap(userId, table)
  let mutated = false
  for (const e of entries) {
    if (!e.postId) continue
    if (!map.has(e.postId)) {
      map.set(e.postId, e.createdAt ?? new Date().toISOString())
      mutated = true
    }
  }
  if (mutated) writeMap(userId, table, map)
}
