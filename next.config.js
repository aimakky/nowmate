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
    // 廃止済みページのリダイレクト
    return [
      { source: '/explore',         destination: '/villages',        permanent: true },
      { source: '/matches',         destination: '/villages',        permanent: true },
      { source: '/likes-me',        destination: '/villages',        permanent: true },
      { source: '/community',       destination: '/villages',        permanent: true },
      { source: '/create',          destination: '/villages/create', permanent: true },
      { source: '/qa',              destination: '/timeline',        permanent: true },
      { source: '/qa/:path*',       destination: '/villages',        permanent: true },
    ]
  },
}

module.exports = nextConfig
