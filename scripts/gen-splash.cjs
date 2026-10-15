// scripts/gen-splash.cjs — Génère les splash.png Android (nuit profonde + étoiles discrètes + logo).
// Écrase android/app/src/main/res/drawable-{port,land}-{mdpi..xxxhdpi}/splash.png + drawable/splash.png.
// Image 100% procédurale (aucune dépendance hors PIL via python). Relancer: node scripts/gen-splash.cjs est
// appelé par prebuild/predev? NON — ce .cjs délègue à python; lancer directement si besoin.
const { execFileSync } = require('child_process');
execFileSync('python', ['scripts/_gen_splash.py'], { stdio: 'inherit', cwd: __dirname + '/..' });
