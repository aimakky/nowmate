import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// /guides と /for-business は旧 nowmate (海外移住者向けコミュニティ) の遺産
// ページで、YVOICE (20 歳以上のゲーム通話コミュニティ) のサービスとは無関係。
// disallow に追加し Google に新規クロールさせない。既に index されている分は
// app/guides/layout.tsx の noindex で削除を促す。
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/home', '/chat', '/matches', '/mypage', '/settings', '/onboarding',
        '/guides', '/for-business',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
