// Rend les icônes SVG de public/email en PNG @2x (64px affiché depuis un
// viewBox 48) — les clients mail n'affichent pas le SVG inline de façon fiable.
// Sortie : public/email/<name>@2x.png
import { Resvg } from '@resvg/resvg-js';
import { readdirSync, writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

const DIR = join(process.cwd(), 'public', 'email');
const FONT_DIR = join(process.cwd(), 'public', 'fonts', '_email');
const SIZE = 96; // affiché 48px → net sur écrans retina

if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });

const svgs = readdirSync(DIR).filter((f) => f.endsWith('.svg'));
for (const f of svgs) {
  const svg = readFileSync(join(DIR, f), 'utf8');
  const r = new Resvg(svg, {
    fitTo: { mode: 'width', value: SIZE },
    font: { fontDirs: [FONT_DIR], loadSystemFonts: false },
  });
  const png = r.render().asPng();
  const out = join(DIR, f.replace(/\.svg$/, '@2x.png'));
  writeFileSync(out, png);
  console.log('->', f.replace(/\.svg$/, '@2x.png'), Math.round(png.length / 1024) + ' Ko');
}
console.log(svgs.length, 'icônes rendues');
