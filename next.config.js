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

module.exports = nextConfig
