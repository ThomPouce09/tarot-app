#!/usr/bin/env node
/**
 * Garde-fou i18n es/hi — vérifie SANS navigateur que lib/i18n/ui.ts est sain.
 *
 * Détecte les échecs mécaniques de traduction (ceux qu'un LLM produit vraiment) :
 *   1. champ es ou hi absent
 *   2. valeur es/hi identique au français (copie verbatim — piège déjà observé)
 *   3. valeur hi sans aucun caractère devanagari (hors noms propres autorisés)
 *   4. valeur es contenant un caractère propre au français (ç œ à è ù ê î ô û ë)
 *   5. valeur fr dupliquée comme es/hi alors qu'elle porte un mot-outil français
 *
 * Usage : node scripts/check-i18n-es-hi.cjs   (exit 1 si au moins une anomalie)
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'lib', 'i18n', 'ui.ts');
const src = fs.readFileSync(FILE, 'utf8');

// Noms propres / sigles qui restent identiques dans toutes les langues.
const PROPER = /^(Tarot|Yi Jing|I Ching|Yi Qing|Runes?|Runas|Email|OK|Mjölnir|Yggdrasil|Arkane|Hávamál|Odin|Odín|Zodiaque|Zodiac|Zodiaco|Promenades|Silver Well|La Base|Base|bases|Disponible|Initié|Initiés)\b/i;
// Caractères utilisés en français mais pas en espagnol courant.
const FR_ONLY_CHARS = /[çœàèùêîôûë]/i;
// Mots-outils STRICTEMENT français. Les homographes espagnols (la, le, des, sur) sont
// exclus, et on n'utilise PAS \b : en JS il ignore les lettres accentuées, donc
// « está » était découpé en « est » + « á » et produisait un faux positif.
const FR_WORDS = /(^|[^A-Za-zÀ-ÿ])(votre|vos|avec|dans|pour|plus|sont|être|tout|toute|aucun|aucune|rien|vers|chez|sans|sous|du|une|les|est)([^A-Za-zÀ-ÿ]|$)/i;


const entries = [];
const re = /^ {2}'([^']+)':\s*\{(.*?)\},\s*$/gm;
let m;
while ((m = re.exec(src)) !== null) entries.push([m[1], m[2]]);

function field(body, name) {
  const idx = body.search(new RegExp('\\b' + name + ':\\s*'));
  if (idx === -1) return null;
  let i = body.indexOf(':', idx) + 1;
  while (body[i] === ' ') i++;
  const q = body[i];
  if (q !== '"' && q !== "'") return null;
  const j = body.indexOf(q, i + 1);
  return body.slice(i + 1, j);
}

const problems = [];
for (const [key, body] of entries) {
  const fr = field(body, 'fr');
  const es = field(body, 'es');
  const hi = field(body, 'hi');
  if (es == null) problems.push(['ES manquant', key]);
  if (hi == null) problems.push(['HI manquant', key]);
  if (es != null && fr != null && es === fr && !PROPER.test(fr)) problems.push(['ES = FR (copie)', key]);
  if (hi != null && fr != null && hi === fr && !PROPER.test(fr)) problems.push(['HI = FR (copie)', key]);
  if (hi != null && !/[\u0900-\u097F]/.test(hi) && !PROPER.test(hi)) problems.push(['HI sans devanagari', key]);
  if (es != null && FR_ONLY_CHARS.test(es)) problems.push(['ES contient des caracteres francais', key]);
  if (es != null && FR_WORDS.test(es) && !PROPER.test(es)) problems.push(['ES contient des mots-outils francais', key]);
  if (hi != null && FR_WORDS.test(hi) && !/[\u0900-\u097F]/.test(hi)) problems.push(['HI contient des mots francais', key]);
}

console.log('Entrees DICT analysees : ' + entries.length);
if (problems.length === 0) {
  console.log('OK - aucune anomalie mecanique es/hi detectee.');
  process.exit(0);
}
console.log('Anomalies : ' + problems.length);
for (const [kind, key] of problems) console.log('  [' + kind + '] ' + key);
process.exit(1);
