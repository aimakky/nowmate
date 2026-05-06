// サイト全体で使う URL の単一ソース。
//
// 並行ドメイン運用の意図:
//   - 新ドメイン: yvoiceonline.com (取得済、Vercel / Supabase 設定はこれから)
//   - 旧ドメイン: nowmatejapan.com (live、当面残置)
//
// マッキーさんが Vercel の Environment Variables で
//   NEXT_PUBLIC_SITE_URL = https://yvoiceonline.com
// を設定するまで、ここは旧ドメインを返す (= 既存挙動を完全維持)。
// 設定した瞬間からビルドで全画面の canonical / OG / sitemap / JSON-LD が
// 一括で新ドメインへ追従する。コード側は二度と書き換え不要。
//
// process.env.NEXT_PUBLIC_SITE_URL は Next.js のビルド時に静的に置換され
// るため client / server / edge どの runtime でも安全に参照できる。
//
// ホスト名のみを使いたい箇所 (例: OG 画像の URL バー表示) は
// SITE_HOST を使う。
const RAW = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://nowmatejapan.com'

// 末尾スラッシュを除去 (`${SITE_URL}/foo` で // を作らないように)
export const SITE_URL: string = RAW.replace(/\/$/, '')

// "nowmatejapan.com" のようなホスト名のみの形 (visual 用)
export const SITE_HOST: string = (() => {
  try {
    return new URL(SITE_URL).host
  } catch {
    return 'nowmatejapan.com'
  }
})()
