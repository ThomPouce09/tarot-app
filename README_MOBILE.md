# 🎴 Tarot Divinatoire - Accès Mobile

## ✅ Configuration terminée !

Ton application est maintenant configurée pour :
- ✅ **Fonctionner SANS base de données** (stockage en mémoire)
- ✅ **Être accessible depuis ton smartphone** sur le réseau local
- ✅ **Sauvegarder les tirages** temporairement (jusqu'au redémarrage)

---

## 🚀 Lancer l'application

### **Option 1 : Double-clic sur le script** (Recommandé)

1. Ouvrir l'Explorateur de fichiers
2. Aller dans : `C:\Users\tsall\Projects\Application Tirage Tarot\tarot_app\nextjs_space\`
3. **Double-cliquer sur `start.bat`**

Le script va :
- Détecter automatiquement ton adresse IP locale
- Lancer le serveur de développement
- T'afficher l'URL à utiliser sur ton smartphone

### **Option 2 : Ligne de commande**

```bash
cd "C:\Users\tsall\Projects\Application Tirage Tarot\tarot_app\nextjs_space"
npm run dev -- --hostname 0.0.0.0 --port 3000
```

---

## 📱 Accéder depuis ton smartphone

### **Étape 1 : Trouver l'URL**

Quand tu lances `start.bat`, tu verras un message comme :

```
📡 Adresse IP locale: 192.168.1.XX

📱 Pour accéder à l'app depuis ton smartphone :
   → http://192.168.1.XX:3000
```

### **Étape 2 : Sur ton smartphone**

1. **Connecte-toi au même WiFi** que ton ordinateur
2. Ouvre ton navigateur (Chrome, Safari, Firefox)
3. Tape l'URL : `http://192.168.1.XX:3000` (remplace avec ton IP)
4. **Profite !** 🎴✨

---

## 🔍 Trouver ton adresse IP manuellement

### **Windows :**
```cmd
ipconfig
```
Cherche : "Carte réseau sans fil" ou "Ethernet" → "Adresse IPv4"

Exemples courants :
- `192.168.1.XX`
- `192.168.0.XX`
- `10.0.0.XX`

---

## ⚠️ Problèmes courants

### ❌ "N'arrive pas à se connecter" sur mobile

**Solutions :**
1. ✅ Vérifie que ton smartphone est sur le **même WiFi** que le PC
2. ✅ Vérifie que le firewall Windows ne bloque pas :
   - Panneau de configuration → Pare-feu Windows
   - "Autoriser une application" → Node.js / npm
3. ✅ Essaye avec `http://localhost:3000` depuis le PC d'abord

### ❌ Le script `start.bat` ne fonctionne pas

**Alternative :**
```bash
# 1. Ouvrir un terminal
cd "C:\Users\tsall\Projects\Application Tirage Tarot\tarot_app\nextjs_space"

# 2. Trouver ton IP
ipconfig

# 3. Lancer avec ton IP
set NEXT_HOST=0.0.0.0
npm run dev -- --hostname 0.0.0.0 --port 3000
```

### ❌ "Application en cours de chargement..." indéfiniment

**Solution :**
- Attendre 30-60 secondes (premier chargement est long)
- Vider le cache du navigateur mobile
- Vérifier que `npm install` est bien terminé

---

## 🎯 Fonctionnalités disponibles

### ✅ Ce qui marche :
- 🎴 Tirage de 3 cartes
- 🃏 Éventail de 78 cartes avec scroll et zoom
- ✨ Animations de retournement avec sparkles
- 📜 Interprétation (Lorem Ipsum)
- 💾 Sauvegarde temporaire des tirages (en mémoire)

### ⏳ Ce qui ne marche pas (car pas de DB) :
- ❌ Historique persistant (perdu au redémarrage)
- ❌ Authentification utilisateur
- ❌ Export des tirages

---

## 📊 Mode de stockage actuel

| Fonctionnalité | Mode actuel (Mémoire) | Avec DB (Futur) |
|----------------|----------------------|-----------------|
| Durée de vie | Session uniquement | Permanent |
| Limité à | 50 tirages | Illimité |
| Multi-appareils | ❌ Non | ✅ Oui |
| Historique | ❌ Non | ✅ Oui |

---

## 🔄 Passer en mode avec DB (plus tard)

Quand tu voudras activer la base de données :

1. **Installer PostgreSQL** (Docker ou local)
2. **Modifier `.env`** :
   ```env
   DISABLE_DB=false
   DATABASE_URL="postgresql://..."
   ```
3. **Exécuter** :
   ```bash
   npx prisma generate
   npx prisma db push
   ```
4. **Redémarrer** le serveur

---

## 🎉 Prêt !

**Lance `start.bat` et teste l'app depuis ton smartphone !**

Si tu rencontres un problème, consulte la section "Dépannage" ou demande de l'aide avec :
- Le message d'erreur complet
- Ton adresse IP (ex: 192.168.1.XX)
- Si le PC et le mobile sont sur le même WiFi

**Bon tirage ! 🔮✨**