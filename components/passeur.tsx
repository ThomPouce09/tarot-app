'use client';

// components/passeur.tsx — « Le Passeur » : aide au choix du tirage, par univers.
//
// Deux exports :
//   <PasseurButton universe> — pastille « ? » sœur du bouton volume (même style,
//     même position, juste dessous), présente sur les 4 hubs d'univers.
//   <PasseurGuide universe> — la modale conversationnelle : la bulle circulaire
//     affiche le Renard (public/images/creatures/renard-rappel-profil.png, comme
//     le rappel « compléter le profil ») et fait visiter les tirages
//     RÉELS de l'univers, un par un ; « C'est pour moi » plonge dans le tirage,
//     « Voir la suite » passe au suivant ; en bout de course, « Choisir moi-même ».
//
// Ouverture auto : une fois par univers (flag compte 'passeur_<u>'), UNIQUEMENT
// si le mode Préférences est 'auto' et que le hall des Étoiles est terminé.
// Vouvoiement de rigueur (règle utilisateur).

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useLang, useT } from '@/lib/i18n';
import { playSound } from '@/lib/sounds';
import { isTutorialSeen, markTutorialSeen, hydrateTutorials, TUTS_EVENT } from '@/lib/tutorials';
import { GUIDE_UNIVERSES, type UniverseKey, type PasseurMode } from '@/lib/guide-data';

// ── Préférence partagée (localStorage + base) ────────────────────────────────
export const PASSEUR_MODE_KEY = 'tarot_passeur_mode';
export const PASSEUR_MODE_EVENT = 'passeur-mode-changed';

export function getPasseurMode(): PasseurMode {
  if (typeof window === 'undefined') return 'auto';
  const v = localStorage.getItem(PASSEUR_MODE_KEY);
  return v === 'bouton' || v === 'off' ? v : 'auto';
}

export function setPasseurMode(m: PasseurMode) {
  try { localStorage.setItem(PASSEUR_MODE_KEY, m); } catch { /* stockage indisponible */ }
  window.dispatchEvent(new Event(PASSEUR_MODE_EVENT));
}

