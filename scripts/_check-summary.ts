import { summarizeDraw, cleanCut } from '@/lib/letter-summary';
import { PrismaClient } from '@prisma/client';

// Contrôle : pour CHAQUE tirage des 2 comptes de test, le résumé automatique
// doit produire au moins une face OU une synthèse — jamais les deux vides
// (sinon la section « ce que l'oracle a vu » serait un cadre vide).
const p = new PrismaClient();

(async () => {
  let total = 0, empty = 0, noFaces = 0, noSynth = 0;
  for (const email of ['tsalle@ik.me', 'tsalle@free.fr']) {
    const u = await p.user.findUnique({ where: { email }, select: { id: true } });
    if (!u) continue;
    const rs = await p.reading.findMany({ where: { userId: u.id }, orderBy: { createdAt: 'desc' } });
    for (const r of rs) {
      total++;
      const s = summarizeDraw(r, 'fr');
      const hasFaces = s.faces.length > 0;
      const hasSynth = !!s.synthesis && s.synthesis.length > 40;
      if (!hasFaces && !hasSynth) {
        empty++;
        console.log('  VIDE :', email, r.type);
      }
      if (!hasFaces) noFaces++;
      if (!hasSynth) noSynth++;
    }
    console.log('══', email, rs.length, 'tirages');
  }
  console.log();
  console.log('total tirages      :', total);
  console.log('sans faces         :', noFaces, `(${Math.round((noFaces / total) * 100)}%)`);
  console.log('sans synthèse      :', noSynth, `(${Math.round((noSynth / total) * 100)}%)`);
  console.log('SANS RIEN (à éviter):', empty);
  await p.$disconnect();
})();
