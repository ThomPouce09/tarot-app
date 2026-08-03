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
    // Critical for APK: routes every fetch/XHR through the native Android
    // HTTP client, bypassing WebView CORS entirely. Without this, the
    // WebView (origin https://localhost) blocks responses from the remote
    // backend → « Erreur de connexion » on login.
    CapacitorHttp: {
      enabled: true,
    },
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
