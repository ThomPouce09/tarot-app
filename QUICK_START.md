# 🎴 Tarot Divinatoire - Configuration Rapide

## ✅ Ce qui a été fait

### 1. **Base de données rendue optionnelle**
- ✅ L'API fonctionne SANS PostgreSQL (stockage en mémoire)
- ✅ Les tirages sont sauvegardés temporairement (50 max)
- ✅ Compatible avec la DB si tu l'actives plus tard

### 2. **Fichiers créés**
| Fichier | Rôle |
|---------|------|
| `.env` | Configuration (DB désactivée par défaut) |
| `start.bat` | Lancement automatique avec détection IP |
| `README_MOBILE.md` | Guide complet pour accès mobile |
| `CONFIGURATION_GUIDE.md` | Guide de configuration DB (pour plus tard) |
| `PROJECT_OVERVIEW.md` | Documentation complète du projet |
| `scripts/setup-database.js` | Script de setup DB (pour plus tard) |

### 3. **Modifications apportées**
- ✅ `app/api/readings/route.ts` : Rendue compatible avec/sans DB
- ✅ `.env` : `DISABLE_DB=true` (mode sans DB activé)
- ✅ `next.config.js` : Optimisé pour le dev
- ✅ `start.bat` : Script de lancement auto

---

## 🚀 Comment lancer l'app

### **Méthode ultra-simple :**

1. **Attendre la fin de l'installation npm** (notification à venir)
2. **Double-cliquer sur `start.bat`**
3. **Ouvrir l'URL affichée** sur ton smartphone

### **URL à utiliser :**
- Sur PC : `http://localhost:3000`
- Sur mobile : `http://192.168.X.X:3000` (IP affichée par le script)

---

## 📱 Depuis ton smartphone

1. **Même WiFi** que ton ordinateur
2. **Navigateur** : Chrome, Safari, Firefox
3. **URL** : Celle affichée par `start.bat`
4. **Test** : Tire 3 cartes et profite des animations !

---

## 🎯 Fonctionnalités disponibles

### ✅ **Ce qui marche (même sans DB) :**
- 🎴 78 cartes dans l'éventail
- 👆 Drag & drop pour extraire les cartes
- ✨ Animations de retournement avec sparkles
- 📜 Interprétation du tirage (Lorem Ipsum)
- 🎨 Design médiéval mystique
- 💾 Sauvegarde temporaire des tirages

### ⏳ **Ce qui viendra avec la DB (optionnel) :**
- 📚 Historique permanent des tirages
- 👤 Authentification utilisateur
- 📊 Statistiques et graphiques
- 💾 Export/Import de tirages

---

## 🛠️ En cas de problème

### "N'arrive pas à se connecter"
1. Vérifie que le mobile et PC sont sur le **même WiFi**
2. Vérifie que le firewall ne bloque pas (autorise Node.js)
3. Teste d'abord avec `http://localhost:3000` sur le PC

### "npm install échoue"
- Réessaie avec : `npm install --legacy-peer-deps`
- Ou attends la fin du background process en cours

### "start.bat ne fonctionne pas"
- Ouvre un terminal et lance manuellement :
  ```bash
  npm run dev -- --hostname 0.0.0.0 --port 3000
  ```

---

## 📊 Résumé de la configuration

```
┌─────────────────────────────────────────────────────┐
│  🎴 Tarot Divinatoire - Prêt à tester !            │
├─────────────────────────────────────────────────────┤
│  Mode : SANS BASE DE DONNÉES                        │
│  Stockage : Mémoire (50 tirages max)               │
│  Accès : Local + Réseau (mobile)                    │
│  Port : 3000                                        │
│  URL PC : http://localhost:3000                     │
│  URL Mobile : http://192.168.X.X:3000 (voir IP)    │
└─────────────────────────────────────────────────────┘
```

---

## 🔄 Pour activer la DB plus tard

```bash
# 1. Modifier .env
DISABLE_DB=false
DATABASE_URL="postgresql://..."

# 2. Générer Prisma
npx prisma generate

# 3. Sync DB
npx prisma db push

# 4. Redémarrer
npm run dev
```

---

## 📚 Fichiers à consulter

- **`README_MOBILE.md`** : Guide détaillé pour l'accès mobile
- **`CONFIGURATION_GUIDE.md`** : Setup complet de PostgreSQL
- **`PROJECT_OVERVIEW.md`** : Architecture et fonctionnement

---

**Prochaine étape : Attendre la fin de `npm install` puis lancer `start.bat` !** 🎉