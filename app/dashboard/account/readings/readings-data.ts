// Donnees et helpers durables de l'historique des tirages.
// Extraits de page.tsx (etape 1 du decoupage) : types, mappings, tableaux de
// positions et fonctions PURES. Aucun JSX, aucun etat React ici.

import { pick4, type Lang } from '@/lib/i18n';
import { DICT } from '@/lib/i18n/ui';

export const DES_CHOIX_KINDS = ['planet', 'sign', 'house'];


export interface Reading {
  id: string;
  userId?: string;
  type: string;
  question?: string | null;
  spread: string;
  cards: any[];
  interpretation?: string | null;
  createdAt: string;
  /** Augure scellé né de cette lecture (badge horloge). */
  echo?: { id: string; dueAt: string; verdict: string | null; verdictPct?: number | null; bestCardIndex?: number | null; textFr?: string | null; textEn?: string | null; textEs?: string | null; textHi?: string | null } | null;
}

// --- Mapping type de tirage -> icône/style (réutilise les tuiles de la landing) ---
// Codes couleur des univers, alignes sur les teintes vecues dans les hubs
// (tarot=or, Yi Jing=rouge laque, runes=teal, des=bleu celeste) pour un tri
// visuel immediat dans l'historique.
export const TYPE_META: Record<string, { key: string; label: string; icon: string; color: string; bg: string; border: string; glow: string }> = {
  tarot:  { key: 'tarot',  label: 'Tarot',            icon: '/images/tarot-icon.png',   color: '#FFD700', bg: 'rgba(218,165,32,0.12)',  border: 'rgba(218,165,32,0.55)',  glow: 'rgba(255,215,0,0.45)' },
  yijing: { key: 'yijing', label: 'Yi Jing',          icon: '/images/yi-jing-icon.png', color: '#F0463C', bg: 'rgba(240,70,60,0.15)',   border: 'rgba(240,70,60,0.6)',    glow: 'rgba(240,70,60,0.55)' },
  rune:   { key: 'rune',   label: 'Runes',            icon: '/images/runes-icon.png',   color: '#3CB371', bg: 'rgba(60,179,113,0.14)',  border: 'rgba(60,179,113,0.55)',  glow: 'rgba(60,179,113,0.5)' },
  des:    { key: 'des',    label: 'Dés',               icon: '/images/des-zodiaque.png', color: '#3D9BE9', bg: 'rgba(46,134,193,0.15)', border: 'rgba(61,155,233,0.6)',   glow: 'rgba(61,155,233,0.55)' },
};

export function classifyType(t: string): keyof typeof TYPE_META {
  const s = (t || '').toLowerCase().replace(/[_-]/g, '');
  if (s.includes('yi') || s.includes('jing') || s.includes('yijing')) return 'yijing';
  if (s.includes('rune') || s.includes('futhark')) return 'rune';
  if (s.includes('des') || s.includes('zodiaque') || s.includes('astro') || s.includes('dice')) return 'des';
  return 'tarot'; // tarot, null, et tout le reste
}

// --- Mapping fin (par type stocke) -> libellé précis + groupe ---
export const SUBTYPE_META: Record<string, { group: 'tarot' | 'yijing' | 'rune' | 'des'; label: string }> = {
  'tarot-3-cartes':      { group: 'tarot',  label: 'Tarot 3 cartes' },
  'tarot-3-cartes-simplifie': { group: 'tarot', label: 'Tarot 3 cartes (simplifié)' },
  'tarot-5-cartes':      { group: 'tarot',  label: 'Tarot 5 cartes' },
  'tarot-5-c-manuelle':  { group: 'tarot',  label: 'Tarot 5 cartes (✋)' },
  'tarot-10-cartes':     { group: 'tarot',  label: 'Tarot 10 cartes' },
  'tirage-ouvert':       { group: 'tarot',  label: 'Tirage Ouvert' },
  'tirage-amoureux':     { group: 'tarot',  label: 'Tirage Amoureux' },
  'yi-jing-simplifie':    { group: 'yijing', label: 'Yi Jing simplifié' },
  'yi-jing-double':       { group: 'yijing', label: 'Le Double Hexagramme' },
  'yi-jing-simple':      { group: 'yijing', label: 'Yi Jing précis' },
  'yi-jing-question':    { group: 'yijing', label: 'Yi Jing (question)' },
  'yi-qing':             { group: 'yijing', label: 'Yi Qing' },
  'yi-jing-du-jour':     { group: 'yijing', label: 'Yi Jing du jour' },
  'runes-nornes':        { group: 'rune',   label: 'Le Fil des Nornes — Précis' },
  'runes-nornes2':       { group: 'rune',   label: 'Le fil des Nornes (simplifié)' },
  'runes-mjolnir':       { group: 'rune',   label: 'Le Marteau de Mjölnir' },
  'runes-yggdrasil':     { group: 'rune',   label: "Les Racines d'Yggdrasil" },
  'runes':               { group: 'rune',   label: 'Runes' },
  'des-choix':           { group: 'des',    label: 'Le Tirage du Choix' },
  'des-obstacle-solution': { group: 'des',  label: 'Obstacle & Solution' },
  'des-affinage':        { group: 'des',    label: 'Tirage par Affinage' },
  'des-simplifie':       { group: 'des',    label: 'Dés Simplifié' },
  'tarot-semaine':       { group: 'tarot',  label: 'Arcanes de la Semaine' },
  'tarot':               { group: 'tarot',  label: 'Tarot' },
  'yi-jing':             { group: 'yijing', label: 'Yi Jing' },
  'yijing':              { group: 'yijing', label: 'Yi Jing' },
};
export function metaOf(r: Reading) {
  const sub = SUBTYPE_META[r.type] || { group: 'tarot' as const, label: TYPE_META.tarot.label };
  const gm = TYPE_META[sub.group];
  return { ...gm, group: sub.group, label: sub.label };
}

