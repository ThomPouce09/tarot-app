const { PHASE_DEVELOPMENT_SERVER } = require('next/constants');

/**
 * Configuration Next.js.
 *
 * ⚠️ distDir : `next dev` et `next build` ne doivent JAMAIS partager le même
 * dossier de sortie. Quand les deux utilisent `.next`, le build corrompt le
 * cache webpack du serveur de développement (MODULE_NOT_FOUND webpack-runtime.js,
 * PageNotFoundError /_not-found) — et le réflexe « purger .next » avant chaque
 * build force un build FROID de ~6 min à chaque fois.
 *
 * Règle appliquée :
 *   - `next dev`                       -> `.next`        (dev classique)
 *   - `next build` en local            -> `.next-build`  (cache conservé,
 *                                                         aucune collision avec dev :
 *                                                         on peut builder PENDANT que
 *                                                         le serveur dev tourne)
 *   - build sur Vercel / CI            -> `.next`        (comportement de production
 *                                                         et de GitHub Actions inchangé)
 *
 * Surchargeable à la main : NEXT_DIST_DIR=.mon-dossier
 *
 * @type {(phase: string) => import('next').NextConfig}
 */
module.exports = (phase) => {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;
  // VERCEL / CI : on garde `.next` (Vercel et le workflow APK l'attendent).
  const isManagedBuild = Boolean(process.env.VERCEL) || Boolean(process.env.CI);
  const distDir =
    process.env.NEXT_DIST_DIR || (isDev || isManagedBuild ? '.next' : '.next-build');

  return {
    distDir,
    // output: 'export',  // Commenté pour Vercel (décommenter pour Capacitor APK)
    productionBrowserSourceMaps: false,
    experimental: {
      // outputFileTracingRoot retiré pour compatibilité Vercel
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
    /*
    webpack: (config, { isServer }) => {
      if (!isServer) {
        config.output.filename = 'static/chunks/[name]-[contenthash:8].js';
        config.output.chunkFilename = 'static/chunks/[contenthash:16].js';
      }
      return config;
    },
    */
  };
};
