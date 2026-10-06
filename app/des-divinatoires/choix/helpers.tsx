'use client';

// Helpers de /des-divinatoires/choix : mini-renderer markdown et
// etiquettes des des. Deplaces tels quels depuis page.tsx (decoupage).

import { DICE_THEME } from '../_shared';
import { DieKind, TargetFaces } from '@/components/astro-dice';
import { meaningFor } from '@/components/astro-dice/meanings';
import { houseName, planetName, signName } from '@/components/astro-dice/names';
import { getRuntimeLang } from '@/lib/i18n';

/** Mini-renderer markdown → React nodes */
export function md(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (trimmed.startsWith('## ')) {
      elements.push(<h3 key={key++} className="text-sm font-bold uppercase tracking-wider mt-4 mb-2" style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.gold, textShadow: `0 0 8px ${DICE_THEME.gold}33`, letterSpacing: '0.08em' }}>{inlineMd(trimmed.slice(3))}</h3>);
    } else if (trimmed.startsWith('# ')) {
      elements.push(<h4 key={key++} className="text-sm font-bold mt-3 mb-1" style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.ocreLight }}>{inlineMd(trimmed.slice(2))}</h4>);
    } else {
      elements.push(<p key={key++} className="mb-1 leading-relaxed" style={{ fontFamily: 'var(--font-cormorant), serif', color: '#F0E6D3', lineHeight: 1.7 }}>{inlineMd(trimmed || '\u00A0')}</p>);
    }
  }
  return elements;
}
export function inlineMd(s: string): React.ReactNode {
  // **bold**
  const parts = s.split(/(\*\*[^*]+\*\*)/);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: '#87CEEB' }}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
export type Step = 'A_intro' | 'A_roll' | 'A_done' | 'B_intro' | 'B_roll' | 'B_done';

export const ACTIVE_DICE: DieKind[] = ['planet', 'sign', 'house'];

export function diceCards(f: TargetFaces) {
  return ACTIVE_DICE.map((k) => ({
    kind: k,
    value: f[k],
    label: k === 'planet' ? planetName(f[k] as string, getRuntimeLang()) : k === 'sign' ? signName(f[k] as string, getRuntimeLang()) : houseName(f[k], getRuntimeLang()),
  }));
}
export function diceStaticText(f: TargetFaces) {
  return ACTIVE_DICE.map((k) => `${k === 'planet' ? 'Planète' : k === 'sign' ? 'Signe' : 'Maison'} ${f[k]} : ${meaningFor(k, f[k])}`).join('\n');
}
