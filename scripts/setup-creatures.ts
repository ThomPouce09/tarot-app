// ===========================================================================
// Setup + seed des créatures errantes (lucioles / petits personnages)
// Convention projet : SQL direct (pas de prisma db push) pour ne pas toucher
// aux tables existantes (hexagrams, messages_attente...).
// Aucun `prisma generate` requis : on utilise $queryRawUnsafe / $executeRawUnsafe.
// Exécution: npx tsx scripts/setup-creatures.ts
// ===========================================================================
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SQL_TABLES = `
CREATE TABLE IF NOT EXISTS "Creature" (
  "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug"       TEXT NOT NULL UNIQUE,
  "name"       TEXT NOT NULL,
  "image"      TEXT NOT NULL,
  "page"       TEXT NOT NULL,
  "color"      TEXT,
  "active"     BOOLEAN NOT NULL DEFAULT true,
  "createdAt"  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "CreatureMessage" (
  "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "creatureId" TEXT NOT NULL REFERENCES "Creature"("id") ON DELETE CASCADE,
  "category"   TEXT NOT NULL,
  "textFr"     TEXT NOT NULL,
  "textEn"     TEXT,
  "createdAt"  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "CreatureMessage_creatureId_idx" ON "CreatureMessage"("creatureId");
`;

// Créatures exemple (visuels fournis par l'utilisateur)
const CREATURES = [
  // Landing : elfes + bohémiens/bohémiennes
  { slug: 'elfe1', name: 'Elfe Aëlin', image: '/images/creatures/elfe1.png', page: 'landing', color: '#FFE9A8' },
  { slug: 'elfe2', name: 'Elfe Bëor', image: '/images/creatures/elfe2.png', page: 'landing', color: '#E0CFF0' },
  { slug: 'elfe3', name: 'Elfe Cael', image: '/images/creatures/elfe3.png', page: 'landing', color: '#C8E6FF' },
  { slug: 'elfe4', name: 'Elfe Dore', image: '/images/creatures/elfe4.png', page: 'landing', color: '#FFD700' },
  { slug: 'elfe5', name: 'Elfe Esya', image: '/images/creatures/elfe5.png', page: 'landing', color: '#D4B483' },
  { slug: 'bohemien1', name: 'Bohémien Lou', image: '/images/creatures/bohemien1.png', page: 'landing', color: '#D4B483' },
  { slug: 'bohemienne1', name: 'Bohémienne Mia', image: '/images/creatures/bohemienne1.png', page: 'landing', color: '#FFE9A8' },
  { slug: 'bohemienne2', name: 'Bohémienne Sol', image: '/images/creatures/bohemienne2.png', page: 'landing', color: '#E0CFF0' },
  // Tarot : bohémiens/bohémiennes
  { slug: 'bohemien1-tarot', name: 'Bohémien Lou', image: '/images/creatures/bohemien1.png', page: 'tarot', color: '#D4B483' },
  { slug: 'bohemienne1-tarot', name: 'Bohémienne Mia', image: '/images/creatures/bohemienne1.png', page: 'tarot', color: '#FFE9A8' },
  { slug: 'bohemienne2-tarot', name: 'Bohémienne Sol', image: '/images/creatures/bohemienne2.png', page: 'tarot', color: '#E0CFF0' },
  // Yi Jing : dragons
  { slug: 'dragon', name: 'Dragon Céleste', image: '/images/creatures/dragon.png', page: 'yi-jing', color: '#E0CFF0' },
  { slug: 'dragon2', name: 'Dragon d\'Jade', image: '/images/creatures/dragon2.png', page: 'yi-jing', color: '#C8E6FF' },
  // Runes (à venir) : elfes + trollinet
  { slug: 'elfe1-runes', name: 'Elfe Aëlin', image: '/images/creatures/elfe1.png', page: 'runes', color: '#FFE9A8' },
  { slug: 'elfe2-runes', name: 'Elfe Bëor', image: '/images/creatures/elfe2.png', page: 'runes', color: '#E0CFF0' },
  { slug: 'trollinet2', name: 'Trollinet Bûrr', image: '/images/creatures/trollinet2.png', page: 'runes', color: '#D4B483' },
  // Dés du Zodiaque : elfes + bohémien
  { slug: 'elfe3-des', name: 'Elfe Cael', image: '/images/creatures/elfe3.png', page: 'des-divinatoires', color: '#C8E6FF' },
  { slug: 'elfe4-des', name: 'Elfe Dore', image: '/images/creatures/elfe4.png', page: 'des-divinatoires', color: '#FFD700' },
  { slug: 'bohemien1-des', name: 'Bohémien Lou', image: '/images/creatures/bohemien1.png', page: 'des-divinatoires', color: '#D4B483' },
];

