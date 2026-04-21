import type { Metadata, Viewport } from 'next'
import './globals.css'
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics'

export const metadata: Metadata = {
  title: { default: 'nowjp — Just landed in Japan? We\'ve got you.', template: '%s | nowjp' },
  description: 'The foreigner-only community in Japan. Connect with expats who get it — survival tips, real friendships, and help when you need it. Free forever.',
  keywords: ['foreigners in japan', 'expat japan', 'expat friends japan', 'expat community japan', 'friends japan', 'language exchange japan', 'international community japan', 'just landed japan', 'new to japan', 'living in japan foreigner', 'expat survival japan'],
  authors: [{ name: 'nowjp' }],
  creator: 'nowjp',
  metadataBase: new URL('https://nowjpjapan.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://nowjp.app',
    siteName: 'nowjp',
    title: 'nowjp — Connect with foreigners in Japan',
    description: 'Find your people. Right here in Japan.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'nowjp' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'nowjp — Connect with foreigners in Japan',
    description: 'Find your people. Right here in Japan.',
    images: ['/og-image.png'],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'nowjp',
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
    { media: '(prefers-color-scheme: light)', color: '#0ea5e9' },
    { media: '(prefers-color-scheme: dark)',  color: '#0ea5e9' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
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
