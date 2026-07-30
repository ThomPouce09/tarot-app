const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for Capacitor APK
  output: 'export',
  trailingSlash: true,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  productionBrowserSourceMaps: false,
  // Unoptimized images for static export
  images: { unoptimized: true },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  devIndicators: {
    appIsrStatus: false,
  },
};

module.exports = nextConfig;
