// ===========================================================================
// Seed des messages de sagesse « pause repas » (1 par jour, bilingue FR/EN).
// Table DailyMessage (day 1-365, textFr, textEn) — créée via `prisma db push`.
// Upsert idempotent (ON CONFLICT day) : relançable sans doublon.
// Exécution : npx tsx --require dotenv/config scripts/seed-daily-messages.ts
// ===========================================================================
import { PrismaClient } from '@prisma/client';
import { DAILY_MESSAGES } from './data/daily-messages';

const prisma = new PrismaClient();

async function main() {
  let ups = 0;
  for (let i = 0; i < DAILY_MESSAGES.length; i++) {
    const [textFr, textEn] = DAILY_MESSAGES[i];
    const day = i + 1;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "DailyMessage" ("id", "day", "textFr", "textEn")
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ("day") DO UPDATE SET "textFr" = $3, "textEn" = $4`,
      crypto.randomUUID(), day, textFr, textEn,
    );
    ups++;
  }
  const total = await prisma.$queryRawUnsafe<{ count: number }[]>(
    `SELECT COUNT(*)::int AS count FROM "DailyMessage"`,
  );
  console.log(`✔ Seed DailyMessage : ${ups} messages (jours 1-${ups})`);
  console.log(`  Total en base : ${total[0].count}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
