/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
  logging: {
    fetches: {
      fullUrl: false,
    },
    incomingRequests: {
      ignore: [
        /^\/api\/productions\/recent/,
        /^\/api\/dark-clips\/schedule/,
        /^\/api\/dark-clips\/import/,
        /^\/api\/dark-clips\/presets/,
        /^\/api\/social/,
        /^\/api\/storage/,
        /^\/storage/,
        /^\/_next/,
        /^\/favicon\.ico/,
      ],
    },
    serverFunctions: false,
    browserToTerminal: false,
  },
}

export default nextConfig
