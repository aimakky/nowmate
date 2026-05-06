import type { Metadata, Viewport } from 'next'
import './globals.css'
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics'

// 注: metadataBase は live ドメイン (nowmatejapan.com) を当面そのまま参照する。
// ブランド表示は YVOICE に統一済み。ドメイン移行時に metadataBase を差し替える。
export const metadata: Metadata = {
  title:    { default: 'YVOICE — Your Voice Online｜大人のゲーム通話コミュニティ', template: '%s | YVOICE' },
  description:
    'YVOICE（ワイボイス）は "Your Voice Online" から生まれた、20歳以上限定の大人向けゲーム通話コミュニティ。自分の声でゲーム仲間と安心してつながれる場所。電話番号認証・本人確認・Trust Tier 制度で民度を守ります。',
  keywords: [
    'YVOICE', 'ワイボイス', 'ワイボ',
    'ゲーム通話', 'ゲームコミュニティ', '大人 ゲーム',
    'ボイスチャット', 'ゲーム仲間', '20歳以上',
    'FPS 仲間', 'RPG 仲間', '通話ルーム',
  ],
  applicationName: 'YVOICE',
  authors:     [{ name: 'YVOICE' }],
  creator:     'YVOICE',
  publisher:   'YVOICE',
  metadataBase: new URL('https://nowmatejapan.com'),
  openGraph: {
    type:       'website',
    locale:     'ja_JP',
    url:        'https://nowmatejapan.com',
    siteName:   'YVOICE',
    title:      'YVOICE — Your Voice Online｜大人のゲーム通話コミュニティ',
    description:'Your Voice Online — ゲーム仲間と声でつながる場所。20歳以上限定・電話認証・Trust Tier で安心。',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'YVOICE — Your Voice Online' }],
  },
  twitter: {
    card: 'summary_large_image',
    title:      'YVOICE — Your Voice Online',
    description:'ゲーム仲間と声でつながる、大人向けゲーム通話コミュニティ。',
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
        {/* favicon と apple-touch-icon は app/icon.tsx と app/apple-icon.tsx が
            Next.js の規約で自動配信するため、明示的な link 指定は不要。
            旧 /icon-192.png は public に存在せず 404 を返していたため削除。 */}
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
