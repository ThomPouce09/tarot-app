// lib/reading-lore.ts — Les « faits techniques » d'un tirage, calculés en dur.
//
// POURQUOI : rappeler au consultant que la réponse s'appuie sur SON tirage
// (dignités entre cartes, hexagramme nucléaire, aett d'origine…) et forcer
// l'oracle à suivre la logique réelle du tirage plutôt que son « bon sens »
// général. Ces faits sont CALCULÉS à partir des données vraies de la base
// — jamais inventés par le modèle.
//
// PÉRIMÈTRE (validation user 2026-10-26) : tirages AVANCÉS uniquement
// (!isBaseType). Les formats courts/base n'ont pas de lore (une note technique
// y sonnerait plaqué).
//
// PROBABILITÉ : 15 % au tirage initial, ~40 % à la 1re question enchaînée,
// ~70 % au-delà. Graine = signature du tirage + question → le même fil
// reproduit la même note (cohérence avec l'historique relu).

import { TAROT_CARDS } from './tarot-data';
import { HEXAGRAM_TRIGRAMS } from './yijing-data';
import { ELDER_FUTHARK } from '../components/rune-stones/runes';

export interface LoreFact {
  /** nom court de la technique (pour le journal/debug) */
  key: string;
  /** fait brut en français — l'oracle le tisse dans sa propre langue */
  text: string;
}

// ── Graine déterministe (FNV-1a + avalanche, mulberry-style) ─────────
function seededIndex(seed: string, mod: number): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h << 13; h >>>= 0;
  h ^= h >>> 17;
  h ^= h << 5; h >>>= 0;
  return h % mod;
}

// ── TAROT ───────────────────────────────────────────────────────────
// Dignités élémentaires canoniques (Rider-Waite / traditions publiées) :
// Bâtons=Feu, Coupes=Eau, Épées=Air, Deniers=Terre. On ne les applique
// qu'aux suites MINEURES (aucune correspondance planétaire discutée des
// majeures → pas de fact inventé).
const SUIT_ELEMENT: Record<string, 'Feu' | 'Eau' | 'Air' | 'Terre'> = {
  Bâtons: 'Feu', Coupes: 'Eau', Épées: 'Air', Deniers: 'Terre',
};
// Élément « ami » classique : Feu↔Air, Terre↔Eau.
const FRIEND_OF: Record<string, string> = { Feu: 'Air', Air: 'Feu', Terre: 'Eau', Eau: 'Terre' };

function dignitiesFact(ids: number[], positionsFr: string[]): LoreFact | null {
  if (ids.length < 2 || ids.length > 5) return null;
  const resolved = ids.map((id) => {
    const c = TAROT_CARDS.find((x) => x.id === id);
    if (!c || c.arcana !== 'minor' || !c.suit) return null;
    return { name: c.name, element: SUIT_ELEMENT[c.suit] || null };
  });
  if (resolved.some((r) => !r || !r.element)) return null;
  const cards = resolved as { name: string; element: string }[];
  const parts: string[] = [];
  for (let i = 0; i < cards.length - 1; i++) {
    const a = cards[i], b = cards[i + 1];
    const rel =
      a.element === b.element ? 's’affectionnent (même élément : renfort mutuel)'
      : FRIEND_OF[a.element] === b.element ? 's’affirment (éléments amis : entente naturelle)'
      : 'se contrarient (éléments adverses : friction à négocier)';
    const pa = (positionsFr[i] || 'position').split(' (')[0].toLowerCase();
    const pb = (positionsFr[i + 1] || 'position').split(' (')[0].toLowerCase();
    parts.push(`« ${a.name} » (${a.element}, ${pa}) et « ${b.name} » (${b.element}, ${pb}) ${rel}`);
  }
  return {
    key: 'dignites',
    text: `Dignités élémentaires du tapis : ${parts.join(' ; ')}.`,
  };
}

// Numérologie du tapis : somme des valeurs numérotées (majeures = leur
// arcane ; mineures numérales = leur nombre ; les figures de cour n'ont pas
// de numéro → on passe son tour si la tirade contient une cour).
function numerologyFact(ids: number[]): LoreFact | null {
  const vals: number[] = [];
  for (const id of ids) {
    const c = TAROT_CARDS.find((x) => x.id === id);
    if (!c) return null;
    const isCourt = c.arcana === 'minor' && ['Valet', 'Cavalier', 'Reine', 'Roi'].some((p) => c.name.startsWith(p));
    if (isCourt) return null;
    vals.push(c.number);
  }
  const sum = vals.reduce((a, b) => a + b, 0);
  let r = sum;
  while (r > 21) r = String(r).split('').reduce((a, d) => a + Number(d), 0);
  const final = TAROT_CARDS.find((c) => c.arcana === 'major' && c.number === r);
  return {
    key: 'numero',
    text: `Valeur cumulée du tirage : ${vals.join(' + ')} = ${sum}`
      + (r !== sum ? `, réduite en ${r}` : '')
      + (final ? ` — la note de fond invisible du tapis résonne avec « ${final.name} ».` : '.'),
  };
}

