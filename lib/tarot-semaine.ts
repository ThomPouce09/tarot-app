// lib/tarot-semaine.ts — constants et règles partagées des « Arcanes de la Semaine ».

// Résonance planétaire canonique (Golden Dawn) : id d'arcane ↔ index du jour
// (0 = dimanche ☉ … 6 = samedi ♄). Le jour « résonne » quand sa carte est
// l'arcane de son luminaire.
export const RESONANCE: Record<number, number> = {
  0: 19,  // dimanche ☉ — Le Soleil
  1: 2,   // lundi ☽ — La Papesse
  2: 16,  // mardi ♂ — La Maison-Dieu
  3: 1,   // mercredi ☿ — Le Bateleur
  4: 10,  // jeudi ♃ — La Roue de Fortune
  5: 3,   // vendredi ♀ — L'Impératrice
  6: 21,  // samedi ♄ — Le Monde
};

export function isResonant(dayIndex: number, cardId: number): boolean {
  return RESONANCE[dayIndex] === cardId;
}

// Grâce de scellement : 5 jours après la fin de la semaine (jour 7) pour sceller
// l'augure. Passé ce délai sans sceau, la roue est PÉRIMÉE : masquée, la page
// retombe sur « Poser la roue de la semaine » (la lecture reste dans l'historique).
export const SEAL_GRACE_DAYS = 5;
export const EXPIRY_DAY = 7 + SEAL_GRACE_DAYS; // nowDayIndex ≥ 12 → périmée si non scellée

const DAY_MS = 86400000;
// Minuit local — les jours de la roue basculent à minuit, pas à l'heure du cast.
// Fuseau du user (défaut Europe/Paris) : le serveur (Vercel) tourne en UTC ; un
// cast passé après 22 h 59 heure de Paris (00 h 59 UTC du lendemain) décalerait
// sinon la roue d'un jour entier. On découpe le calendrier en DATES locales, pas
// en instants — la soustraction de deux minuits UTC de dates ne dépend pas des
// bascules d'heure d'été.
const FALLBACK_TZ = 'Europe/Paris';
const _fmtDay = new Map<string, Intl.DateTimeFormat>();
function sodTz(t: number | string | Date, tz: string): number {
  let f = _fmtDay.get(tz);
  if (!f) { f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }); _fmtDay.set(tz, f); }
  return Date.parse(`${f.format(new Date(t))}T00:00:00Z`);
}
const safeTz = (tz?: string | null) => (typeof tz === 'string' && tz ? tz : FALLBACK_TZ);

/** Position (0..7) du jour courant dans une roue posée à castAt (fuseau du user). */
export function wheelDayIndex(castAt: string, tz?: string | null): number {
  const z = safeTz(tz);
  return Math.max(0, Math.floor((sodTz(Date.now(), z) - sodTz(castAt, z)) / DAY_MS));
}

/**
 * Interprétation d'une roue rendue PUBLIQUE (historique, sérialisations) :
 * on ne découvre que ce qui est légitimement révélé — jamais les cartes
 * futures, jamais les éclats non ouverts, jamais le fil rouge avant la fin
 * de semaine (sauf augure déjà scellé : le texte est alors visible d'avance
 * par definition dans l'objet echo). Renvoie la chaîne d'origine si ce n'est
 * pas un état de roue valide.
 */
export function sanitizeWheelInterpretation(interpretation: string | null, echoSealed: boolean, tz?: string | null): string | null {
  if (!interpretation) return interpretation;
  let st: any;
  try { st = JSON.parse(interpretation); } catch { return interpretation; }
  if (!st || !Array.isArray(st.cards) || st.cards.length !== 7 || !st.castAt) return interpretation;
  const nowDay = Math.min(7, wheelDayIndex(st.castAt, tz));
  const revealed = new Set<number>([...(Array.isArray(st.revealed) ? st.revealed : []), ...Array.from({ length: Math.min(nowDay, 7) }, (_, i) => i)]);
  const out: any = { castAt: st.castAt, revealed: [...revealed].filter((d) => d <= nowDay).sort((a, b) => a - b) };
  // Cartes : jamais le nom d'un jour non révélé (vignettes de l'historique).
  out.cards = st.cards.map((id: number, d: number) => (revealed.has(d) ? id : -1));
  out.days = Array.isArray(st.days) ? st.days.map((x: unknown, d: number) => (revealed.has(d) ? x : null)) : undefined;
  if (nowDay >= 7 || echoSealed) out.filRouge = st.filRouge ?? null;
  return JSON.stringify(out);
}