// Messages par créature (FR + EN). categories: tips|credits|lore|advice|joke|history
const MESSAGES: Record<string, { category: string; textFr: string; textEn: string }[]> = {
  'elfe1': [
    { category: 'lore', textFr: 'Bienvenue dans l\'Oracle des Étoiles ✦ Ici, chaque tirage est une rencontre.', textEn: 'Welcome to the Oracle of the Stars ✦ Here, every draw is a meeting.' },
    { category: 'tips', textFr: 'Astuce : change la langue dans Mon espace → Préférences.', textEn: 'Tip: switch language in My space → Preferences.' },
    { category: 'history', textFr: 'Le tarot parle depuis le XVe siècle. Nous ne faisons que l\'écouter.', textEn: 'Tarot has spoken since the 15th century. We merely listen.' },
  ],
  'elfe2': [
    { category: 'lore', textFr: 'Les étoiles t\'observent. Ose leur poser ta question.', textEn: 'The stars are watching. Dare to ask them your question.' },
    { category: 'joke', textFr: 'Pourquoi l\'elfe ne se perd-il jamais ? Il suit la lumière… comme toi.', textEn: 'Why does the elf never get lost? He follows the light… like you.' },
  ],
  'elfe3': [
    { category: 'advice', textFr: 'Une bonne question est courte et honnête. Le reste vient seul.', textEn: 'A good question is short and honest. The rest comes on its own.' },
    { category: 'lore', textFr: 'Les runes ne prédisent pas ; elles révèlent.', textEn: 'Runes do not predict; they reveal.' },
  ],
  'elfe4': [
    { category: 'history', textFr: 'Gravees il y a 1800 ans, les runes gardent la mémoire du Nord.', textEn: 'Carved 1800 years ago, runes keep the memory of the North.' },
    { category: 'credits', textFr: 'Offre : ton 1er tirage du jour est offert. Profite-en ✦', textEn: 'Offer: your first draw of the day is free. Enjoy ✦' },
  ],
  'elfe5': [
    { category: 'advice', textFr: 'Tarot : laisse la première carte te surprendre avant de la nommer.', textEn: 'Tarot: let the first card surprise you before naming it.' },
    { category: 'tips', textFr: 'Ton historique garde toutes tes lectures. Reviens-y quand tu veux.', textEn: 'Your history keeps every reading. Return whenever you wish.' },
  ],
  'bohemien1': [
    { category: 'lore', textFr: 'Bienvenue voyageur. L\'univers du tarot t\'attend.', textEn: 'Welcome traveler. The world of tarot awaits.' },
    { category: 'history', textFr: 'Les bohémiens lisent les cartes depuis des siècles, de campement en campement.', textEn: 'Bohemians have read cards for centuries, from camp to camp.' },
  ],
  'bohemienne1': [
    { category: 'advice', textFr: 'Pose ta question à voix basse, le destin écoute.', textEn: 'Ask your question softly, fate is listening.' },
    { category: 'joke', textFr: 'La bohémienne a tiré 78 cartes… et n\'a toujours pas choisi.', textEn: 'The bohemian drew 78 cards… and still hasn\'t chosen.' },
  ],
  'bohemienne2': [
    { category: 'credits', textFr: 'Offre : ton 1er tirage du jour est offert. Profite-en ✦', textEn: 'Offer: your first draw of the day is free. Enjoy ✦' },
    { category: 'lore', textFr: 'Chaque carte est une porte. Laquelle pousses-tu ?', textEn: 'Each card is a door. Which one do you push?' },
  ],
  'bohemien1-tarot': [
    { category: 'advice', textFr: 'Tarot : laisse la première carte te surprendre avant de la nommer.', textEn: 'Tarot: let the first card surprise you before naming it.' },
    { category: 'lore', textFr: 'Les arcanes aiment les esprits libres. Comme toi.', textEn: 'The arcana love free spirits. Like you.' },
  ],
  'bohemienne1-tarot': [
    { category: 'tips', textFr: 'Ton historique garde toutes tes lectures. Reviens-y quand tu veux.', textEn: 'Your history keeps every reading. Return whenever you wish.' },
    { category: 'advice', textFr: 'Une question claire donne une réponse nette.', textEn: 'A clear question gives a clear answer.' },
  ],
  'bohemienne2-tarot': [
    { category: 'history', textFr: 'Le tarot parle depuis le XVe siècle. Nous ne faisons que l\'écouter.', textEn: 'Tarot has spoken since the 15th century. We merely listen.' },
    { category: 'joke', textFr: 'La bohémienne a bu le café des cartes… elles lui ont tout dit.', textEn: 'The bohemian drank the cards\' coffee… they told her everything.' },
  ],
  'dragon': [
    { category: 'advice', textFr: 'Yi Jing : lance tes 3 pièces, puis écoute le calme.', textEn: 'I Ching: cast your 3 coins, then listen to the calm.' },
    { category: 'lore', textFr: 'Le Yi Jing est le plus ancien livre de sagesse de Chine.', textEn: 'The I Ching is the oldest book of wisdom in China.' },
    { category: 'history', textFr: 'Depuis 3000 ans, il guide les décisions sans jamais forcer.', textEn: 'For 3000 years it has guided decisions without ever forcing.' },
  ],
  'dragon2': [
    { category: 'lore', textFr: 'Le dragon veille sur les hexagrammes. Interroge-les.', textEn: 'The dragon watches over the hexagrams. Ask them.' },
    { category: 'advice', textFr: 'Une décision juste naît du silence, pas du bruit.', textEn: 'A right decision is born of silence, not noise.' },
  ],
  'elfe1-runes': [
    { category: 'advice', textFr: 'Runes : pose une question fermée. La réponse sera nette.', textEn: 'Runes: ask a closed question. The answer will be clear.' },
    { category: 'lore', textFr: 'Les runes ne prédisent pas ; elles révèlent.', textEn: 'Runes do not predict; they reveal.' },
  ],
  'elfe2-runes': [
    { category: 'history', textFr: 'Gravees il y a 1800 ans, les runes gardent la mémoire du Nord.', textEn: 'Carved 1800 years ago, runes keep the memory of the North.' },
    { category: 'tips', textFr: 'Astuce : une rune par jour éclaire une semaine.', textEn: 'Tip: one rune a day lights up a week.' },
  ],
  'trollinet2': [
    { category: 'joke', textFr: 'Le trollinet a renversé la pierre runique… elle a roulé vers la vérité.', textEn: 'The trollkin knocked over the rune stone… it rolled toward the truth.' },
    { category: 'lore', textFr: 'Sous la terre, les runes dorment. Le trollinet les réveille.', textEn: 'Beneath the earth, runes sleep. The trollkin wakes them.' },
  ],
  'elfe3-des': [
    { category: 'advice', textFr: 'Dés du Zodiaque : laisse le hasard choisir la face. La planète, le signe et la maison parleront.', textEn: 'Dice of the Zodiac: let chance choose the face. Planet, sign and house will speak.' },
    { category: 'lore', textFr: 'Trois dés, douze faces : un mini-univers pour éclairer ta question.', textEn: 'Three dice, twelve faces: a mini-universe to light your question.' },
  ],
  'elfe4-des': [
    { category: 'tips', textFr: 'Astuce : affine un tirage déjà clair avec le mode Affinage.', textEn: 'Tip: refine a clear draw with the Affinage mode.' },
    { category: 'history', textFr: 'Les dés astraux relient l’astrologie aux tirages depuis l’Antiquité.', textEn: 'Astral dice link astrology to draws since antiquity.' },
  ],
  'bohemien1-des': [
    { category: 'advice', textFr: 'Hésite entre deux chemins ? Le tirage du Choix compare leurs énergies.', textEn: 'Torn between two paths? The Choice draw compares their energies.' },
    { category: 'lore', textFr: 'Chaque dé est une porte sur le destin. Laquelle lances-tu ?', textEn: 'Each die is a door to fate. Which do you cast?' },
  ],
};

