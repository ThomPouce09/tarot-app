// Génère lib/generated/media-opt.json : la liste des médias pour lesquels une
// version optimisée existe RÉELLEMENT dans public/media-opt/ (même arborescence
// que public/). Lu par lib/media.ts : tout média absent de cette liste est servi
// depuis son fichier d'origine — le reroutage ne peut donc jamais produire de 404.
// Exécuté avant chaque build/dev (hooks prebuild/predev, avec gen-backdrops) :
// déposer un fichier optimisé suffit, aucune édition de code.
const fs = require('fs');
const path = require('path');

const base = path.join(__dirname, '..', 'public', 'media-opt');
const outDir = path.join(__dirname, '..', 'lib', 'generated');
const files = [];

(function walk(dir, prefix) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.isDirectory()) walk(path.join(dir, e.name), rel);
    else files.push(`/${rel}`);
  }
})(base, '');

fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'media-opt.json');
fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), files: files.sort() }, null, 1));
console.log(`[gen-media-manifest] ${files.length} médias optimisés → ${path.relative(process.cwd(), out)}`);
