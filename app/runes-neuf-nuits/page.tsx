'use client';

// ═══════════════════════════════════════════════════════════════════
// PROTOTYPE JOUABLE — « Les Neuf Nuits d'Odin » (/runes-neuf-nuits)
// Non référencé dans les hubs : test de jouabilité uniquement.
//
// L'initiation du Hávamál : Odin, pendu neuf nuits à Yggdrasil, arracha
// les runes. Ici : le user ouvre une VEILLE, et chaque nuit tire une
// rune à l'aveugle (sachet de cuir). Neuf runes s'accumulent — au 3ᵉ,
// 6ᵉ et 9ᵉ seuil, l'oracle murmure une étape ; à la nuit 9, il tisse la
// SAGA complète des neuf runes et scelle l'augure pour la nuit suivante.
// Persistance locale (localStorage) pour la démo — en production :
// session de veille en base + push nocturne (cron existant).
// Palette : RUNE_THEME des hubs (vert forêt / doré pâle / brume).
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '@/lib/i18n';
import { ELDER_FUTHARK, type Rune } from '@/components/rune-stones/runes';
import { RUNE_THEME } from '../runes/_shared';

const GOLD = RUNE_THEME.goldPale;
const SAGE = RUNE_THEME.sage;
const IVORY = RUNE_THEME.sagePale;

type Draft = { r: number; i: number };
type Session = {
  id: string;
  startedAt: number;
  nights: { rune: number; aeatt: number; day: number }[];
  revealed: number; // combien de runes l'utilisateur a découvertes
  oracle: Record<string, string>;
};

const LS_KEY = '***';
const AEATTS = [
  { fr: 'Ætt de Frey', en: 'Frey’s Ætt' },
  { fr: 'Ætt de Hagal', en: 'Hagal’s Ætt' },
  { fr: 'Ætt de Týr', en: 'Týr’s Ætt' },
];

// Démo : on autorise toutes les 20 s pour tester le rythme ; la vraie
// version imposera une nuit réelle (date + push du cron 20h30).
const NIGHT_MS = 20_000;

function stoneFace(name: string): { bg: string; ink: string } {
  // 3 teintes de galet (granit / calcaire / schiste) pseudo-aléatoires par rune.
  const h = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 3;
  return h === 0
    ? { bg: 'linear-gradient(160deg,#5c6e63 0%,#2f4238 70%,#16241c 100%)', ink: '#0a1c11' }
    : h === 1
    ? { bg: 'linear-gradient(160deg,#8b9b8f 0%,#54645a 75%,#233228 100%)', ink: '#0a1c11' }
    : { bg: 'linear-gradient(160deg,#43554b 0%,#233528 75%,#0d1a11 100%)', ink: '#e9d9ac' };
}

