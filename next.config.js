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
  async redirects() {
    // マッチング・出会い系機能を全廃止 → 村へリダイレクト
    return [
      { source: '/home',            destination: '/villages', permanent: true },
      { source: '/explore',         destination: '/villages', permanent: true },
      { source: '/matches',         destination: '/villages', permanent: true },
      { source: '/likes-me',        destination: '/villages', permanent: true },
      { source: '/chat',            destination: '/timeline', permanent: true },
      { source: '/chat/:matchId',   destination: '/timeline', permanent: true },
      { source: '/community',       destination: '/villages', permanent: true },
      { source: '/create',          destination: '/villages/create', permanent: true },
    ]
  },
}

module.exports = nextConfig
