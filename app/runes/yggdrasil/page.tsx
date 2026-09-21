'use client';

// app/runes/yggdrasil/page.tsx — « Les Racines d'Yggdrasil » v2
// Le tirage-BILAN : 5 runes posées ZONE PAR ZONE sur l'Arbre-Monde.
// Parcours : modale « Compris » (1re fois) → modale question (libre ou
// thème orienté, 4 domaines × 5 sous-thèmes) → LE tirage se lance
// immédiatement. Pas de question = pas d'arbre.
// Chaque pierre allume sa zone (racines → tronc → branches → couronne) ; la
// 5e déclenche le bloom puis la lecture IA (mode 'yggdrasil', palette cèdre).
// Les zones restent cliquables pendant/après le tirage (rappel symbolique).
// Le titre+ sous-titre disparaissent pendant le tirage : la place rendue sert
// à l'arbre (~4/5 de la hauteur d'écran) avec un discret bandeau rappelant
// la question validée.

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import YiSlideNav from '@/components/yi-slide-nav';
import {
  RuneBackground,
  RuneTitle,
  RuneButton,
  RuneAnalysis,
  RUNE_THEME,
} from '../_shared';
import { type DrawnRune } from '@/components/rune-stones';
import { saveReading, updateReading } from '@/lib/save-reading';
import { useT, useLang } from '@/lib/i18n';
import AuthGate from '@/components/auth-gate';
import { playSound } from '@/lib/sounds';
import YggdrasilArt from './YggdrasilArt';
import YggQuestion from './ygg-question';
import { YGG_POS } from './positions';

const RuneStonesSet = dynamic(
  () => import('@/components/rune-stones').then((m) => m.RuneStonesSet),
  { ssr: false },
);

type Phase = 'intro' | 'ask' | 'draw' | 'read';

