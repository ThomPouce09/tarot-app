// ─── Hexagramme du Jour : logique déterministe partagée ────────────────────
// Le tirage du jour n'est plus un calendrier fixe de périodes : c'est un vrai
// tirage quotidien, reproductible et sans aléa persistant.
//
//  - Collectif : hexagramme du jour = jour de l'année → 1..64 (identique pour
//    tout le monde, sert de référence et de repli hors connexion).
//  - Personnel : décalage déterministe par compte (hash email + date), donc
//    stable toute la journée, différent chaque jour et pour chaque personne.
//  - Lignes mutantes : 0 à 2 lignes issues du même hash → hexagramme transformé.
//
// Tout est pur et synchrone : la page, la lettre et le cron partagent la même
// source de vérité, sans appel réseau.

/** Clé du jour local au format YYYY-MM-DD. */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Jour de l'année (1..366). */
export function dayOfYear(d: Date = new Date()): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

/** Hash 32 bits stable (FNV-1a) — même entrée, même sortie partout. */
export function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Hexagramme collectif du jour (identique pour tous). */
export function collectiveHexNumber(date: Date = new Date()): number {
  return ((dayOfYear(date) - 1) % 64) + 1;
}

/**
 * Hexagramme du jour. Avec un email → version personnelle (stable pour la
 * journée) ; sans → version collective.
 */
export function dailyHexNumber(date: Date = new Date(), email?: string | null): number {
  const base = collectiveHexNumber(date);
  if (!email) return base;
  const h = hash32(`${email.toLowerCase()}|${dayKey(date)}`);
  return ((base - 1 + (h % 64)) % 64) + 1;
}

/** Lignes mutantes du jour (index 1..6, base → sommet). 0 à 2 lignes. */
export function dailyMutatingLines(date: Date = new Date(), email?: string | null): number[] {
  const h = hash32(`lignes|${email ? email.toLowerCase() : 'collectif'}|${dayKey(date)}`);
  const count = h % 5 === 0 ? 2 : h % 3 === 0 ? 1 : 0; // ~40 % de jours sans mutation
  const lines: number[] = [];
  let x = h >>> 5;
  for (let i = 0; i < count; i++) {
    x = (x * 1103515245 + 12345) >>> 0;
    const line = (x % 6) + 1;
    if (!lines.includes(line)) lines.push(line);
  }
  return lines.sort((a, b) => a - b);
}

/** Hexagramme du lendemain (pour « hier → aujourd'hui » et le rappel du soir). */
export function hexForOffset(days: number, date: Date = new Date(), email?: string | null): number {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return dailyHexNumber(d, email);
}

