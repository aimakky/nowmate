// 2026-05-10 リリース前整理: /explore は旧 nowmate の "find people nearby"
// 機能 (位置情報マッチング) で、YVOICE (大人向けゲーム通話コミュニティ) の
// MVP 設計と無関係なため、ユーザー導線から削除。直接アクセスは /timeline へ
// redirect する。
//
// 旧 233 行のコンテンツは git 履歴に残置 (復活する場合は revert)。
// middleware の保護パスは維持。

import { redirect } from 'next/navigation'

export default function ExplorePage() {
  redirect('/timeline')
}
