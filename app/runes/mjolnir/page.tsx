'use client';

// app/runes/mjolnir/page.tsx — « Le Marteau de Mjölnir » v2 (moule Yggdrasil)
// Le tirage de FRAPPE : 5 runes posées zone par zone sur le marteau forgé.
// Parcours : modale « Compris » (1re fois) → modale question (libre ou thème
// orienté 4×5) → le tirage se lance immédiatement.
// Chaque pierre CHAUFFE sa zone (bas du manche → crête) avec un petit choc ;
// la 5e déclenche LA FRAPPE (éclair + flash + tremblement + gerbe) puis la
// lecture IA dédiée (mode 'mjolnir', palette cèdre), le Conseil d'Odin et le
// sceau d'augure. Fil d'étapes + bandeau de pose pour accompagner le user.

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
import MjolnirArt, { MjolnirStrike } from './MjolnirArt';
import YggQuestion from '../yggdrasil/ygg-question';
import { MJG_POS, MJG_LABEL_AT, MJG_POSE_LINE } from './positions';

const RuneStonesSet = dynamic(
  () => import('@/components/rune-stones').then((m) => m.RuneStonesSet),
  { ssr: false },
);

type Phase = 'intro' | 'ask' | 'draw' | 'read';

function MjolnirPage() {
  const t = useT();
  const lang = useLang();
  const L = (fr: string, en: string) => (lang === 'en' ? en : fr);
  const POS = MJG_POS.map((p) => (lang === 'en' ? p.en.name : p.fr.name));

  const [phase, setPhase] = useState<Phase>('intro');
  const [isRolling, setIsRolling] = useState(false);
  const [runes, setRunes] = useState<DrawnRune[]>([]);
  const [lit, setLit] = useState(0);            // zones chauffées (0..5)
  const [strike, setStrike] = useState(false);  // la frappe
  const [openPos, setOpenPos] = useState<number | null>(null);
  const [openQ, setOpenQ] = useState(false);
  const [question, setQuestion] = useState<string | null>(null);
  const [readingId, setReadingId] = useState<string | null>(null);
  const [artH, setArtH] = useState(520);
  const savedRef = useRef(false);

  // Modale « Compris » : une seule fois par appareil.
  useEffect(() => {
    try { setPhase(localStorage.getItem('mjg_intro_seen') ? 'ask' : 'intro'); }
    catch { setPhase('ask'); }
  }, []);
  const closeIntro = useCallback(() => {
    try { localStorage.setItem('mjg_intro_seen', '1'); } catch { /* ignore */ }
    setPhase('ask');
  }, []);

  // Hauteur utile du marteau (~4/5 écran), comme sur Yggdrasil.
  useEffect(() => {
    const fit = () => setArtH(Math.max(470, Math.min(650, Math.round(window.innerHeight * 0.84) - 150)));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const roll = useCallback((q: string) => {
    setQuestion(q);
    setRunes([]); setLit(0); setStrike(false); setReadingId(null); setOpenPos(null);
    savedRef.current = false;
    setIsRolling(true);
    setPhase('draw');
  }, []);

  // Chaque pierre posée : sa zone chauffe + petit choc (impact forge).
  const handleReveal = useCallback((n: number) => {
    setLit(n);
    if (n > 0 && n < 5) playSound('rune-hit-1', 0.7);
  }, []);

  const handleRest = useCallback(async (r: DrawnRune[]) => {
    setIsRolling(false);
    setRunes(r);
    // LA FRAPPE : l'éclair part à la FIN de l'animation du dernier tirage
    // (la 5ᵉ rune a encore son vol + son rebond, ~1,2 s après l'appel de
    // repos) — pas à l'instant de sa pose.
    window.setTimeout(() => {
      setStrike(true);
      playSound('tonnerre', 0.95); // l'éclair gronde — l'impact grave de la Frappe
    }, 1200);
    if (!savedRef.current) {
      savedRef.current = true;
      const id = await saveReading({
        type: 'runes-mjolnir',
        spread: L('Le Marteau de Mjölnir', 'Mjölnir’s Hammer'),
        cards: r.slice(0, 5).map((d, i) => ({
          name: d.rune?.name, symbol: d.rune?.symbol, reversed: d.reversed, position: POS[i],
        })),
        question,
      });
      setReadingId(id);
    }
    // la frappe est montrée ~2,8 s avant que l'IA prenne le relais
    window.setTimeout(() => setPhase('read'), 2800);
  }, [POS, question, lang, L]);

  const onAnalysis = useCallback((text: string) => {
    if (readingId && text) updateReading(readingId, { interpretation: text });
  }, [readingId]);

  // Rappel de zone (clic sur étiquette ou pastille du fil).
  const infoCard = (i: number) => {
    const p = MJG_POS[i];
    const z = lang === 'en' ? p.en : p.fr;
    const d = runes[i];
    return (
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.96 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-x-3 top-2 z-40"
      >
        <div className="relative rounded-2xl border p-3.5" style={{
          background: 'linear-gradient(160deg, rgba(20,54,31,0.96) 0%, rgba(9,28,17,0.97) 100%)',
          borderColor: `${RUNE_THEME.goldPale}55`,
          boxShadow: '0 0 34px rgba(233,217,172,0.18), 0 18px 44px rgba(0,0,0,0.65)',
          colorScheme: 'dark',
        }}>
          <button type="button" aria-label={L('Fermer', 'Close')} onClick={() => setOpenPos(null)}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-sm"
            style={{ color: RUNE_THEME.goldPale, border: `1px solid ${RUNE_THEME.goldPale}44` }}>✕</button>
          <p className="text-[10px] uppercase tracking-[0.35em]" style={{ color: RUNE_THEME.goldSoft }}>{z.zone}</p>
          <h4 className="mt-1 text-[15px] font-bold" style={{ fontFamily: 'var(--font-cinzel), serif', color: RUNE_THEME.goldPale }}>
            {z.name}
            {d && <span className="ml-2 font-normal" style={{ color: RUNE_THEME.sagePale }}>— {d.rune?.symbol} {d.rune?.name}{d.reversed ? (lang === 'en' ? ' (reversed)' : ' (renversée)') : ''}</span>}
          </h4>
          <p className="mt-1 text-[12px] leading-relaxed" style={{ color: RUNE_THEME.sage }}>{z.deep}</p>
          {d && <p className="mt-1 text-[12px] italic leading-relaxed" style={{ color: RUNE_THEME.stone }}>{d.reversed ? d.rune?.reversed : d.rune?.upright}</p>}
        </div>
      </motion.div>
    );
  };

  const drawing = phase === 'draw' || phase === 'read';
  const STEPS = lang === 'en' ? MJG_POSE_LINE.en : MJG_POSE_LINE.fr;

  return (
    <RuneBackground>
      <YiSlideNav />

      {/* ── Modale d'accueil : le sens profond + les 5 zones du marteau ── */}
      <AnimatePresence>
        {phase === 'intro' && (
          <motion.div className="fixed inset-0 z-[90] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, y: 26, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-md overflow-y-auto rounded-2xl border p-6"
              style={{
                background: 'linear-gradient(160deg, #14301f 0%, #0c2417 60%, #06120b 100%)',
                borderColor: `${RUNE_THEME.goldPale}44`,
                boxShadow: '0 0 46px rgba(233,217,172,0.14), 0 24px 60px rgba(0,0,0,0.7)',
                maxHeight: '88vh',
              }}>
              <div className="pointer-events-none absolute inset-2 rounded-xl border" style={{ borderColor: `${RUNE_THEME.goldPale}22` }} />
              <p className="text-center text-sm tracking-[0.5em]" style={{ color: RUNE_THEME.goldSoft }}>ᛏ ⋅ ᛗ ⋅ ᛏ</p>
              <h2 className="mt-2 text-center text-2xl font-bold" style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: RUNE_THEME.goldPale, textShadow: '0 0 22px rgba(233,217,172,0.5)' }}>
                {L('Le Marteau de Mjölnir', 'Mjölnir’s Hammer')}
              </h2>
              <p className="mt-3 text-center text-[13px] italic leading-relaxed" style={{ color: RUNE_THEME.sage }}>
                {L('Les autres tirages éclairent. Celui-ci frappe. Face à un blocage qui résiste, le marteau d’Odin ne donne pas un conseil : il donne un plan de bataille — sur quoi t’appuyer, ce qui bloque vraiment, ce qu’il faut casser, avec quoi frapper, et le coup à porter.',
                  'The other castings illuminate. This one strikes. Facing a block that resists, Odin’s hammer gives no advice: it gives a battle plan — what to stand on, what truly blocks, what must break, what you strike with, and the blow to deliver.')}
              </p>
              <div className="mt-4 space-y-2">
                {MJG_POS.map((p) => (
                  <div key={p.key} className="flex items-start gap-3 rounded-xl px-3 py-2" style={{ background: 'rgba(12,36,23,0.6)', border: `1px solid ${RUNE_THEME.sage}22` }}>
                    <span className="mt-0.5 text-base leading-none" style={{ color: RUNE_THEME.goldPale }}>{lang === 'en' ? p.en.zone : p.fr.zone}</span>
                    <span className="text-[12px] leading-snug" style={{ color: RUNE_THEME.sagePale }}>
                      <b style={{ color: RUNE_THEME.goldPale }}>{(lang === 'en' ? p.en.name : p.fr.name)}</b>
                      {' — '}{lang === 'en' ? p.en.brief : p.fr.brief}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-center text-[11px] italic" style={{ color: `${RUNE_THEME.sage}aa` }}>
                {L('Seule la rune de la Menace est heureuse renversée : ce qui devait mourir est déjà mourant.',
                  'Only the Threat’s rune is glad reversed: what was meant to die is already dying.')}
              </p>
              <div className="mt-5 text-center">
                <RuneButton variant="save" saveTint="cedar" onClick={closeIntro}>{L('Compris', 'Understood')}</RuneButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modale question (libre OU thème) → lance directement le tirage ── */}
      <YggQuestion
        open={phase === 'ask'}
        onConfirm={roll}
        copy={{
          title: 'Quel obstacle frapper ?', titleEn: 'Which obstacle to strike?',
          sub: 'Nomme le blocage — ou choisis un thème si tu préfères rester abstrait.',
          subEn: 'Name the block — or pick a theme if you prefer to stay abstract.',
          cta: 'Armer le marteau', ctaEn: 'Arm the hammer',
        }}
      />

      {/* ── En-tête : titre + sous-titre (moule Yggdrasil), et rappel discret
           de la question pendant le tirage. -mt : on gagne la marge haute du
           bandeau pour que tout tienne AU-DESSUS du marteau. ── */}
      <div className="-mt-7">
      <RuneTitle
        compact
        fit
        title={t('runes.mjolnir.title')}
        subtitle={L('Brise ce qui résiste !', 'Break what resists!')}
      />
      {drawing && question && (
        <button type="button" onClick={() => setOpenQ(true)}
          className="mx-auto mt-2 flex max-w-[92vw] items-center gap-1.5 rounded-full px-3 py-0.5 text-center text-[12px] italic"
          style={{ fontFamily: 'var(--font-cormorant), serif', color: `${RUNE_THEME.sage}dd`, border: `1px dashed ${RUNE_THEME.sage}44`, background: 'rgba(8,22,14,0.55)' }}>
          <span className="inline-block max-w-[70vw] truncate">« {question} »</span>
          <span className="text-[10px] not-italic" style={{ color: RUNE_THEME.goldPale }}>⌄</span>
        </button>
      )}
      </div>

      {/* Modale « sujet validé » */}
      <AnimatePresence>
        {openQ && question && (
          <motion.div className="fixed inset-0 z-[95] flex items-center justify-center p-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpenQ(false)}>
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, y: 18, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }} transition={{ duration: 0.35 }} onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-2xl border p-5 text-center"
              style={{ background: 'linear-gradient(160deg, #14301f 0%, #0a2014 100%)', borderColor: `${RUNE_THEME.goldPale}55`, boxShadow: '0 0 40px rgba(233,217,172,0.14), 0 22px 54px rgba(0,0,0,0.7)' }}>
              <p className="text-[10px] uppercase tracking-[0.35em]" style={{ color: RUNE_THEME.goldSoft }}>
                {L('Obstacle confié au marteau', 'Obstacle entrusted to the hammer')}
              </p>
              <p className="mt-3 text-[16px] leading-relaxed" style={{ fontFamily: 'var(--font-cormorant), serif', color: RUNE_THEME.sagePale }}>« {question} »</p>
              <div className="mt-4"><RuneButton variant="save" saveTint="cedar" onClick={() => setOpenQ(false)}>{L('Fermer', 'Close')}</RuneButton></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-2xl px-4">
        {/* ── Fil d'étapes (accompagnement) : 1 confier · 2 forger · 3 frapper ── */}
        {drawing && (
          <div className="mb-0 mt-2 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.14em]" style={{ fontFamily: 'var(--font-cinzel), serif' }}>
            {[
              { k: L('Confier', 'Entrust'), at: 0 },
              { k: L('Forger', 'Forge'), at: 1 },
              { k: L('Frapper', 'Strike'), at: 5 },
            ].map((s, i) => {
              const reached = phase === 'read' || lit >= s.at || (s.at === 0 && !!question);
              const active = !reached || (i === 1 && lit > 0 && !strike && phase === 'draw');
              return (
                <span key={s.k} className="flex items-center gap-2">
                  {i > 0 && <span style={{ color: `${RUNE_THEME.sage}55` }}>›</span>}
                  <span className="rounded-full px-2 py-0.5" style={{
                    color: reached ? RUNE_THEME.goldPale : `${RUNE_THEME.sage}88`,
                    border: `1px solid ${reached ? `${RUNE_THEME.goldPale}55` : 'rgba(159,196,173,0.2)'}`,
                    background: active ? 'rgba(233,217,172,0.08)' : 'transparent',
                  }}>{s.k}</span>
                </span>
              );
            })}
          </div>
        )}

        {/* ── Bandeau d'accompagnement (dans le flux, AU-DESSUS du dessin) :
             la zone en cours se nomme pendant la pose ── */}
        <AnimatePresence mode="wait">
          {phase === 'draw' && lit < 5 && (
            <motion.p key={lit} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-2 mt-2 text-center text-[11px] italic"
              style={{ fontFamily: 'var(--font-cormorant), serif', color: RUNE_THEME.sagePale, textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}>
              {STEPS[Math.max(lit, 0)]}
            </motion.p>
          )}
        </AnimatePresence>

        {/* ── Le marteau : art + pierres + zones cliquables ── */}
        {drawing && (
          <div className="relative mx-auto" style={{ height: artH, maxWidth: 380 }}>
            <MjolnirArt lit={lit} />
            <RuneStonesSet count={5} layout="hammer" isRolling={isRolling} onReveal={handleReveal} onRest={handleRest} height={artH} />

            {/* pastilles cliquables sur chaque zone (pendant ET après le tirage) */}
            <div className="pointer-events-none absolute inset-0" style={{ zIndex: 20 }}>
              {MJG_POS.map((p, i) => (
                <button key={`${p.key}-hot`} type="button" aria-label={(lang === 'en' ? p.en.name : p.fr.name)}
                  onClick={() => setOpenPos(openPos === i ? null : i)}
                  className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    left: `${p.at.x}%`, top: `${p.at.y}%`, width: 52, height: 52,
                    border: `1px solid ${lit > i ? `${RUNE_THEME.goldPale}66` : 'rgba(159,196,173,0.22)'}`,
                    background: lit > i ? 'rgba(233,217,172,0.06)' : 'transparent',
                    boxShadow: lit > i ? '0 0 14px rgba(233,217,172,0.25)' : 'none',
                  }} />
              ))}
            </div>

            {/* étiquettes cliquables + point pulsé (marges libres) */}
            {MJG_POS.map((p, i) => (
              <AnimatePresence key={p.key}>
                {lit > i && (
                  <motion.button type="button" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.25 }}
                    onClick={() => setOpenPos(openPos === i ? null : i)}
                    className="absolute cursor-pointer whitespace-nowrap border-none bg-transparent p-1 text-[9.5px] uppercase tracking-[0.14em]"
                    style={{ ...MJG_LABEL_AT[i], color: RUNE_THEME.goldPale, textShadow: '0 1px 3px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.8)', fontFamily: 'var(--font-cinzel), serif' }}>
                    <motion.span aria-hidden className="mr-1 inline-block h-[6px] w-[6px] rounded-full align-middle"
                      style={{ background: RUNE_THEME.goldPale, boxShadow: '0 0 8px rgba(233,217,172,0.9)' }}
                      animate={{ opacity: [1, 0.35, 1], scale: [1, 0.8, 1] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }} />
                    {(lang === 'en' ? p.en.name : p.fr.name).split('—')[0].trim()}
                  </motion.button>
                )}
              </AnimatePresence>
            ))}

            {/* FRAPPE : calque éclair/réplique/étincelles monté APRÈS les
                pierres → passe littéralement DEVANT toute la scène. */}
            <MjolnirStrike strike={strike} />

            <AnimatePresence>{openPos !== null && infoCard(openPos)}</AnimatePresence>
          </div>
        )}

        {/* ── Lecture IA (palette cèdre) + Conseil d'Odin + sceau d'augure ── */}
        {phase === 'read' && (
          <div className="pb-24">
            <div className="mt-4">
              <RuneAnalysis
                mode="mjolnir"
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
  return <AuthGate><MjolnirPage /></AuthGate>;
}
