'use client';

// Helpers purs de /des-divinatoires/obstacle-solution (etape 1/2 du decoupage).
// Types, constantes de teinte et rendu markdown minimal. Aucun etat, aucun hook.

import { DICE_THEME } from '../_shared';
import { getRuntimeLang } from '@/lib/i18n';
import type { TargetFaces } from '@/components/astro-dice';
import { meaningFor } from '@/components/astro-dice/meanings';
import { houseName } from '@/components/astro-dice/names';

export type Step = 'intro' | 'obstacle_roll' | 'obstacle_done' | 'solution_roll' | 'solution_done';

export function diceCards(f: TargetFaces) {
  return (['planet', 'sign', 'house'] as const).map((k) => ({
    kind: k,
    value: f[k],
    label: k === 'house' ? houseName(f[k], getRuntimeLang()) : String(f[k]),
  }));
}
export function diceStaticText(f: TargetFaces) {
  return (['planet', 'sign', 'house'] as const)
    .map((k) => `${k === 'planet' ? 'Planète' : k === 'sign' ? 'Signe' : 'Maison'} ${f[k]} : ${meaningFor(k, f[k])}`)
    .join('\n');
}

// Rendu markdown simplifié (**bold**, ## titres) — comme /choix.
function inlineMd(s: string): React.ReactNode {
  const parts = s.split(/(\*\*[^*]+\*\*)/);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: DICE_THEME.ocreLight }}>{part.slice(2, -2)}</strong>;
    }
    return italicParts(part);
  });
}
function italicParts(s: string): React.ReactNode {
  const parts = s.split(/(\*[^*]+\*)/);
  return parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} style={{ fontStyle: 'italic', opacity: 0.85 }}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}
export function md(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (trimmed.startsWith('## ')) {
      elements.push(<h3 key={key++} className="text-sm font-bold uppercase tracking-wider mt-4 mb-2" style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.gold, textShadow: '0 0 8px rgba(201,167,91,0.2)', letterSpacing: '0.08em' }}>{inlineMd(trimmed.slice(3))}</h3>);
    } else if (trimmed.startsWith('# ')) {
      elements.push(<h4 key={key++} className="text-sm font-bold mt-3 mb-1" style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.ocreLight }}>{inlineMd(trimmed.slice(2))}</h4>);
    } else {
      elements.push(<p key={key++} className="mb-1 leading-relaxed" style={{ fontFamily: 'var(--font-cormorant), serif', color: '#F0E6D3', lineHeight: 1.7 }}>{inlineMd(trimmed || '\u00A0')}</p>);
    }
  }
  return elements;
}

export const VOIE_TINT: Record<string, string> = {
  fire: '#f28a5c', water: '#6fb6d9', air: '#cfe3f5', earth: '#c9a86a',
};
