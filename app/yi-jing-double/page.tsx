'use client';

// ═══════════════════════════════════════════════════════════════════
// /yi-jing-double — « Le Double Hexagramme » (zhi gua) — v2 complète.
//
// 1. Une question (domaine & intention, comme les tirages simplifiés).
// 2. Le rituel des trois pièces : brassage au creux de la main, jet,
//    impact sur la table (CoinRitual — le serveur re-dérive la paire).
// 3. L'hexagramme se construit EN DIRECT dans le coin (jet 1 = trait du bas).
// 4. Phase 4 : coupelle et pièces disparaissent ; présent à gauche, futur
//    des mutantes à droite — la mutation joue sous les yeux.
// 5. Lecture de la paire par l'oracle (4 temps + échéance en jours).
// 6. L'augure se SCELLE sur l'échéance (Echo, push au jour dit) ; au retour,
//    verdict en % — la boucle maison est enclenchée.
//
// Économie : 1 grand tirage à la pose (consume serveur via /api/entitlement).
// Consultation libre : chaque pose débite 1 grand tirage (débit serveur).
// Le scellement est OPTIONNEL : quitter la page libere une nouvelle consultation.
// Sauvegarde : Reading type 'yi-jing-double' — vue « présent → futur » dans
// l'historique. Palette : laque noir/rouge/or (charte Yi Jing).
// ═══════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '@/lib/i18n';
import { useEntitlement, EntitlementGateModal } from '@/lib/use-entitlement';
import AuthGate from '@/components/auth-gate';
import YiSlideNav from '@/components/yi-slide-nav';
import WaitOverlay from '@/components/wait-overlay';
import { YiThemeSelector, YI_LACQUER, YI_GLASS } from '../yi-jing-simplifie/theme-selector';
import { api } from '@/lib/api-client';
import { playSound, stopSound, installSoundUnlock } from '@/lib/sounds';
import CoinRitual from './coin-ritual';
import HEX from '@/lib/yj-hexagrams.json';

type HexRow = { c: string; b: string };
const BY_BITS: Record<string, number> = {};
for (const [n, h] of Object.entries(HEX as Record<string, HexRow>)) BY_BITS[h.b] = Number(n);

const GOLD = YI_LACQUER.gold;
const GOLD_SOFT = YI_LACQUER.goldSoft;
const LILAC = YI_LACQUER.lilac;
const LILAC_DIM = YI_LACQUER.lilacDim;
const MUT = '#FF6B5E';
/** secondes d'admiration de la paire mutée avant l'auto-lecture IA */
const AUTO_READ_SECS = 4;
/* Pilule laque rouge/bordeaux — même veine que les boutons rouges des tirages Yi Jing. */
const YI_RED = {
  background:
    'linear-gradient(180deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.08) 40%, rgba(255,255,255,0) 55%), linear-gradient(160deg, #8e1c22 0%, #6b1017 55%, #3a070c 100%)',
  color: '#FFE9C9',
  border: '1.5px solid rgba(243,201,105,0.55)',
  boxShadow:
    '0 6px 18px rgba(0,0,0,0.55), 0 0 22px rgba(180,40,45,0.35), inset 0 1px 1px rgba(255,255,255,0.25), inset 0 -5px 12px rgba(0,0,0,0.45)',
  textShadow: '0 1px 2px rgba(0,0,0,0.6)',
};

interface DoubleRead { sections: { key: string; fr: string; en: string }[]; dueInDays: number }
interface DoubleView {
  id: string; castAt: string; question: string | null;
  lignes: number[]; mutants: number[];
  hexPresent: number; hexFutur: number;
  names: { pFr: string; pEn: string; fFr: string; fEn: string };
  read: DoubleRead | null;
  echo: { id: string; textFr: string; textEn: string | null; dueAt: string; verdict: string | null; verdictPct: number | null } | null;
}

function emailLocal(): string {
  try { return JSON.parse(localStorage.getItem('tarot_user') || '{}')?.email ?? ''; } catch { return ''; }
}
const DAY_MS = 86400000;

/* ─────────────────────────── Une ligne (yao) ─────────────────────────── */

