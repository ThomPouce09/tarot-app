'use client';

// app/des-divinatoires/launch-card.tsx
// Carte d'introduction partagée des tirages de dés (/choix, /obstacle-solution) :
// soit Élément & intention (même sélecteur que le tirage simplifié), soit
// question libre écrite. Le CTA « Enregistrer et lancer les dés » est serti
// or sur indigo profond. `lockedMode` impose le mode hérité du 1ᵉʳ tirage
// (thème ⇒ thème, question ⇒ question — jamais de mélange A/B).

import { tr } from '@/lib/i18n';
import { useState } from 'react';
import { DICE_THEME } from './_shared';
import { DiceThemeSelector } from '@/app/des-divinatoires-simplifie/theme-selector';

export function DiceLaunchCard({ title, placeholder, instruct, draft, setDraft, onLaunch, lockedMode, lockNote }: {
  title: string;
  placeholder: string;
  instruct: string;
  draft: string;
  setDraft: (v: string) => void;
  onLaunch: (q: string | null, m: 'theme' | 'free') => void;
  /** Mode imposé (second tirage = premier tirage : pas de mixage thème/question). */
  lockedMode?: 'theme' | 'free' | null;
  /** Libellé de la note de verrouillage (ex. « 1ᵉʳ choix », « l'Obstacle »). */
  lockNote?: string;
}) {
  const [mode, setMode] = useState<'theme' | 'free'>(lockedMode ?? 'free');
  const eff = lockedMode ?? mode;
  const q = draft.trim();
  return (
    <div
      className="mx-auto max-w-2xl rounded-2xl p-5 sm:p-6"
      style={{
        background: 'linear-gradient(160deg, rgba(20,36,90,0.92) 0%, rgba(10,20,48,0.94) 55%, rgba(4,6,15,0.95) 100%)',
        border: '1.5px solid rgba(212,175,55,0.42)',
        boxShadow: '0 18px 44px rgba(0,0,0,0.6), inset 0 0 40px rgba(212,175,55,0.07)',
      }}
    >
      <h3
        className="mb-1 text-center text-lg font-bold"
        style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.ocreLight, textShadow: '0 0 14px rgba(232,198,106,0.4)' }}
      >
        {title}
      </h3>
      <p
        className="mx-auto mb-4 max-w-md text-center text-xs italic leading-relaxed"
        style={{ fontFamily: 'var(--font-cinzel), serif', color: '#DCE6F599' }}
        dangerouslySetInnerHTML={{ __html: instruct }}
      />

      {/* Onglets : question libre (défaut) / thème & intention. Verrouillés
          quand le second tirage doit imiter le premier (pas de mixage). */}
      <div className="mb-4 flex justify-center gap-2">
        {([
          ['theme', 'Élément & intention'],
          ['free', 'Ma question libre'],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            type="button"
            disabled={!!lockedMode}
            onClick={() => !lockedMode && setMode(k)}
            className="rounded-full px-4 py-1.5 text-xs font-bold transition-all active:scale-[0.97]"
            style={{
              fontFamily: 'var(--font-cinzel), serif',
              letterSpacing: '0.06em',
              color: eff === k ? DICE_THEME.ocreLight : 'rgba(220,230,245,0.55)',
              background: eff === k ? 'linear-gradient(180deg, #2a3a6b 0%, #0a1430 100%)' : 'transparent',
              border: eff === k ? '1px solid rgba(212,175,55,0.75)' : '1px solid rgba(212,175,55,0.25)',
              boxShadow: eff === k ? '0 0 16px rgba(212,175,55,0.3), inset 0 1px 0 rgba(232,198,106,0.3)' : 'none',
              opacity: lockedMode && eff !== k ? 0.35 : 1,
            }}
          >
            {eff === k ? '✦ ' : ''}{label}{eff === k ? ' ✦' : ''}{lockedMode && lockedMode === k ? ` (repris${lockNote ? ` ${lockNote}` : ' du 1ᵉʳ tirage'})` : ''}
          </button>
        ))}
      </div>

      {eff === 'theme' ? (
        <DiceThemeSelector ctaSculpt onConfirm={(qq) => onLaunch(qq, 'theme')} />
      ) : (
        <div>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl px-4 py-3 text-center text-sm"
            style={{
              background: 'rgba(4,6,15,0.6)',
              border: '1px solid rgba(212,175,55,0.35)',
              color: '#DCE6F5',
              fontFamily: 'var(--font-cormorant), serif',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.55)',
            }}
          />
          <div className="mt-5 text-center">
            <button
              onClick={() => onLaunch(q || null, 'free')}
              disabled={!q}
              className="rounded-full px-9 py-3.5 text-base font-bold transition-all active:scale-[0.97] disabled:opacity-40"
              style={{
                fontFamily: 'var(--font-cinzel-deco), serif',
                letterSpacing: '0.05em',
                color: '#F7ECCE',
                background: 'linear-gradient(180deg, #22366f 0%, #14245a 46%, #070d22 100%)',
                border: '1px solid rgba(232,198,106,0.85)',
                boxShadow: '0 0 0 4px rgba(212,175,55,0.12), 0 12px 26px rgba(3,5,12,0.85), 0 0 36px rgba(212,175,55,0.3), inset 0 1px 0 rgba(232,198,106,0.5), inset 0 -14px 26px rgba(0,0,0,0.55)',
                textShadow: '0 0 12px rgba(232,198,106,0.5), 0 1px 2px rgba(0,0,0,0.9)',
              }}
            >
              {tr("Enregistrer et lancer les dés", "Save and roll the dice", "Guardar y lanzar los dados", "सेवें और पासे फेंकें")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
