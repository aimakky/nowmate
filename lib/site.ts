// YVOICE のサイト全体で使う URL の単一ソース。
//
// 並行ドメイン運用の意図:
//   - 正式ドメイン: yvoiceonline.com（YVOICE 公式 / 段階移行中）
//   - 旧ドメイン:   nowmatejapan.com（過去の本番ドメイン、当面 live で残置）
//
// Vercel の Environment Variables で
//   NEXT_PUBLIC_SITE_URL = https://yvoiceonline.com
// を設定すると、全画面の canonical / OG / sitemap / JSON-LD が
// 一括で正式ドメインへ追従する。未設定時は安全側として旧ドメインを返す
// （= 既存リンクが死なないようにするための一時的な互換措置）。
//
// process.env.NEXT_PUBLIC_SITE_URL は Next.js のビルド時に静的に置換され
// るため client / server / edge どの runtime でも安全に参照できる。
//
// ホスト名のみを使いたい箇所 (例: OG 画像の URL バー表示) は SITE_HOST を使う。
const RAW = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://nowmatejapan.com'

// 末尾スラッシュを除去 (`${SITE_URL}/foo` で // を作らないように)
export const SITE_URL: string = RAW.replace(/\/$/, '')

// ホスト名のみ (visual 用)
export const SITE_HOST: string = (() => {
  try {
    return new URL(SITE_URL).host
  } catch {
    return 'nowmatejapan.com'
  }
})()
