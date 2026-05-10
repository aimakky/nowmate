// 2026-05-10 リリース前整理: /likes-me は旧 nowmate の dating Premium 機能
// (「自分にいいねした人を見る」) で、YVOICE (ゲーム通話コミュニティ) のコン
// セプトと真逆。MVP では非表示にし、直接アクセスは /mypage へ redirect。
//
// 旧 149 行のコンテンツは git 履歴に残置 (復活する場合は revert)。
// /upgrade/success/page.tsx に残っていた内部リンクは別 commit で /mypage へ
// 切替。middleware の保護パスは維持。

import { redirect } from 'next/navigation'

export default function LikesMePage() {
  redirect('/mypage')
}
