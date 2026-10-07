// scripts/seed-creatures-v2.ts
// ===========================================================================
// Seed des messages de créatures v2 (fichier « messages_creatures.txt »).
// - Annule et remplace TOUS les CreatureMessage existants.
// - Ajoute les colonnes manquantes : CreatureMessage.page / textEs / textHi.
// - Les cadeaux (credits_base / credits_grand) existent par page ; chaque
//   créature d'une page reçoit les messages de cette page.
// PERFORMANCE : insertion en BATCH de 100 lignes (multi-row VALUES) — le
// seed ligne-à-ligne via Neon distant dépassait 10 minutes et tombait en
// timeout. Convention projet : SQL direct via $queryRawUnsafe/$executeRawUnsafe.
// Exécution : npx tsx scripts/seed-creatures-v2.ts
// ===========================================================================
import { PrismaClient } from '@prisma/client';
import { LANDING } from './data/creature-msgs-landing';
import { TAROT } from './data/creature-msgs-tarot';
import { YI_JING } from './data/creature-msgs-yijing';
import { RUNES } from './data/creature-msgs-runes';
import { DES } from './data/creature-msgs-des';

const prisma = new PrismaClient();

type Msg = { category: string; fr: string; en: string; es: string; hi: string };

const BY_PAGE: Record<string, Msg[]> = {
  'landing': LANDING,
  'tarot': TAROT,
  'yi-jing': YI_JING,
  'runes': RUNES,
  'des-divinatoires': DES,
};

/** Échappe une chaîne SQL simple (les textes viennent du dépôt, pas de l'utilisateur). */
const q = (s: string) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;

async function ensureColumns() {
  const stmts = [
    `ALTER TABLE "CreatureMessage" ADD COLUMN IF NOT EXISTS "page" TEXT`,
    `ALTER TABLE "CreatureMessage" ADD COLUMN IF NOT EXISTS "textEs" TEXT`,
    `ALTER TABLE "CreatureMessage" ADD COLUMN IF NOT EXISTS "textHi" TEXT`,
    `CREATE INDEX IF NOT EXISTS "CreatureMessage_page_idx" ON "CreatureMessage"("page")`,
  ];
  for (const s of stmts) await prisma.$executeRawUnsafe(s);
  console.log('✔ Colonnes page/textEs/textHi prêtes');
}

async function main() {
  await ensureColumns();

  // 1. Purge TOTALE des messages (annule et remplace le corpus existant).
  const del = await prisma.$executeRawUnsafe(`DELETE FROM "CreatureMessage"`);
  console.log(`✔ ${del} anciens messages supprimés`);

  // 2. Toutes les lignes (créature x message) en mémoire.
  const creatures = await prisma.$queryRawUnsafe<{ id: string; slug: string; page: string }[]>(
    `SELECT "id","slug","page" FROM "Creature" WHERE "active" = true`,
  );
  console.log(`  créatures actives : ${creatures.length}`);

  const rows: string[] = [];
  for (const c of creatures) {
    const msgs = BY_PAGE[c.page];
    if (!msgs) { console.warn(`  ! page inconnue pour ${c.slug} (${c.page}) — ignorée`); continue; }
    for (const m of msgs) {
      rows.push(
        `(${q(crypto.randomUUID())},${q(c.id)},${q(m.category)},${q(c.page)},${q(m.fr)},${q(m.en)},${q(m.es)},${q(m.hi)})`,
      );
    }
    const gifts = msgs.filter((m) => m.category !== 'lore').length;
    console.log(`  ✓ ${c.slug} (${c.page}) : ${msgs.length} messages dont ${gifts} cadeaux`);
  }

  // 3. Insertion par lots de 100 (une seule requête réseau par lot).
  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "CreatureMessage" ("id","creatureId","category","page","textFr","textEn","textEs","textHi") VALUES ` +
        rows.slice(i, i + CHUNK).join(','),
    );
    console.log(`  … ${Math.min(i + CHUNK, rows.length)}/${rows.length} insérés`);
  }
  console.log(`✔ Seed terminé : ${rows.length} messages`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
