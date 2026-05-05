import { MetadataRoute } from 'next'

// 旧 (自由村 / 海外移住者向け nowmate) 時代の base URL は壊れた
// `https://自由村japan.com` を指していた。YVOICE 移行後の live ドメインは
// 引き続き nowmatejapan.com (旧 GitHub repo / Vercel project 名のため即時
// 移行できない) なので、ここでは ASCII の正しい URL に統一する。
//
// /guides/* 配下は旧 nowmate (英語の Japan expat ガイド) の遺産で、現在の
// YVOICE (20 歳以上の日本人ゲーマー向け通話コミュニティ) と完全に無関係。
// app/guides/layout.tsx 側で noindex を出す。sitemap でも参照しないことで
// Google に「もう存在しない」と認識させる。
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://nowmatejapan.com'
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
