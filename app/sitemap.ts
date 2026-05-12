import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// base URL は lib/site.ts の SITE_URL から取得。
// NEXT_PUBLIC_SITE_URL 設定時は YVOICE 正式ドメイン (yvoiceonline.com) に追従。
//
// /for-business は YVOICE のサービス内容と無関係なレガシーページ。
// app/for-business/page.tsx 側で noindex 済み、sitemap からも除外。
// (/guides 配下は物理削除済み)
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
