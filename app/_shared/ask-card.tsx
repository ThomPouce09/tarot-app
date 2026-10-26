'use client';

// app/_shared/ask-card.tsx — Carte « question OU thème » standardisée (demande
// user : présentation IDENTIQUE à /obstacle-solution — onglets, PAS de « ou »,
// question précise par défaut). Partagée par les tirages qui laissent le choix
// (thème/sous-thèmes ou question écrite) : Mjölnir, Racines d'Yggdrasil,
// Double Hexagramme. Chaque univers garde sa teinte (RUNE_THEME cèdre pour les
// runes, laque rouge/or pour le Yi Jing) et ses propres thèmes/sous-thèmes,
// injectés via children (YggQuestion domains / YiThemeSelector).
// Calquée sur app/des-divinatoires/launch-card.tsx (structure, gabarits,
// sélecteurs internes intouchés).

import { useState, type ReactNode } from 'react';
import { tr } from '@/lib/i18n';

export type AskTint = 'cedar' | 'lacquer';

const CEDAR: AskTint = 'cedar';

const TINTS: Record<AskTint, {
  panel: string; border: string; shadow: string;
  accent: string; accentDim: string; ink: string; divider: string;
  tabOnBg: string; tabOnBorder: string; tabOnShadow: string;
  inputBg: string; inputBorder: string; inputColor: string;
  cta: React.CSSProperties;
}> = {
  cedar: {
    panel: 'linear-gradient(160deg, rgba(20,48,31,0.94) 0%, rgba(12,36,23,0.96) 55%, rgba(6,18,11,0.97) 100%)',
    border: '1.5px solid rgba(233,217,172,0.35)',
    shadow: '0 18px 44px rgba(0,0,0,0.6), inset 0 0 40px rgba(233,217,172,0.06)',
    accent: '#E9D9AC', accentDim: 'rgba(184,196,158,0.6)', ink: 'rgba(214,226,198,0.6)',
    divider: 'rgba(184,196,158,0.2)',
    tabOnBg: 'linear-gradient(180deg, #1f5234 0%, #0c2417 100%)',
    tabOnBorder: '1px solid rgba(233,217,172,0.75)',
    tabOnShadow: '0 0 16px rgba(233,217,172,0.28), inset 0 1px 0 rgba(233,217,172,0.3)',
    inputBg: 'linear-gradient(160deg, #16301f 0%, #0d2015 100%)',
    inputBorder: '1.5px solid rgba(233,217,172,0.24)',
    inputColor: '#D6E2C6',
    cta: {
      background: 'linear-gradient(180deg, #1f5234 0%, #123a22 46%, #061209 100%)',
      border: '1px solid rgba(233,217,172,0.85)',
      color: '#F5EAD6',
      boxShadow: '0 0 0 4px rgba(233,217,172,0.1), 0 12px 26px rgba(3,8,5,0.85), 0 0 34px rgba(233,217,172,0.26), inset 0 1px 0 rgba(233,217,172,0.45), inset 0 -14px 26px rgba(0,0,0,0.55)',
      textShadow: '0 0 12px rgba(233,217,172,0.45), 0 1px 2px rgba(0,0,0,0.9)',
    },
  },
  lacquer: {
    panel: 'linear-gradient(160deg, rgba(36,16,20,0.94) 0%, rgba(20,10,14,0.96) 55%, rgba(13,6,9,0.97) 100%)',
    border: '1.5px solid rgba(243,201,105,0.38)',
    shadow: '0 18px 44px rgba(0,0,0,0.62), inset 0 0 40px rgba(142,28,34,0.12)',
    accent: '#F3C969', accentDim: 'rgba(201,178,138,0.75)', ink: 'rgba(245,234,214,0.55)',
    divider: 'rgba(201,178,138,0.2)',
    tabOnBg: 'linear-gradient(180deg, #3a1118 0%, #140a0e 100%)',
    tabOnBorder: '1px solid rgba(243,201,105,0.8)',
    tabOnShadow: '0 0 16px rgba(243,201,105,0.3), inset 0 1px 0 rgba(243,201,105,0.3)',
    inputBg: 'linear-gradient(160deg, #1d0d12 0%, #0d0609 100%)',
    inputBorder: '1.5px solid rgba(243,201,105,0.28)',
    inputColor: '#F0E6D3',
    cta: {
      background: 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.16) 42%, rgba(255,255,255,0) 56%), linear-gradient(135deg, #F6D98A 0%, #E8B84B 35%, #B8860B 72%, #D9AE3C 100%)',
      border: '1.5px solid rgba(248,233,176,0.9)',
      color: '#2a1808',
      boxShadow: '0 6px 20px rgba(218,165,32,0.5), 0 2px 5px rgba(0,0,0,0.55), inset 0 1px 1px rgba(255,255,255,0.7), inset 0 -5px 12px rgba(122,74,4,0.5)',
      textShadow: '0 1px 0 rgba(255,245,208,0.55)',
    },
  },
};

