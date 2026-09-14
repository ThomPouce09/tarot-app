// Import du catalogue créatures v3 (CSV) dans Neon — script à usage unique.
// node scripts/import-creatures.cjs <chemin.csv>
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CSV = process.argv[2];
if (!CSV || !fs.existsSync(CSV)) { console.error('CSV introuvable'); process.exit(1); }

// page attendue par /api/creature : landing | tarot | runes | yi-jing | des-divinatoires
const PAGE = { landing: 'landing', tarot: 'tarot', runes: 'runes', 'yi-jing': 'yi-jing', des: 'des-divinatoires' };
const FOLDER = { landing: '', tarot: 'tarot/', runes: 'runes/', 'yi-jing': 'yi-jing/', des: 'des/' };

function parseCsvLine(line) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ';') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

(async () => {
  const raw = fs.readFileSync(CSV, 'utf8').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const header = parseCsvLine(lines[0]);
  console.log('colonnes:', header.join(' | '));
  const idx = (name) => header.findIndex((h) => h.startsWith(name));
  const iUni = idx('univers'), iSlug = idx('slug'), iFr = idx('nom FR'), iEn = idx('nom EN'),
        iFile = idx('fichier'), iCol = idx('couleur'), iCat = idx('catégorie'),
        iTextFr = idx('texte FR'), iTextEn = idx('texte EN');

  // ── Regroupement par créature ──
  const crea = new Map();
  for (const ln of lines.slice(1)) {
    const c = parseCsvLine(ln);
    const slug = c[iSlug].trim();
    if (!slug) continue;
    if (!crea.has(slug)) {
      crea.set(slug, {
        slug, name: c[iFr].trim(), nameEn: c[iEn].trim(),
        page: PAGE[c[iUni].trim()], image: '/images/creatures/' + FOLDER[c[iUni].trim()] + c[iFile].trim(),
        color: c[iCol].trim() || null, messages: [],
      });
    }
    crea.get(slug).messages.push({ category: c[iCat].trim(), textFr: c[iTextFr], textEn: c[iTextEn] });
  }
  console.log('créatures:', crea.size);

  // ── Désactive l'ancien catalogue (soft, réversible) ──
  const old = await prisma.creature.updateMany({ where: { active: true }, data: { active: false } });
  console.log('anciennes créatures désactivées:', old.count);

  // ── Upsert nouvelles créatures + messages (idempotent) ──
  let upC = 0, upM = 0;
  for (const c of crea.values()) {
    const row = await prisma.creature.upsert({
      where: { slug: c.slug },
      update: { name: c.name, page: c.page, image: c.image, color: c.color, active: true },
      create: { slug: c.slug, name: c.name, page: c.page, image: c.image, color: c.color, active: true },
    });
    upC++;
    for (const m of c.messages) {
      const exists = await prisma.creatureMessage.findFirst({
        where: { creatureId: row.id, category: m.category, textFr: m.textFr },
      });
      if (!exists) {
        await prisma.creatureMessage.create({
          data: { creatureId: row.id, category: m.category, textFr: m.textFr, textEn: m.textEn || null },
        });
        upM++;
      }
    }
  }
  console.log('créatures upsert:', upC, '| messages créés:', upM);

  // ── Vérification ──
  const actives = await prisma.creature.count({ where: { active: true } });
  const byPage = await prisma.$queryRaw`SELECT page, COUNT(*)::int AS n FROM "Creature" WHERE active = true GROUP BY page`;
  const totalMsg = await prisma.$queryRaw`SELECT COUNT(*)::int AS n FROM "CreatureMessage" m JOIN "Creature" c ON c."id" = m."creatureId" WHERE c."active" = true`;
  const byCat = await prisma.$queryRaw`SELECT m."category", COUNT(*)::int AS n FROM "CreatureMessage" m JOIN "Creature" c ON c."id" = m."creatureId" WHERE c."active" = true GROUP BY m."category"`;
  console.log('ACTIVES:', actives, JSON.stringify(byPage), '| messages:', totalMsg[0].n, JSON.stringify(byCat));
})()
  .catch((e) => { console.error('ERREUR', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
