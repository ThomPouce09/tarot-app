import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tarot.app',
  appName: 'Tarot Divinatoire',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    // Allow cleartext in dev only — remove for production
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0d1b2a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
    },
    Share: {},
    Haptics: {
      notificationDuration: 0.2,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0d1b2a',
    },
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
