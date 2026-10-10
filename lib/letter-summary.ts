// ── Résumé automatique d'un tirage pour la lettre mystique ───────────────
// AUCUNE IA : on relit ce que le tirage contient déjà (cartes + interprétation
// stockée) et on en extrait une phrase courte, dans la langue de la lettre.
//
// Chaque univers a sa forme de données (cf. Reading.cards / .interpretation) :
//   tarot   : cards = [id, id, id]              → noms via TAROT_CARDS
//   runes   : cards = [{name, symbol, reversed}] → nom + symbole + sens
//   yi-jing : cards = [{numero, glyph, tag}]     → glyphe + nom de l'hexagramme
//   dés     : cards = [{kind, value, label}]     → planète / signe / maison
//
// Le rendu final est TOUJOURS du texte brut échappé (pas de HTML brut issu de
// la base) : la lettre l'insère via escapeHtml().

import { TAROT_CARDS } from '@/lib/tarot-data';

export interface DrawSummary {
  /** Nom du tirage (spread), ex. « Le Marteau de Mjölnir ». */
  spread: string | null;
  /** Liste lisible des faces tirées, ex. « Othala ᛟ (inversée) · Gebo ᚷ ». */
  faces: string[];
  /** Phrase de synthèse déjà rédigée par l'app pour ce tirage (ou null). */
  synthesis: string | null;
}

interface RawReading {
  type: string | null;
  cards: unknown;
  interpretation: unknown;
  spread: string | null;
}

/** Parse tolérant : la base stocke du JSON dans des colonnes texte. */
function parseJson(v: unknown): any {
  if (v == null) return null;
  if (typeof v === 'object') return v;
  try {
    return JSON.parse(String(v));
  } catch {
    return null;
  }
}

function classifyType(t: string | null): 'tarot' | 'yijing' | 'rune' | 'des' {
  const s = (t || '').toLowerCase().replace(/[_-]/g, '');
  if (s.includes('yi') || s.includes('jing')) return 'yijing';
  if (s.includes('rune') || s.includes('futhark')) return 'rune';
  if (s.includes('des') || s.includes('zodiaque') || s.includes('astro') || s.includes('dice')) return 'des';
  return 'tarot';
}

/** Libellés de sens (inversée / droite) dans les 4 langues. */
const REVERSED_LABEL: Record<string, string> = {
  fr: 'inversée', en: 'reversed', es: 'invertida', hi: 'उलटा',
};

/** Noms de planètes / signes restent des symboles : rien à traduire. */
function desFace(c: any): string | null {
  if (!c || typeof c !== 'object') return null;
  const label = typeof c.label === 'string' && c.label.trim() ? c.label.trim() : String(c.value ?? '');
  if (!label) return null;
  // Les libellés « ♆ » seuls (dés-obstacle-solution) : on garde le symbole.
  return label;
}

/**
 * Résumé automatique d'un tirage. `lang` sert aux libellés de sens ;
 * les noms de cartes/hexagrammes sont déjà dans la bonne langue côté données.
 */
export function summarizeDraw(r: RawReading, lang: 'fr' | 'en' | 'es' | 'hi'): DrawSummary {
  const kind = classifyType(r.type);
  const cards = parseJson(r.cards);
  const interp = parseJson(r.interpretation);
  const faces: string[] = [];

  if (Array.isArray(cards)) {
    for (const c of cards) {
      if (kind === 'tarot') {
        // Deux formes : [id, id, id] (3 cartes, cross) ou [{id,name}] (roue 7 j).
        if (c && typeof c === 'object' && (c as any).name) {
          faces.push(String((c as any).name));
        } else {
          const id = typeof c === 'number' ? c : Number(c);
          const card = TAROT_CARDS.find((x) => x.id === id);
          if (card) faces.push(card.name);
        }
      } else if (kind === 'rune') {
        if (c && typeof c === 'object' && (c as any).name) {
          const rev = (c as any).reversed ? ` (${REVERSED_LABEL[lang] || REVERSED_LABEL.fr})` : '';
          faces.push(`${(c as any).name} ${(c as any).symbol || ''}${rev}`.trim());
        }
      } else if (kind === 'yijing') {
        if (c && typeof c === 'object' && (c as any).glyph) {
          faces.push(`${(c as any).glyph}${(c as any).numero ? ` ${(c as any).numero}` : ''}`);
        }
      } else {
        const f = desFace(c);
        if (f) faces.push(f);
      }
    }
  }

  // Synthèse déjà rédigée par l'app, par ordre de préférence selon l'univers.
  // Certaines valeurs sont multilingues ({fr,en,es,hi}) : on prend la langue
  // de la lettre, avec repli fr.
  const localized = (v: unknown): string | null => {
    if (typeof v === 'string') return v.trim() || null;
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      const pick = o[lang] ?? o.fr ?? o.en;
      if (typeof pick === 'string') return pick.trim() || null;
    }
    return null;
  };

  let synthesis: string | null = null;
  if (interp && typeof interp === 'object') {
    const candidates: unknown[] = [
      (interp as any).synthese,       // runes (mjolnir / nornes)
      (interp as any).resume,         // tarot 3 cartes / yi-jing simplifié
      (interp as any).filRouge,       // roue des 7 jours (objet multilingue)
      (interp as any).issue,          // yi-jing simplifié (repli)
      (interp as any).shortA,         // dés : face A
      (interp as any).static,         // dés : lecture statique
      (interp as any).oracleFlash,    // dés simplifié
      (interp as any).analyse,        // divers
    ];
    for (const c of candidates) {
      const s = localized(c);
      if (s && s.length > 40) {
        synthesis = s;
        break;
      }
    }
    // Repli : première valeur texte suffisamment longue.
    if (!synthesis) {
      for (const v of Object.values(interp as Record<string, unknown>)) {
        const s = localized(v);
        if (s && s.length > 40) {
          synthesis = s;
          break;
        }
      }
    }
  }

  // Yi Jing simplifié : les cartes ne sont pas stockées en base. Quand la
  // synthèse cite l'hexagramme (« … la Récolte (43) »), on en extrait le
  // numéro comme repère visuel ; sinon on n'invente rien (pas de face).
  if (kind === 'yijing' && faces.length === 0 && synthesis) {
    const m = synthesis.match(/\((\d{1,2})\)/) || synthesis.match(/hexagramme\s+(\d{1,2})/i);
    if (m) faces.push(`☯ ${m[1]}`);
  }

  return {
    spread: r.spread || null,
    faces,
    synthesis,
  };
}

/** Coupe propre à la phrase (max `max` caractères, sans couper un mot). */
export function cleanCut(text: string, max = 200): string {
  const s = text.replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const slice = s.slice(0, max);
  const lastStop = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
  if (lastStop > max * 0.5) return slice.slice(0, lastStop + 1);
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > 0 ? slice.slice(0, lastSpace) : slice) + '…';
}
