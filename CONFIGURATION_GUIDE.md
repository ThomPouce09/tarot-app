# 🎴 Tarot Divinatoire - Guide de Configuration

## 📋 Prérequis

- ✅ Node.js 18+ (déjà installé : v22.22.3)
- ✅ npm ou yarn (déjà installés)
- ⏳ **PostgreSQL** (à installer si pas déjà présent)

---

## 🗄️ Option 1 : PostgreSQL Local (Recommandé pour dev)

### A. Installer PostgreSQL

**Windows :**
1. Télécharger depuis https://www.postgresql.org/download/windows/
2. Installer PostgreSQL 15+
3. Noter le mot de passe `postgres` défini pendant l'installation

**Ou utiliser Docker (plus simple) :**
```bash
docker run -d \
  --name tarot-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=tarot_db \
  -p 5432:5432 \
  postgres:15-alpine
```

### B. Créer la base de données

**Avec psql (CLI PostgreSQL) :**
```bash
psql -U postgres
```

Puis dans psql :
```sql
CREATE DATABASE tarot_db;
\q
```

**Ou avec pgAdmin (GUI) :**
1. Ouvrir pgAdmin
2. Click droit sur "Databases" → "Create" → "Database"
3. Nom : `tarot_db`
4. Owner : `postgres`

---

## 🔧 Configuration du Projet

### Étape 1 : Copier le fichier d'environnement

```bash
cd "C:\Users\tsall\Projects\Application Tirage Tarot\tarot_app\nextjs_space"
copy .env.example .env
```

### Étape 2 : Modifier `.env`

Ouvrir `.env` et mettre à jour `DATABASE_URL` :

```env
# Pour PostgreSQL local
DATABASE_URL="postgresql://postgres:VOTRE_MDP@localhost:5432/tarot_db?schema=public"

# Pour Docker
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tarot_db?schema=public"

# Pour un service cloud (ex: Neon, Supabase, Railway)
DATABASE_URL="postgresql://user:***@host.region.neon.tech/tarot_db?sslmode=require"
```

### Étape 3 : Installer les dépendances

```bash
# npm
npm install

# yarn
yarn install
```

### Étape 4 : Générer Prisma Client

```bash
npx prisma generate
```

### Étape 5 : Synchroniser la base de données

```bash
npx prisma db push
```

Cela va créer la table `Reading` dans votre base de données.

### Étape 6 (optionnel) : Seeder la DB

Si vous avez un fichier `scripts/seed.ts` :

```bash
npm run prisma:seed
```

---

## 🚀 Lancer l'Application

### Mode Développement

```bash
npm run dev
# ou
yarn dev
```

Puis ouvrir : **http://localhost:3000**

### Mode Production

```bash
npm run build
npm start
```

---

## ☁️ Options de Base de Données Cloud (Gratuites)

### 1. **Neon** (Recommandé)
- URL : https://neon.tech
- PostgreSQL serverless
- Gratuit : 0.5 GB stockage
- **Avantage** : URL de connexion automatique

### 2. **Supabase**
- URL : https://supabase.com
- PostgreSQL + features additionnelles
- Gratuit : 500 MB stockage
- **Avantage** : Dashboard complet

### 3. **Railway**
- URL : https://railway.app
- PostgreSQL managé
- Gratuit : $5 credit/mois
- **Avantage** : Setup très simple

### 4. **Aiven**
- URL : https://aiven.io
- PostgreSQL managé
- Gratuit : 5 GB stockage
- **Avantage** : Multi-cloud

---

## 🧪 Vérifier que tout fonctionne

### Test 1 : Vérifier Prisma

```bash
npx prisma studio
```

Ouvre un dashboard web pour explorer votre DB (http://localhost:5555)

### Test 2 : Tester l'API

```bash
# Récupérer les tirages (devrait retourner [])
curl http://localhost:3000/api/readings
```

### Test 3 : Faire un tirage manuel

1. Ouvrir http://localhost:3000
2. Cliquer sur 3 cartes dans l'éventail
3. Vérifier que les cartes se retournent avec animation
4. Cliquer sur "Interprétation du tirage"

---

## 🐛 Dépannage

### Erreur: "Can't connect to PostgreSQL"

**Solution :**
1. Vérifier que PostgreSQL tourne :
   ```bash
   # Windows
   services.msc → chercher "postgresql-x64-15"
   
   # Docker
   docker ps | grep postgres
   ```

2. Vérifier le port :
   ```bash
   netstat -an | grep 5432
   ```

3. Tester la connexion :
   ```bash
   psql -U postgres -h localhost -p 5432
   ```

### Erreur: "Prisma Client not generated"

**Solution :**
```bash
npx prisma generate --force
```

### Erreur: "Environment variables not found"

**Solution :**
Redémarrer le serveur de dev après modification du `.env` :
```bash
# Ctrl+C puis
npm run dev
```

---

## 📚 Ressources Utiles

- **Prisma Docs** : https://www.prisma.io/docs
- **Next.js Docs** : https://nextjs.org/docs
- **PostgreSQL Docs** : https://www.postgresql.org/docs/

---

## 🎯 Checklist de Configuration

- [ ] PostgreSQL installé et running
- [ ] Base de données `tarot_db` créée
- [ ] Fichier `.env` créé avec `DATABASE_URL` correcte
- [ ] Dépendances installées (`npm install`)
- [ ] Prisma Client généré (`npx prisma generate`)
- [ ] Schema synchronisé (`npx prisma db push`)
- [ ] Application lancée (`npm run dev`)
- [ ] Premier tirage testé avec succès ✨

---

**Bon courage pour la configuration ! 🎴✨**

En cas de problème, ouvre une issue ou demande de l'aide avec le message d'erreur complet.