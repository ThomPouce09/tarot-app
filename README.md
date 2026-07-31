# Tarot App — APK Android (Capacitor)

Version mobile Android de l'application de tirage divinatoire (Tarot, Yi Jing, Runes, Dés du Zodiaque).

## Architecture

```
tarot_app_apk/
├── app/                    # Pages Next.js 14 (App Router)
│   ├── des-divinatoires/   # Dés du Zodiaque (affinage, obstacle-solution, choix)
│   ├── tarot-3-cartes/     # Tirage Tarot 3 cartes
│   ├── tarot-5-cartes/     # Tirage Tarot 5 cartes
│   ├── yi-jing/            # Yi Jing simple
│   ├── yi-jing-question/   # Yi Jing avec question
│   ├── yi-jing-du-jour/    # Yi Jing du jour
│   ├── runes/              # Runes scandinaves
│   ├── auth/               # Connexion, inscription, confirmation
│   └── dashboard/          # Compte, historique des lectures
├── components/             # Composants UI réutilisables
├── lib/
│   ├── api-client.ts       # ⭐ Wrapper API → backend distant
│   ├── capacitor-utils.ts  # ⭐ Détection native + partage natif
│   ├── save-reading.ts     # Sauvegarde des lectures
│   └── i18n/               # Internationalisation fr/en
├── public/                 # Assets statiques
├── scripts/
│   └── setup-android.sh    # Init Capacitor + Android (local)
├── .github/workflows/
│   └── build-apk.yml       # ⭐ Build APK en CI (GitHub Actions)
├── capacitor.config.ts     # Config Capacitor
└── next.config.js          # Static export (output: 'export')
```

## ⚠️ Différences critiques vs version web (nextjs_space)

Ce projet est une **adaptation pour APK** — il ne remplace PAS l'original.

| Aspect | Web (original) | APK (ce projet) |
|---|---|---|
| Rendu | SSR/dynamique | **100% statique** (`output: 'export'`) |
| API routes (`/api/*`) | Locales (Next.js server) | **Supprimées** — backend distant requis |
| Base de données | Prisma/Drizzle local | Backend distant |
| Partage | `navigator.share` | `shareViaCapacitor()` (plugin natif + fallback) |
| Auth | Server-side | Backend distant (toutes les API externes) |

### Points techniques de l'adaptation

1. **`next.config.js`** : `output: 'export'` + `trailingSlash: true` + `images.unoptimized: true`
2. **`app/layout.tsx`** : `export const dynamic = 'force-dynamic'` supprimé (incompatible static export)
3. **`app/interpret/[type]/layout.tsx`** : `generateStaticParams()` pour les 64 hexagrammes + types de tirage (la page est `'use client'`, les params vivent dans le layout)
4. **`app/auth/confirm/page.tsx`** : `useSearchParams()` enveloppé dans `<Suspense>` (contrainte Next.js 14)
5. **`lib/api-client.ts`** : toutes les requêtes passent par `api()` qui préfixe `NEXT_PUBLIC_API_URL` (backend distant)
6. **`lib/capacitor-utils.ts`** : `isNative()` détecte Capacitor ; `shareViaCapacitor()` utilise le plugin Share natif avec fallback Web Share API + clipboard

## Prérequis

| Outil | Version | Notes |
|---|---|---|
| Node.js | 20+ | LTS |
| JDK | 17 | Temurin recommandé |
| Android SDK | 35 (Android 15) | build-tools, platform-tools |
| Android Studio | — | Optionnel si CI |

## Build en CI (recommandé)

Le workflow `.github/workflows/build-apk.yml` compile l'APK automatiquement :

1. **Pousser** sur la branche `apk-build`
2. GitHub → **Actions** → **Build APK** → **Run workflow**
3. L'APK est dans les **artifacts** du run

Le workflow fait : build statique → JDK 17 → Android SDK → `cap init` → `cap add android` → `cap sync` → `gradlew assembleRelease` → upload APK.

## Build en local

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer le backend distant
# Créer .env.local :
#   NEXT_PUBLIC_API_URL=https://TON-BACKEND-VERCEL.vercel.app

# 3. Build statique
npm run build          # → génère out/

# 4. Initialiser Capacitor (une seule fois)
npx cap init TarotApp com.tarot.app
npx cap add android

# 5. Synchroniser le web build
npx cap sync

# 6. Ouvrir dans Android Studio
npx cap open android
```

## Déploiement / publication

- **Backend** : le projet original (`nextjs_space`) reste déployé sur Vercel — c'est lui qui sert toutes les API
- **APK** : signer avec un keystore (voir `keytool -genkeypair`) puis publier sur Google Play (`.aab` via Android Studio ou `gradlew bundleRelease`)

## Fichiers clés

| Fichier | Rôle |
|---|---|
| `capacitor.config.ts` | appId `com.tarot.app`, webDir `out/`, plugins (SplashScreen, Share, Haptics, StatusBar) |
| `.env.apk` | Template de config APK (copier vers `.env.local`) |
| `lib/api-client.ts` | `api(path, options)` → `NEXT_PUBLIC_API_URL + path` |
| `lib/capacitor-utils.ts` | `isNative()`, `shareViaCapacitor()`, `getApiBaseUrl()` |
| `.github/workflows/build-apk.yml` | CI complète → APK artifact |