// ── Le bouton « ? » (jumeau de l'enceinte) ───────────────────────────────────
export function PasseurButton({ universe, open, top = 80, right = 7, z = 55 }: {
  universe: UniverseKey; open: () => void; top?: number; right?: number; z?: number;
}) {
  const t = useT();
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const sync = () => setHidden(getPasseurMode() === 'off');
    sync();
    window.addEventListener(PASSEUR_MODE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(PASSEUR_MODE_EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);
  if (hidden) return null;
  const label = t('passeur.open');
  return (
    <button
      type="button"
      onClick={() => { playSound('mute-unmute', 0.7); open(); }}
      aria-label={label}
      title={label}
      className="fixed flex h-9 w-9 items-center justify-center rounded-full opacity-60 backdrop-blur-[2px] transition-all duration-300 hover:scale-110 hover:opacity-100 active:scale-95"
      style={{
        top,
        right,
        zIndex: z,
        background: 'rgba(26,14,10,0.28)',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: 'none',
      }}
    >
      {/* Glyphe « ? » fin — même trait que l'enceinte (stroke 2, viewBox 24) */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DAA520" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M9.2 9a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.4-2.8 4" />
        <path d="M12 17.5h.01" />
      </svg>
    </button>
  );
}

// ── La modale du guide ───────────────────────────────────────────────────────
export function PasseurGuide({ universe }: { universe: UniverseKey }) {
  const router = useRouter();
  const t = useT();
  const lang = useLang();
  const U = GUIDE_UNIVERSES[universe];
  const fr = lang !== 'en';
  const flagKey = `passeur_${universe}`;
  const hubPath = U.hubPath;
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0); // 0..N-1 = tirage présenté ; N = fin

  // Ouverture par le bouton (monté sur le hub)
  useEffect(() => {
    const onOpen = () => { hydrateTutorials().then(() => setOpen(true)); };
    window.addEventListener('passeur-open', onOpen);
    return () => window.removeEventListener('passeur-open', onOpen);
  }, []);

  // Ouverture AUTO : mode 'auto' + flag univers jamais vu + hall terminé
  // + portail langue fermé. Comme FirstVisitHints, on attend la disparition
  // des overlays prioritaires ; on ne se relance JAMAIS après fermeture.
  useEffect(() => {
    let stop = false;
    const poll = () => {
      if (stop) return;
      // Mode vérifié À CHAQUE tick : un changement dans Préférences (autre onglet)
      // est respecté immédiatement.
      if (getPasseurMode() !== 'auto') return;
      const busy = document.querySelector('[data-lang-gate]') || document.querySelector('[data-tour="hall"]');
      hydrateTutorials().then(() => {
        if (stop) return;
        // flag posé à la fermeture : la modale ne se rouvre jamais en auto.
        if (!busy && !isTutorialSeen(flagKey)) setOpen(true);
        else setTimeout(poll, 600);
      });
    };
    poll();
    return () => { stop = true; };
  }, [flagKey]);

  // Ferme si l'utilisateur navigue hors du hub (on sort, la page change).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    markTutorialSeen(flagKey); // « vu » = ne se rouvre plus en auto, quel que soit le mode de sortie
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flagKey]);

  const go = useCallback((href: string) => {
    setOpen(false);
    markTutorialSeen(flagKey);
    router.push(href);
  }, [flagKey, router]);

  const N = U.tirages.length;
  const step = idx < N ? U.tirages[idx] : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="dialog" aria-modal="true" aria-label={t('passeur.aria')}
        >
          {/* Overlay — voilé, jamais d'encre noire */}
          <div className="absolute inset-0" style={{ background: 'rgba(10,8,14,0.62)', backdropFilter: 'blur(3px)' }} onClick={close} />

          {/* Panneau */}
          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-3xl"
            style={{
              background: `linear-gradient(160deg, ${U.panelFrom} 0%, ${U.panelTo} 100%)`,
              border: `1.5px solid ${U.accent}66`,
              boxShadow: '0 12px 48px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.04)',
            }}
            initial={{ y: 28, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {/* halo or en tête */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28"
              style={{ background: `radial-gradient(ellipse at 50% 0%, ${U.accent}2e 0%, transparent 70%)` }} />

            {/* En-tête : le Passeur en bulle + progression */}
            <div className="relative px-6 pt-6 pb-3">
              <div className="flex items-center gap-4">
                {/* Avatar en pastille circulaire (jamais carrée) */}
                <div
                  className="shrink-0 rounded-full overflow-hidden"
                  style={{
                    width: 64, height: 64,
                    border: `2px solid ${U.accent}`,
                    boxShadow: `0 0 18px ${U.accent}55, 0 4px 12px rgba(0,0,0,0.4)`,
                  }}
                  aria-hidden
                >
                  <img src="/images/creatures/renard-rappel-profil.png" alt="" className="h-full w-full object-cover" style={{ objectPosition: '50% 40%' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold leading-tight" style={{
                    fontFamily: 'var(--font-cinzel-deco), serif',
                    color: U.accent,
                    textShadow: `0 0 14px ${U.accent}44`,
                  }}>
                    {fr ? 'Aide aux tirages' : 'Reading helper'}
                  </h2>
                  <p className="mt-0.5 text-[11px] leading-snug" style={{ color: U.accentPale, opacity: 0.9 }}>
                    {fr ? `Choisir un tirage dans ${U.nameFr.toLowerCase()}` : `Choosing a reading in ${U.nameEn}`}
                  </p>
                </div>
              </div>
              {/* progression : pastilles par tirage */}
              <div className="mt-3 flex items-center gap-1.5" aria-hidden>
                {U.tirages.map((tg, i) => (
                  <span key={tg.href} className="rounded-full transition-all duration-300"
                    style={{
                      width: i === idx ? 18 : 7, height: 7,
                      background: i < idx ? `${U.accent}cc` : i === idx ? U.accent : `${U.accent}33`,
                    }} />
                ))}
                <span className="ml-auto text-[10px] tabular-nums" style={{ color: U.accentPale, opacity: 0.75 }}>
                  {idx + 1} / {N}
                </span>
              </div>
            </div>

            {/* Corps : la carte du tirage présenté (cascade à chaque étape) */}
            <div className="relative px-6 pb-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.32, ease: 'easeOut' }}
                >
                  {step ? (
                    <>
                      {/* Bulle du Passeur : « parle » à chaque étape */}
                      <div
                        className="rounded-2xl rounded-tl-md px-4 py-3 text-[13px] leading-relaxed"
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: `1px solid ${U.accent}3d`,
                          color: '#F5EAD6',
                        }}
                      >
                        <span className="font-semibold" style={{ color: U.accent }}>
                          {fr ? step.title : step.titleEn}
                        </span>
                        {' · '}
                        <span style={{ opacity: 0.85 }}>
                          {fr ? step.gestureFr : step.gestureEn}
                        </span>
                      </div>
                      <p className="mt-2.5 text-xs leading-relaxed" style={{ color: U.accentPale, opacity: 0.92 }}>
                        {(fr ? step.forFr : step.forEn)}
                      </p>

                      {/* Actions */}
                      <div className="mt-4 flex flex-col gap-2">
                        <button
                          onClick={() => { playSound('soft-pop', 0.8); go(step.href); }}
                          className="w-full rounded-xl py-2.5 text-sm font-semibold transition-all active:scale-[0.98]"
                          style={{
                            background: `linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.10) 38%, transparent 60%), linear-gradient(135deg, ${U.accent}, ${U.panelFrom})`,
                            color: '#1c1006',
                            border: `1px solid ${U.accent}`,
                            boxShadow: `0 4px 16px ${U.accent}44, inset 0 -3px 8px rgba(0,0,0,0.25)`,
                          }}
                        >
                          {fr ? 'C’est pour moi' : 'This one is for me'}
                        </button>
                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => { playSound('mute-unmute', 0.5); setIdx((i) => Math.min(i + 1, N)); }}
                            className="text-xs underline-offset-2 transition-opacity hover:opacity-80"
                            style={{ color: U.accentPale }}
                          >
                            {fr ? 'Non, voir la suite →' : 'No, show me the next →'}
                          </button>
                          <button
                            onClick={close}
                            className="text-xs underline-offset-2 transition-opacity hover:opacity-80"
                            style={{ color: U.accentPale, opacity: 0.75 }}
                          >
                            {fr ? 'Choisir moi-même' : 'Choose on my own'}
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Écran de fin : rien ne correspond → le Passeur l'assume */
                    <>
                      <div
                        className="rounded-2xl rounded-tl-md px-4 py-3 text-[13px] leading-relaxed"
                        style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${U.accent}3d`, color: '#F5EAD6' }}
                      >
                        {fr
                          ? 'Aucun de ces tirages ne vous parle ? Ce n’est pas un échec — l’Oracle écoute aussi les silences. Vous pouvez parcourir les tuiles à votre rythme, ou changer d’univers depuis le hall.'
                          : 'None of these readings speaks to you? That is not a failure — the Oracle listens to silences too. Browse the tiles at your own pace, or return to the hall and try another universe.'}
                      </div>
                      <div className="mt-4 flex flex-col gap-2">
                        <button onClick={close} className="w-full rounded-xl py-2.5 text-sm font-semibold active:scale-[0.98]"
                          style={{
                            background: `linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.10) 38%, transparent 60%), linear-gradient(135deg, ${U.accent}, ${U.panelFrom})`,
                            color: '#1c1006', border: `1px solid ${U.accent}`,
                            boxShadow: `0 4px 16px ${U.accent}44, inset 0 -3px 8px rgba(0,0,0,0.25)`,
                          }}>
                          {fr ? 'Parcourir les tirages' : 'Browse the readings'}
                        </button>
                        <div className="flex items-center justify-between gap-2">
                          <button onClick={() => setIdx(0)} className="text-xs underline-offset-2 hover:opacity-80" style={{ color: U.accentPale }}>
                            {fr ? '↺ Revenir au début' : '↺ Start over'}
                          </button>
                          <button onClick={() => { playSound('mute-unmute', 0.4); close(); router.push('/'); }} className="text-xs underline-offset-2 hover:opacity-80" style={{ color: U.accentPale, opacity: 0.8 }}>
                            {fr ? 'Retour au hall' : 'Back to the hall'}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Pied discret */}
              <p className="mt-4 text-center text-[10px]" style={{ color: U.accentPale, opacity: 0.55 }}>
                {fr ? '✦ Cette aide ne prédit rien — elle ouvre la bonne porte. ✦' : '✦ This helper predicts nothing — it opens the right door. ✦'}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Enveloppe prête à monter sur un hub ──────────────────────────────────────
export default function Passeur({ universe, top = 80, right = 7 }: { universe: UniverseKey; top?: number; right?: number }) {
  // le bouton dispatche 'passeur-open' ; le guide l'écoute (un seul composant monté)
  return (
    <>
      <PasseurButton universe={universe} top={top} right={right} open={() => window.dispatchEvent(new Event('passeur-open'))} />
      <PasseurGuide universe={universe} />
    </>
  );
}