async function main() {
  console.log('▶ Création des tables Creature / CreatureMessage…');
  const stmts = SQL_TABLES.split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const stmt of stmts) {
    await prisma.$executeRawUnsafe(stmt);
  }
  console.log('✔ Tables prêtes');

  // Nettoyage des créatures placeholder d'origine (visuels non fournis)
  const LEGACY = ['luciole-aria', 'luciole-vesper', 'renard-rune', 'hibou-tarot', 'dragon-yijing'];
  for (const slug of LEGACY) {
    await prisma.$executeRawUnsafe(`DELETE FROM "Creature" WHERE "slug" = $1`, slug);
  }

  for (const c of CREATURES) {
    // $queryRawUnsafe (pas de Prisma.sql) : le client Prisma n'est PAS généré
    // en CI (pas de schema.prisma) → le namespace Prisma y est incomplet.
    // Cast après appel au lieu d'un type argument (TS2347 sinon).
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT "id" FROM "Creature" WHERE "slug" = $1`,
      c.slug,
    )) as { id: string }[];
    let id: string;
    if (rows.length) {
      id = rows[0].id;
      await prisma.$executeRawUnsafe(
        `UPDATE "Creature" SET "name"=$1,"image"=$2,"page"=$3,"color"=$4,"active"=true WHERE "slug"=$5`,
        c.name, c.image, c.page, c.color, c.slug,
      );
      console.log(`↻ ${c.slug} mis à jour`);
    } else {
      const creatureId = crypto.randomUUID();
      const ins = (await prisma.$queryRawUnsafe(
        `INSERT INTO "Creature" ("id","slug","name","image","page","color") VALUES ($1,$2,$3,$4,$5,$6) RETURNING "id"`,
        creatureId, c.slug, c.name, c.image, c.page, c.color,
      )) as { id: string }[];
      id = ins[0].id;
      console.log(`＋ ${c.slug} créé`);
    }
    // (Ré)seed des messages (idempotent : on vide puis réinsère)
    await prisma.$executeRawUnsafe(`DELETE FROM "CreatureMessage" WHERE "creatureId" = $1`, id);
    for (const m of MESSAGES[c.slug] || []) {
      const msgId = crypto.randomUUID();
      await prisma.$executeRawUnsafe(
        `INSERT INTO "CreatureMessage" ("id","creatureId","category","textFr","textEn") VALUES ($1,$2,$3,$4,$5)`,
        msgId, id, m.category, m.textFr, m.textEn,
      );
    }
  }
  console.log('✔ Seed terminé');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