export function AskCard({ tint, title, subtitle, placeholder, draft, setDraft, onAsk, children, ctaLabel }: {
  tint: AskTint;
  /** Titre gravé de la carte (ex. « Quel obstacle frapper ? »). */
  title: string;
  /** Sous-titre italic (invite question ou thème). */
  subtitle?: string;
  placeholder: string;
  draft: string;
  setDraft: (v: string) => void;
  /** Lancer avec la question libre écrite (jamais vide). */
  onAsk: (q: string) => void;
  /** Onglet thème : sélecteur thèmes/sous-thèmes de l'univers (composant existant). */
  children: ReactNode;
  /** CTA de la question libre — défaut : libellé standard maison. */
  ctaLabel?: string;
}) {
  // Question précise par défaut (exigence user), onglet thème en second —
  // exactement l'ordre de /obstacle-solution.
  const T = TINTS[tint];
  const [mode, setMode] = useState<'free' | 'theme'>('free');
  const q = draft.trim();
  return (
    <div
      className="mx-auto max-w-2xl rounded-2xl p-5 sm:p-6"
      style={{ background: T.panel, border: T.border, boxShadow: T.shadow }}
    >
      <h3
        className="mb-1 text-center text-lg font-bold"
        style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: T.accent, textShadow: tint === CEDAR ? '0 0 14px rgba(233,217,172,0.35)' : '0 0 14px rgba(243,201,105,0.4)' }}
      >
        {title}
      </h3>
      {subtitle && (
        <p
          className="mx-auto mb-4 max-w-md text-center text-xs italic leading-relaxed"
          style={{ fontFamily: 'var(--font-cinzel), serif', color: T.ink }}
        >
          {subtitle}
        </p>
      )}

      {/* Onglets : mêmes pastilles que /obstacle-solution — « Élément &
          intention » à gauche (ici Thème & intention), « Ma question » à
          droite, et la question précise ACTIVE par défaut. */}
      <div className="mb-4 flex justify-center gap-2">
        {([
          ['theme', tr("Thème & intention", "Theme & intention", "Tema e intención", "विषय एवं संकल्प")],
          ['free', tr("Ma question libre", "My own question", "Mi pregunta libre", "मेरा स्वतंत्र प्रश्न")],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setMode(k)}
            className="rounded-full px-4 py-1.5 text-xs font-bold transition-all active:scale-[0.97]"
            style={{
              fontFamily: 'var(--font-cinzel), serif',
              letterSpacing: '0.06em',
              color: mode === k ? T.accent : T.ink,
              background: mode === k ? T.tabOnBg : 'transparent',
              border: mode === k ? T.tabOnBorder : '1px solid rgba(218,165,32,0.25)',
              boxShadow: mode === k ? T.tabOnShadow : 'none',
            }}
          >
            {mode === k ? '✦ ' : ''}{label}{mode === k ? ' ✦' : ''}
          </button>
        ))}
      </div>

      {mode === 'free' ? (
        <div>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && q) onAsk(q); }}
            placeholder={placeholder}
            className="w-full rounded-xl px-4 py-3 text-center text-sm"
            style={{
              background: T.inputBg,
              border: T.inputBorder,
              color: T.inputColor,
              fontFamily: 'var(--font-cormorant), serif',
              caretColor: T.accent,
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.55)',
            }}
          />
          <div className="mt-5 text-center">
            <button
              onClick={() => q && onAsk(q)}
              disabled={!q}
              className="rounded-full px-9 py-3.5 text-base font-bold transition-all active:scale-[0.97] disabled:opacity-40"
              style={{
                fontFamily: 'var(--font-cinzel-deco), serif',
                letterSpacing: '0.05em',
                ...T.cta,
              }}
            >
              {ctaLabel ?? tr("Enregistrer et lancer", "Save and cast", "Guardar y lanzar", "सेवें और चलाएँ")}
            </button>
          </div>
        </div>
      ) : (
        <div>{children}</div>
      )}
    </div>
  );
}
