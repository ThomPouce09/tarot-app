'use client';

// app/des-divinatoires/choix/duel-verdict.tsx — L'ACTE 4 du Duel v2 :
// sous la balance figée, l'argumentation de la voyante se déplie —
// les deux vies en regard, l'angle mort, la Troisième Lumière (ligne
// flottante ENTRE les plateaux), le résumé, puis le TRANCHÉ du consultant
// (c'est lui qui conclut, pas le tirage : deux boutons A/B + trace).

import { useState } from 'react';
import { motion } from 'framer-motion';
import { DICE_THEME } from '../_shared';
import { md } from './helpers';
import { useT } from '@/lib/i18n';

export interface DuelVerdict {
  tranche: string;
  developA: string;
  developB: string;
  consequenceA: string;
  consequenceB: string;
  angleMorts: string;
  conditionRenverse: string;
  troisiemeLumiere: string;
  resume: string;
}

const cardStyle: React.CSSProperties = {
  background: `linear-gradient(160deg, ${DICE_THEME.brick} 0%, ${DICE_THEME.brickDeep} 100%)`,
  border: `1.5px solid ${DICE_THEME.gold}33`,
  boxShadow: `inset 0 0 30px ${DICE_THEME.gold}0c`,
};

function SectionTitle({ children, tone }: { children: React.ReactNode; tone?: 'gold' | 'blue' }) {
  return (
    <p
      className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em]"
      style={{
        fontFamily: 'var(--font-cinzel-deco), serif',
        color: tone === 'blue' ? '#87CEEB' : DICE_THEME.ocreLight,
      }}
    >
      {children}
    </p>
  );
}

function Corps({ text, large }: { text: string; large?: boolean }) {
  if (!text) return null;
  return <div className={large ? 'text-[16px] leading-relaxed' : 'text-[15px] leading-relaxed'} style={{ fontFamily: 'var(--font-cormorant), serif', color: '#F0E6D3', lineHeight: 1.75 }}>{md(text)}</div>;
}

export function DuelVerdictCard({
  verdict,
  balance,
}: {
  verdict: DuelVerdict;
  balance: 'A' | 'B';
}) {
  const t = useT();
  const [open, setOpen] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
      className="mx-auto max-w-2xl rounded-3xl p-5"
      style={cardStyle}
    >
      {/* ═══ Le tranché de la voyante (toujours visible) ═══ */}
      <p
        className="text-center text-[19px] font-bold leading-relaxed"
        style={{
          fontFamily: 'var(--font-cinzel), serif',
          color: DICE_THEME.gold,
          textShadow: `0 0 18px ${DICE_THEME.gold}44`,
        }}
      >
        {verdict.tranche}
      </p>

      {/* la balance TOMBE toujours : conditionRenverse = la nuance de la
          victoire à la pesée (ce qui ferait basculer la face restante). */}
      {verdict.conditionRenverse && (
        <p
          className="mx-auto mt-3 max-w-xl text-center text-[16px] italic"
          style={{ fontFamily: 'var(--font-cormorant), serif', color: `${DICE_THEME.glyph}dd` }}
        >
          {verdict.conditionRenverse}
        </p>
      )}

      {/* ═══ Les deux vies, en regard ═══ */}
      <button
        className="mt-4 w-full text-center text-[11px] uppercase tracking-[0.2em]"
        style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: `${DICE_THEME.ocreLight}bb` }}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? '⌄ ' : '⌃ '}
        {t('des.choix.duel.twoLives')}
      </button>

      {open && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl p-4" style={{ background: 'rgba(4,6,15,0.4)', border: `1px solid ${DICE_THEME.gold}22` }}>
              <SectionTitle>{t('des.choix.duel.argA')}</SectionTitle>
              <Corps text={verdict.developA} large />
              {verdict.consequenceA && (
                <>
                  <p className="mt-3 mb-1"><SectionTitle tone="blue">{t('des.choix.duel.lifeA')}</SectionTitle></p>
                  <Corps text={verdict.consequenceA} large />
                </>
              )}
            </div>
            <div className="rounded-2xl p-4" style={{ background: 'rgba(4,6,15,0.4)', border: `1px solid ${DICE_THEME.gold}22` }}>
              <SectionTitle>{t('des.choix.duel.argB')}</SectionTitle>
              <Corps text={verdict.developB} large />
              {verdict.consequenceB && (
                <>
                  <p className="mt-3 mb-1"><SectionTitle tone="blue">{t('des.choix.duel.lifeB')}</SectionTitle></p>
                  <Corps text={verdict.consequenceB} large />
                </>
              )}
            </div>
          </div>

          {/* ═══ Angle mort + Troisième Lumière (la porte cachée) ═══ */}
          {verdict.angleMorts && (
            <div className="mt-4 rounded-2xl p-4" style={{ background: 'rgba(10,20,48,0.55)', border: `1px dashed ${DICE_THEME.gold}44` }}>
              <SectionTitle>{t('des.choix.duel.angleMort')}</SectionTitle>
              <Corps text={verdict.angleMorts} large />
            </div>
          )}
          {verdict.troisiemeLumiere && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 1.4 }}
              className="mx-auto mt-4 max-w-xl text-center text-[17px] italic leading-relaxed"
              style={{
                fontFamily: 'var(--font-cormorant), serif',
                color: '#FFF6DC',
                textShadow: `0 0 16px ${DICE_THEME.ocreLight}66`,
              }}
            >
              ✦ {verdict.troisiemeLumiere} ✦
            </motion.p>
          )}
          {verdict.resume && (
            <p
              className="mt-4 text-center text-[16px] font-bold"
              style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.ocreLight }}
            >
              {verdict.resume}
            </p>
          )}
        </motion.div>
      )}

      {/* ═══ C'est le consultant qui tranche — le tirage s'arrête au seuil
            (retour user : pas de boutons, la ligne d'invitation suffit). ═══ */}
      <p
        className="mt-5 text-center text-[14px] uppercase tracking-[0.18em]"
        style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: `${DICE_THEME.ocreLight}dd` }}
      >
        {t('des.choix.duel.decide')}
      </p>
    </motion.div>
  );
}