function Yao({ yang, mutating, wave, turned }: { yang: boolean; mutating: boolean; wave: boolean; turned: boolean }) {
  const color = mutating && wave && !turned ? MUT : GOLD;
  const bar = (
    <div
      className="h-[10px] rounded-sm"
      style={{
        background: `linear-gradient(180deg, rgba(255,248,222,0.95) 0%, ${color} 42%, rgba(16,8,2,0.42) 100%), ${color}`,
        boxShadow: mutating
          ? `inset 0 1px 0 rgba(255,255,255,0.75), inset 0 -2px 4px rgba(40,20,0,0.6), 0 0 14px ${color}, 0 2px 6px rgba(0,0,0,0.5)`
          : `inset 0 1px 0 rgba(255,255,255,0.65), inset 0 -2px 4px rgba(40,20,0,0.55), 0 0 6px rgba(243,201,105,0.35), 0 2px 5px rgba(0,0,0,0.45)`,
        opacity: mutating ? 1 : 0.95,
      }}
    />
  );
  // Une ligne mutante retournée affiche sa NOUVELLE nature (le retournement
  // est le moment — visuellement, c'est tout le sel du tirage).
  const shownYang = turned ? !yang : yang;
  return (
    <motion.div
      animate={mutating && wave && !turned ? { scaleY: [1, 1.35, 0.9, 1.25, 1], rotateZ: [0, -1.6, 1.6, -0.8, 0] } : { scaleY: 1, rotateZ: 0 }}
      transition={mutating && wave && !turned ? { duration: 1.05, repeat: Infinity } : { duration: 0.45 }}
      className="flex w-full items-center justify-center gap-3"
    >
      <div className="w-full">
        {shownYang ? (
          bar
        ) : (
          <div className="flex w-full items-center justify-between">
            <div className="w-[38%]">{bar}</div>
            <div className="w-[38%]">{bar}</div>
          </div>
        )}
      </div>
      {mutating && (
        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[11px]" style={{ color: turned ? GOLD : MUT }}>
          {turned ? '✦' : '◌'}
        </span>
      )}
    </motion.div>
  );
}

/** Colonne de yao ; lignes = valeurs brutes 6/7/8/9 base→sommet. */
function HexColumn({
  lignes, mutants, wave, turnCount, showFuture,
}: {
  lignes: number[]; mutants: Set<number>; wave: boolean;
  /** nb de mutantes déjà retournées (ordre ascendant base→sommet) */
  turnCount: number; showFuture: boolean;
}) {
  const sortedMut = [...mutants].sort((a, b) => a - b);
  const turnedSet = new Set(sortedMut.slice(0, turnCount));
  return (
    <div className="flex w-full flex-col-reverse items-center gap-2.5 pr-4">
      {lignes.map((v, i) => {
        const yang = v === 7 || v === 9;
        const mutating = mutants.has(i);
        const turned = turnedSet.has(i);
        const shown = showFuture ? !yang && mutating ? true : yang && mutating ? false : yang : yang;
        return (
          <div key={i} className="relative w-full">
            <Yao yang={shown} mutating={mutating} wave={wave && !showFuture} turned={turned} />
          </div>
        );
      })}
    </div>
  );
}

