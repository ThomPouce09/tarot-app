# 🔮 Tarot Divinatoire — Vue d'ensemble du projet

## 📋 Résumé exécutif

Application web de **tarot divinatoire** en français avec une expérience visuelle immersive et des animations soignées. L'application permet un tirage de 3 cartes (Passé, Présent, Avenir) depuis un éventail de 78 cartes avec drag & drop.

---

## 🎨 Design & Expérience Utilisateur

### Thème visuel
- **Style** : Médiéval mystique, tons sombres
- **Couleurs principales** :
  - Or : `#DAA520`
  - Brun foncé : `#1a0e0a`
  - Bleu nuit : `#1a1a4e`

### Polices (Google Fonts)
- **Cinzel** : Texte principal (400, 500, 600, 700)
- **Cinzel Decorative** : Titres (400, 700)
- **MedievalSharp** : Accents (400)

### Assets CDN
- **Table rustique** : `https://cdn.abacus.ai/images/fa15d4d8-3350-4925-96db-6e3c7d57c889.png`
- **Dos de carte** : `https://cdn.abacus.ai/images/00de34b4-d163-46d0-b0cc-503b5a314aec.png`

---

## 🃏 Système de Tarot

### Structure des cartes (78 cartes totales)

#### Arcanes Majeurs (22 cartes : 0-21)
| ID | Nom | Symbole | Keywords |
|----|-----|---------|----------|
| 0 | Le Mat | 🃏 | liberté, aventure, folie |
| 1 | Le Bateleur | 🎭 | création, habileté, volonté |
| 2 | La Papesse | 📖 | intuition, sagesse, mystère |
| 3 | L'Impératrice | 👑 | fécondité, abondance, nature |
| 4 | L'Empereur | 🏰 | autorité, structure, pouvoir |
| 5 | Le Pape | ⛪ | enseignement, tradition, spiritualité |
| 6 | L'Amoureux | 💕 | amour, choix, union |
| 7 | Le Chariot | 🏇 | victoire, conquête, détermination |
| 8 | La Justice | ⚖️ | équilibre, vérité, loi |
| 9 | L'Hermite | 🔦 | solitude, recherche, prudence |
| 10 | La Roue de Fortune | 🎡 | destin, cycles, chance |
| 11 | La Force | 🦁 | courage, énergie, maîtrise |
| 12 | Le Pendu | 🔮 | sacrifice, lâcher-prise, suspension |
| 13 | La Mort | 💀 | transformation, fin, renouveau |
| 14 | La Tempérance | 🏺 | harmonie, patience, guérison |
| 15 | Le Diable | 😈 | tentation, passion, attachement |
| 16 | La Maison Dieu | ⚡ | destruction, révélation, libération |
| 17 | L'Étoile | ⭐ | espoir, inspiration, sérénité |
| 18 | La Lune | 🌙 | illusion, rêves, inconscient |
| 19 | Le Soleil | ☀️ | bonheur, succès, vitalité |
| 20 | Le Jugement | 📯 | résurrection, appel, absolution |
| 21 | Le Monde | 🌍 | accomplissement, plénitude, réalisation |

#### Arcanes Mineurs (56 cartes)
4 enseignes × 14 cartes chacune :

| Enseigne | Couleur | Symbole | Thèmes |
|----------|---------|---------|--------|
| **Bâtons** | #8B4513 | 🏹 | action, créativité, ambition, énergie |
| **Coupes** | #1E3A5F | 🏆 | émotions, amour, relations, intuition |
| **Épées** | #4A4A4A | ⚔️ | intellect, vérité, conflit, justice |
| **Deniers** | #8B6914 | ⭐ | matériel, travail, santé, prospérité |

**Structure d'une enseigne :**
- As → 10 (cartes numérotées)
- Valet, Cavalier, Reine, Roi (cartes de la cour)

---

## 🏗️ Architecture Technique

### Stack technologique
- **Framework** : Next.js 14.2.28 (App Router)
- **Langage** : TypeScript 5.2.2
- **UI** : React 18.2.0 + shadcn/ui (Radix UI)
- **Animations** : Framer Motion 10.18.0
- **Style** : TailwindCSS 3.3.3
- **Base de données** : Prisma + PostgreSQL
- **Auth** : NextAuth.js 4.24.11

### Structure des fichiers
```
nextjs_space/
├── app/
│   ├── page.tsx              # Point d'entrée → TarotApp
│   ├── layout.tsx            # Layout avec Google Fonts
│   ├── globals.css           # Styles globaux + animations
│   ├── components/
│   │   ├── tarot-app.tsx     # Composant principal (client)
│   │   ├── card-fan.tsx      # Éventail de 78 cartes (drag & drop)
│   │   ├── drawn-cards.tsx   # Zone des 3 cartes tirées
│   │   ├── card-face.tsx     # Face individuelle des cartes
│   │   └── interpretation-panel.tsx  # Modale d'interprétation
│   └── api/readings/
│       └── route.ts          # API endpoints (POST/GET)
├── components/
│   ├── ui/                   # 50+ composants shadcn/ui
│   ├── layouts/              # Layouts (app-shell, auth, etc.)
│   ├── theme-provider.tsx    # Dark/light theme
│   └── theme-toggle.tsx      # Toggle theme
├── lib/
│   ├── tarot-data.ts         # Données des 78 cartes
│   ├── prisma.ts             # Client Prisma singleton
│   ├── db.ts                 # Utils DB
│   ├── types.ts              # Types TypeScript
│   └── utils.ts              # Helpers (clsx, cn)
├── prisma/
│   └── schema.prisma         # Schéma de base de données
├── scripts/
│   ├── safe-seed.ts          # Seed avec sécurité anti-delete
│   └── seed.ts               # Script de seed (à lire)
├── public/
│   ├── favicon.svg
│   ├── og-image.png
│   └── images/table-bg.jpg
└── package.json
```

