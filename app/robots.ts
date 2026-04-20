import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/home', '/chat', '/matches', '/mypage', '/settings', '/onboarding'] },
    sitemap: 'https://nowjpjapan.com/sitemap.xml',
  }
}