function YggdrasilPage() {
  const t = useT();
  const lang = useLang();
  const L = (fr: string, en: string) => (lang === 'en' ? en : fr);
  const POS = YGG_POS.map((p) => (lang === 'en' ? p.en.name : p.fr.name));

  const [phase, setPhase] = useState<Phase>('intro');
  const [isRolling, setIsRolling] = useState(false);
  const [runes, setRunes] = useState<DrawnRune[]>([]);
  const [lit, setLit] = useState(0);          // zones allumées (0..5)
  const [bloom, setBloom] = useState(false);  // l'arbre entier s'embrase
  const [openPos, setOpenPos] = useState<number | null>(null); // zone rappelée
  const [openQ, setOpenQ] = useState(false);                    // modale sujet
  const [question, setQuestion] = useState<string | null>(null);
  const [readingId, setReadingId] = useState<string | null>(null);
  const [treeH, setTreeH] = useState(520);    // hauteur utile de l'arbre
  const savedRef = useRef(false);

  // Modale « Compris » : une seule fois par appareil (pattern Double Hexagramme).
  useEffect(() => {
    try {
      setPhase(localStorage.getItem('ygg_intro_seen') ? 'ask' : 'intro');
    } catch { setPhase('ask'); }
  }, []);
  const closeIntro = useCallback(() => {
    try { localStorage.setItem('ygg_intro_seen', '1'); } catch { /* ignore */ }
    setPhase('ask');
  }, []);

  // ~4/5 de la hauteur d'écran pour l'arbre (borné), titre en haut + IA dessous.
  useEffect(() => {
    const fit = () => setTreeH(Math.max(470, Math.min(650, Math.round(window.innerHeight * 0.84) - 110)));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const roll = useCallback((q: string) => {
    setQuestion(q);
    setRunes([]); setLit(0); setBloom(false); setReadingId(null); setOpenPos(null);
    savedRef.current = false;
    setIsRolling(true);
    setPhase('draw');
  }, []);

  // Chaque pierre posée : sa zone s'allume + son (sève). La 5e → bloom.
  const handleReveal = useCallback((n: number) => {
    setLit(n);
    if (n > 0 && n < 5) playSound('stick-draw', 0.55);
    if (n >= 5) {
      setBloom(true);
      playSound('spell', 0.9); // l'arbre s'éveille
    }
  }, []);

  // Toutes les runes sont au repos → sauvegarde + bascule lecture.
  const handleRest = useCallback(async (r: DrawnRune[]) => {
    setIsRolling(false);
    setRunes(r);
    if (!savedRef.current) {
      savedRef.current = true;
      const id = await saveReading({
        type: 'runes-yggdrasil',
        spread: L("Les Racines d'Yggdrasil", "The Roots of Yggdrasil"),
        cards: r.slice(0, 5).map((d, i) => ({
          name: d.rune?.name,
          symbol: d.rune?.symbol,
          reversed: d.reversed,
          position: POS[i],
        })),
        question,
      });
      setReadingId(id);
    }
    // bloom 2,6 s puis l'analyse IA prend le relais (autoRun dans RuneAnalysis)
    window.setTimeout(() => setPhase('read'), 2600);
  }, [POS, question, lang, L]);

  const onAnalysis = useCallback((text: string) => {
    if (readingId && text) updateReading(readingId, { interpretation: text });
  }, [readingId]);

  // Le contenu du rappel de zone : symbolique + (si la pierre est posée) sa rune.
  const infoCard = (i: number) => {
    const p = YGG_POS[i];
    const fr = lang === 'en' ? p.en : p.fr;
    const d = runes[i];
    const sens = d ? (d.reversed
      ? (lang === 'en' ? ' (reversed)' : ' (renversée)')
      : '') : '';
    return (
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.96 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-x-3 top-2 z-40"
      >
        <div
          className="relative rounded-2xl border p-3.5"
          style={{
            background: 'linear-gradient(160deg, rgba(20,54,31,0.96) 0%, rgba(9,28,17,0.97) 100%)',
            borderColor: `${RUNE_THEME.goldPale}55`,
            boxShadow: '0 0 34px rgba(233,217,172,0.18), 0 18px 44px rgba(0,0,0,0.65)',
            colorScheme: 'dark',
          }}
        >
          <button
            type="button"
            aria-label={L('Fermer', 'Close')}
            onClick={() => setOpenPos(null)}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-sm"
            style={{ color: RUNE_THEME.goldPale, border: `1px solid ${RUNE_THEME.goldPale}44` }}
          >
            ✕
          </button>
          <p className="text-[10px] uppercase tracking-[0.35em]" style={{ color: RUNE_THEME.goldSoft }}>
            {fr.zone}
          </p>
          <h4 className="mt-1 text-[15px] font-bold" style={{ fontFamily: 'var(--font-cinzel), serif', color: RUNE_THEME.goldPale }}>
            {fr.name}
            {d && (
              <span className="ml-2 font-normal" style={{ color: RUNE_THEME.sagePale }}>
                — {d.rune?.symbol} {d.rune?.name}{sens}
              </span>
            )}
          </h4>
          <p className="mt-1 text-[12px] leading-relaxed" style={{ color: RUNE_THEME.sage }}>
            {fr.deep}
          </p>
          {d && (
            <p className="mt-1 text-[12px] italic leading-relaxed" style={{ color: RUNE_THEME.stone }}>
              {d.reversed ? d.rune?.reversed : d.rune?.upright}
            </p>
          )}
        </div>
      </motion.div>
    );
  };

  const drawing = phase === 'draw' || phase === 'read';

  return (
    <RuneBackground>
      <YiSlideNav />

      {/* ── Modale d'accueil : le sens profond + les 5 positions ── */}
      <AnimatePresence>
        {phase === 'intro' && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, y: 26, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border p-6"
              style={{
                background: 'linear-gradient(160deg, #14301f 0%, #0c2417 60%, #06120b 100%)',
                borderColor: `${RUNE_THEME.goldPale}44`,
                boxShadow: '0 0 46px rgba(233,217,172,0.14), 0 24px 60px rgba(0,0,0,0.7)',
              }}
            >
              <div className="pointer-events-none absolute inset-2 rounded-xl border" style={{ borderColor: `${RUNE_THEME.goldPale}22` }} />
              <p className="text-center text-sm tracking-[0.5em]" style={{ color: RUNE_THEME.goldSoft }}>ᛉ ⋅ ᛟ ⋅ ᛉ</p>
              <h2 className="mt-2 text-center text-2xl font-bold" style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: RUNE_THEME.goldPale, textShadow: '0 0 22px rgba(233,217,172,0.5)' }}>
                {L('Les Racines d’Yggdrasil', 'The Roots of Yggdrasil')}
              </h2>
              <p className="mt-3 text-center text-[13px] italic leading-relaxed" style={{ color: RUNE_THEME.sage }}>
                {L('Ce tirage ne répond pas à une question : il dresse ton bilan. Ton chemin vu comme l’Arbre-Monde — ce qui te nourrit en secret, ce qui te ronge, ce qui te tient debout, ce qui peut encore grandir, et ce que seul le sommet voit.',
                  'This casting answers no question: it draws your reckoning. Your path as the World-Tree — what feeds you unseen, what gnaws at you, what keeps you standing, what can still grow, and what only the crown can see.')}
              </p>
              <div className="mt-4 space-y-2">
                {YGG_POS.map((p) => (
                  <div key={p.key} className="flex items-start gap-3 rounded-xl px-3 py-2" style={{ background: 'rgba(12,36,23,0.6)', border: `1px solid ${RUNE_THEME.sage}22` }}>
                    <span className="mt-0.5 text-base leading-none" style={{ color: RUNE_THEME.goldPale }}>
                      {lang === 'en' ? p.en.zone : p.fr.zone}
                    </span>
                    <span className="text-[12px] leading-snug" style={{ color: RUNE_THEME.sagePale }}>
                      <b style={{ color: RUNE_THEME.goldPale }}>{(lang === 'en' ? p.en.name : p.fr.name)}</b>
                      {' — '}
                      {lang === 'en' ? p.en.brief : p.fr.brief}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-center text-[11px] italic" style={{ color: `${RUNE_THEME.sage}aa` }}>
                {L('Seule la rune du Dragon est heureuse renversée : nommer ce qui ronge, c’est déjà le vaincre.',
                  'Only the Dragon’s rune is glad reversed: naming what gnaws is already defeating it.')}
              </p>
              <div className="mt-5 text-center">
                <RuneButton onClick={closeIntro}>{L('Compris', 'Understood')}</RuneButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modale de la question : libre OU thème orienté → lance le tirage ── */}
      <YggQuestion open={phase === 'ask'} onConfirm={roll} />

      {/* ── Bandeau d'en-tête : titre + sous-titre (comme avant), et pendant
           le tirage le rappel discret de la question validée juste en dessous ── */}
      <RuneTitle
        compact
        fit
        title={t('runes.yggdrasil.title')}
        subtitle={L('Le bilan de l’Arbre-Monde : cinq runes, des racines à la couronne.',
          'The World-Tree reckoning: five runes, from roots to crown.')}
      />
      {drawing && question && (
        <button
          type="button"
          onClick={() => setOpenQ(true)}
          className="mx-auto mt-3 flex max-w-[92vw] items-center gap-1.5 rounded-full px-3 py-0.5 text-center text-[12px] italic"
          style={{
            fontFamily: 'var(--font-cormorant), serif', color: `${RUNE_THEME.sage}dd`,
            border: `1px dashed ${RUNE_THEME.sage}44`, background: 'rgba(8,22,14,0.55)',
          }}
        >
          <span className="inline-block max-w-[70vw] truncate">« {question} »</span>
          <span className="text-[10px] not-italic" style={{ color: RUNE_THEME.goldPale }}>⌄</span>
        </button>
      )}

      {/* Modale « sujet validé » : question ou thème+sous-thème choisis */}
      <AnimatePresence>
        {openQ && question && (
          <motion.div
            className="fixed inset-0 z-[95] flex items-center justify-center p-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpenQ(false)}
          >
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }} transition={{ duration: 0.35 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-2xl border p-5 text-center"
              style={{
                background: 'linear-gradient(160deg, #14301f 0%, #0a2014 100%)',
                borderColor: `${RUNE_THEME.goldPale}55`,
                boxShadow: '0 0 40px rgba(233,217,172,0.14), 0 22px 54px rgba(0,0,0,0.7)',
              }}
            >
              <p className="text-[10px] uppercase tracking-[0.35em]" style={{ color: RUNE_THEME.goldSoft }}>
                {L('Sujet confié à l’Arbre', 'Matter entrusted to the Tree')}
              </p>
              <p className="mt-3 text-[16px] leading-relaxed" style={{ fontFamily: 'var(--font-cormorant), serif', color: RUNE_THEME.sagePale }}>
                « {question} »
              </p>
              <div className="mt-4">
                <RuneButton variant="save" saveTint="cedar" onClick={() => setOpenQ(false)}>{L('Fermer', 'Close')}</RuneButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-2xl px-4">
        {/* ── L'Arbre-Monde : SVG + pierres + zones cliquables (~4/5 écran) ── */}
        {drawing && (
          <div className="relative mx-auto" style={{ height: treeH, maxWidth: 380 }}>
            <YggdrasilArt lit={lit} pulse={bloom} />
            <RuneStonesSet
              count={5}
              layout="tree"
              isRolling={isRolling}
              onReveal={handleReveal}
              onRest={handleRest}
              height={treeH}
            />
            {/* Zones cliquables : rappeler la symbolique, pendant ET après le tirage. */}
            <div className="pointer-events-none absolute inset-0" style={{ zIndex: 20 }}>
              {YGG_POS.map((p, i) => (
                <button
                  key={`${p.key}-hot`}
                  type="button"
                  aria-label={(lang === 'en' ? p.en.name : p.fr.name)}
                  onClick={() => setOpenPos(openPos === i ? null : i)}
                  className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    left: `${p.at.x}%`, top: `${p.at.y}%`,
                    width: 52, height: 52,
                    border: `1px solid ${lit > i ? `${RUNE_THEME.goldPale}66` : 'rgba(159,196,173,0.22)'}`,
                    background: lit > i ? 'rgba(233,217,172,0.06)' : 'transparent',
                    boxShadow: lit > i ? '0 0 14px rgba(233,217,172,0.25)' : 'none',
                  }}
                />
              ))}
            </div>
            {/* Étiquettes cliquables des zones (dans les marges libres, jamais
                sur les runes) : un tap rouvre le rappel de symbolique. */}
            {YGG_POS.map((p, i) => (
              <AnimatePresence key={p.key}>
                {lit > i && (
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.25 }}
                    onClick={() => setOpenPos(openPos === i ? null : i)}
                    className="absolute cursor-pointer whitespace-nowrap border-none bg-transparent p-1 text-[9.5px] uppercase tracking-[0.14em]"
                    style={{
                      ...[{ left: '2%', top: '62%' }, { right: '2%', top: '50%' },
                          { left: '2%', top: '40%' }, { right: '2%', top: '31.5%' },
                          { right: '14%', top: '6%' }][i],
                      color: RUNE_THEME.goldPale,
                      textShadow: '0 1px 3px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.8)',
                      fontFamily: 'var(--font-cinzel), serif',
                    }}
                  >
                    <motion.span
                      aria-hidden
                      className="mr-1 inline-block h-[6px] w-[6px] rounded-full align-middle"
                      style={{ background: RUNE_THEME.goldPale, boxShadow: '0 0 8px rgba(233,217,172,0.9)' }}
                      animate={{ opacity: [1, 0.35, 1], scale: [1, 0.8, 1] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    {(lang === 'en' ? p.en.name : p.fr.name).split('—')[0].trim()}
                  </motion.button>
                )}
              </AnimatePresence>
            ))}
            {/* Le rappel de zone (symbole + pierre posée) */}
            <AnimatePresence>{openPos !== null && infoCard(openPos)}</AnimatePresence>
          </div>
        )}

        {/* ── Lecture : l'IA seule (les symboliques vivent sur l'arbre) ── */}
        {phase === 'read' && (
          <div className="pb-24">
            <div className="mt-4">
              <RuneAnalysis
                mode="yggdrasil"
                moss
                runes={runes.slice(0, 5).map((d, i) => ({ rune: d.rune, reversed: d.reversed, position: POS[i] }))}
                question={question}
                onAnalysis={onAnalysis}
                echo={{ readingId, question }}
                autoRun
              />
            </div>
          </div>
        )}
      </div>
    </RuneBackground>
  );
}

export default function GatedPage() {
  return <AuthGate><YggdrasilPage /></AuthGate>;
}
