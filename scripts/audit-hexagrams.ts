// AUDIT (lecture seule) — table en dur HEXAGRAM_TRIGRAMS vs colonne hexagrams.lignes (Neon).
// Ne corrige rien : produit la liste des desaccords pour arbitrage.
import { PrismaClient } from '@prisma/client';
import { HEXAGRAM_TRIGRAMS } from '../lib/yijing-data';

const p = new PrismaClient();
const BITS_TRI: Record<string, string> = {
  '111': 'Ciel', '000': 'Terre', '010': 'Eau', '100': 'Tonnerre',
  '101': 'Feu', '011': 'Vent', '110': 'Lac', '001': 'Montagne',
};

(async () => {
  const rows = await p.hexagram.findMany({ select: { numero: true, lignes: true, element: true }, orderBy: { numero: 'asc' } });
  await p.$disconnect();

  // Sens de lecture de `lignes` : prouve par 63/64. 63 = Eau au-dessus du Feu
  // (canonique). On teste les deux orientations et on garde celle qui rend 63 correct.
  const parse = (s: string): ('1' | '0')[] | null => {
    let arr: unknown; try { arr = JSON.parse(s); } catch { return null; }
    if (!Array.isArray(arr) || arr.length !== 6) return null;
    return arr.map((x) => (String(x).trim().includes(' ') ? '0' as const : '1' as const));
  };
  const pairFrom = (bits: string[]) => {
    const low = BITS_TRI[bits.slice(0, 3).join('')];
    const high = BITS_TRI[bits.slice(3, 6).join('')];
    return low && high ? { inferior: low, superior: high } : null;
  };
  const sixty = rows.find((r) => r.numero === 63);
  const raw = sixty ? parse(String(sixty.lignes)) : null;
  const asTopDown = raw ? pairFrom(raw.slice().reverse()) : null; // index0 = HAUT
  const asBottomUp = raw ? pairFrom(raw) : null;                  // index0 = BAS
  const canonical63 = { inferior: 'Feu', superior: 'Eau' };
  const eq = (a: any, b: any) => a && a.inferior === b.inferior && a.superior === b.superior;
  const index0isTop = eq(asTopDown, canonical63);
  console.log(`orientation retenue: index0 = ${index0isTop ? 'HAUT (ligne 6)' : 'BAS (ligne 1)'} (valide par 63 = Eau/Feu)`);
  console.log('');

  const diverg: string[] = [];
  for (const r of rows) {
    const bits = parse(String(r.lignes));
    if (!bits) { console.log(`${r.numero}: lignes illisibles`); continue; }
    const db = pairFrom(index0isTop ? bits.slice().reverse() : bits);
    const app = HEXAGRAM_TRIGRAMS[r.numero];
    if (!db || !app) continue;
    if (db.inferior !== app.inferior || db.superior !== app.superior) {
      diverg.push(`${r.numero} (${r.element})  DB=${db.superior}/${db.inferior}  TABLE=${app.superior}/${app.inferior}`);
    }
  }
  console.log(`DÉSACCORDS table en dur vs base (${diverg.length}/64) :`);
  console.log(diverg.join('\n') || 'aucun');
})();
