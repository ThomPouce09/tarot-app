// Génère le bandeau-titre de la lettre mystique en PNG, avec les polices
// réelles de l'app (Cinzel Decorative + Cormorant Garamond, cf. public/fonts).
// Les clients mail ne chargent pas les polices web : figer la typographie dans
// une image est le seul moyen fiable d'avoir le rendu de la marque.
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const W = 1200;
const H = 360;
const OUT_DIR = join(process.cwd(), 'public', 'email');
const OUT = join(OUT_DIR, 'letter-header.png');
// TTF convertis depuis les woff2 (resvg ne décode pas le woff2) :
// public/fonts/_email/*.ttf, générés une fois par scripts/_woff2-to-ttf.py.
const FONT_DIR = join(process.cwd(), 'public', 'fonts', '_email');

console.log('polices trouvées :', readdirSync(FONT_DIR).filter((f) => f.endsWith('.woff2') || f.endsWith('.ttf') || f.endsWith('.otf')).join(', '));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="sky" cx="50%" cy="0%" r="85%">
      <stop offset="0%" stop-color="#3a2456"/>
      <stop offset="55%" stop-color="#1d1130"/>
      <stop offset="100%" stop-color="#0a0510"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFF3C4"/>
      <stop offset="45%" stop-color="#F0C75E"/>
      <stop offset="100%" stop-color="#B8860B"/>
    </linearGradient>
    <radialGradient id="halo" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFD700" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#FFD700" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <ellipse cx="600" cy="118" rx="430" ry="195" fill="url(#halo)"/>
  <g fill="#F5EAD6" opacity="0.9">
    <circle cx="90" cy="70" r="2.4"/><circle cx="210" cy="150" r="1.8"/>
    <circle cx="330" cy="58" r="2.1"/><circle cx="470" cy="188" r="1.5"/>
    <circle cx="700" cy="72" r="2.6"/><circle cx="820" cy="162" r="1.6"/>
    <circle cx="950" cy="58" r="2.1"/><circle cx="1080" cy="140" r="1.8"/>
    <circle cx="160" cy="252" r="1.6"/><circle cx="1010" cy="266" r="1.7"/>
    <circle cx="560" cy="272" r="1.4"/><circle cx="880" cy="246" r="1.5"/>
    <circle cx="410" cy="120" r="1.5"/><circle cx="760" cy="230" r="1.4"/>
  </g>
  <g transform="translate(600 94)">
    <circle r="35" fill="none" stroke="url(#gold)" stroke-width="3"/>
    <path d="M -12 -23 A 25 25 0 1 0 -12 23 A 19 19 0 1 1 -12 -23" fill="#F0C75E" opacity="0.95"/>
  </g>
  <text x="600" y="234" text-anchor="middle" font-family="Cinzel Decorative" font-weight="700"
        font-size="62" letter-spacing="4" fill="url(#gold)">LETTRE MYSTIQUE</text>
  <line x1="350" y1="264" x2="850" y2="264" stroke="#DAA520" stroke-opacity="0.55" stroke-width="1.5"/>
  <text x="600" y="304" text-anchor="middle" font-family="Cormorant Garamond" font-style="italic"
        font-size="33" fill="#cbbfa6">Votre semaine avec l’Oracle</text>
</svg>`;

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const r = new Resvg(svg, {
  fitTo: { mode: 'width', value: W },
  font: { fontDirs: [FONT_DIR], loadSystemFonts: true, defaultFontFamily: 'Cinzel Decorative' },
});
const png = r.render().asPng();
writeFileSync(OUT, png);
console.log('OK', OUT, Math.round(png.length / 1024) + ' Ko', W + 'x' + H);
