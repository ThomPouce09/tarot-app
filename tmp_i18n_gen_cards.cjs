// Générateur i18n des noms de cartes et libellés de position.
// Entre : tmp/i18n/cards_es_hi.json (produit par les traducteurs :
//   { majors:[{id:'m0',en,es,hi}…22], minors:{'Bâtons':{en:[14],es:[14],hi:[14]},…},
//     positions:{pos3:{en,es,hi},posCross:{…},nornes:{…}} })
// Sortie : lib/tarot-data-i18n.ts — tables indexées par id FR + helpers.
// Idempotent. À relancer si les noms évoluent.
const fs = require('fs');
const src = JSON.parse(fs.readFileSync('tmp/i18n/cards_es_hi.json', 'utf8'));

const majors = {};
for (const m of src.majors) majors[m.id] = m; // id = 'm0'..'m21'

const SUIT_MAP = { 'Bâtons': 'Bâtons', 'Coupes': 'Coupes', 'Épées': 'Épées', 'Deniers': 'Deniers' };

const out = [];
out.push('// lib/tarot-data-i18n.ts — Noms des 78 cartes + libellés de position en 4 langues.');
out.push('// GÉNÉRÉ par tmp_i18n_gen_cards.cjs depuis tmp/i18n/cards_es_hi.json — ne pas éditer à la main.');
out.push('');
out.push('import type { Lang } from \'./i18n\';');
out.push('');
out.push('export type NameVariants = { es: string; hi: string };');
out.push('');
out.push('/** Majors : index = id du tarot (0-21). */');
out.push('export const MAJOR_NAMES_I18N: (NameVariants | null)[] = [');
for (let i = 0; i <= 21; i++) {
  const m = majors['m' + i];
  if (!m) { out.push('  null,'); continue; }
  out.push(`  { es: ${JSON.stringify(m.es)}, hi: ${JSON.stringify(m.hi)} },`);
}
out.push('];');
out.push('');
out.push('/** Minors : suite FR -> 14 noms (ordre : As..Dix, Valet, Cavalier, Reine, Roi). */');
out.push('export const MINOR_NAMES_I18N: Record<string, NameVariants[]> = {');
for (const suit of ['Bâtons', 'Coupes', 'Épées', 'Deniers']) {
  const v = src.minors && src.minors[suit];
  if (!v) throw new Error('minors manquants pour ' + suit);
  for (const lg of ['en', 'es', 'hi']) {
    if (!Array.isArray(v[lg]) || v[lg].length !== 14 || v[lg].some((x) => !String(x).trim())) {
      if (lg==='es'||lg==='hi') throw new Error(`minors ${suit}.${lg} incomplet`);
    }
  }
  out.push(`  ${JSON.stringify(suit)}: [`);
  for (let i = 0; i < 14; i++) {
    out.push(`    { es: ${JSON.stringify(v.es[i])}, hi: ${JSON.stringify(v.hi[i])} },`);
  }
  out.push('  ],');
}
out.push('};');
out.push('');
out.push('/** Libellés de position (sélecteurs passés au composant de tirage). */');
const P = src.positions;
for (const key of ['pos3', 'posCross', 'nornes']) {
  const v = P[key];
  if (!v) throw new Error('positions.' + key + ' manquant');
  const varName = key === 'pos3' ? 'POSITION_LABELS_3' : key === 'posCross' ? 'POSITION_LABELS_CROSS' : 'NORNES_POSITIONS';
  out.push(`export const ${varName}: Record<Lang, string[]> = {`);
  out.push(`  fr: ${JSON.stringify(v.fr)},`);
  out.push(`  en: ${JSON.stringify(v.en)},`);
  out.push(`  es: ${JSON.stringify(v.es)},`);
  out.push(`  hi: ${JSON.stringify(v.hi)},`);
  out.push('};');
  out.push('');
}
out.push('/** Nom localisé d\'une carte (id 0-77). EN : via card.nameEn existant (non passé ici).');
out.push(" *  lang fr → fr ; es/hi → table ; en → fallback fr (l'appelant utilise nameEn). */");
out.push('export function tarotNameI18n(id: number, fr: string, lang: Lang, nameEn?: string): string {');
out.push('  if (lang === \'fr\') return fr;');
out.push('  if (lang === \'en\') return nameEn || fr;');
out.push('  const pick = (t: { es: string; hi: string } | null | undefined) => (lang === \'es\' ? t?.es : t?.hi) || fr;');
out.push('  if (id <= 21) return pick(MAJOR_NAMES_I18N[id]);');
out.push('  const suitIdx = Math.floor((id - 22) / 14);');
out.push('  const cardIdx = (id - 22) % 14;');
out.push('  const suits = [\'Bâtons\', \'Coupes\', \'Épées\', \'Deniers\'];');
out.push('  return pick(MINOR_NAMES_I18N[suits[suitIdx]]?.[cardIdx]);');
out.push('}');
out.push('');
fs.writeFileSync('lib/tarot-data-i18n.ts', out.join('\n'));
console.log('lib/tarot-data-i18n.ts généré');
