/** @type {import('next').NextConfig} */
const nextConfig = {
  // 既存コードに pre-existing な lint 違反が多数あるため、本番ビルドでは
  // ESLint をブロッキングにしない。lint は `npm run lint` で別途実行する想定。
  // 段階的に既存違反を解消したら ignoreDuringBuilds を外す。
  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // ── キャッシュ無効化（スマホPWA対策）────────────────────────────
  async headers() {
    return [
      {
        // HTMLページはキャッシュしない
        source: '/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Pragma',        value: 'no-cache' },
          { key: 'Expires',       value: '0' },
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
