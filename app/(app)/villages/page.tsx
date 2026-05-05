// 旧 nowmate 時代の「村を探す」一覧ページ。samee 移行後は不要なため恒久 redirect。
// 既存の /villages/[id] 詳細ページ（個別の村ページ）はそのまま動作する。
//
// なぜ消したか:
//  - カテゴリが旧サービスのまま（仕事村 / 夜話・雑談 / 悩み相談）
//  - samee の世界観（ゲーム / ギルド / 通話ルーム）と完全に不一致
//  - ログイン直後にここへ着地して「旧 UI が出る」と報告された
//
// 旧コードは git 履歴に残っているので、ゲーム要素以外を復活させたい場合は
// 過去 commit から拾い直せる。
import { redirect } from 'next/navigation'

export default function VillagesPage() {
  redirect('/guilds')
}
