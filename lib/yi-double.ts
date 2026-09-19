// lib/yi-double.ts
// Le Double Hexagramme (zhi gua) — mécanique partagée client/serveur.
//
// Tirage orthodoxe des 49 tiges d'achillée : chaque ligne vaut
//   6 = vieux yin  (mutant, yin → yang)  — 1/16
//   7 = jeune yang (stable)              — 5/16
//   8 = jeune yin  (stable)              — 7/16
//   9 = vieux yang (mutant, yang → yin)  — 3/16
// Source : probabilités classiques du diviseur à l'achillée (shaodi/yang
// lao etc.). Le serveur RE-VÉRIFIE la déivation des hexagrammes à partir
// des lignes transmises par le client (le client ne peut pas tricher sur
// les numéros, il ne choisit que le moment du bouton).

import HEX from './yj-hexagrams.json';

type HexRow = { c: string; b: string };
const BY_BITS: Record<string, number> = {};
for (const [n, h] of Object.entries(HEX as Record<string, HexRow>)) BY_BITS[h.b] = Number(n);

/** Bits base→sommet, '1' = yang. */
export function bitsPresent(lignes: number[]): string {
  return lignes.map((v) => (v === 8 || v === 6 ? '0' : '1')).join('');
}
export function bitsFuture(lignes: number[]): string {
  return lignes
    .map((v) => (v === 6 || v === 7 ? '1' : v === 8 || v === 9 ? '0' : '1'))
    .join('');
}

export interface DoubleDerivation {
  lignes: number[];            // valeurs 6/7/8/9, base→sommet
  mutants: number[];           // index 0..5 des lignes mutantes
  hexPresent: number | null;   // 1..64
  hexFutur: number | null;     // 1..64 (== présent si aucun mutant)
  glyphPresent: string | null;
  glyphFutur: string | null;
}

/** Dérive (et valide) la paire depuis les lignes brutes. null si invalide. */
export function deriveDouble(lignes: unknown): DoubleDerivation | null {
  if (!Array.isArray(lignes) || lignes.length !== 6) return null;
  const ls = lignes.map(Number);
  if (!ls.every((v) => v === 6 || v === 7 || v === 8 || v === 9)) return null;
  const mutants = ls.map((v, i) => (v === 6 || v === 9 ? i : -1)).filter((i) => i >= 0);
  const hp = BY_BITS[bitsPresent(ls)] ?? null;
  const hf = BY_BITS[bitsFuture(ls)] ?? null;
  return {
    lignes: ls,
    mutants,
    hexPresent: hp,
    hexFutur: hf,
    glyphPresent: hp ? (HEX as Record<string, HexRow>)[String(hp)]?.c ?? null : null,
    glyphFutur: hf ? (HEX as Record<string, HexRow>)[String(hf)]?.c ?? null : null,
  };
}

/** Lancer rituel des 6 lignes (côté client — le serveur re-dérive pareil). */
export function rollLine(): number {
  const x = Math.random() * 16;
  return x < 1 ? 6 : x < 6 ? 7 : x < 13 ? 8 : 9;
}
export function castSixLines(): number[] {
  return Array.from({ length: 6 }, () => rollLine());
}
