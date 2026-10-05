/**
 * Configuration Next.js — variante APK (Capacitor).
 *
 * ⚠️ distDir : sur la branche web, `next dev` et `next build` utilisent des
 * dossiers distincts (`.next` / `.next-build`). Ici on garde VOLONTAIREMENT
 * `.next` : `capacitor.config.ts` déclare `webDir: 'out'`, et un `distDir`
 * personnalisé fait écrire l'export statique DANS ce distDir au lieu de `out/`
 * → `npx cap sync` ne trouverait plus rien. Ne pas aligner cette ligne sur la
 * branche web sans vérifier le workflow APK.
 *
 * Surchargeable à la main : NEXT_DIST_DIR=.mon-dossier
 *
 * @type {import('next').NextConfig}
 */
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
