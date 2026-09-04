'use client';

// app/runes/nornes/nornes-tutorial-modal.tsx
// Modale « Principe du Fil des Nornes » affichée AVANT le premier tirage de
// /runes/nornes. Le bouton « Compris » ferme la modale et active le sac.
// Icônes SVG inline uniquement (règle projet : pas d'emoji/Material).

import { motion } from 'framer-motion';
import { useT } from '@/lib/i18n';
import { RUNE_THEME, RuneButton } from '../_shared';
import { ShakePouch } from './shake-tutorial';

export function NornesTutorialModal({
  onDone,
  step1Key = 'runes.nornes.modalStep1',
  step2Key = 'runes.nornes.modalStep2',
  step3Key = 'runes.nornes.modalStep3',
}: {
  onDone: () => void;
  /** Étapes personnalisables (/nornes2 : thème + révélation côte à côte). */
  step1Key?: string;
  step2Key?: string;
  step3Key?: string;
}) {
  const t = useT();
  const STEPS = [
    { glyph: 'ᛟ', key: step1Key },
    { glyph: 'ᚲ', key: step2Key },
    { glyph: 'ᛉ', key: step3Key },
  ];
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4">
      {/* Voile sombre */}
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={onDone} />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={t('runes.nornes.modalTitle')}
        initial={{ opacity: 0, scale: 0.94, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative w-full max-w-md rounded-2xl px-5 pb-5 pt-4 text-center"
        style={{
          background: `linear-gradient(160deg, ${RUNE_THEME.forest} 0%, ${RUNE_THEME.forestDeep} 60%, #06120b 100%)`,
          border: `1.5px solid ${RUNE_THEME.goldPale}55`,
          boxShadow: `0 0 60px rgba(0,0,0,0.6), inset 0 0 40px ${RUNE_THEME.forestMid}33`,
        }}
      >
        {/* Pochon animé (décor) */}
        <motion.div
          className="mx-auto mb-2 flex w-fit items-center justify-center"
          animate={{ rotate: [0, -7, 7, -7, 7, 0], x: [0, -3, 3, -3, 3, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 0.9, ease: 'easeInOut' }}
        >
          <ShakePouch size={56} />
        </motion.div>

        {/* Titre */}
        <h2
          className="text-lg sm:text-xl font-bold leading-tight"
          style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: RUNE_THEME.goldPale }}
        >
          {t('runes.nornes.modalTitle')}
        </h2>

        {/* Les 3 étapes */}
        <div className="mt-4 flex flex-col gap-2.5 text-left">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.key}
              className="flex items-start gap-2.5"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.18, duration: 0.35, ease: 'easeOut' }}
            >
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px]"
                style={{
                  background: `${RUNE_THEME.goldPale}1f`,
                  border: `1px solid ${RUNE_THEME.goldPale}55`,
                  color: RUNE_THEME.goldPale,
                  fontFamily: 'var(--font-cinzel-deco), serif',
                }}
              >
                {s.glyph}
              </span>
              <p
                className="text-xs sm:text-sm leading-relaxed"
                style={{ fontFamily: 'var(--font-cinzel), serif', color: RUNE_THEME.sagePale }}
              >
                {t(s.key)}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Seul bouton : Compris */}
        <div className="mt-5 flex justify-center">
          <RuneButton variant="save" onClick={onDone}>
            {t('runes.nornes.gotIt')}
          </RuneButton>
        </div>
      </motion.div>
    </div>
  );
}
