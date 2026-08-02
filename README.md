# Tarot App — Application de divination (Next.js 14)

Application web de tirages divinatoires : **Tarot, Yi Jing, Runes, Dés du Zodiaque**.
Base : Next.js 14 (App Router) + Prisma + Neon (PostgreSQL) + Stripe.

> 📱 Version APK Android : voir `tarot_app_apk/` (branche `apk-build`)

## 🚀 Démarrage rapide

```bash
npm install
# Configurer .env.local (voir .env.example)
npm run dev        # http://localhost:3000
```

## 🗺️ Structure des pages

### Tirages

| Route | Fonction | Statut |
|---|---|---|
| `/tarot` | Tirage Tarot 3 cartes (classique) | ✅ |
| `/tarot-3-cartes` | Tirage Tarot 3 cartes (+ interprétation) | ✅ |
| `/tarot-5-cartes` | Tirage Tarot 5 cartes | ✅ |
| `/tarot-5-c-manuelle` | Tirage 5 cartes manuel | ✅ |
| `/yi-jing` | Yi Jing simple | ✅ |
| `/yi-jing-question` | Yi Jing avec question | ✅ |
| `/yi-jing-du-jour` | Yi Jing du jour | ✅ |
| `/yi-qing` | Yi Qing (variante) | ✅ |
| `/runes` | Runes — accueil (Elder Futhark) | ✅ |
| `/runes/yggdrasil` | Runes — Yggdrasil | ✅ |
| `/runes/nornes` | Runes — Nornes | ✅ |
| `/runes/mjolnir` | Runes — Mjolnir | ✅ |
| `/des-divinatoires` | Dés du Zodiaque — accueil | ✅ |
| `/des-divinatoires/affinage` | Dés — tirage d'affinité | ✅ |
| `/des-divinatoires/choix` | Dés — tirage choix (2 options) | ✅ |
| `/des-divinatoires/obstacle-solution` | Dés — obstacle/solution | ✅ |
| `/des-divinatoires/demo-skins` | Démo des skins de dés | 🧪 Dev |

### Compte & auth

| Route | Fonction |
|---|---|
| `/login` + `/auth/login` | Connexion (email + mot de passe, bcrypt) |
| `/auth/signup` | Inscription (Turnstile/Recaptcha) |
| `/auth/forgot-password` | Mot de passe oublié |
| `/auth/confirm` | Confirmation reset (token) |
| `/dashboard` | Tableau de bord |
| `/dashboard/account` | Compte — profil |
| `/dashboard/account/readings` | Historique des lectures |
| `/dashboard/account/stats` | Statistiques (graphiques) |
| `/dashboard/account/abonnement` | Abonnement Stripe |
| `/dashboard/account/security` | Sécurité (mdp) |
| `/dashboard/account/preferences` | Préférences (thème, langue) |
| `/privacy` | Politique de confidentialité |

### Interprétation

| Route | Fonction |
|---|---|
| `/interpret/[type]` | Page unifiée d'interprétation (Yi Jing, Tarot, Runes, Dés) |
| `/interpret` | Index interprétation |
| `*/interpretation` | Pages d'interprétation par tirage |

## 🔌 API routes (31)

### Auth (`/api/auth/*`)
- `signup` — inscription + email de confirmation
- `signup/delete` — suppression inscription incomplète
- `login` / `signin` — connexion
- `confirm` — valider token reset
- `forgot-password` — envoi email
- `change-password` — changement mdp connecté
- `update-account` — MAJ profil
- `delete-account` — suppression compte

### Interprétation LLM
- `astro-dice-interpretation` — Dés du Zodiaque (LLM)
- `astro-interpretation-choix` — Dés choix (LLM)
- `astro-interpretation-approfondie` — analyse approfondie
- `astro-interpretation-obstacle` — obstacle/solution
- `astro-interpretation-db` — interprétation depuis DB
- `astro-dice-oracle-flash` — oracle flash
- `rune-interpretation` — Runes (LLM)
- `tarot-5-interpretation` — Tarot 5 (LLM)
- `yi-jing-du-jour` — Yi Jing du jour
- `yi-jing-question-interpretation` — Yi Jing question
- `yi-qing-interpretation` — Yi Qing
- `interpret` — interprétation générique
- `interpretation-wait` — file d'attente des interprétations
- `hexagram/[numero]` — données hexagramme

