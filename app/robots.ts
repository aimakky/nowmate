import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// /for-business は YVOICE のサービス内容と無関係なレガシーページ。
// disallow に追加し Google に新規クロールさせない。
// (/guides 配下は物理削除済みのため Google には 404 → 自然 deindex される)
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/home', '/chat', '/matches', '/mypage', '/settings', '/onboarding',
        '/for-business',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
