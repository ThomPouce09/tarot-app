'use client';

// components/artemis-parchment.tsx — Le parchemin du SECRET d'Artémis,
// composant autonome (réutilisé par /obstacle-solution ; /affinage garde sa
// version embarquée, inchangée, pour ne pas risquer de régression).
//
// Mécaniques identiques à l'affinage :
//   - bouton « Révéler le secret » tant que non révélé ;
//   - parchemin secret-artemis.png = RÉCEPTACLE : zone texte calée dans la
//     partie claire, police auto-ajustée (jamais de débordement du cadre) ;
//   - reflet lumineux qui balaie + lueur lunaire pulsante à l'apparition ;
//   - son 'artemis-reveal' (magic10.wav) à l'apparition réelle du texte ;
//   - le clic (son 'artemis-secret') est joué par le parent APRÈS ses propres
//     vérifications de privilège (modale de gate possible).

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { playSound } from '@/lib/sounds';
import { useT } from '@/lib/i18n';

export default function ArtemisParchment({
  advice,
  revealed,
  onReveal,
}: {
  /** Texte gravé reçu (peut arriver après la révélation : mode filet). */
  advice: string | null;
  revealed: boolean;
  onReveal: () => void;
}) {
  const t = useT();
  const boxRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLParagraphElement | null>(null);
  const [font, setFont] = useState<string | null>(null);
  const soundDoneRef = useRef(false);

  // Précharge le parchemin dès que le secret est disponible (avant le clic).
  useEffect(() => {
    if (!advice) return;
    const img = new window.Image();
    img.src = '/images/secret-artemis.png';
  }, [advice]);

  // Son de révélation à l'APPARITION réelle du texte (une fois).
  useEffect(() => {
    if (!revealed || !advice) return;
    if (soundDoneRef.current) return;
    soundDoneRef.current = true;
    playSound('artemis-reveal', 1);
  }, [revealed, advice]);
  useEffect(() => {
    if (!revealed) soundDoneRef.current = false;
  }, [revealed]);

  // Le parchemin s'installe AU CENTRE de l'écran à la révélation (exigence
  // user : il restait trop bas). Deux passes : le ressort framer et
  // l'auto-fit de la police déplacent le bloc après le premier alignement.
  useEffect(() => {
    if (!revealed) return;
    const c = () => wrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t1 = window.setTimeout(c, 150);
    const t2 = window.setTimeout(c, 700);
    const t3 = window.setTimeout(c, 1300);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); window.clearTimeout(t3); };
  }, [revealed, advice]);

  // Auto-ajustement de la police : le texte doit tenir dans la zone claire
  // (même algorithme que l'affinage : on réduit jusqu'à ce qu'il tienne).
  useEffect(() => {
    if (!revealed || !advice) return;
    let raf = 0;
    const fit = () => {
      const box = boxRef.current;
      const txt = textRef.current;
      if (!box || !txt) return;
      let size = 15;
      txt.style.fontSize = `${size}px`;
      // On descend tant que le texte déborde de la zone (marge de 2 px).
      while (txt.scrollHeight > box.clientHeight - 2 && size > 8.5) {
        size -= 0.5;
        txt.style.fontSize = `${size}px`;
      }
      setFont(`${size}px`);
    };
    raf = requestAnimationFrame(fit);
    return () => cancelAnimationFrame(raf);
  }, [revealed, advice]);

  if (!revealed) {
    return (
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={onReveal}
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all hover:scale-[1.03] hover:brightness-110 active:scale-95"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.12) 38%, rgba(255,255,255,0) 60%), #005f6a',
            color: '#fff',
            fontFamily: 'var(--font-cinzel), serif',
            boxShadow:
              '0 0 16px rgba(0,95,106,0.5), inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -3px 7px rgba(0,0,0,0.35)',
          }}
        >
          <span aria-hidden className="text-base leading-none">☾</span>
          {t('des.affinage.artemis.reveal')}
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="mx-auto mt-6 scroll-mt-24" style={{ maxWidth: 560 }}>
      <p
        className="mb-3 flex items-center justify-center gap-2 text-base font-bold uppercase tracking-[0.14em]"
        style={{
          fontFamily: 'var(--font-cinzel-deco), serif',
          backgroundImage: 'linear-gradient(180deg, #FFFFFF 0%, #DCE6F5 45%, #9FB4E8 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          filter:
            'drop-shadow(0 2px 3px rgba(0,0,0,0.55)) drop-shadow(0 0 14px rgba(200,215,255,0.45))',
        }}
      >
        <span aria-hidden style={{ color: '#DCE6F5', WebkitTextFillColor: '#DCE6F5' }}>✦</span>
        {t('des.affinage.artemis.title')}
        <span aria-hidden style={{ color: '#DCE6F5', WebkitTextFillColor: '#DCE6F5' }}>✦</span>
      </p>
      <motion.div
        initial={{ opacity: 0, scale: 0.78, y: 20, filter: 'blur(8px)' }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ type: 'spring', damping: 15, stiffness: 150, mass: 0.9 }}
        className="relative mx-auto overflow-hidden rounded-xl"
        style={{
          width: 'min(80%, 360px)',
          aspectRatio: '250 / 318',
          backgroundImage: "url('/images/secret-artemis.png')",
          backgroundSize: '100% 100%',
          backgroundPosition: 'center',
          boxShadow: '0 14px 44px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.35)',
        }}
      >
        {/* Reflet lumineux qui balaie le parchemin */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-1/2"
          style={{
            background:
              'linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.5) 45%, rgba(255,255,255,0.08) 60%, transparent 100%)',
            left: '-60%',
          }}
          initial={{ left: '-60%' }}
          animate={{ left: '110%' }}
          transition={{ delay: 0.35, duration: 0.95, ease: 'easeInOut' }}
        />
        {/* Lueur lunaire pulsante dans la zone claire */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 45%, rgba(214,228,255,0.55), transparent 70%)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.5, 0.15, 0.35, 0.15] }}
          transition={{ delay: 0.5, duration: 1.6, times: [0, 0.3, 0.55, 0.8, 1] }}
        />
        {/* Zone texte : calée DANS la partie claire du parchemin */}
        <div
          ref={boxRef}
          className="absolute flex flex-col items-center justify-center overflow-y-auto overscroll-contain"
          style={{ top: '17%', bottom: '20%', left: '15%', right: '15%', scrollbarWidth: 'none', touchAction: 'pan-y' }}
        >
          {advice ? (
            <motion.p
              ref={textRef}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.55 }}
              className="text-center font-bold italic leading-snug"
              style={{
                fontFamily: 'var(--font-cinzel), serif',
                fontSize: font || '12px',
                color: '#2E2A4A',
                textShadow:
                  '0 -1px 0 rgba(20,16,48,0.4), 0 1px 0 rgba(255,252,240,0.9), 0 2px 4px rgba(46,42,74,0.18)',
              }}
            >
              {advice}
            </motion.p>
          ) : (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-sm italic"
              style={{ fontFamily: 'var(--font-cinzel), serif', color: '#2E2A4A' }}
            >
              {t('des.affinage.artemis.whispering')}
            </motion.p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