/* ── Le tracé en direct — centré sous la question (les jets s'empilent base→sommet) ── */
function LiveStack({ lines, L }: { lines: number[]; L: (fr: string, en: string) => string }) {
  return (
    <div className="inline-flex flex-col items-center rounded-2xl px-6 py-4"
      style={{ background: 'rgba(16,7,10,0.92)', border: `1.5px solid ${GOLD}88`, boxShadow: '0 0 26px rgba(243,201,105,0.28), 0 8px 28px rgba(0,0,0,0.6)' }}>
      <p className="font-[family-name:var(--font-cinzel-deco)] text-[11px] uppercase tracking-[0.25em]"
        style={{ color: GOLD, textShadow: '0 0 10px rgba(243,201,105,0.6)' }}>✦ {lines.length}/6</p>
      <div className="mt-2 flex flex-col-reverse items-center gap-1.5">
        {lines.map((v, i) => {
          const yang = v === 7 || v === 9;
          return (
            <motion.div key={i}
              initial={{ opacity: 0, scale: 0.45 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              className="flex items-center gap-1.5">
              <span className="w-4 text-right text-[12px] leading-none" style={{ color: '#FF6B5E', textShadow: '0 0 8px rgba(255,107,94,0.8)' }}>
                {v === 9 ? '○' : v === 6 ? '×' : ''}
              </span>
              {yang ? (
                <div className="h-[7px] w-24 rounded-sm" style={{ background: `linear-gradient(180deg, rgba(255,248,222,0.95) 0%, ${GOLD} 42%, rgba(16,8,2,0.42) 100%), ${GOLD}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -2px 4px rgba(40,20,0,0.6), 0 0 10px rgba(243,201,105,0.5), 0 2px 5px rgba(0,0,0,0.5)' }} />
              ) : (
                <div className="flex w-24 justify-between">
                  <div className="h-[7px] w-[38%] rounded-sm" style={{ background: `linear-gradient(180deg, rgba(255,248,222,0.95) 0%, ${GOLD} 42%, rgba(16,8,2,0.42) 100%), ${GOLD}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -2px 4px rgba(40,20,0,0.6), 0 0 10px rgba(243,201,105,0.5), 0 2px 5px rgba(0,0,0,0.5)' }} />
                  <div className="h-[7px] w-[38%] rounded-sm" style={{ background: `linear-gradient(180deg, rgba(255,248,222,0.95) 0%, ${GOLD} 42%, rgba(16,8,2,0.42) 100%), ${GOLD}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -2px 4px rgba(40,20,0,0.6), 0 0 10px rgba(243,201,105,0.5), 0 2px 5px rgba(0,0,0,0.5)' }} />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
      <p className="mt-1.5 text-[9px] italic tracking-wide" style={{ color: `${GOLD}aa` }}>{L('hexagramme en cours', 'building')}</p>
    </div>
  );
}

/* ── Modale d'accueil : le rituel expliqué UNE fois, bouton « Compris » ── */
function IntroModal({ L, onClose }: { L: (fr: string, en: string) => string; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-center justify-center px-6"
      style={{ background: 'rgba(10,4,7,0.78)', backdropFilter: 'blur(5px)' }}>
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative w-full max-w-sm rounded-3xl px-6 py-7 text-center"
        style={{ background: `linear-gradient(160deg, ${YI_LACQUER.panelTop} 0%, ${YI_LACQUER.panelMid} 55%, ${YI_LACQUER.panelDeep} 100%)`,
          border: `1.5px solid ${GOLD}66`, boxShadow: '0 14px 48px rgba(0,0,0,0.6), 0 0 34px rgba(243,201,105,0.16)' }}>
        <div className="pointer-events-none absolute inset-2 rounded-[20px] border border-[#F3C969]/20" />
        <p className="text-xs tracking-[0.45em]" style={{ color: `${GOLD}cc` }}>✦ ☾ ✦</p>
        <h2 className="mt-2 font-[family-name:var(--font-cinzel-deco)] text-xl" style={{ color: GOLD, textShadow: '0 0 16px rgba(243,201,105,0.55)' }}>
          {L('Le rituel des trois pièces', 'The ritual of the three coins')}
        </h2>
        <p className="mt-3 text-sm italic leading-relaxed" style={{ color: LILAC_DIM }}>
          {L('Six jets, six traits : brasse les pièces dans le bol, puis jette-les vers le haut. Les lignes mutantes — vieux yang, vieux yin — ondulent puis se retournent : ta situation enfante sous tes yeux l’hexagramme en quoi elle se transforme.',
             'Six casts, six lines: rattle the coins in the bowl, then cast them upward. The moving lines — old yang, old yin — ripple, then flip: your situation gives birth, before your eyes, to the hexagram it is becoming.')}
        </p>
        <button onClick={onClose} type="button"
          className="mt-6 rounded-full px-9 py-2.5 font-[family-name:var(--font-cinzel-deco)] text-[15px] tracking-wide transition-transform active:scale-[0.97]"
          style={YI_GLASS}>
          {L('Compris', 'Got it')}
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────── Écran ─────────────────────────────── */

function DoublePage() {
  const lang = useLang();
  const en = lang === 'en';
  const { gateReason, closeGate, openGate } = useEntitlement();
  const L = (fr: string, e: string) => (en ? e : fr);

  const [db, setDb] = useState<DoubleView | null | undefined>(undefined);
  const [question, setQuestion] = useState<string | null>(null);
  const [freeQ, setFreeQ] = useState('');
  const [phase, setPhase] = useState<'ask' | 'shake' | 'raise' | 'wave' | 'turn' | 'read' | 'seal' | 'await'>('ask');
  const [busy, setBusy] = useState(false);
  const [readBusy, setReadBusy] = useState(false);
  const [countdown, setCountdown] = useState(AUTO_READ_SECS);
  const [waitOn, setWaitOn] = useState(false);
  const [readErr, setReadErr] = useState(false);
  const [sealedBusy, setSealedBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [verdictPct, setVerdictPct] = useState(50);
  const [intro, setIntro] = useState(true);
  const [progressLines, setProgressLines] = useState<number[]>([]);
  const [raiseDur, setRaiseDur] = useState(2.45);     // durée (s) du bambous de dressage
  const timers = useRef<number[]>([]);

  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(null), 3000); };
  useEffect(() => () => { timers.current.forEach((t) => window.clearTimeout(t)); }, []);
  const later = useCallback((fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); }, []);


  /* Jingle d'ouverture de l'univers + arrêt à la sortie (règle maison). */
  useEffect(() => {
    installSoundUnlock();
    return () => stopSound('yi-jing');
  }, []);

  /* ── Le rituel des trois pièces vit dans <CoinRitual>. La page débite le
     grand tirage au ramassage des pièces, puis enregistre les six valeurs. ── */
  const consumePickup = useCallback(async () => {
    const e = emailLocal();
    if (!e) { flash(L('Connectez-vous pour consulter.', 'Log in to consult.')); return false; }
    setBusy(true);
    try {
      const dec = await api('/api/entitlement', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e, type: 'yi-jing-double', question }),
        signal: AbortSignal.timeout(20000),
      } as RequestInit).then((r) => r.json());
      if (!dec.allowed) { openGate(dec.reason || 'limit-grand'); return false; }
      return true;
    } catch { flash(L('Connexion perdue.', 'Connection lost.')); return false; }
    finally { setBusy(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question]);

  // Pose avec filet : garde dédiée (ne partage plus l'état busy du débit),
  // timeout de 25 s (un tunnel qui pend ne doit plus figer le bol à jamais),
  // et état d'erreur visible + « Réessayer » branché sur le rituel.
  const lastLines = useRef<number[]>([]);
  const castingRef = useRef(false);
  const [casting, setCasting] = useState(false);
  const [castError, setCastError] = useState(false);
  const doCast = async (lignes: number[]) => {
    const e = emailLocal();
    if (!e || castingRef.current) return;
    lastLines.current = lignes;
    castingRef.current = true; setCasting(true); setCastError(false);
    try {
      // Pose en base (le serveur re-dérive la paire depuis les six jets).
      const res = await api('/api/yi-jing-double', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e, action: 'cast', lignes, question }),
        signal: AbortSignal.timeout(25000),
      } as RequestInit);
      const d = await res.json();
      if (!res.ok) {
        flash(d.error || L('Le tirage a échoué.', 'The cast failed.'));
        setCastError(true);
        return;
      }
      setDb(d.double as DoubleView);
      // Phase 4 : coupelle et pièces disparaissent, la mutation joue au centre.
      // Un fichier de bambous AU HASARD accompagne le dressage : les 6 sons
      // du mp3 tombent pile sur les 6 traits (pas = durée/6).
      const sk = STICK_KEYS[Math.floor(Math.random() * STICK_KEYS.length)];
      const durS = STICK_DUR[sk];
      // Un seul son au dressage : tuer les résidus du jet (versement,
      // froissement, tick du dernier trait) avant de lancer le bambous.
      stopSound('coin-table'); stopSound('coin-shake');
      playSound(sk, 0.9);
      setRaiseDur(durS);
      setPhase('raise');
      const t1 = Math.round(durS * 1000) + 250;       // fin du bambous ≈ fin du dressage
      later(() => {
        setPhase('wave');
        const m = [...(d.double.mutants as number[])].sort((a, b) => a - b);
        later(() => {
          if (m.length) playSound('spell', 0.9);   // révélation magique du mutant
          setPhase('turn');
        }, 1150 + m.length * 900 + 500);
        later(() => setPhase('read'), 1150 + m.length * 900 + 1900);
        if (!m.length) later(() => setPhase('read'), 2200); // stable : pas de ballet
      }, t1);
    } catch { flash(L('Connexion perdue — la table garde vos pièces.', 'Connection lost — the table keeps your coins.')); setCastError(true); }
    finally { castingRef.current = false; setCasting(false); }
  };

  /* ── Lecture de la paire (IA) ── */
  const askPair = useCallback(async (id: string) => {
    if (readBusy) return;
    setReadBusy(true); setReadErr(false);
    setWaitOn(true);
    try {
      const res = await api('/api/yi-jing-double', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailLocal(), action: 'read', id, lang }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.reason || 'http');
      setDb((prev) => (prev ? { ...prev, read: d.read } : prev));
    } catch { setReadErr(true); setWaitOn(false); } finally { setReadBusy(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readBusy, lang]);
  useEffect(() => {
    if (db && !db.read && !readBusy && !readErr && phase === 'read') {
      // Compte à rebours visible ; l'auto-lancement part de la valeur affichée
      // (+ 0,2 s de latence pour admirer la paire mutée).
      setCountdown(AUTO_READ_SECS);
      const iv = window.setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000);
      const tt = window.setTimeout(() => void askPair(db.id), AUTO_READ_SECS * 1000 + 200);
      return () => { window.clearInterval(iv); window.clearTimeout(tt); };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db?.id, phase, readBusy, readErr]);


  /* ── Sceau de l'augure ── */
  const seal = async () => {
    if (!db) return;
    setSealedBusy(true);
    try {
      const res = await api('/api/yi-jing-double', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailLocal(), action: 'sealed', id: db.id }),
      });
      const d = await res.json();
      if (!res.ok) {
        flash(d.reason === 'echo-cap' ? d.error : L('Sceau impossible.', 'Could not seal.'));
        return;
      }
      playSound('spell', 0.8);
      setDb((prev) => {
        if (!prev || !prev.read) return prev;
        const dir = prev.read.sections.find((x) => x.key === 'direction') || prev.read.sections[0];
        return { ...prev, echo: { id: d.echoId, textFr: dir.fr, textEn: dir.en, dueAt: d.dueAt, verdict: null, verdictPct: null } };
      });
      flash(L('Ton augure est scellé — la boucle est lancée.', 'Your augury is sealed — the loop is cast.'));
    } finally { setSealedBusy(false); }
  };

  /* ── Verdict à échéance ── */
  const sendVerdict = async () => {
    if (!db) return;
    setSealedBusy(true);
    try {
      const res = await api('/api/yi-jing-double', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailLocal(), action: 'verdict', id: db.id, pct: verdictPct }),
      });
      if (!res.ok) { flash(L('L’enregistrement a échoué.', 'The record failed.')); return; }
      setDb((prev) => (prev && prev.echo
        ? { ...prev, echo: { ...prev.echo, verdict: verdictPct >= 100 ? 'oui' : verdictPct <= 0 ? 'non' : 'partiel', verdictPct } }
        : prev));
      flash(L('La mutation est consignée — la Ferveur grandit.', 'The turn is recorded — Fervor grows.'));
    } finally { setSealedBusy(false); }
  };

  /* ── Dérivés d'affichage ── */
  const mutantsSet = useMemo(() => new Set(db?.mutants || []), [db?.mutants]);
  const glyph = (n: number | null | undefined) => (n ? (HEX as Record<string, HexRow>)[String(n)]?.c : '…');
  const turnedCount = phase === 'turn' || phase === 'read' || phase === 'seal' || phase === 'await'
    ? (db?.mutants.length || 0) : 0;
  const showFutureCol = !!db && db.mutants.length > 0 && (phase === 'turn' || phase === 'read' || phase === 'seal' || phase === 'await');
  const echoDue = !!db?.echo && !db.echo.verdict && Date.now() >= new Date(db.echo.dueAt).getTime();
  const daysLeft = db?.echo ? Math.max(0, Math.ceil((new Date(db.echo.dueAt).getTime() - Date.now()) / DAY_MS)) : 0;

  const SECTIONS = [
    { key: 'situation', fr: 'La situation', en: 'The situation' },
    { key: 'bascule', fr: 'Le point de bascule', en: 'The hinge' },
    { key: 'direction', fr: 'La direction du changement', en: 'Where it turns' },
    { key: 'conseil', fr: 'Le conseil', en: 'The counsel' },
  ];

  /* ── Rendu ── */


  return (
    <div
      className="relative min-h-screen select-none"
      style={{ background: `radial-gradient(ellipse at 50% 0%, ${YI_LACQUER.panelTop} 0%, ${YI_LACQUER.panelMid} 55%, ${YI_LACQUER.panelDeep} 100%)` }}
    >
      <YiSlideNav />
      <div className="relative z-10 mx-auto max-w-2xl px-4 pb-24 pt-14">
        {/* En-tête — marque de l'épreuve */}
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.4em]" style={{ color: `${GOLD}99` }}>zhi gua ✦ {L('le tirage du changement', 'the transformation casting')}</p>
          <h1 className="mt-1 font-[family-name:var(--font-cinzel-deco)] text-3xl" style={{ color: GOLD, textShadow: '0 0 30px rgba(243,201,105,0.35)' }}>
            {L('Le Double Hexagramme', 'The Double Hexagram')}
          </h1>
          {question && phase !== 'ask' && (
            <p className="mx-auto mt-3 inline-block max-w-full truncate rounded-full px-4 py-1.5 text-xs italic" style={{ background: 'rgba(142,28,34,0.22)', border: `1px solid ${GOLD}44`, color: LILAC }}>
              « {question} »
            </p>
          )}
          {phase === 'shake' && progressLines.length > 0 && (
            <div className="mt-3 flex justify-center"><LiveStack lines={progressLines} L={L} /></div>
          )}
        </div>

        {/* ── 1. La question ── */}
        {phase === 'ask' && (
          <div className="mt-10">
            {/* Saisie libre — ou sélection d'un thème & intention existants. */}
            <input type="text" value={freeQ} onChange={(e) => setFreeQ(e.target.value)}
              maxLength={300}
              placeholder={L('Garder en mémoire votre question', 'Keep your question in mind')}
              className="mx-auto mb-3 block w-full max-w-sm rounded-lg px-4 py-2.5 text-sm"
              style={{ background: 'rgba(0,0,0,0.35)', border: `1px solid ${GOLD}44`, color: '#f0e6d3' }}
              onKeyDown={(e) => { if (e.key === 'Enter' && freeQ.trim()) { setQuestion(freeQ.trim()); setPhase('shake'); } }} />
            <button disabled={!freeQ.trim()} onClick={() => { setQuestion(freeQ.trim()); setPhase('shake'); }}
              className="mx-auto block rounded-full px-8 py-2.5 font-[family-name:var(--font-cinzel-deco)] text-[15px] tracking-wide transition-[filter,transform] hover:brightness-110 active:scale-[0.97] disabled:opacity-40 disabled:hover:brightness-100"
              style={YI_GLASS}>
              {L('Consulter avec cette question', 'Consult with this question')}
            </button>
            <p className="my-3 text-center text-[10px] uppercase tracking-[0.3em]" style={{ color: `${LILAC_DIM}77` }}>{L('— ou —', '— or —')}</p>
            <div className="mb-6">
              <YiThemeSelector glass onConfirm={(q) => { setQuestion(q); setPhase('shake'); }} />
            </div>
          </div>
        )}

        {/* ── 2-3. Le rituel des trois pièces (6 jets, construction en direct) ── */}
        {phase === 'shake' && (
          <CoinRitual L={L} onPickup={consumePickup} onDone={(ls) => void doCast(ls)} onProgress={setProgressLines}
            onBlocked={() => { setPhase('ask'); setProgressLines([]); }}
            casting={casting} castError={castError} onRetry={() => void doCast(lastLines.current)} />
        )}
        {/* ── 3-4. Les colonnes : présent, puis la mutation en direct ── */}
        {db && (phase === 'raise' || phase === 'wave' || phase === 'turn' || phase === 'read' || phase === 'seal' || phase === 'await') && (
          <div className="mt-10 flex items-start justify-center gap-1 sm:gap-8">
            {/* Présent */}
            <div className="flex w-[34vw] max-w-[160px] flex-col items-center gap-3">
              <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: `${GOLD}99` }}>{L('Présent', 'Present')}</p>
              <p className="font-[family-name:var(--font-cinzel-deco)] text-2xl" style={{ color: GOLD }}>
                #{db.hexPresent} <span className="ml-1">{glyph(db.hexPresent)}</span>
              </p>
              <p className="w-full text-center text-[11px] italic leading-tight" style={{ color: LILAC }}>
                {en ? db.names.pEn : db.names.pFr}
              </p>
              <div className="mt-1 w-full">
                {phase === 'raise'
                  ? <RaiseLines lignes={db.lignes} step={raiseDur / 6} />
                  : <HexColumn lignes={db.lignes} mutants={mutantsSet} wave={phase === 'wave'} turnCount={turnedCount} showFuture={false} />}
              </div>
              <p className="text-[10px]" style={{ color: `${GOLD}aa` }}>
                {db.mutants.length
                  ? L(`mutantes : ${db.mutants.map((i) => i + 1).join('·')}`, `moving: ${db.mutants.map((i) => i + 1).join('·')}`)
                  : L('aucune mutante — situation stable', 'no moving line — stable')}
              </p>
            </div>

            {/* Le verbe : la flèche de mutation qui s'allume au retour */}
            <AnimatePresence>
              {showFutureCol && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-24 flex items-center">
                  <motion.p
                    animate={{ x: [0, 5, 0] }} transition={{ duration: 1.6, repeat: Infinity }}
                    className="text-xl" style={{ color: `${GOLD}cc` }}>➔</motion.p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Futur — accouché en direct */}
            <AnimatePresence>
              {showFutureCol && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.7, rotateY: -90 }} animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                  transition={{ duration: 1.0, ease: 'easeOut' }}
                  className="flex w-[34vw] max-w-[160px] flex-col items-center gap-3" style={{ perspective: 700 }}
                >
                  <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: `${MUT}cc` }}>{L('En devenir', 'Becoming')}</p>
                  <p className="font-[family-name:var(--font-cinzel-deco)] text-2xl" style={{ color: GOLD }}>
                    #{db.hexFutur} <span className="ml-1">{glyph(db.hexFutur)}</span>
                  </p>
                  <p className="w-full text-center text-[11px] italic leading-tight" style={{ color: LILAC }}>
                    {en ? db.names.fEn : db.names.fFr}
                  </p>
                  <div className="mt-1 w-full">
                    <HexColumn lignes={db.lignes} mutants={mutantsSet} wave={false} turnCount={turnedCount} showFuture />
                  </div>
                  <p className="h-3 text-[10px]" style={{ color: `${GOLD}aa` }}>
                    {phase !== 'turn' ? L('le nouvel hexagramme est posé', 'the new hexagram stands') : '…'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── 5. Lecture de la paire ── */}
        {db && (phase === 'read' || phase === 'seal' || phase === 'await') && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-10 max-w-xl">
            <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(160deg, rgba(142,28,34,0.22) 0%, rgba(10,5,7,0.9) 100%)', border: `1.5px solid ${GOLD}55`, boxShadow: '0 0 30px rgba(0,0,0,0.6)' }}>
              <h3 className="text-center font-[family-name:var(--font-cinzel-deco)] text-base" style={{ color: GOLD }}>
                {L('Lecture de la paire', 'Reading of the pair')}
              </h3>

              {!db.read && !readBusy && !readErr && (
                <div className="mt-4 text-center">
                  <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                    <button onClick={() => void askPair(db.id)} className="rounded-full px-7 py-2.5 font-[family-name:var(--font-cinzel-deco)] text-xs font-bold uppercase tracking-widest"
                      style={YI_RED}>
                      {L('Oracle sur la paire', 'Oracle on the pair')}
                    </button>
                    <p className="animate-pulse text-[11px] italic" style={{ color: `${LILAC}bb` }}>
                      ⟳ {L(`Déclenchement automatique dans ${countdown} s`, `Auto-launching in ${countdown}s`)}
                    </p>
                  </div>
                  <p className="mt-2 text-[10px]" style={{ color: `${LILAC_DIM}99` }}>→ {L('puis scelle l’augure sur l’échéance annoncée', 'then seal the augury on the announced date')}</p>
                </div>
              )}
              {readBusy && !db.read && (
                <p className="mt-4 text-center text-xs italic" style={{ color: LILAC, opacity: 0.7 }}>
                  {L('Les deux hexagrammes conversent…', 'The two hexagrams converse…')}
                </p>
              )}
              {readErr && !db.read && (
                <div className="mt-4 text-center">
                  <p className="text-xs italic" style={{ color: '#E2B8AC' }}>{L('L’oracle se tait — réessaie.', 'The oracle is silent — retry.')}</p>
                  <button onClick={() => void askPair(db.id)} className="mt-1 text-xs underline" style={{ color: GOLD }}>{L('Relancer', 'Retry')}</button>
                </div>
              )}

              {/* Les 4 temps — cartes dorées, révélation en cascade */}
              {db.read && (
                <>
                  <div className="mt-4 space-y-3">
                    {SECTIONS.map((s, i) => {
                      const sec = db.read!.sections.find((x) => x.key === s.key);
                      return (
                        <motion.div key={s.key}
                          initial={i > 0 ? { opacity: 0, y: 8 } : false}
                          animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.18 }}
                          className="rounded-xl p-3.5" style={{ background: 'rgba(10,5,7,0.55)', border: '1px solid rgba(243,201,105,0.18)' }}>
                          <p className="text-[10px] uppercase tracking-[0.25em]" style={{ color: `${GOLD}bb` }}>{en ? s.en : s.fr}</p>
                          <p className="mt-1.5 text-sm italic leading-relaxed" style={{ color: LILAC, fontFamily: 'var(--font-cinzel), serif' }}>
                            « {sec ? (en ? sec.en : sec.fr) : '…'} »
                          </p>
                        </motion.div>
                      );
                    })}
                  </div>
                  <p className="mt-4 text-center text-[11px]" style={{ color: `${GOLD}aa` }}>
                    {L(`observe le retournement d’ici ${db.read.dueInDays} jours`, `watch the turn within ${db.read.dueInDays} days`)}
                  </p>
                </>
              )}
            </div>

            {/* ── 6. Sceller l'augure / échéance / verdict ── */}
            {db.read && !db.echo && phase === 'read' && (
              <div className="mt-4 text-center">
                <button onClick={seal} disabled={sealedBusy} className="rounded-full px-7 py-2.5 text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.15) 38%, rgba(255,255,255,0) 60%), linear-gradient(180deg, #E8C66A 0%, #D4AF37 45%, #9A7A22 100%)',
                    color: '#241505', border: '1.5px solid rgba(232,198,106,0.6)',
                    boxShadow: '0 0 18px rgba(212,175,55,0.55), inset 0 1px 1px rgba(255,255,255,0.45), inset 0 -3px 7px rgba(0,0,0,0.35)' }}>
                  {L('Sceller l’augure', 'Seal the augury')}
                </button>
                <p className="mt-1.5 text-[10px]" style={{ color: `${LILAC_DIM}99` }}>
                  {L('l’oracle te rappellera au jour dit — puis tu jugeras', 'the oracle will call you back on the day — then you judge')}
                </p>
              </div>
            )}

            {db.echo && !db.echo.verdict && !echoDue && (
              <div className="mt-4 rounded-2xl p-5 text-center" style={{ background: 'linear-gradient(160deg,#4A2C1A 0%,#2A1408 60%,#180B05 100%)', border: '1.5px solid rgba(218,165,32,0.45)' }}>
                <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: `${GOLD}bb` }}>{L('Augure scellé', 'Augury sealed')}</p>
                <p className="mt-2 text-sm italic leading-relaxed" style={{ color: LILAC, fontFamily: 'var(--font-cinzel), serif' }}>« {en && db.echo.textEn ? db.echo.textEn : db.echo.textFr} »</p>
                <p className="mt-3 text-xs" style={{ color: GOLD_PALE_SAFE }}>
                  {L(`le retournement s’observe dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`, `the turn ripens in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`)}
                </p>
              </div>
            )}

            {echoDue && db.echo && (
              <div className="mt-4 rounded-2xl p-5" style={{ background: 'linear-gradient(160deg,#4A2C1A 0%,#2A1408 60%,#180B05 100%)', border: '1.5px solid rgba(218,165,32,0.6)', boxShadow: '0 0 26px rgba(218,165,32,0.25)' }}>
                <p className="text-center text-[10px] uppercase tracking-[0.3em]" style={{ color: `${GOLD}bb` }}>{L('L’échéance est là', 'The day has come')}</p>
                <p className="mt-2 text-center text-sm italic" style={{ color: LILAC, fontFamily: 'var(--font-cinzel), serif' }}>« {en && db.echo.textEn ? db.echo.textEn : db.echo.textFr} »</p>
                <p className="mt-3 text-center text-[11px]" style={{ color: `${LILAC}aa` }}>{L('Le retournement promis a-t-il eu lieu ?', 'Did the promised turn come to pass?')}</p>
                <div className="mt-3 flex justify-center gap-2">
                  {[0, 25, 50, 75, 100].map((p) => (
                    <button key={p} onClick={() => setVerdictPct(p)} className="h-10 w-14 rounded-lg text-sm font-bold transition-all" style={{
                      background: verdictPct === p ? `linear-gradient(180deg, ${GOLD}, ${GOLD_SOFT})` : 'rgba(218,165,32,0.08)',
                      color: verdictPct === p ? '#241505' : GOLD, border: `1px solid ${verdictPct === p ? GOLD : `${GOLD}44`}` }}>
                      {p}%
                    </button>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <button onClick={sendVerdict} disabled={sealedBusy} className="rounded-full px-7 py-2.5 text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.15) 38%, rgba(255,255,255,0) 60%), linear-gradient(180deg, #E8C66A 0%, #D4AF37 45%, #9A7A22 100%)',
                      color: '#241505', border: '1.5px solid rgba(232,198,106,0.6)', boxShadow: '0 0 18px rgba(212,175,55,0.55)' }}>
                    {L('Consigner le verdict', 'Record the verdict')}
                  </button>
                </div>
              </div>
            )}

            {db.echo?.verdict && (
              <div className="mt-4 rounded-2xl p-5 text-center" style={{ background: 'linear-gradient(160deg, rgba(142,28,34,0.2) 0%, rgba(10,5,7,0.9) 100%)', border: '1.5px solid rgba(218,165,32,0.4)' }}>
                <p className="text-sm" style={{ color: GOLD }}>✓ {db.echo.verdictPct ?? (db.echo.verdict === 'oui' ? 100 : db.echo.verdict === 'partiel' ? 50 : 0)}%</p>
                <p className="mt-1 text-[11px]" style={{ color: `${LILAC}99` }}>
                  {L('La mutation est consignée. Un nouveau Double peut être consulté quand tu veux.',
                     'The turn is recorded. A new Double may be cast whenever you wish.')}
                </p>
                <button onClick={() => { setDb(null); setPhase('ask'); setQuestion(null); }} className="mt-3 text-xs underline" style={{ color: GOLD }}>
                  {L('Revenir au seuil', 'Return to the threshold')}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm"
            style={{ background: 'rgba(24,11,5,0.92)', border: '1px solid rgba(218,165,32,0.6)', color: GOLD, fontFamily: 'var(--font-cinzel), serif', boxShadow: '0 0 24px rgba(218,165,32,0.35)' }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
      <EntitlementGateModal reason={gateReason} onClose={closeGate} />
      <AnimatePresence>
        {intro && <IntroModal L={L} onClose={() => setIntro(false)} />}
      </AnimatePresence>
      {waitOn && db && <WaitOverlay type="yi-jing-double" ready={!!db.read} onVideoEnded={() => setWaitOn(false)} fit169 />}
    </div>
  );
}

const GOLD_PALE_SAFE = '#F0C75E';

/* Les 6 lignes se dressent une à une, base vers le sommet. */
/** Les fichiers sticks-pile* contiennent 6 sons de bambous (un par trait) :
    le dressage de l'hexagramme est calé sur la durée exacte du fichier. */
const STICK_KEYS = ['sticks-pile', 'sticks-pile2', 'sticks-pile3', 'sticks-pile4', 'sticks-pile5'];
const STICK_DUR: Record<string, number> = {
  'sticks-pile': 1.45, 'sticks-pile2': 2.00, 'sticks-pile3': 3.00, 'sticks-pile4': 2.20, 'sticks-pile5': 1.76,
};

function RaiseLines({ lignes, step = 0.42 }: { lignes: number[]; step?: number }) {
  return (
    <div className="flex flex-col-reverse items-center gap-2.5">
      {lignes.map((v, i) => (
        <motion.div key={i}
          initial={{ opacity: 0, y: 14, scaleX: 0.4 }}
          animate={{ opacity: 1, y: 0, scaleX: 1 }}
          transition={{ delay: i * step, duration: Math.min(0.35, step), ease: 'easeOut' }}
          className="w-full">
          <Yao yang={v === 7 || v === 9} mutating={false} wave={false} turned={false} />
        </motion.div>
      ))}
    </div>
  );
}

export default function GatedDoublePage() {
  return <AuthGate><DoublePage /></AuthGate>;
}
