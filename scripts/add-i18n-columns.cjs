// Ajout idempotent des colonnes/tables i18n (sans régénération du client Prisma :
// toutes les lectures/écritures de ces champs passent par du SQL brut).
//   User.language                — langue d'interface (lettre hebdo, emails)
//   Echo.textEs / Echo.textHi    — augures en espagnol / hindi
//   hexagrams_es / hexagrams_hi  — noms + synthèses des 64 hexagrammes
// La table `hexagrams` n'est JAMAIS modifiée.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const before = await prisma.$queryRawUnsafe(
    `SELECT table_name, column_name FROM information_schema.columns
     WHERE table_schema='public' AND table_name IN ('User','Echo')
     ORDER BY table_name, ordinal_position`
  );
  console.log('AVANT :');
  for (const r of before) console.log('  ' + r.table_name + '.' + r.column_name);

  await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS language text`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Echo" ADD COLUMN IF NOT EXISTS "textEs" text`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Echo" ADD COLUMN IF NOT EXISTS "textHi" text`);
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS hexagrams_es (numero int PRIMARY KEY, name_es text, synthese_es text)`
  );
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS hexagrams_hi (numero int PRIMARY KEY, name_hi text, synthese_hi text)`
  );

  const cols = await prisma.$queryRawUnsafe(
    `SELECT table_name, column_name FROM information_schema.columns
     WHERE table_schema='public' AND ((table_name IN ('User','Echo') AND column_name IN ('language','textEs','textHi'))
        OR table_name IN ('hexagrams_es','hexagrams_hi'))
     ORDER BY table_name, column_name`
  );
  console.log('APRES :');
  for (const r of cols) console.log('  ' + r.table_name + '.' + r.column_name);
}

main()
  .catch((e) => { console.error('ERREUR :', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
