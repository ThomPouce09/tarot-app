import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tarot.app',
  // Le nom du launcher est porté par les ressources Android (values*/strings.xml) :
  // values/ = REPLI anglais (toute langue non traduite), values-fr l'original
  // apostrophé, values-en/es/hi localisés. appName doit rester SANS apostrophe :
  // `cap sync` le réécrit brut dans values/strings.xml (aapt casserait sinon).
  appName: "The Oracle of Stars",
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
      backgroundColor: '#0a0720', // coeur de la nuit profonde du splash genere (chaîne de démarrage uniforme 2026-10-15)
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
    },
    Share: {},
    Haptics: {
      notificationDuration: 0.2,
    },
    PushNotifications: {
      presentationOptions: ['banner', 'list', 'sound'],
    },
  },
  android: {
    allowMixedContent: false,
    // captureInput:true remplaçait l'InputConnection du WebView par un
    // BaseInputConnection nu → le clavier Android n'affichait plus la
    // prédiction de mots ni l'autofill (seulement dans l'APK, pas sur
    // navigateur). Désactivé pour restaurer la saisie native complète.
    captureInput: false,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
