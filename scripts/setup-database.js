// ===========================================================================
// Tarot Divinatoire - Configuration de la Base de Données
// ===========================================================================
// Ce script configure automatiquement Prisma et la base de données
// Exécution: node scripts/setup-database.js
// ===========================================================================

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

const log = {
  info: (msg) => console.log(`${COLORS.blue}ℹ${COLORS.reset} ${msg}`),
  success: (msg) => console.log(`${COLORS.green}✔${COLORS.reset} ${msg}`),
  warn: (msg) => console.log(`${COLORS.yellow}⚠${COLORS.reset} ${msg}`),
  error: (msg) => console.log(`${COLORS.red}✖${COLORS.reset} ${msg}`),
  step: (msg) => console.log(`\n${COLORS.magenta}━━━ ${msg} ━━━${COLORS.reset}\n`)
};

function runCommand(cmd, options = {}) {
  try {
    execSync(cmd, { stdio: 'inherit', ...options });
    return true;
  } catch (error) {
    if (!options.silent) {
      log.error(`Command failed: ${cmd}`);
    }
    return false;
  }
}

async function main() {
  console.clear();
  
  console.log(`${COLORS.cyan}${COLORS.bright}`);
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     🎴 Tarot Divinatoire - DB Setup 🎴                   ║');
  console.log('║     Configuration de Prisma + PostgreSQL                 ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(`${COLORS.reset}\n`);

  // Étape 1 : Vérifier si .env existe
  log.step('Étape 1: Vérification du fichier .env');
  
  const envPath = path.join(process.cwd(), '.env');
  let envExists = fs.existsSync(envPath);
  
  if (!envExists) {
    log.info('Création du fichier .env...');
    const examplePath = path.join(process.cwd(), '.env.example');
    if (fs.existsSync(examplePath)) {
      fs.copyFileSync(examplePath, envPath);
      log.success('.env créé à partir de .env.example');
    } else {
      log.warn('.env.example non trouvé, création manuelle nécessaire');
    }
  } else {
    log.success('Fichier .env trouvé');
  }

  // Étape 2 : Demander l'URL de connexion
  log.step('Étape 2: Configuration de DATABASE_URL');
  
  const defaultUrl = 'postgresql://postgres:***@localhost:5432/tarot_db?schema=public';
  console.log(`${COLORS.dim}Format: postgresql://user:***@host:port/database?schema=public${COLORS.reset}\n`);
  
  let databaseUrl = await question(`${COLORS.yellow}?${COLORS.reset} DATABASE_URL [${defaultUrl}]: `);
  databaseUrl = databaseUrl.trim() || defaultUrl;
  
  // Mettre à jour le fichier .env
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
  
  if (envContent.includes('DATABASE_URL=')) {
    envContent = envContent.replace(/DATABASE_URL=.*/, `DATABASE_URL=${databaseUrl}`);
  } else {
    envContent += `\nDATABASE_URL=${databaseUrl}\n`;
  }
  
  fs.writeFileSync(envPath, envContent);
  log.success('.env mis à jour avec DATABASE_URL');

  // Étape 3 : Générer Prisma Client
  log.step('Étape 3: Génération de Prisma Client');
  
  log.info('Exécution de: npx prisma generate');
  if (runCommand('npx prisma generate')) {
    log.success('Prisma Client généré avec succès');
  } else {
    log.error('Échec de la génération Prisma Client');
    log.warn('Vérifiez que prisma est installé: npm install -D prisma');
    rl.close();
    process.exit(1);
  }

  // Étape 4 : Synchroniser le schema avec la DB
  log.step('Étape 4: Synchronisation du schema avec la base de données');
  
  console.log(`${COLORS.yellow}⚠${COLORS.reset} Cette opération va créer/mettre à jour les tables dans la DB.\n`);
  const confirm = await question(`${COLORS.cyan}?${COLORS.reset} Continuer ? (y/n): `);
  
  if (confirm.toLowerCase() !== 'y') {
    log.warn('Opération annulée par l\'utilisateur');
    rl.close();
    process.exit(0);
  }
  
  log.info('Exécution de: npx prisma db push');
  if (runCommand('npx prisma db push')) {
    log.success('Schema synchronisé avec succès');
  } else {
    log.error('Échec de la synchronisation');
    log.warn('Vérifiez que PostgreSQL est en cours d\'exécution et que DATABASE_URL est correcte');
    rl.close();
    process.exit(1);
  }

  // Étape 5 : Optionnel - Seeder la base de données
  log.step('Étape 5: Seed de la base de données (optionnel)');
  
  const seedPath = path.join(process.cwd(), 'scripts', 'seed.ts');
  const seedExists = fs.existsSync(seedPath);
  
  if (!seedExists) {
    log.info('Aucun fichier seed.ts trouvé (optionnel)');
    console.log(`${COLORS.dim}Pour créer un seed, ajoutez un fichier scripts/seed.ts${COLORS.reset}`);
  } else {
    const doSeed = await question(`${COLORS.yellow}?${COLORS.reset} Voulez-vous exécuter le seed ? (y/n): `);
    if (doSeed.toLowerCase() === 'y') {
      log.info('Exécution du seed...');
      if (runCommand('npm run prisma:seed || npx prisma db seed')) {
        log.success('Seed exécuté avec succès');
      } else {
        log.warn('Le seed a échoué (ce n\'est pas bloquant)');
      }
    }
  }

  // Résumé
  console.log('\n');
  log.step('✅ Configuration terminée !');
  
  console.log(`${COLORS.green}${COLORS.bright}
╔═══════════════════════════════════════════════════════════╗
║        🎉 Base de données prête ! 🎉                     ║
╠═══════════════════════════════════════════════════════════╣
║  Prochaines étapes :                                      ║
║  1. npm run dev   (lancer le serveur de dev)             ║
║  2. Ouvrir http://localhost:3000                          ║
║  3. Faire votre premier tirage ! 🎴                       ║
╚═══════════════════════════════════════════════════════════╝
  ${COLORS.reset}`);

  rl.close();
}

main().catch((err) => {
  log.error(err.message);
  rl.close();
  process.exit(1);
});