### Données & infra
- `readings` — CRUD historique lectures
- `creature` — créature (companion)
- `debug-log` — logs de debug
- `subscription` — abonnement
- `checkout` + `checkout/confirm` — paiement Stripe
- `webhooks/stripe` — webhook Stripe
- `billing-portal` — portail de facturation

## 🗄️ Base de données (Prisma + Neon)

Modèles :
- **User** — comptes (email, mdp bcrypt, rôle, langue)
- **Subscription** — abonnements Stripe (initié / oracle)
- **Reading** — lectures sauvegardées (type, cartes, résultat, interprétation)
- **Creature** / **CreatureMessage** — compagnon conversationnel
- **MessagesAttente** — file d'attente interprétations async
- **AstroInterpretation** — interprétations astrologiques (Dés)
- **PromptTemplate** — prompts LLM éditables en DB

> ⚠️ `getPrompt(key, vars)` utilise un regex `/\{\{var\}\}/g` — vérifier le prompt avant d'appeler le LLM.

## 🤖 LLM (multi-provider)

Providers configurés (fallback en cascade) :
- **DeepSeek** (principal)
- **OpenRouter** (fallback)
- **NVIDIA NIM** (fallback)

Config : `lib/llm.ts` + `lib/config.ts` — prompts dans `lib/prompts.ts` + table `PromptTemplate`.

## 💳 Stripe

- Abonnements : **Initie** / **Oracle** (voir `lib/plans.ts`)
- Checkout + webhooks + portail facturation
- Secrets : `STRIPE_SECRET_KEY`, `STRIPE_PRICE_INITIE`, `STRIPE_PRICE_ORACLE`, `STRIPE_WEBHOOK_SECRET`

## 🌍 i18n

`lib/i18n/` — `ui.ts` (textes UI), `cards.ts` (cartes), `index.tsx` (provider)
Langues : fr / en

## 🎨 Design système

- Thème : mystique sombre, doré (#DAA520) pour titres, bleu (#87CEEB) pour Dés du Zodiaque
- Police : Cinzel (titres) + système
- Composants : shadcn/ui (Radix UI) + Tailwind
- Animations : framer-motion, three.js/R3F (dés 3D)
- `STYLE_GUIDE.md` (obsolète — juin 2026, à régénérer)

## 🧪 Outils de dev

- `playwright.config.ts` — tests E2E
- `lib/use-shimmer.ts` — effet shimmer chargement
- `components/wait-overlay.tsx` — overlay d'attente (obligatoire pour toute opération async)
- `components/chunk-load-error-handler.tsx` — gestion erreurs de chunk

## 🔐 Sécurité

- Mots de passe : **bcrypt**
- Rate limiting sur auth
- Turnstile (Cloudflare) / Recaptcha sur inscription
- Validation : zod / yup
- Cookies sécurisés pour session

## 📁 Structure clé

```
nextjs_space/
├── app/               # Pages + API routes (App Router)
├── components/        # UI (shadcn + custom)
├── lib/
│   ├── llm.ts         # Multi-provider LLM
│   ├── prompts.ts     # Prompts (défauts)
│   ├── stripe.ts      # Client Stripe
│   ├── prisma.ts      # Client Prisma
│   ├── save-reading.ts # Sauvegarde lectures
│   ├── tarot-data.ts  # Données cartes Tarot
│   ├── yijing-data.ts # Données hexagrammes
│   ├── plans.ts       # Plans d'abonnement
│   └── i18n/          # fr/en
├── prisma/schema.prisma
├── public/            # Assets statiques
└── config/            # Config
```

## 📌 Notes de dev importantes

1. **Boutons async** : toujours spinner + message textuel pendant le chargement ; les boutons ne doivent disparaître QUE quand le résultat est prêt
2. **/choix** : carte fusionnée `【Dés】+【Interprétation combinée】+【Analyse approfondie Oracle】`, sauvegarde centralisée 1/session
3. **/obstacle-solution** : titres dorés (#DAA520), séparateur `— OU —`, cartes toujours visibles
4. **Cache webpack corrompu** : tuer les PIDs node, `rm -rf .next node_modules/.cache`, relancer dev
5. **Dés du Zodiaque** : thème bleu (boutons blue/blueLight, glyphes #87CEEB, PAS d'accentColor gold)
6. **NE PAS** commit/push sans autorisation explicite de l'utilisateur
