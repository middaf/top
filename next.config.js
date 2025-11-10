/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/dashboard_admin',
        destination: '/dashboard',
        permanent: true,
      },
      {
        source: '/',
        destination: '/signin',
        permanent: false,
      }
    ]
  },
  optimizeFonts: true,
  // Temporarily disable CSS optimization
  experimental: {
    optimizeCss: false
  },
}

module.exports = nextConfig