// ─── Table Roi Wen ↔ binaire ───────────────────────────────────────────────
// Bits de la ligne 1 (base) à la ligne 6 (sommet) ; 1 = yang (pleine),
// 0 = yin (brisée). Trigrammes : 乾111 坤000 震100 坎010 艮001 巽011 離101 兌110.
const KING_WEN_BINARY: string[] = [
  '111111', // 1  乾 Le Créatif
  '000000', // 2  坤 Le Réceptif
  '100010', // 3  屯 Le Difficile Commencement
  '010001', // 4  蒙 La Jeunesse Inexpérimentée
  '111010', // 5  需 L'Attente
  '010111', // 6  訟 Le Conflit
  '010000', // 7  師 La Armée
  '000010', // 8  比 Le Rapprochement
  '111011', // 9  小畜 L'Apprivoisement du Petit
  '110111', // 10 履 La Conduite
  '111000', // 11 泰 La Paix
  '000111', // 12 否 L'Obstruction
  '101111', // 13 同人 L'Esprit de Communauté
  '111101', // 14 大有 La Grande Possession
  '001000', // 15 謙 L'Humilité
  '000100', // 16 豫 L'Enthousiasme
  '100110', // 17 隨 Le Suivi
  '011001', // 18 蠱 La Réforme de l'Inertie
  '110000', // 19 臨 L'Approche
  '000011', // 20 觀 La Contemplation
  '100101', // 21 噬嗑 La Morsure qui Décide
  '101001', // 22 賁 L'Ornement
  '000001', // 23 剝 L'Éclatement
  '100000', // 24 復 Le Retour
  '100111', // 25 无妄 L'Innocence
  '111001', // 26 大畜 La Force Domestiquée
  '100001', // 27 頤 Les Joues (La Nourriture)
  '011110', // 28 大過 L'Excès de Grandes Choses
  '010010', // 29 坎 L'Abîme (Eau)
  '101101', // 30 離 L'Adhérence (Feu)
  '001110', // 31 咸 L'Influence
  '011100', // 32 恆 La Durée
  '001111', // 33 遯 La Retraite
  '111100', // 34 大壯 La Puissance des Grandes Choses
  '000101', // 35 晉 Le Progresser
  '101000', // 36 明夷 L'Obscurcissement de la Lumière
  '101011', // 37 家人 La Famille
  '110101', // 38 睽 L'Opposition
  '001010', // 39 蹇 L'Obstacle
  '010100', // 40 解 La Délivrance
  '110001', // 41 損 La Diminution
  '100011', // 42 益 L'Augmentation
  '111110', // 43 夬 L'Éclat (La Percée)
  '011111', // 44 姤 Le Couplage
  '000110', // 45 萃 Le Rassemblement
  '011000', // 46 升 La Montée
  '010110', // 47 困 L'Oppression
  '011010', // 48 井 Le Puits
  '101110', // 49 革 La Révolution
  '011101', // 50 鼎 Le Chaudron
  '100100', // 51 震 Le Mouvement (Tonnerre)
  '001001', // 52 艮 L'Immobilité (Montagne)
  '001011', // 53 漸 Le Développement Graduel
  '110100', // 54 歸妹 Le Mariage de la Jeune Fille
  '101100', // 55 豐 L'Abondance
  '001101', // 56 旅 Le Voyageur
  '011011', // 57 巽 Le Doux (Vent)
  '110110', // 58 兌 L'Ouverture (Marais)
  '010011', // 59 渙 La Dissolution
  '110010', // 60 節 La Limitation
  '110011', // 61 中孚 La Vérité Intérieure
  '001100', // 62 小過 L'Excès de Petites Choses
  '101010', // 63 既濟 L'Accomplissement
  '010101', // 64 未濟 L'Avant l'Accomplissement
];

/** Binaire (base → sommet) d'un hexagramme Roi Wen. */
export function hexagramBinary(numero: number): string {
  return KING_WEN_BINARY[numero - 1] || '000000';
}

/** Numéro Roi Wen depuis un binaire (base → sommet), ou null. */
export function binaryToHexagram(binary: string): number | null {
  const idx = KING_WEN_BINARY.indexOf(binary);
  return idx >= 0 ? idx + 1 : null;
}

/** Lignes (base → sommet) en booléens : true = yang. */
export function hexagramLines(numero: number): boolean[] {
  return hexagramBinary(numero)
    .split('')
    .map((c) => c === '1');
}

/**
 * Hexagramme transformé : on retourne les lignes mutantes du jour.
 * Retourne null si le binaire obtenu n'existe pas (ne peut arriver qu'avec des
 * lignes mutantes hors plage).
 */
export function transformedHexagram(
  numero: number,
  mutating: number[],
): number | null {
  if (mutating.length === 0) return null;
  const bits = hexagramBinary(numero).split('');
  for (const line of mutating) {
    const i = line - 1;
    if (i < 0 || i > 5) continue;
    bits[i] = bits[i] === '1' ? '0' : '1';
  }
  return binaryToHexagram(bits.join(''));
}

/** Libellé lisible d'une ligne mutante (FR/EN). */
export function mutatingLineLabel(line: number, lang: 'fr' | 'en'): string {
  const names = ['Neuf', 'Six']; // yang / yin
  const ordFR = ['', 'initiale', 'deuxième', 'troisième', 'quatrième', 'cinquième', 'du haut'];
  const ordEN = ['', 'beginning', 'second', 'third', 'fourth', 'fifth', 'top'];
  if (lang === 'en') return `line ${ordEN[line] || line}`;
  return `ligne ${ordFR[line] || line}`;
}
