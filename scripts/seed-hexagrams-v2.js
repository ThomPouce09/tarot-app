// Seed des 64 hexagrammes dans le modèle Prisma `Hexagram` (table hexagrams).
// Source : drizzle/import_hexagrams.sql (dump d'origine) + corrections :
//  - caractères CJK de compatibilité (⽐→比, ⼩→小, ⼤→大, ⽆→无, ⾰→革, ⿍→鼎, ⾉→艮)
//  - pinyin restaurés (16豫 Yù, 22賁 Bì)
//  - dates '12/07 -16/07' / '04/11-09/11' éclatées en debut/fin propres
// Usage : node scripts/seed-hexagrams-v2.js
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Repli si une date est illisible : période de 5 jours décalée par numéro.
function fallbackPeriod(numero) {
  const startDay = ((numero - 1) * 5) % 365; // jour 0 = 01/01
  const d = new Date(2026, 0, 1 + startDay);
  const e = new Date(2026, 0, 1 + startDay + 4);
  const f = (x) => String(x.getDate()).padStart(2, '0') + '/' + String(x.getMonth() + 1).padStart(2, '0');
  return [f(d), f(e)];
}

const COMPAT = { '⽐': '比', '⼩': '小', '⼤': '大', '⽆': '无', '⾰': '革', '⿍': '鼎', '⾉': '艮' };
const PINYIN_FIX = { 16: 'Yù', 22: 'Bì' };

function parseVals(body) {
  const out = []; let cur = ''; let inStr = false;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === "'") {
      if (inStr && body[i + 1] === "'") { cur += "'"; i++; } else inStr = !inStr;
    } else if (c === ',' && !inStr) { out.push(cur.trim()); cur = ''; }
    else cur += c;
  }
  out.push(cur.trim());
  return out;
}

async function main() {
  const sqlPath = path.join(__dirname, '..', 'drizzle', 'import_hexagrams.sql');
  const lines = fs.readFileSync(sqlPath, 'utf8').split(/\r?\n/).filter((l) => l.startsWith('INSERT'));
  console.log(`📥 ${lines.length} lignes dans le dump…`);

  let ok = 0;
  for (const l of lines) {
    const start = l.indexOf('VALUES (');
    const end = l.indexOf(') ON CONFLICT');
    const body = l.slice(start + 8, end < 0 ? undefined : end);
    const [numeroS, dateDebut, dateFin, caractere, pinyin, element, strategie, attitude, conseil, synthese, lignes] = parseVals(body);
    const numero = parseInt(numeroS, 10);

    // ── Nettoyage ──
    let dd = dateDebut, df = dateFin;
    const range = dd.match(/^(\d{2}\/\d{2})\s*-\s*(\d{2}\/\d{2})$/);
    if (range) { dd = range[1]; df = range[2]; }
    if (!/^\d{2}\/\d{2}$/.test(dd) || !/^\d{2}\/\d{2}$/.test(df)) {
      [dd, df] = fallbackPeriod(numero);
      console.log(`  ⚠️  hex ${numero}: dates invalides → repli ${dd}-${df}`);
    }
    const car = (COMPAT[caractere] || caractere || '?').trim();
    const pin = PINYIN_FIX[numero] || pinyin;

    await prisma.hexagram.upsert({
      where: { numero },
      update: { dateDebut: dd, dateFin: df, caractere: car, pinyin: pin, element, strategie, attitude, conseil, synthese, lignes },
      create: { numero, dateDebut: dd, dateFin: df, caractere: car, pinyin: pin, element, strategie, attitude, conseil, synthese, lignes },
    });
    ok++;
  }
  const count = await prisma.hexagram.count();
  console.log(`✅ ${ok} lignes traitées, ${count} hexagrammes en base.`);
}

main()
  .catch((e) => { console.error('❌', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
