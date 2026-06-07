const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export',  // Commenté pour Vercel (décommenter pour Capacitor APK)
  distDir: process.env.NEXT_DIST_DIR || '.next',
  productionBrowserSourceMaps: false,
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../'),
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // images: { unoptimized: true },  // Requis pour static export uniquement
  images: {
    domains: ['cdn.abacus.ai'],
  },
  // Allow access from network (for testing on mobile)
  devIndicators: {
    appIsrStatus: false,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.output.filename = 'static/chunks/[name]-[contenthash:8].js';
      config.output.chunkFilename = 'static/chunks/[contenthash:16].js';
    }
    return config;
  },
};

module.exports = nextConfig;
