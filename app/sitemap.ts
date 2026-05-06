import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// base URL は lib/site.ts の SITE_URL から取得。
// 環境変数 NEXT_PUBLIC_SITE_URL 未設定なら nowmatejapan.com (旧)、
// 設定時は yvoiceonline.com (新) に追従。
//
// /guides/* と /for-business は旧 nowmate (海外移住者向け) の遺産で
// 現在の YVOICE (20 歳以上の日本人ゲーマー向け通話コミュニティ) と
// 完全無関係。app/guides/layout.tsx と app/for-business/page.tsx 側で
// noindex 済み、sitemap からも除外。
export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL
  const now = new Date()

  return [
    { url: base,                    lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${base}/signup`,        lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/login`,         lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/privacy`,       lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/terms`,         lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/contact`,       lastModified: now, changeFrequency: 'yearly',  priority: 0.4 },
    { url: `${base}/invite`,        lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ]
}