// ── YI JING ─────────────────────────────────────────────────────────
// Les 8 trigrammes en bits du bas vers le haut (1 = trait yang ———,
// 0 = trait yin —— ——), convention du Zhou Yi.
const TRIGRAM_BITS: Record<string, string> = {
  Ciel: '111', Terre: '000', Eau: '010', Tonnerre: '100',
  Feu: '101', Vent: '011', Lac: '110', Montagne: '001',
};
const BITS_TRIGRAM: Record<string, string> = Object.fromEntries(
  Object.entries(TRIGRAM_BITS).map(([k, v]) => [v, k]),
);

/** les 6 traits (bas→haut) d'un hexagramme, depuis sa paire de trigrammes. */
export function hexagramBits(numero: number): string[] | null {
  const pair = HEXAGRAM_TRIGRAMS[numero];
  if (!pair) return null;
  const inf = TRIGRAM_BITS[pair.inferior];
  const sup = TRIGRAM_BITS[pair.superior];
  if (!inf || !sup) return null;
  return (inf + sup).split(''); // index 0 = ligne 1 (bas) = trigramme inferieur
}

/** numéro de l'hexagramme formé par deux trigrammes (nom). */
export function hexNumberFromTrigrams(inferior: string, superior: string): number | null {
  for (const [num, pair] of Object.entries(HEXAGRAM_TRIGRAMS)) {
    if (pair.inferior === inferior && pair.superior === superior) return Number(num);
  }
  return null;
}

/** Hexagramme nucléaire (shu gua) : lignes 2-3-4 en bas, 3-4-5 en haut.
 *  (Règle classique ; vérifiée : 63 → 64, 1 → 1, 2 → 2, 3 → 23.) */
export function nuclearNumero(numero: number): number | null {
  const bits = hexagramBits(numero);
  if (!bits) return null;
  const low = bits[1] + bits[2] + bits[3];   // lignes 2-3-4 (bas->haut)
  const high = bits[2] + bits[3] + bits[4];  // lignes 3-4-5 (bas->haut)
  const inf = BITS_TRIGRAM[low];
  const sup = BITS_TRIGRAM[high];
  if (!inf || !sup) return null;
  return hexNumberFromTrigrams(inf, sup);
}

function nuclearFact(numero: number, nameOf: (n: number) => string | null): LoreFact | null {
  const nuc = nuclearNumero(numero);
  if (!nuc) return null;
  const name = nameOf(nuc);
  return {
    key: 'nucleaire',
    text: `À l'intérieur de l'hexagramme ${numero} se trame en silence l'hexagramme ${nuc}`
      + (name ? ` « ${name} »` : '')
      + ` (lignes 2-3-4 et 3-4-5) : la dynamique cachée, ce que la situation couve sans le montrer encore.`,
  };
}

function architectureFact(numero: number): LoreFact | null {
  const pair = HEXAGRAM_TRIGRAMS[numero];
  if (!pair) return null;
  return {
    key: 'architecture',
    text: `Architecture de l'hexagramme ${numero} : ${pair.superior} au-dessus, ${pair.inferior} en dessous — la situation se lit comme ce que porte ${pair.superior.toLowerCase()} soutenu par ce que porte ${pair.inferior.toLowerCase()}.`,
  };
}

// ── RUNES ───────────────────────────────────────────────────────────
// Le futhark des Anciens est ordonné en trois aetts de huit runes :
// 0-7 aett de Frey, 8-15 aett d'Heimdall, 16-23 aett de Tyr.
function aettOf(index: number): { aett: string; lord: string } {
  if (index < 8) return { aett: 'aett de Frey', lord: 'Frey, dieu de la fécondité et des dons prospères' };
  if (index < 16) return { aett: 'aett d’Heimdall', lord: 'Heimdall, gardien du seuil — les forces qui traversent et transforment' };
  return { aett: 'aett de Tyr', lord: 'Tyr, le juste qui paie le prix du geste' };
}

interface RuneLike { name: string; position?: string; reversed?: boolean }

