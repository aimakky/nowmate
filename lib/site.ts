// YVOICE のサイト全体で使う URL の単一ソース。
//
// 並行ドメイン運用の意図:
//   - 正式 URL (canonical):  https://www.yvoiceonline.com
//     Vercel Domains で Production に接続されている終着点。apex
//     (yvoiceonline.com) も Vercel 側で 308 で www に集約しているため、
//     canonical / OG / sitemap / Stripe redirect は **www 付き** を正と
//     する (重複インデックス回避 + 301/308 hop を 1 段減らす)。
//   - 旧ドメイン:   nowmatejapan.com / www.nowmatejapan.com
//     既存 SNS シェア・過去リンクの受け口として Vercel Domains で 307/308
//     redirect → www.yvoiceonline.com に転送中。**絶対に削除しない**。
//
// 2026-05-13 fallback 反転 (apex → www に再修正):
//   2026-05-13 第一段で apex (https://yvoiceonline.com) を fallback に
//   採用したが、Vercel 側で apex が www に 308 集約されているため、
//   生成 URL が www に統一されるよう **www 付き正式 URL** に再修正。
//   旧来 (旧本番) は nowmatejapan.com 直書きだったが、ブランド移行で
//   YVOICE www 形式へ移行。env 未設定でも新ドメイン基準で URL が生成され、
//   かつ Vercel の hop を介さず最短で到達する。
//
// Vercel の Environment Variables で
//   NEXT_PUBLIC_SITE_URL = https://www.yvoiceonline.com
// を明示設定するのが推奨 (将来別ドメインに切り替える時もここだけ書き換えれば
// 全画面が追従する)。
//
// process.env.NEXT_PUBLIC_SITE_URL は Next.js のビルド時に静的に置換され
// るため client / server / edge どの runtime でも安全に参照できる。
//
// ホスト名のみを使いたい箇所 (例: OG 画像の URL バー表示) は SITE_HOST を使う。
const RAW = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://www.yvoiceonline.com'

// 末尾スラッシュを除去 (`${SITE_URL}/foo` で // を作らないように)
export const SITE_URL: string = RAW.replace(/\/$/, '')

// ホスト名のみ (visual 用)
export const SITE_HOST: string = (() => {
  try {
    return new URL(SITE_URL).host
  } catch {
    return 'www.yvoiceonline.com'
  }
})()
