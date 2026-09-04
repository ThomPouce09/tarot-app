// Génère les listes de fonds d'écran aléatoires depuis public/backgrounds/ :
//   lib/generated/backdrops-runes.json  → /backgrounds/runes*.jpg
//   lib/generated/backdrops-des.json    → /backgrounds/des-divinatoires*.jpg
// (tri numérique : runes1, runes2, …, runes10). Exécuté avant chaque build/dev
// (hooks prebuild/predev) → déposer un nouveau fichier numéroté suffit,
// aucune édition de code nécessaire.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'public', 'backgrounds');
const outDir = path.join(__dirname, '..', 'lib', 'generated');

const JOBS = [
  { pattern: /^runes(\d+)\.(jpe?g|png|webp|mp4)$/i, out: 'backdrops-runes.json' },
  { pattern: /^des-divinatoires(\d+)\.(jpe?g|png|webp|mp4)$/i, out: 'backdrops-des.json' },
];

const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
fs.mkdirSync(outDir, { recursive: true });

for (const job of JOBS) {
  const list = files
    .filter((f) => job.pattern.test(f))
    .sort((a, b) => {
      const na = parseInt(a.match(job.pattern)[1], 10);
      const nb = parseInt(b.match(job.pattern)[1], 10);
      return na - nb;
    })
    .map((f) => `/backgrounds/${f}`);
  const outFile = path.join(outDir, job.out);
  fs.writeFileSync(outFile, JSON.stringify(list, null, 2));
  console.log(`[gen-backdrops] ${list.length} fonds → ${path.relative(process.cwd(), outFile)}`);
}
