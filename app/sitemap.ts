import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://nowmatejapan.com'
  const now = new Date()

  return [
    { url: base,                    lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${base}/for-business`,  lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/signup`,        lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/login`,         lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/privacy`,       lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/terms`,         lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/contact`,       lastModified: now, changeFrequency: 'yearly',  priority: 0.4 },
    { url: `${base}/invite`,        lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/guides`,                              lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/guides/new-to-japan`,                 lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/guides/making-friends-in-japan`,      lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/guides/language-exchange-japan`,      lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/guides/expats-in-tokyo`,              lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/guides/expats-in-osaka`,              lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/guides/expats-in-fukuoka`,            lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
  ]
}
