import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// 認証必須・ユーザー個別画面は Google に新規クロールさせない。
// (旧 /for-business / /guides 配下は物理削除済みのため Google には 404 → 自然 deindex される)
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/home', '/chat', '/matches', '/mypage', '/settings', '/onboarding',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
