// Génère les listes de fonds d'écran aléatoires depuis public/backgrounds/ :
//   lib/generated/backdrops-runes.json    → /backgrounds/runes*.jpg
//   lib/generated/backdrops-des.json      → /backgrounds/des-divinatoires*.jpg
//   lib/generated/backdrops-yi-jing.json  → /backgrounds/yi-jing-bg*.jpg|.mp4
//   lib/generated/backdrops-tarot.json    → /backgrounds/tarot-bg*.jpg|.mp4
// (tri numérique). Exécuté avant chaque build/dev (hooks prebuild/predev)
// → déposer un nouveau fichier numéroté suffit, aucune édition de code.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'public', 'backgrounds');
const outDir = path.join(__dirname, '..', 'lib', 'generated');

const JOBS = [
  { pattern: /^runes(\d+)\.(jpe?g|png|webp|mp4)$/i, out: 'backdrops-runes.json' },
  { pattern: /^des-divinatoires(\d+)\.(jpe?g|png|webp|mp4)$/i, out: 'backdrops-des.json' },
  // yi-jing : fichiers nommés yi-jing-bg.jpg, yi-jing-bg0.mp4, yi-jing-bg1.mp4…
  // Le numéro est extrait après "bg" (chaîne vide = -1 pour placer bg.jpg en premier).
  { pattern: /^yi-jing-bg(\d*)\.(jpe?g|png|webp|mp4)$/i, out: 'backdrops-yi-jing.json', numGroup: true },
  // tarot : fichiers nommés tarot-bg.jpg, tarot-bg1.jpg, tarot-bg4.mp4…
  // ⚠ le motif est ANCRÉ sur « tarot-bg » : « table-tarot-bg.jpg » (décor des
  // tirages) ne matche donc pas — il n'a rien à faire dans le pool des hubs.
  { pattern: /^tarot-bg(\d*)\.(jpe?g|png|webp|mp4)$/i, out: 'backdrops-tarot.json', numGroup: true },
];

const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
fs.mkdirSync(outDir, { recursive: true });

for (const job of JOBS) {
  const list = files
    .filter((f) => job.pattern.test(f))
    .sort((a, b) => {
      const ma = a.match(job.pattern)[1];
      const mb = b.match(job.pattern)[1];
      const na = job.numGroup ? (ma === '' ? -1 : parseInt(ma, 10)) : parseInt(ma, 10);
      const nb = job.numGroup ? (mb === '' ? -1 : parseInt(mb, 10)) : parseInt(mb, 10);
      return na - nb;
    })
    .map((f) => `/backgrounds/${f}`);
  const outFile = path.join(outDir, job.out);
  fs.writeFileSync(outFile, JSON.stringify(list, null, 2));
  console.log(`[gen-backdrops] ${list.length} fonds → ${path.relative(process.cwd(), outFile)}`);
}
