// Browser calls same-origin /api; Next proxies to FastAPI (BACKEND_URL is read at build time).
const backend = process.env.BACKEND_URL || 'http://localhost:8131'

export default {
  output: 'standalone',
  images: { unoptimized: true },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backend}/api/:path*` }]
  },
}