---

## ⚡ Fonctionnalités principales

### 1. Cinématique d'ouverture
- Séquence en 4 phases : noir → table lointaine → zoom → prêt
- Duration totale : ~3 secondes
- Effet de fondu et zoom progressif

### 2. Éventail de cartes (CardFan)
- **78 cartes** affichées en éventail avec overlap
- **Scroll horizontal** : molette souris ou swipe tactile
- **Zoom** : pinch-to-zoom (mobile) ou Ctrl+molette (desktop)
  - Facteur : 1× à 3×
  - Indicateur de zoom + bouton reset
- **Interactions** :
  - Survol : la carte se soulève (-12px) et grossit (1.08×)
  - Premier clic : confirmation "Tirer ?" avec overlay
  - Deuxième clic : extraction avec animation

### 3. Tirage des cartes (DrawnCards)
- **3 positions** : Passé (☾) → Présent (☉) → Avenir (★)
- **Animation d'arrivée** : spring (stiffness: 180, damping: 18)
- **Retournement** : flip 3D avec sparkles (8 particules ✦)
- **Inversion** : 30% de chance d'être inversée
- **Affichage** : nom de la carte + mention "(Inversée)" si applicable

### 4. Interprétation (InterpretationPanel)
- **Bouton** : "✨ Interprétation du tirage ✨" (après 3 cartes)
- **Panel modal** :
  - Titre + bouton fermer
  - 3 sections (une par carte) :
    - Position (Passé/Présent/Avenir)
    - Nom de la carte + inversion
    - Keywords (badges)
    - Interprétation (Lorem ipsum actuellement)
  - Synthèse générale (Lorem ipsum)
  - Bouton "Nouveau Tirage"

### 5. Reset
- Remise à zéro complète
- Réinitialise :
  - `drawnCards` : []
  - `usedCardIds` : nouveau Set
  - `availableIndices` : Set(78)
  - `showInterpretation` : false

---

## 🗄️ Base de données (Prisma)

### Schéma
```prisma
model Reading {
  id          String   @id @default(cuid())
  card1       String
  card2       String
  card3       String
  card1Rev    Boolean  @default(false)
  card2Rev    Boolean  @default(false)
  card3Rev    Boolean  @default(false)
  interpretation String? @db.Text
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([createdAt])
}
```

### API Endpoints

**POST /api/readings**
```json
{
  "card1": "Le Bateleur",
  "card2": "La Papesse",
  "card3": "L'Empereur",
  "card1Rev": false,
  "card2Rev": true,
  "card3Rev": false
}
```
→ `200 { success: true, id: "..." }`

**GET /api/readings**
→ `200 [Reading, Reading, ...]` (10 derniers)

---

## 🎭 Animations clés

### CSS (globals.css)
- **mystic-glow** : Pulsation lumineuse (3s infinite)
- **card-shimmer** : Reflet brillant (4s infinite)
- **title-glow** : Lueur du titre (4s infinite)
- **card-inner.flipped** : Rotation Y 180° (0.8s cubic-bezier)

### Framer Motion
- **Spring** : arrivée des cartes (stiffness: 180)
- **Fade** : apparition/disparition des panels
- **Scale** : zoom/hover des cartes
- **Sparkles** : 8 particules avec stagger (0.08s × i)

---

## 📱 Responsive

### Breakpoints
- Mobile : < 640px
- SM : ≥ 640px
- MD : ≥ 768px
- LG : ≥ 1024px
- XL : ≥ 1280px

### Adaptations
- **Cartes éventail** :
  - Mobile : 60×90px, overlap -22px
  - Desktop : 95×143px, overlap -32px
- **Slots** : 6 dimensions selon breakpoint
- **Textes** : 4 tailles selon breakpoint

---

## 🚀 Scripts npm

```bash
# Développement
yarn dev          # Next.js dev server

# Production
yarn build        # Build Next.js
yarn start        # Start production server

# DB
prisma generate   # Générer le client Prisma
prisma db push    # Push schema à la DB
prisma migrate    # Migrations

# Seed
yarn prisma seed  # Seeder la DB (via safe-seed.ts)

# Lint
yarn lint         # ESLint + Prettier
```

---

## 🔐 Configuration (.env)

Variables requises (non fournies dans le zip) :
```env
# Base de données PostgreSQL
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# NextAuth (optionnel pour auth utilisateurs)
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# AWS S3 (optionnel pour storage)
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_BUCKET_NAME="..."

# Azure Storage (optionnel)
AZURE_STORAGE_CONNECTION_STRING="..."
```

---

## 🛠️ Étapes suivantes recommandées

1. **Installer les dépendances** ✅ (en cours)
2. **Configurer .env** avec DATABASE_URL
3. **Générer Prisma** : `yarn prisma generate`
4. **Initialiser la DB** : `prisma db push`
5. **Seeder** : `yarn prisma seed` (si seed.ts présent)
6. **Développement** : `yarn dev`

---

## 💡 Développements futurs prévus

- [ ] **API IA** pour interprétation des cartes
- [ ] **Système utilisateurs** avec authentification
- [ ] **Historique des tirages** par utilisateur
- [ ] **Sauvegarde cloud** (S3/Azure Storage)
- [ ] **Partage de tirages** (social)
- [ ] **Tirages personnalisés** (1, 3, 5, 10 cartes)
- [ ] **Modes de tirage** (Croix celte, etc.)

---

**Document généré** : 31 mai 2026
**Projet** : Application Tirage Tarot
**Version** : 1.0.0