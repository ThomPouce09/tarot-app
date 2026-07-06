// Script d'import des dates de période pour les hexagrammes
// Usage: node scripts/seed-hexagrams-dates.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const hexagramsWithDates = [
  { number: 1, dateDebut: new Date('2026-09-28'), dateFin: new Date('2026-10-02') },
  { number: 2, dateDebut: new Date('2026-02-13'), dateFin: new Date('2026-02-18') },
  { number: 3, dateDebut: new Date('2026-03-02'), dateFin: new Date('2026-03-07') },
  { number: 4, dateDebut: new Date('2026-11-10'), dateFin: new Date('2026-11-15') },
  { number: 5, dateDebut: new Date('2026-07-17'), dateFin: new Date('2026-07-22') },
  { number: 6, dateDebut: new Date('2026-10-08'), dateFin: new Date('2026-10-12') },
  { number: 7, dateDebut: new Date('2026-11-16'), dateFin: new Date('2026-11-21') },
  { number: 8, dateDebut: new Date('2026-02-02'), dateFin: new Date('2026-02-06') },
  { number: 9, dateDebut: new Date('2026-07-23'), dateFin: new Date('2026-07-28') },
  { number: 10, dateDebut: new Date('2026-07-02'), dateFin: new Date('2026-07-06') },
  { number: 11, dateDebut: new Date('2026-07-07'), dateFin: new Date('2026-07-11') },
  { number: 12, dateDebut: new Date('2026-01-06'), dateFin: new Date('2026-01-10') },
  { number: 13, dateDebut: new Date('2026-05-15'), dateFin: new Date('2026-05-20') },
  { number: 14, dateDebut: new Date('2026-08-04'), dateFin: new Date('2026-08-10') },
  { number: 15, dateDebut: new Date('2026-01-01'), dateFin: new Date('2026-01-05') },
  { number: 16, dateDebut: new Date('2026-01-21'), dateFin: new Date('2026-01-26') },
  { number: 17, dateDebut: new Date('2026-03-25'), dateFin: new Date('2026-03-29') },
  { number: 18, dateDebut: new Date('2026-08-28'), dateFin: new Date('2026-09-02') },
  { number: 19, dateDebut: new Date('2026-05-21'), dateFin: new Date('2026-05-26') },
  { number: 20, dateDebut: new Date('2026-01-27'), dateFin: new Date('2026-02-01') },
  { number: 21, dateDebut: new Date('2026-03-20'), dateFin: new Date('2026-03-24') },
  { number: 22, dateDebut: new Date('2026-04-10'), dateFin: new Date('2026-04-14') },
  { number: 23, dateDebut: new Date('2026-02-07'), dateFin: new Date('2026-02-12') },
  { number: 24, dateDebut: new Date('2026-02-19'), dateFin: new Date('2026-02-24') },
  { number: 25, dateDebut: new Date('2026-03-30'), dateFin: new Date('2026-04-04') },
  { number: 26, dateDebut: new Date('2026-07-12'), dateFin: new Date('2026-07-16') },
  { number: 27, dateDebut: new Date('2026-02-25'), dateFin: new Date('2026-03-01') },
  { number: 28, dateDebut: new Date('2026-08-29'), dateFin: new Date('2026-09-03') },
  { number: 29, dateDebut: new Date('2026-11-04'), dateFin: new Date('2026-11-09') },
  { number: 30, dateDebut: new Date('2026-05-02'), dateFin: new Date('2026-05-07') },
  { number: 31, dateDebut: new Date('2026-11-28'), dateFin: new Date('2026-12-03') },
  { number: 32, dateDebut: new Date('2026-09-11'), dateFin: new Date('2026-09-16') },
  { number: 33, dateDebut: new Date('2026-11-22'), dateFin: new Date('2026-11-27') },
  { number: 34, dateDebut: new Date('2026-07-29'), dateFin: new Date('2026-08-03') },
  { number: 35, dateDebut: new Date('2026-01-16'), dateFin: new Date('2026-01-20') },
  { number: 36, dateDebut: new Date('2026-04-05'), dateFin: new Date('2026-04-09') },
  { number: 37, dateDebut: new Date('2026-04-20'), dateFin: new Date('2026-04-25') },
  { number: 38, dateDebut: new Date('2026-06-21'), dateFin: new Date('2026-06-26') },
  { number: 39, dateDebut: new Date('2026-12-22'), dateFin: new Date('2026-12-26') },
  { number: 40, dateDebut: new Date('2026-10-23'), dateFin: new Date('2026-10-28') },
  { number: 41, dateDebut: new Date('2026-05-27'), dateFin: new Date('2026-06-01') },
  { number: 42, dateDebut: new Date('2026-03-08'), dateFin: new Date('2026-03-13') },
  { number: 43, dateDebut: new Date('2026-08-11'), dateFin: new Date('2026-08-16') },
  { number: 44, dateDebut: new Date('2026-08-23'), dateFin: new Date('2026-08-28') },
  { number: 45, dateDebut: new Date('2026-01-11'), dateFin: new Date('2026-01-15') },
  { number: 46, dateDebut: new Date('2026-10-03'), dateFin: new Date('2026-10-07') },
  { number: 47, dateDebut: new Date('2026-10-13'), dateFin: new Date('2026-10-17') },
  { number: 48, dateDebut: new Date('2026-09-23'), dateFin: new Date('2026-09-27') },
  { number: 49, dateDebut: new Date('2026-05-08'), dateFin: new Date('2026-05-14') },
  { number: 50, dateDebut: new Date('2026-09-04'), dateFin: new Date('2026-09-10') },
  { number: 51, dateDebut: new Date('2026-03-14'), dateFin: new Date('2026-03-19') },
  { number: 52, dateDebut: new Date('2026-12-27'), dateFin: new Date('2026-12-31') },
  { number: 53, dateDebut: new Date('2026-12-16'), dateFin: new Date('2026-12-21') },
  { number: 54, dateDebut: new Date('2026-06-15'), dateFin: new Date('2026-06-20') },
  { number: 55, dateDebut: new Date('2026-04-26'), dateFin: new Date('2026-05-01') },
  { number: 56, dateDebut: new Date('2026-12-04'), dateFin: new Date('2026-12-09') },
  { number: 57, dateDebut: new Date('2026-09-17'), dateFin: new Date('2026-09-22') },
  { number: 58, dateDebut: new Date('2026-06-27'), dateFin: new Date('2026-07-01') },
  { number: 59, dateDebut: new Date('2026-10-29'), dateFin: new Date('2026-11-03') },
  { number: 60, dateDebut: new Date('2026-06-02'), dateFin: new Date('2026-06-08') },
  { number: 61, dateDebut: new Date('2026-06-09'), dateFin: new Date('2026-06-14') },
  { number: 62, dateDebut: new Date('2026-12-10'), dateFin: new Date('2026-12-15') },
  { number: 63, dateDebut: new Date('2026-04-11'), dateFin: new Date('2026-04-19') },
  { number: 64, dateDebut: new Date('2026-10-18'), dateFin: new Date('2026-10-22') }
];

async function main() {
  console.log('📅 Mise à jour des dates de période pour les hexagrammes...');
  for (const h of hexagramsWithDates) {
    await prisma.hexagram.update({
      where: { number: h.number },
      data: {
        dateDebut: h.dateDebut,
        dateFin: h.dateFin
      }
    });
  }

  const count = await prisma.hexagram.count({
    where: {
      dateDebut: { not: null },
      dateFin: { not: null }
    }
  });
  console.log(`✅ ${count} hexagrammes mis à jour avec leurs périodes !`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