function RuneStone({ rune, aeatt, faceDown, onFlip }: { rune: Rune; aeatt: number; faceDown: boolean; onFlip?: () => void }) {
  const face = stoneFace(rune.name);
  return (
    <motion.button
      type="button" onClick={onFlip}
      className="relative h-16 w-16 sm:h-20 sm:w-20"
      style={{ perspective: 600 }}
      whileHover={faceDown ? { scale: 1.08, rotate: Math.random() * 8 - 4 } : undefined}
      whileTap={{ scale: 0.94 }}
      animate={faceDown ? { y: [0, -14, 0], rotate: [0, Math.random() * 10 - 5, 0] } : { y: 0, rotate: 0 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      title={faceDown ? '???' : `${rune.name} — ${rune.upright}`}
    >
      <motion.div
        className="absolute inset-0"
        animate={{ rotateY: faceDown ? 0 : 180 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* dos : sachet de cuir gravé */}
        <div className="absolute inset-0 flex items-center justify-center rounded-[38%] border" style={{ backfaceVisibility: 'hidden', background: 'radial-gradient(ellipse at 35% 25%, #4a3524 0%, #2a1c12 65%, #170f08 100%)', borderColor: 'rgba(233,217,172,0.35)', boxShadow: '0 4px 10px rgba(0,0,0,0.55), inset 0 0 14px rgba(0,0,0,0.6)' }}>
          <div className="absolute inset-0 flex items-center justify-center text-lg" style={{ color: 'rgba(233,217,172,0.5)' }}>ᛟ</div>
        </div>
        {/* face : galet runique */}
        <div className="absolute inset-0 rounded-[36%] border" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: face.bg, borderColor: 'rgba(233,217,172,0.4)', boxShadow: '0 0 16px rgba(233,217,172,0.25), inset 0 2px 6px rgba(255,255,255,0.18), inset 0 -4px 8px rgba(0,0,0,0.45)' }}>
          <div className="absolute inset-0 flex items-center justify-center" style={{ color: GOLD, textShadow: '0 0 10px rgba(233,217,172,0.6)' }}>
            <span className="text-2xl sm:text-3xl">{rune.symbol}</span>
          </div>
          <div className="absolute inset-x-0 bottom-0.5 text-center text-[7px] uppercase tracking-widest sm:text-[8px]" style={{ color: face.ink, opacity: 0.85 }}>{rune.name}</div>
        </div>
      </motion.div>
    </motion.button>
  );
}

export default function PrototypeNeufNuits() {
  const lang = useLang();
  const [sess, setSess] = useState<Session | null>(null);
  const [shake, setShake] = useState(false);
  const [asked, setAsked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  // restauration + avance-auto « la nuit passe » (démo)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setSess(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    if (!sess) return;
    const id = window.setInterval(() => {
      setSess((cur) => {
        if (!cur) return cur;
        const last = cur.startedAt + cur.nights.length * NIGHT_MS;
        if (cur.nights.length < 9 && Date.now() - last >= 0) {
          const next = drawNight(cur.nights.map((n) => n.rune));
          const updated: Session = { ...cur, nights: [...cur.nights, next] };
          try { localStorage.setItem(LS_KEY, JSON.stringify(updated)); } catch {}
          return updated;
        }
        return cur;
      });
    }, 4000);
    return () => window.clearInterval(id);
  }, [sess?.startedAt]); // eslint-disable-line

  const nights = sess?.nights ?? [];
  const canDraw = nights.length === 0 || nights.length >= Math.floor((Date.now() - (sess?.startedAt ?? 0)) / NIGHT_MS) + 0;

  function openVigil() {
    const first = drawNight([]);
    const s: Session = { id: `v${Date.now()}`, startedAt: Date.now(), nights: [first], revealed: 0, oracle: {} };
    setSess(s);
    try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
    setToast(lang === 'en' ? 'The vigil begins. Night 1 falls.' : 'La veille commence. La 1ʳᵉ nuit tombe.');
    window.setTimeout(() => setToast(null), 2600);
  }

  function drawNight(used: number[]): { rune: number; aeatt: number; day: number } {
    const pool = ELDER_FUTHARK.map((_, i) => i).filter((i) => !used.includes(i));
    const r = pool[Math.floor(Math.random() * pool.length)];
    return { rune: r, aeatt: Math.floor(r / 8), day: used.length + 1 };
  }

  function reveal() {
    if (!sess) return;
    if (sess.revealed >= sess.nights.length) {
      setToast(lang === 'en' ? 'Wait for the next night…' : 'Attends la nuit suivante…');
      window.setTimeout(() => setToast(null), 1800);
      return;
    }
    const updated = { ...sess, revealed: sess.revealed + 1 };
    setSess(updated);
    try { localStorage.setItem(LS_KEY, JSON.stringify(updated)); } catch {}
  }

  function reshuffle() {
    if (!sess) return;
    const fresh: Session = { id: `v${Date.now()}`, startedAt: Date.now(), nights: [drawNight([])], revealed: 0, oracle: {} };
    setSess(fresh);
    try { localStorage.setItem(LS_KEY, JSON.stringify(fresh)); } catch {}
  }

  const milestones = [
    { at: 3, fr: 'La rune du seuil', en: 'The threshold rune' },
    { at: 6, fr: 'La rune du gouffre', en: 'The abyss rune' },
    { at: 9, fr: 'La Saga des neuf nuits', en: 'The Saga of the Nine Nights' },
  ];

  async function ask(key: string) {
    if (!sess) return;
    const ms = milestones.find((m) => m.en === key || String(m.at) === key)!;
    setLoading((l) => ({ ...l, [key]: true }));
    setErrors((e) => ({ ...e, [key]: false }));
    const n = ms.at;
    const taken = sess.nights.slice(0, n);
    const lines = taken.map((t) => {
      const rune = ELDER_FUTHARK[t.rune];
      return `${t.day}. ${rune.name} ${rune.symbol} (${AEATTS[t.aeatt].fr}) — ${rune.upright}`;
    }).join('\n');
    try {
      const res = await fetch('/api/prototype-interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'prototype',
          prompt: n === 9
            ? `Tu es un vates nordique. Voici les 9 runes tirées à l'aveugle au fil d'une veille de neuf nuits (comme Odin au tree-monde) :\n${lines}\n\nEn français, en 6 phrases maximum : tisse ces neuf runes en UNE saga — le fil du début, l'épreuve du milieu, la sagesse arrachée de la fin. Termine par une sentence rituelle brève. Pas de markdown.`
            : `Tu es un vates nordique. Voici ${n} runes tirées à l'aveugle durant une veille :\n${lines}\n\nEn français, en 3 phrases maximum : quel est le seuil que ces runes ouvrent, ce qu'elles exigent de celui qui les garde.`,
        }),
      });
      if (!res.ok) throw new Error('http');
      const data = await res.json();
      const txt = String(data.text || '').trim();
      if (!txt) throw new Error('empty');
      const updated = { ...sess, oracle: { ...sess.oracle, [key]: txt } };
      setSess(updated);
      try { localStorage.setItem(LS_KEY, JSON.stringify(updated)); } catch {}
    } catch { setErrors((e) => ({ ...e, [key]: true })); }
    finally { setLoading((l) => ({ ...l, [key]: false })); }
  }

  return (
    <div className="relative min-h-screen select-none overflow-x-hidden" style={{ background: `radial-gradient(ellipse at 50% -10%, ${RUNE_THEME.forest} 0%, ${RUNE_THEME.forestDeep} 55%, #06120b 100%)` }}>
      {/* Yggdrasil en fond : tronc + branche */}
      <svg className="pointer-events-none fixed left-1/2 top-0 h-full w-[680px] -translate-x-1/2 opacity-[0.10]" viewBox="0 0 200 400" fill="none" stroke={GOLD} strokeWidth="1">
        <path d="M100 0 C98 120 102 260 100 400" />
        <path d="M100 70 C60 50 40 70 18 62 M100 70 C140 48 160 68 182 58" opacity=".7" />
        <path d="M100 200 C70 190 55 205 30 200 M100 200 C132 188 148 204 172 198" opacity=".5" />
        <path d="M100 330 C74 344 60 336 38 350 M100 330 C128 344 142 336 164 352" opacity=".6" />
      </svg>

      <div className="relative z-10 mx-auto max-w-2xl px-4 pb-24 pt-14">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.4em]" style={{ color: `${GOLD}88` }}>✦ prototype ✦</p>
          <h1 className="mt-1 font-[family-name:var(--font-cinzel-deco)] text-3xl tracking-wide" style={{ color: GOLD, textShadow: '0 0 26px rgba(233,217,172,0.35)' }}>
            {lang === 'en' ? 'The Nine Nights of Odin' : 'Les Neuf Nuits d’Odin'}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-xs italic leading-relaxed" style={{ color: SAGE }}>
            {lang === 'en'
              ? '“I know I hung on the wind-swung tree, nine long nights, pierced by my own spear…” — the Hávamál. Each vigil night draws one rune blind from the leather pouch. At nights 3, 6 and 9, the seer speaks. Nine runes become one saga — and an augury is sealed for the dawn.'
              : '« Je sais que j’ai pendu au arbre hurlant au vent, neuf longues nuits, blessé par ma propre lance… » — le Hávamál. Chaque nuit de veille tire une rune à l’aveugle dans le sachet de cuir. Aux nuits 3, 6 et 9, le vate parle. Neuf runes deviennent une saga — et l’augure est scellé pour l’aube.'}
          </p>
          <p className="mt-1 text-[10px] tracking-widest" style={{ color: `${GOLD}77` }}>
            {lang === 'en' ? 'vigil: 1 grand draw + 2 whispers' : 'veille : 1 grand tirage + 2 murmures'} · {lang === 'en' ? 'demo pace = 20s/night' : 'démo : 20 s par nuit'}
          </p>
        </div>

        {!sess ? (
          <div className="mt-16 text-center">
            <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openVigil}
              className="rounded-full px-8 py-3 font-[family-name:var(--font-cinzel-deco)] text-sm font-bold uppercase tracking-widest"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.1) 38%, rgba(255,255,255,0) 60%), #1f5234',
                color: GOLD, border: `1.5px solid ${GOLD}`, boxShadow: '0 0 24px rgba(233,217,172,0.25), inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -3px 7px rgba(0,0,0,0.5)',
              }}>
              {lang === 'en' ? 'Begin the nine-night vigil' : 'Ouvrir la veille de neuf nuits'}
            </motion.button>
            <p className="mt-3 text-[11px]" style={{ color: SAGE, opacity: 0.85 }}>
              {lang === 'en' ? 'One opening draw (big cast). The nights are free.' : 'Un geste d’ouverture (grand tirage). Les nuits, elles, sont offertes.'}
            </p>
          </div>
        ) : (
          <>
            {/* La rangée des neuf emplacements */}
            <div className="mt-10 grid grid-cols-3 gap-4 sm:gap-6">
              {Array.from({ length: 9 }, (_, i) => {
                const night = nights[i];
                const isRevealed = night && i < sess.revealed;
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    {night ? (
                      <RuneStone
                        rune={ELDER_FUTHARK[night.rune]}
                        aeatt={night.aeatt}
                        faceDown={!isRevealed}
                        onFlip={() => (isRevealed ? undefined : i === sess.revealed ? reveal() : undefined)}
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-[38%] border border-dashed sm:h-20 sm:w-20" style={{ borderColor: `${GOLD}33` }} />
                    )}
                    <span className="text-[9px] uppercase tracking-widest" style={{ color: night ? SAGE : `${SAGE}55` }}>
                      {lang === 'en' ? `Night ${i + 1}` : `Nuit ${i + 1}`}
                    </span>
                    {night && i >= sess.revealed && (
                      <span className="text-[8px] italic" style={{ color: `${GOLD}99` }}>
                        {i === sess.revealed ? (lang === 'en' ? 'tap to reveal' : 'toucher pour révéler') : (lang === 'en' ? 'blind' : 'à l’aveugle')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Le sachet : geste de la nuit suivante (démo : 20 s) */}
            {nights.length < 9 && (
              <div className="mt-8 text-center">
                <motion.button
                  type="button"
                  onClick={() => { setShake(true); window.setTimeout(() => setShake(false), 650); }}
                  whileTap={{ scale: 0.9 }}
                  className="mx-auto flex h-16 w-24 items-center justify-center rounded-[50%_50%_46%_46%/60%_60%_40%_40%] border font-[family-name:var(--font-cinzel-deco)] text-[10px] uppercase tracking-widest"
                  style={{
                    background: 'radial-gradient(ellipse at 40% 25%, #4a3524 0%, #2a1c12 60%, #170f08 100%)',
                    borderColor: `${GOLD}66`, color: GOLD, boxShadow: 'inset 0 -6px 12px rgba(0,0,0,0.6), 0 6px 16px rgba(0,0,0,0.5)',
                    animation: shake ? 'pouchShake .6s ease-in-out' : undefined,
                  }}>
                  {lang === 'en' ? 'the pouch' : 'le sachet'}
                </motion.button>
                <style>{`@keyframes pouchShake{0%,100%{transform:rotate(0)}20%{transform:rotate(-12deg) translateY(-6px)}40%{transform:rotate(10deg)}60%{transform:rotate(-8deg) translateY(-3px)}80%{transform:rotate(6deg)}}`}</style>
                <p className="mt-2 text-[10px]" style={{ color: SAGE, opacity: 0.75 }}>
                  {nights.length < 9 ? (lang === 'en' ? 'shake when the night has come' : 'secoue quand la nuit est venue') : ''}
                </p>
              </div>
            )}

            {/* Murmures & saga */}
            {milestones.map((m) => {
              if (nights.length < m.at || sess.revealed < m.at) return null;
              const done = sess.oracle[m.en];
              return (
                <motion.div key={m.en} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-2xl p-4 sm:p-5"
                  style={{ background: 'linear-gradient(160deg, rgba(31,82,52,0.5) 0%, rgba(12,36,23,0.92) 100%)', border: `1.5px solid ${m.at === 9 ? GOLD : `${GOLD}44`}`, boxShadow: m.at === 9 ? '0 0 30px rgba(233,217,172,0.18)' : 'none' }}>
                  <h3 className="text-center font-[family-name:var(--font-cinzel-deco)] text-sm" style={{ color: GOLD }}>
                    {lang === 'en' ? m.en : m.fr}
                  </h3>
                  {!done && !loading[m.en] && !errors[m.en] && (
                    <div className="mt-3 text-center">
                      <button onClick={() => ask(m.en)} className="rounded-full px-6 py-2 text-xs font-bold uppercase tracking-widest"
                        style={{ background: m.at === 9 ? 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.12) 38%, rgba(255,255,255,0) 60%), #005f6a' : 'transparent', color: m.at === 9 ? '#fff' : GOLD, border: m.at === 9 ? 'none' : `1px solid ${GOLD}55`, boxShadow: m.at === 9 ? '0 0 16px rgba(0,95,106,0.5), inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -3px 7px rgba(0,0,0,0.35)' : 'none' }}>
                        {m.at === 9 ? (lang === 'en' ? 'Weave the saga' : 'Tisser la saga') : lang === 'en' ? 'Hear the whisper' : 'Écouter le murmure'}
                      </button>
                    </div>
                  )}
                  {loading[m.en] && <p className="mt-3 text-center text-xs italic" style={{ color: SAGE }}>{lang === 'en' ? 'The runes are whispering…' : 'Les runes murmurent…'}</p>}
                  {errors[m.en] && !loading[m.en] && (
                    <div className="mt-3 text-center">
                      <p className="text-xs italic" style={{ color: SAGE }}>{lang === 'en' ? 'Wind swallowed the whisper — try again.' : 'Le vent a avalé le murmure — réessaie.'}</p>
                      <button onClick={() => ask(m.en)} className="mt-1 text-xs underline" style={{ color: GOLD }}>{lang === 'en' ? 'Retry' : 'Relancer'}</button>
                    </div>
                  )}
                  {done && <p className="mt-2 text-center text-sm italic leading-relaxed" style={{ color: IVORY, fontFamily: 'var(--font-cinzel), serif' }}>« {done} »</p>}
                  {m.at === 9 && done && (
                    <p className="mt-3 text-center text-[11px]" style={{ color: `${GOLD}aa` }}>
                      {lang === 'en' ? '→ seal your augury on the saga’s promise (EchoBox in prod)' : '→ scelle ton augure sur la promesse de la saga (EchoBox en version réelle)'}
                    </p>
                  )}
                </motion.div>
              );
            })}

            <div className="mt-8 text-center">
              <button onClick={() => { if (confirm(lang === 'en' ? 'Abandon this vigil?' : 'Abandonner cette veille ?')) reshuffle(); }} className="text-[11px] underline" style={{ color: `${GOLD}77` }}>
                {lang === 'en' ? 'abandon vigil (demo)' : 'abandonner la veille (démo)'}
              </button>
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm"
            style={{ background: 'rgba(12,36,23,0.94)', border: `1px solid ${GOLD}66`, color: GOLD, fontFamily: 'var(--font-cinzel), serif', boxShadow: '0 0 24px rgba(233,217,172,0.3)' }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
