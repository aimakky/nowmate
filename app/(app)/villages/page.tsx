// /villages はレガシー URL。YVOICE では /guilds（ゲーム村）に統一済み。
// 既存の /villages/[id] 詳細ページ（個別ページ）はそのまま動作する。
// 旧コードは git 履歴に残置。
import { redirect } from 'next/navigation'

export default function VillagesPage() {
  redirect('/guilds')
}