function arrowsFact(runes: RuneLike[]): LoreFact | null {
  if (runes.length !== 3) return null;
  const n = runes.map((r) => r.name);
  if (n[0] === n[1] && n[1] === n[2] && n[0]) {
    return {
      key: 'fleches',
      text: `Triple rune « ${n[0]} » : une Flèche d’Heimdall — configuration rarissime, le message tombe trois fois, le ciel appuie très fort sur ce point précis.`,
    };
  }
  return null;
}

function aettFact(runes: RuneLike[]): LoreFact | null {
  if (runes.length === 0) return null;
  const withIdx = runes
    .map((r) => ({ r, idx: ELDER_FUTHARK.findIndex((x) => x.name === r.name) }))
    .filter((x) => x.idx >= 0);
  if (withIdx.length === 0) return null;
  // La rune la plus "parlante" : celle du présent si présente, sinon la 1re.
  const present = withIdx.find((x) => /verdandi|pr.sent/i.test(x.r.position || '')) || withIdx[0];
  const { aett, lord } = aettOf(present.idx);
  return {
    key: 'aett',
    text: `${present.r.name} (#${present.idx + 1} du futhark des Anciens) appartient à l’${aett}, sous la tutelle de ${lord}.`,
  };
}

function merkstaveFact(runes: RuneLike[]): LoreFact | null {
  const rev = runes.find((r) => r.reversed);
  if (!rev) return null;
  return {
    key: 'merkstave',
    text: `La rune ${rev.name} est en merkstave (renversée) : sa force n'est pas annulée, elle est retardée, tournée vers l'ombre — à lire comme l'obstacle interne au thème de sa position, pas comme son contraire.`,
  };
}

// ── Sélection (taux + graine) ───────────────────────────────────────
function pickFact(pool: (LoreFact | null)[], step: number, seed: string): LoreFact | null {
  // 15 % au tirage initial, 40 % a la premiere question enchainee, 70 % ensuite.
  const rate = step <= 0 ? 0.15 : step === 1 ? 0.4 : 0.7;
  const roll = seededIndex(`${seed}|roll`, 1000) / 1000;
  if (roll >= rate) return null;
  const avail = pool.filter(Boolean) as LoreFact[];
  if (avail.length === 0) return null;
  return avail[seededIndex(`${seed}|pick`, avail.length)];
}

/** Lore d'un TIRAGE TAROT avancé. step = nb de questions déjà posées sur ce
 *  tirage (0 = initial). positionsFr = libellés FR des positions. */
export function tarotLore(opts: {
  cards: number[];
  positionsFr: string[];
  step: number;
  seed: string;
}): LoreFact | null {
  const pool: (LoreFact | null)[] = [
    dignitiesFact(opts.cards, opts.positionsFr),
    numerologyFact(opts.cards),
  ];
  return pickFact(pool, opts.step, opts.seed);
}

/** Lore d'un tirage YI JING avancé. nameOf lit le nom court d'un hexagramme
 *  (prisma) — injecté pour éviter que le lib dépende de la DB. */
export function yiJingLore(opts: {
  numero: number;
  nameOf: (n: number) => string | null;
  step: number;
  seed: string;
}): LoreFact | null {
  const pool: (LoreFact | null)[] = [
    nuclearFact(opts.numero, opts.nameOf),
    architectureFact(opts.numero),
  ];
  return pickFact(pool, opts.step, opts.seed);
}

/** Lore d'un tirage RUNES avancé (Nornes, Mjolnir, Yggdrasil — jamais nornes2). */
export function runeLore(opts: {
  runes: RuneLike[];
  step: number;
  seed: string;
}): LoreFact | null {
  const arrows = arrowsFact(opts.runes);
  const pool: (LoreFact | null)[] = [arrows, aettFact(opts.runes), merkstaveFact(opts.runes)];
  return pickFact(pool, opts.step, opts.seed);
}

/** Consigne d'intégration pour le prompt oracle (partagée aux trois univers). */
export const LORE_INSTRUCTION =
`NOTE DU DEVIN — fait CALCULÉ sur le tirage réel, vérifié. Tu dois t'y conformer (jamais le contredire, jamais en inventer un autre) : glisse-le en UNE demie-phrase subtile, au moment où il éclaire le mieux, comme un professionnel laisse échapper son geste. Ni liste, ni leçon, ni jargon : une respiration de métier qui rappelle à qui écoute que la lecture tient à CES cartes/traits/runes posés là. Si aucune place naturelle n'existe dans ta réponse, tais-le entièrement plutôt que de le plaquer.`;
