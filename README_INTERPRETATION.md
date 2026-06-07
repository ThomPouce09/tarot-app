# 🎴 Interprétation IA du Tirage de Tarot

## Vue d'ensemble

L'application intègre une interprétation automatisée des tirages de tarot utilisant l'IA de **Stepfun (Step3-mini)** via l'API NVIDIA.

## Architecture

```
Utilisateur → Bouton "Interprétation" → API Route Next.js → NVIDIA API → Interprétation JSON → Affichage animé
```

## Configuration

### 1. Obtenir une clé API NVIDIA

1. Rends-toi sur [NVIDIA Build](https://build.nvidia.com/)
2. Crée un compte ou connecte-toi
3. Génère une clé API
4. Copie la clé (commence par `nvapi-...`)

### 2. Ajouter la clé dans `.env.local`

Dans le dossier `nextjs_space/` :

```bash
# Crée ou édite le fichier .env.local
echo "NVIDIA_API_KEY=nvapi-YOUR_KEY_HERE" >> .env.local
```

**Important** : `.env.local` ne doit **jamais** être commité dans Git (il est dans `.gitignore`).

### 3. Redémarrer le serveur de développement

```bash
npm run dev
```

## Fonctionnement

### Déclenchement
- Après avoir tiré **3 cartes**, un bouton "✨ Interprétation du tirage ✨" apparaît dans la zone G
- Le bouton clignote 3 fois pour attirer l'attention, puis reste visible

### Appel API
1. L'utilisateur clique sur le bouton
2. Un loader apparaît avec l'animation "Les esprits consultent les cartes..."
3. L'API Route `/api/interpretation` est appelée avec les 3 cartes
4. NVIDIA API génère l'interprétation (2-3 phrases par carte)
5. Le résultat est affiché avec une animation de révélation progressive

### Animation de révélation
- **Carte 1 (Passé)** : apparaî t après 300ms
- **Carte 2 (Défi)** : apparaît après 1000ms
- **Carte 3 (Conseil)** : apparaît après 1700ms

## Structure des fichiers

```
app/
├── api/
│   └── interpretation/
│       └── route.ts          # API Route sécurisée (serveur)
├── components/
│   ├── interpretation-panel.tsx   # Composant d'affichage
│   └── card-fan.tsx          # Contient le bouton d'interprétation
└── tarot-app.tsx             # Intègre InterpretationPanel
```

## Modèle IA utilisé

**Stepfun Step3-mini** via NVIDIA API
- **Endpoint** : `https://integrate.api.nvidia.com/v1/chat/completions`
- **Température** : 0.7 (créatif mais cohérent)
- **Max tokens** : 500
- **Format** : JSON strict

## Prompt envoyé à l'IA

```
Tu es un expert en tarot divinatoire, mystique et bienveillant.

Interprète ce tirage à 3 cartes en français :
- Carte 1 (Passé/Situation) : {nom}
- Carte 2 (Défi/Obstacle) : {nom}
- Carte 3 (Conseil/Issue) : {nom}

Style : mystique, poétique, bienveillant, 2-3 phrases max par carte
Format : JSON uniquement
```

## Gestion des erreurs

- **Clé API manquante** : erreur 401 dans la console
- **Format invalide** : erreur affichée dans le panel
- **Timeout** : affichage d'un message d'erreur utilisateur

## Tests

Pour tester l'interprétation :

1. ✅ Ajoute ta clé API dans `.env.local`
2. ✅ Lance `npm run dev`
3. ✅ Tire 3 cartes
4. ✅ Clique sur "✨ Interprétation du tirage ✨"
5. ✅ Vérifie que les 3 interprétations s'affichent progressivement

## Améliorations futures

- [ ] **Historique des tirages** : sauvegarder les tirages + interprétations
- [ ] **Partage** : générer une image du tirage à partager
- [ ] **Multilingue** : anglais, espagnol
- [ ] **Tirages personnalisés** : amour, travail, santé
- [ ] **Significations détaillées** : fiche explicative pour chaque carte
- [ ] **Mode "Tirage du jour"** : un tirage quotidien avec notification

---

**Développé avec ✨ par Hermes Agent**