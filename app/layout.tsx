import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'nowmate — Connect with foreigners in Japan', template: '%s | nowmate' },
  description: 'Find friends, language partners, and local help. Connect with foreigners living in Japan — free forever.',
  keywords: ['foreigners in japan', 'expat japan', 'friends japan', 'language exchange japan', 'international community japan'],
  authors: [{ name: 'nowmate' }],
  creator: 'nowmate',
  metadataBase: new URL('https://nowmate.app'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://nowmate.app',
    siteName: 'nowmate',
    title: 'nowmate — Connect with foreigners in Japan',
    description: 'Find your people. Right here in Japan.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'nowmate' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'nowmate — Connect with foreigners in Japan',
    description: 'Find your people. Right here in Japan.',
    images: ['/og-image.png'],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'nowmate',
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
      <body className="h-full">{children}</body>
    </html>
  )
}
