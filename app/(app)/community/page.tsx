// 2026-05-10 リリース前整理: /community は旧 samee/nowmate の Japan expat tips
// ページで YVOICE (大人向けゲーム通話コミュニティ) と無関係な内容だったため、
// ユーザー導線から削除。直接アクセスされた場合は /timeline へ redirect する。
//
// 旧 142 行のコンテンツは git 履歴に残置 (復活する場合は revert)。
// middleware の保護パスからは外していないため、未認証は /login へ redirect する
// 既存挙動は維持される。

import { redirect } from 'next/navigation'

export default function CommunityPage() {
  redirect('/timeline')
}