// Locale BCP-47 par langue (dates/heures de l'historique).
export const LOC: Record<Lang, string> = { fr: 'fr-FR', en: 'en-GB', es: 'es-ES', hi: 'hi-IN' };
export const loc = (l: Lang) => LOC[l] || 'fr-FR';

// Libellé 4 langues du type de tirage (titre de chaque item de la liste).
export function typeLabelOf(r: Reading, lang: Lang): string {
  const fallback = SUBTYPE_META[r.type]?.label || TYPE_META.tarot.label;
  const e = (DICT as Record<string, Partial<Record<Lang, string>>>)['htype.' + (r.type || '')];
  if (!e) return fallback;
  return pick4(e.fr || fallback, e.en ?? e.fr ?? fallback, e.es, e.hi)(lang);
}

export const FILTERS = [
  { key: 'all',   labelKey: 'history.filter.all',    icon: '/images/tarot-icon.png', color: '#FFD700' },
  { key: 'tarot', labelKey: 'history.filter.tarot',  icon: '/images/tarot-icon.png', color: '#FFD700' },
  { key: 'yijing', labelKey: 'history.filter.yijing', icon: '/images/yi-jing-icon.png', color: '#F0463C' },
  { key: 'rune',  labelKey: 'history.filter.rune',   icon: '/images/runes-icon.png', color: '#3CB371' },
  { key: 'des',   labelKey: 'history.filter.des',    icon: '/images/des-zodiaque.png', color: '#3D9BE9' },
] as const;

export const tarot3Positions = [
  { key: 'situation', position: 'past', icon: '🕰️', nameKey: 'history.pos.past', titleColor: 'text-blue-300', cardColor: 'bg-blue-950/20 border-blue-800/30' },
  { key: 'defis', position: 'present', icon: '⚔️', nameKey: 'history.pos.present', titleColor: 'text-amber-300', cardColor: 'bg-amber-950/20 border-amber-800/30' },
  { key: 'issue', position: 'future', icon: '💫', nameKey: 'history.pos.future', titleColor: 'text-green-300', cardColor: 'bg-green-950/20 border-green-800/30' },
];
export const tarot5Positions = [
  { key: 'situation', icon: '⬆️', nameKey: 'history.pos.summit', titleColor: 'text-yellow-300', cardColor: 'bg-yellow-950/20 border-yellow-700/40' },
  { key: 'defis', icon: '👈', nameKey: 'history.pos.orient', titleColor: 'text-red-300', cardColor: 'bg-red-950/20 border-red-800/40' },
  { key: 'soutien', icon: '🎯', nameKey: 'history.pos.synthesis', titleColor: 'text-purple-300', cardColor: 'bg-purple-950/20 border-purple-800/40' },
  { key: 'issue', icon: '👉', nameKey: 'history.pos.occident', titleColor: 'text-orange-300', cardColor: 'bg-orange-950/20 border-orange-800/40' },
  { key: 'conseil', icon: '⬇️', nameKey: 'history.pos.base', titleColor: 'text-cyan-300', cardColor: 'bg-cyan-950/20 border-cyan-800/40' },
];
