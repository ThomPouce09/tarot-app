// fix-hexagram-lignes.ts — Correction ciblée (2 lignes) de la table hexagrams.
//
// DIAGNOSTIC (audit-hexagrams.ts, confirmé par comparaison croisée) :
//   - 17 (Suivi, 随) stockait les traits de 54 (Épousée) — trigrammes inversés
//   - 21 (Morsure, 噬嗑) stockait les traits de 55 (Abondance) — même inversion
//   Les 62 autres lignes de la table sont conformes à la table KING_WEN_BINARY
//   du code (lib/yi-daily.ts), elle-même validée par les canons (15,22,56,63,64).
//
// Format stocké : tableau de 6 chaînes, index 0 = ligne du HAUT ;
// trait plein "━━━━━" = yang (1), brisé "━ ━ ━" = yin (0).
//
// Valeurs canoniques (bas->haut) : 17 = 100110 (Tonnerre dessous, Lac dessus),
// 21 = 100101 (Tonnerre dessous, Feu dessus). On les renverse pour le stockage.

import { PrismaClient } from '@prisma/client';

const Y = '━━━━━'; // yang
const N = '━ ━ ━'; // yin

// haut -> bas
const FIX: Record<number, string[]> = {
  17: '011001'.split('').map((b) => (b === '1' ? Y : N)), // = '100110' retourne (bas->haut canon)
  21: '101001'.split('').map((b) => (b === '1' ? Y : N)), // = '100101' retourne
};

const p = new PrismaClient();
(async () => {
  for (const [n, lignes] of Object.entries(FIX)) {
    await p.hexagram.update({ where: { numero: Number(n) }, data: { lignes: JSON.stringify(lignes) } });
    console.log('corrigé', n, lignes.join(','));
  }
  await p.$disconnect();
})();
