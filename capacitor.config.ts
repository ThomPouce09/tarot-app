import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tarot.divination',
  appName: 'Tarot Divination',
  webDir: 'out',  // Dossier de build Next.js (export statique)
  server: {
    // Pour dev en live-reload (décommenter pour tester sur mobile)
    // url: 'http://10.167.87.38:3000',
    // cleartext: true,
  },
  android: {
    allowMixedContent: true,  // Pour appeler l'API en dev
    captureInput: true,
    webContentsDebuggingEnabled: true,  // Debug dans Chrome
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0a0604',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
  },
};

export default config;