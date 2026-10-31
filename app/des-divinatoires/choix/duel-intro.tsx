'use client';

// app/des-divinatoires/choix/duel-intro.tsx — La carte de DÉPÔT du Duel v2.
// Le consultant ne choisit pas un thème : il dépose SON hésitation, en trois
// gestes simples guidés par l'exemple dans chaque champ :
//   1. le chemin A, comme il le vit (don + coût) ;
//   2. le chemin B, idem ;
//   3. (facultatif, précieux) le nœud — ce qui rend le choix si dur.
// Garde-fous : 10 caractères mini par option ; si A et B se ressemblent trop
// (texte quasi doublon), l'invite à préciser ce qui les sépare avant de lancer.

import { useState } from 'react';
import { motion } from 'framer-motion';
import { DICE_THEME, DiceButton } from '../_shared';
import { useT } from '@/lib/i18n';

/** similarité trigrammes 0..1 (FR-simple, sans dépendance) */
export function duelSimilarity(a: string, b: string): number {
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  const A = norm(a), B = norm(b);
  if (!A || !B) return 0;
  if (A === B) return 1;
  const grams = (s: string) => {
    const g = new Set<string>();
    for (let i = 0; i + 3 <= s.length; i++) g.add(s.slice(i, i + 3));
    return g;
  };
  const ga = grams(A), gb = grams(B);
  let inter = 0;
  ga.forEach((x) => { if (gb.has(x)) inter++; });
  return inter / Math.max(1, ga.size + gb.size - inter);
}

export function DuelIntroCard({
  onLaunch,
}: {
  onLaunch: (a: string, b: string, knot: string) => void;
}) {
  const t = useT();
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [knot, setKnot] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const field = (
    label: string,
    value: string,
    set: (s: string) => void,
    placeholder: string,
    max = 240,
  ) => (
    <label className="block">
      <span
        className="mb-1 block text-[11px] uppercase tracking-[0.16em]"
        style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.ocreLight }}
      >
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => { set(e.target.value.slice(0, max)); if (err) setErr(null); }}
        rows={2}
        placeholder={placeholder}
        className="w-full resize-none rounded-xl px-3 py-2 text-sm outline-none"
        style={{
          fontFamily: 'var(--font-cormorant), serif',
          background: 'rgba(4,6,15,0.55)',
          border: `1.5px solid ${DICE_THEME.gold}55`,
          color: DICE_THEME.glyph,
        }}
      />
    </label>
  );

  const submit = () => {
    const A = a.trim(), B = b.trim();
    if (A.length < 10 || B.length < 10) { setErr(t('des.choix.duel.errShort')); return; }
    if (duelSimilarity(A, B) > 0.72) { setErr(t('des.choix.duel.errSame')); return; }
    onLaunch(A, B, knot.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-xl rounded-3xl border p-5"
      style={{
        borderColor: `${DICE_THEME.gold}55`,
        background: `linear-gradient(160deg, ${DICE_THEME.brick} 0%, ${DICE_THEME.brickDeep} 100%)`,
        boxShadow: `inset 0 0 34px ${DICE_THEME.gold}0c`,
      }}
    >
      <h3
        className="mb-1 text-center text-base font-bold"
        style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.gold, textShadow: `0 0 18px ${DICE_THEME.gold}44` }}
      >
        {t('des.choix.duel.title')}
      </h3>
      <p
        className="mb-4 text-center text-[12px] italic leading-relaxed"
        style={{ fontFamily: 'var(--font-cormorant), serif', color: `${DICE_THEME.ocreLight}dd` }}
      >
        {t('des.choix.duel.instruct')}
      </p>

      <div className="space-y-3">
        {field(t('des.choix.duel.labelA'), a, setA, t('des.choix.duel.phA'))}
        {field(t('des.choix.duel.labelB'), b, setB, t('des.choix.duel.phB'))}
        {field(t('des.choix.duel.labelKnot'), knot, setKnot, t('des.choix.duel.phKnot'), 300)}
      </div>

      {err && (
        <p className="mt-3 text-center text-[12px]" style={{ color: '#F2B8A0' }}>{err}</p>
      )}

      <div className="mt-5 flex justify-center">
        <DiceButton variant="gold" onClick={submit}>
          {t('des.choix.duel.cta')}
        </DiceButton>
      </div>
    </motion.div>
  );
}
