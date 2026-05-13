/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // ── キャッシュ無効化（スマホPWA + Vercel Edge 両対応）──────────
  // 旧版は Cache-Control: no-cache のみだったため、Vercel Edge が
  // X-Vercel-Cache: HIT で 27 分以上古い HTML を配信し続けるバグが発生。
  // CDN-Cache-Control / Vercel-CDN-Cache-Control を明示的に no-store に
  // 指定して Vercel Edge レイヤを強制バスト。
  // 参考: https://vercel.com/docs/edge-network/caching#cdn-cache-control
  async headers() {
    return [
      {
        // HTMLページはブラウザもエッジも一切キャッシュしない
        source: '/(.*)',
        headers: [
          { key: 'Cache-Control',            value: 'private, no-cache, no-store, must-revalidate, max-age=0' },
          { key: 'CDN-Cache-Control',        value: 'no-store' },
          { key: 'Vercel-CDN-Cache-Control', value: 'no-store' },
          { key: 'Pragma',                   value: 'no-cache' },
          { key: 'Expires',                  value: '0' },
        ],
      },
      {
        // 静的アセット（JS/CSS/画像）は1年キャッシュ（ハッシュ付きで自動バスト）
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },

  async redirects() {
    // 廃止済みページのリダイレクト（permanent→falseに変更しキャッシュを防ぐ）
    return [
      { source: '/explore',         destination: '/villages',        permanent: false },
      { source: '/matches',         destination: '/villages',        permanent: false },
      { source: '/likes-me',        destination: '/villages',        permanent: false },
      { source: '/community',       destination: '/villages',        permanent: false },
      { source: '/create',          destination: '/villages/create', permanent: false },
      { source: '/qa',              destination: '/timeline',        permanent: false },
      { source: '/qa/:path*',       destination: '/villages',        permanent: false },
    ]
  },
}

// ── Sentry 統合 ─────────────────────────────────────────────
// withSentryConfig は build 時に source map upload を行う wrapper。
// SENTRY_AUTH_TOKEN / SENTRY_ORG / SENTRY_PROJECT が未設定の環境
// (ローカル / Playwright CI 等) では upload を skip するだけで build は通る。
// 本番反映時は Vercel 側 env 設定で有効化する。
const { withSentryConfig } = require('@sentry/nextjs')

module.exports = withSentryConfig(nextConfig, {
  // Sentry org / project は env から拾う。値の直書きはしない。
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // CLI 出力を build ログから抑える (Vercel ログを汚さない)。
  silent: true,
  // tunneling や source map upload に必要な auth token は env から。
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // App Router の client コードを含むよう map upload 範囲を広げる。
  widenClientFileUpload: true,
})
