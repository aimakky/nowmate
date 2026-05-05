import type { Metadata, Viewport } from 'next'
import './globals.css'
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics'

// 注: metadataBase は live ドメイン (nowmatejapan.com) を当面そのまま参照する。
// ブランド表示は YVOICE に統一済み。ドメイン移行時に metadataBase を差し替える。
export const metadata: Metadata = {
  title:    { default: 'YVOICE — 大人のゲーム通話コミュニティ', template: '%s | YVOICE' },
  description:
    'YVOICE（ワイボイス）は、20歳以上限定の大人のゲーム通話コミュニティ。安心してゲーム仲間と声でつながれる場所。電話番号認証・本人確認・Trust Tier 制度で民度を守ります。',
  keywords: [
    'YVOICE', 'ワイボイス', 'ワイボ',
    'ゲーム通話', 'ゲームコミュニティ', '大人 ゲーム',
    'ボイスチャット', 'ゲーム仲間', '20歳以上',
    'FPS 仲間', 'RPG 仲間', '通話ルーム',
  ],
  authors:     [{ name: 'YVOICE' }],
  creator:     'YVOICE',
  metadataBase: new URL('https://nowmatejapan.com'),
  openGraph: {
    type:       'website',
    locale:     'ja_JP',
    url:        'https://nowmatejapan.com',
    siteName:   'YVOICE',
    title:      'YVOICE — 大人のゲーム通話コミュニティ',
    description:'ゲーム仲間と声でつながる場所。20歳以上限定・電話認証・Trust Tier で安心。',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'YVOICE' }],
  },
  twitter: {
    card: 'summary_large_image',
    title:      'YVOICE — 大人のゲーム通話コミュニティ',
    description:'ゲーム仲間と声でつながる場所。',
    images:     ['/og-image.png'],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'YVOICE',
  },
  formatDetection: { telephone: false },
  other: { 'mobile-web-app-capable': 'yes' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#8b5cf6' },
    { media: '(prefers-color-scheme: dark)',  color: '#8b5cf6' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="h-full">
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  )
}
