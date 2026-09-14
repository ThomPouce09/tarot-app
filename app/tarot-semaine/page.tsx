'use client';

// ═══════════════════════════════════════════════════════════════════
// /tarot-semaine — « Les Arcanes de la Semaine » (version réelle).
//
// Une roue = 7 arcanes majeurs, un par jour planétaire (dim☉ … sam♄),
// posée d'un geste (coût : 2 grands tirages, débits par /api/entitlement).
// temporalité des 7 jours GLISSANTS : on peut tirer n'importe quel jour ;
// le « dimanche » personnel = jour du tirage. Les jours passés se
// révèlent d'eux-mêmes ; seul le jour courant s'ouvre au tap. Le fil
// rouge (tissé par l'oracle) se scelle en augure daté du jour 7 ; au
// retour, bilan : notation en pourcentage (pas de 25) + choix facultatif
// de la carte la mieux accomplie. Une seule roue active à la fois.
// ═══════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '@/lib/i18n';
import { useEntitlement, EntitlementGateModal } from '@/lib/use-entitlement';
import AuthGate from '@/components/auth-gate';
import YiSlideNav from '@/components/yi-slide-nav';
import OracleWaitAnimation, { setOracleWait } from '@/components/oracle-wait-animation';
import { api } from '@/lib/api-client';

const GOLD = '#DAA520';
const GOLD_PALE = '#F0C75E';
const IVORY = '#F5EAD6';

const DAYS = [
  { fr: 'Dimanche', en: 'Sunday', planet: '☉' },
  { fr: 'Lundi', en: 'Monday', planet: '☽' },
  { fr: 'Mardi', en: 'Tuesday', planet: '♂' },
  { fr: 'Mercredi', en: 'Wednesday', planet: '☿' },
  { fr: 'Jeudi', en: 'Thursday', planet: '♃' },
  { fr: 'Vendredi', en: 'Friday', planet: '♀' },
  { fr: 'Samedi', en: 'Saturday', planet: '♄' },
];

interface CardView {
  id: number; day: number; weekday: number; name: string; nameEn: string;
  keywords: string[]; revealed: boolean; resonant: boolean;
  insight: { fr: string; en: string } | null;
}
interface Wheel {
  readingId: string; castAt: string; nowDay: number; dueAt: string;
  cards: CardView[];
  woven: boolean;
  filRouge: { fr: string; en: string } | null;
  echo: { id: string; textFr: string; textEn: string | null; dueAt: string; verdict: string | null; verdictPct: number | null; bestCardIndex: number | null } | null;
}

function emailLocal(): string {
  try { return JSON.parse(localStorage.getItem('tarot_user') || '{}')?.email ?? ''; } catch { return ''; }
}

function SemainePage() {
  const lang = useLang();
  const { gateReason, closeGate, openGate } = useEntitlement();
  const [wheel, setWheel] = useState<Wheel | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [verdictPct, setVerdictPct] = useState(50);
  const [bestCard, setBestCard] = useState<number | null>(null);
  const [sealedBusy, setSealedBusy] = useState(false);

  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(null), 2600); };

  const reload = useCallback(async () => {
    const e = emailLocal();
    if (!e) { setWheel(null); return; }
    try {
      const r = await api(`/api/tarot-semaine?email=${encodeURIComponent(e)}`);
      const d = await r.json();
      setWheel(d.wheel ?? null);
    } catch { setWheel(null); }
  }, []);
  useEffect(() => { reload(); }, [reload]);

  /* ── Tirer la roue (2 grands tirages) ── */
  const cast = async () => {
    const e = emailLocal();
    if (!e || busy) return;
    setBusy(true);
    try {
      // 1) débit des droits (serveur : canDo + consume, cost 2).
      const dec = await api('/api/entitlement', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e, type: 'tarot-semaine', question: null }),
      }).then((r) => r.json());
      if (!dec.allowed) { openGate(dec.reason || 'limit-grand'); return; }
      // 2) 7 arcanes majeurs uniques.
      const pool = Array.from({ length: 22 }, (_, i) => i);
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      const cards = pool.slice(0, 7);
      // 3) pose en base.
      const res = await api('/api/tarot-semaine', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e, action: 'cast', cards }),
      });
      const d = await res.json();
      if (!res.ok) { flash(d.error || 'Le tirage a échoué.'); return; }
      await reload();
      flash(lang === 'en' ? 'The wheel is cast. Day one glows.' : 'La roue est posée. Le jour 1 luit.');
    } finally { setBusy(false); }
  };

  /* ── Ouvrir le jour courant ── */
  const reveal = async (day: number) => {
    if (!wheel || day !== wheel.nowDay) return;
    const e = emailLocal();
    const res = await api('/api/tarot-semaine', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: e, action: 'reveal', day }),
    });
    if (res.ok) { const d = await res.json(); setWheel(d.wheel); }
  };

  /* ── Tissage : UN seul appel IA → 7 éclats + fil rouge (auto après le cast) ── */
  const [weaving, setWeaving] = useState(false);
  const [weaveErr, setWeaveErr] = useState(false);
  const askWeave = useCallback(async () => {
    setWeaving(true); setWeaveErr(false);
    try {
      const res = await api('/api/tarot-semaine', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailLocal(), action: 'weave' }),
      });
      if (!res.ok) throw new Error();
      await reload();
    } catch { setWeaveErr(true); } finally { setWeaving(false); }
  }, [reload]);
  useEffect(() => {
    if (wheel && !wheel.woven && !weaving && !weaveErr) void askWeave();
  }, [wheel, weaving, weaveErr, askWeave]);
  useEffect(() => { setOracleWait(weaving); }, [weaving]);
  useEffect(() => () => setOracleWait(false), []);

  /* ── Sceller l'augure = fil rouge ── */
  const seal = async () => {
    if (!wheel) return;
    setSealedBusy(true);
    try {
      const res = await api('/api/tarot-semaine', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailLocal(), action: 'seal' }),
      });
      const d = await res.json();
      if (!res.ok) flash(d.reason === 'echo-cap' ? d.error : (lang === 'en' ? 'Could not seal.' : 'Sceau impossible.'));
      else flash(lang === 'en' ? 'Your augury is sealed for the week’s end.' : 'Ton augure est scellé jusqu’à la fin de la semaine.');
      await reload();
    } finally { setSealedBusy(false); }
  };

  /* ── Bilan : notation % + meilleure carte (facultatif) ── */
  const sendVerdict = async () => {
    if (!wheel?.echo) return;
    setSealedBusy(true);
    try {
      const res = await api('/api/tarot-semaine', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailLocal(), action: 'verdict', echoId: wheel.echo.id, pct: verdictPct, bestCardIndex: bestCard }),
      });
      if (!res.ok) { flash(lang === 'en' ? 'The record failed.' : 'L’enregistrement a échoué.'); return; }
      await reload();
      flash(lang === 'en' ? 'Week recorded — the Fervor grows.' : 'Semaine consignée — la Ferveur grandit.');
    } finally { setSealedBusy(false); }
  };

  const weekDone = wheel ? wheel.nowDay >= 7 : false;
  const echoDue = wheel?.echo && !wheel.echo.verdict && Date.now() >= new Date(wheel.echo.dueAt).getTime();

  const rows = useMemo(() => [wheel?.cards.slice(0, 4), wheel?.cards.slice(4)], [wheel]);

  return (
    <div className="relative min-h-screen select-none overflow-x-hidden" style={{ background: 'radial-gradient(ellipse at 50% -10%, #3A1E2E 0%, #1A0D14 55%, #0A0608 100%)' }}>
      <YiSlideNav />
      <div className="pointer-events-none fixed inset-0 opacity-25" style={{ backgroundImage: 'url(/backgrounds/table-tarot-bg.jpg?v=11)', backgroundSize: 'cover', backgroundPosition: 'center' }} />

      <div className="relative z-10 mx-auto max-w-3xl px-3 pb-24 pt-16">
        <div className="text-center">
          <h1 className="title-glow font-[family-name:var(--font-cinzel-deco)] text-3xl uppercase tracking-[0.12em] sm:text-4xl" style={{ color: GOLD }}>
            {lang === 'en' ? 'Arcana of the Week' : 'Les Arcanes de la Semaine'}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-xs italic leading-relaxed" style={{ color: IVORY, opacity: 0.75 }}>
            {lang === 'en'
              ? 'Seven major arcana, one per planetary day. Once cast, the week unfolds on its own: past days reveal themselves, today’s card glows, and the thread weaves the seven into one counsel — sealed as an augury.'
              : 'Sept arcanes majeurs, un par jour planétaire. Posée d’un seul geste, la semaine se déplie d’elle-même : les jours passés se révèlent, celui d’aujourd’hui luit, et le fil rouge tisse les sept en un conseil — scellé en augure.'}
          </p>
          {!wheel && (
            <p className="mt-1 text-[10px] tracking-widest" style={{ color: `${GOLD}99` }}>
              {lang === 'en' ? 'casting the wheel spends two advanced readings' : 'poser la roue débite deux grands tirages'}
            </p>
          )}
        </div>

        {wheel === undefined && <p className="mt-16 text-center text-sm italic" style={{ color: IVORY, opacity: 0.6 }}>…</p>}

        {/* ── Pas de roue : proposer l'office ── */}
        {wheel === null && (
          <div className="mt-16 text-center">
            <motion.button type="button" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={cast} disabled={busy}
              className="rounded-full px-8 py-3 font-[family-name:var(--font-cinzel-deco)] text-sm font-bold uppercase tracking-widest disabled:opacity-50"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.12) 38%, rgba(255,255,255,0) 60%), #4A1931',
                color: GOLD_PALE, border: '1.5px solid rgba(218,165,32,0.7)',
                boxShadow: '0 0 22px rgba(218,165,32,0.35), inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -3px 7px rgba(0,0,0,0.4)',
              }}>
              {busy ? '…' : lang === 'en' ? 'Cast this week’s wheel' : 'Poser la roue de la semaine'}
            </motion.button>
            <p className="mt-3 text-[11px]" style={{ color: IVORY, opacity: 0.65 }}>
              {lang === 'en' ? 'Any day begins your own week — the wheel follows you, 7 days from today.' : 'N’importe quel jour ouvre ta semaine à toi — la roue suit 7 jours depuis aujourd’hui.'}
            </p>
          </div>
        )}

        {/* ── La roue posée : couronne 4 + 3 ── */}
        {wheel && (
          <>
            <div className="mt-8 flex flex-col items-center gap-2">
              {rows.map((row, ri) => (
                <div key={ri} className="flex items-end justify-center gap-2 sm:gap-4">
                  {row?.map((c, i) => {
                    const idx = ri === 0 ? i : i + 4;
                    const isToday = idx === wheel.nowDay;
                    const open = c.revealed;
                    const lift = Math.abs(i - (ri === 0 ? 1.5 : 1)) * 5;
                    return (
                      <motion.button key={c.day} type="button" onClick={() => reveal(idx)}
                        className="relative" animate={{ y: lift }}
                        whileHover={!open && isToday ? { y: lift - 8 } : undefined}
                        style={{ rotate: (i - (ri === 0 ? 1.5 : 1)) * -1.2 }}>
                        <div className="relative h-24 w-16 overflow-hidden rounded-lg border-2 sm:h-36 sm:w-24" style={{
                          borderColor: isToday ? GOLD_PALE : 'rgba(218,165,32,0.4)',
                          boxShadow: isToday ? '0 0 22px rgba(218,165,32,0.65)' : '0 4px 14px rgba(0,0,0,0.6)',
                        }}>
                          {/* Retournement sans backface-visibility (robuste iOS/Safari) : fondu + rotation d'une seule face active. */}
                          <AnimatePresence initial={false}>
                            {open ? (
                              <motion.div key="face" initial={{ opacity: 0, rotateY: -70, scale: 0.94 }} animate={{ opacity: idx < wheel.nowDay ? 0.85 : 1, rotateY: 0, scale: 1 }} exit={{ opacity: 0 }}
                                transition={{ duration: 0.55, ease: 'easeInOut' }} className="absolute inset-0 overflow-hidden rounded-lg" style={{ transformStyle: 'preserve-3d', borderColor: `${GOLD}88` }}>
                                <img src={`/cards/arcana/${c.id}.jpg`} alt={c.name} className="h-full w-full object-cover" />
                                <div className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-0.5 text-center text-[8px] font-bold sm:text-[10px]" style={{ color: GOLD_PALE, fontFamily: 'var(--font-cinzel-deco), serif' }}>
                                  {c.name}{c.resonant && ' ✦'}
                                </div>
                              </motion.div>
                            ) : (
                              <motion.div key="back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, rotateY: 70, scale: 0.94 }}
                                transition={{ duration: 0.3 }} className="absolute inset-0 rounded-lg" style={{
                                  backgroundImage: 'url(/images/card-back.png)', backgroundSize: 'cover',
                                  boxShadow: 'inset 0 0 0 1px rgba(218,165,32,0.25)',
                                }} />
                            )}
                          </AnimatePresence>
                        </div>
                        <div className="mt-1.5 text-center">
                          <div className="text-sm" style={{ color: isToday ? GOLD_PALE : `${GOLD}99` }}>{DAYS[c.weekday].planet}</div>
                          <div className="text-[9px] uppercase tracking-widest" style={{ color: IVORY, opacity: isToday ? 0.95 : 0.5 }}>
                            {DAYS[c.weekday][lang as 'fr' | 'en']}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              ))}
            </div>
            <p className="mt-2 text-center text-[10px]" style={{ color: `${GOLD}aa` }}>
              {lang === 'en' ? '✦ = the card resonates with its day’s planet' : '✦ = la carte résonne avec la planète du jour'}
              {' · '}
              {weekDone ? (lang === 'en' ? 'week complete — weave the thread' : 'semaine bouclée — tisse le fil') :
                `${lang === 'en' ? 'day' : 'jour'} ${wheel.nowDay + 1}/7 — ${lang === 'en' ? 'tap the glowing card' : 'touche la carte qui luit'}`}
            </p>

            {/* ── L'éclat du jour : la portion IA de LA carte courante, mise en vedette ── */}
            {(() => {
              const today = wheel.cards[wheel.nowDay];
              const shown = today?.revealed ? today : wheel.cards.slice(0, Math.min(wheel.nowDay, 7)).reverse().find(c => c.revealed);
              if (!shown || wheel.nowDay >= 7) return null;
              if (weaving) return (
                <p className="mt-4 text-center text-xs italic" style={{ color: IVORY, opacity: 0.7 }}>
                  {lang === 'en' ? 'The oracle is lighting your seven days…' : 'L’oracle éclaire tes sept jours…'}
                </p>
              );
              if (!shown.insight) return (
                <div className="mt-4 text-center">
                  {weaveErr && <p className="mb-2 text-xs italic" style={{ color: '#E2B8AC' }}>{lang === 'en' ? 'The oracle fell silent.' : 'L’oracle s’est tu.'}</p>}
                  <button onClick={askWeave} className="rounded-full px-6 py-2 text-[11px] font-bold uppercase tracking-widest" style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.12) 38%, rgba(255,255,255,0) 60%), #005f6a',
                    color: '#fff', boxShadow: '0 0 16px rgba(0,95,106,0.5), inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -3px 7px rgba(0,0,0,0.35)' }}>
                    {lang === 'en' ? 'Light the week' : 'Éclairer la semaine'}
                  </button>
                </div>
              );
              return (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={`ins-${shown.day}`}
                  className="mx-auto mt-5 max-w-md rounded-2xl px-5 py-4 text-center"
                  style={{
                    background: 'linear-gradient(160deg, rgba(74,25,49,0.55) 0%, rgba(24,11,5,0.85) 100%)',
                    border: '1.5px solid rgba(218,165,32,0.55)',
                    boxShadow: '0 0 26px rgba(218,165,32,0.28), inset 0 1px 1px rgba(255,255,255,0.12)',
                  }}>
                  <p className="text-[9px] uppercase tracking-[0.3em]" style={{ color: `${GOLD}bb` }}>
                    {lang === 'en' ? 'The card’s light —' : 'L’éclat du jour —'} {DAYS[shown.weekday][lang as 'fr' | 'en']} · {shown[lang === 'en' ? 'nameEn' : 'name']}
                  </p>
                  <p className="mt-2 text-sm italic leading-relaxed" style={{ color: IVORY, fontFamily: 'var(--font-cinzel), serif' }}>
                    « {shown.insight[lang]} »
                  </p>
                </motion.div>
              );
            })()}

            {/* ── Fil rouge + sceau + bilan ── */}
            {(weekDone || echoDue) && (
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-8 max-w-xl">
                <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(160deg,#4A2C1A 0%,#2A1408 60%,#180B05 100%)', border: '1.5px solid rgba(218,165,32,0.45)', boxShadow: '0 0 30px rgba(0,0,0,0.55), inset 0 0 30px rgba(74,25,49,0.35)' }}>
                  <h3 className="text-center font-[family-name:var(--font-cinzel-deco)] text-base" style={{ color: GOLD }}>
                    {lang === 'en' ? 'The Red Thread' : 'Le Fil rouge de l’Oracle'}
                  </h3>
                  {!wheel.filRouge && !wheel.echo && (
                    <div className="mt-4 text-center">
                      {weaving ? <p className="text-xs italic" style={{ color: IVORY, opacity: 0.7 }}>{lang === 'en' ? 'The seven cards are weaving…' : 'Les sept cartes se tissent…'}</p> : (
                        <>
                          {weaveErr && <p className="mb-2 text-xs italic" style={{ color: '#E2B8AC' }}>{lang === 'en' ? 'The oracle fell silent.' : 'L’oracle s’est tu.'}</p>}
                          <button onClick={askWeave} className="rounded-full px-7 py-2.5 text-xs font-bold uppercase tracking-widest" style={{
                            background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.12) 38%, rgba(255,255,255,0) 60%), #005f6a',
                            color: '#fff', boxShadow: '0 0 16px rgba(0,95,106,0.5), inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -3px 7px rgba(0,0,0,0.35)' }}>
                            {lang === 'en' ? 'Weave the thread' : 'Tisser le fil rouge'}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {wheel.filRouge && <p className="mt-3 text-center text-sm italic leading-relaxed" style={{ color: IVORY, fontFamily: 'var(--font-cinzel), serif' }}>« {wheel.filRouge[lang]} »</p>}
                  {wheel.filRouge && !wheel.echo && (
                    <div className="mt-4 text-center">
                      <button onClick={seal} disabled={sealedBusy} className="rounded-full px-7 py-2.5 text-xs font-bold uppercase tracking-widest disabled:opacity-50" style={{
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.12) 38%, rgba(255,255,255,0) 60%), #005f6a',
                        color: '#fff', boxShadow: '0 0 16px rgba(0,95,106,0.5), inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -3px 7px rgba(0,0,0,0.35)' }}>
                        {lang === 'en' ? 'Seal it as an augury' : 'Le sceller en augure'}
                      </button>
                      <p className="mt-1.5 text-[10px]" style={{ color: `${IVORY}88` }}>
                        {lang === 'en' ? 'due at the week’s end — then you’ll judge it' : 'échéance fin de semaine — puis tu le jugeras'}
                      </p>
                    </div>
                  )}
                  {wheel.echo && !wheel.echo.verdict && (
                    <div className="mt-4">
                      <p className="text-center text-[11px] italic" style={{ color: `${IVORY}aa` }}>
                        {lang === 'en' ? 'Did the week turn out as woven?' : 'La semaine a-t-elle tourné comme tissée ?'}
                      </p>
                      <div className="mt-3 flex justify-center gap-2">
                        {[0, 25, 50, 75, 100].map((p) => (
                          <button key={p} onClick={() => setVerdictPct(p)}
                            className="h-10 w-14 rounded-lg text-sm font-bold transition-all" style={{
                              background: verdictPct === p ? `linear-gradient(180deg, ${GOLD_PALE}, ${GOLD})` : 'rgba(218,165,32,0.08)',
                              color: verdictPct === p ? '#241505' : GOLD, border: `1px solid ${verdictPct === p ? GOLD_PALE : `${GOLD}44`}`,
                            }}>{p}%</button>
                        ))}
                      </div>
                      <p className="mt-3 text-center text-[10px] uppercase tracking-widest" style={{ color: `${GOLD}99` }}>
                        {lang === 'en' ? 'best-kept card (optional)' : 'la carte la mieux accomplie (facultatif)'}
                      </p>
                      <div className="mt-2 flex justify-center gap-2">
                        {wheel.cards.map((c) => (
                          <button key={c.day} onClick={() => setBestCard(bestCard === c.day ? null : c.day)} title={c.name}
                            className="h-9 w-7 rounded-md overflow-hidden transition-all" style={{
                              border: bestCard === c.day ? `2px solid ${GOLD_PALE}` : '1px solid rgba(218,165,32,0.3)',
                              boxShadow: bestCard === c.day ? `0 0 12px ${GOLD}88` : 'none',
                              opacity: bestCard === null || bestCard === c.day ? 1 : 0.45,
                            }}>
                            <img src={`/cards/arcana/${c.id}.jpg`} alt={c.name} className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                      <div className="mt-4 text-center">
                        <button onClick={sendVerdict} disabled={sealedBusy} className="rounded-full px-7 py-2.5 text-xs font-bold uppercase tracking-widest disabled:opacity-50" style={{
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.15) 38%, rgba(255,255,255,0) 60%), linear-gradient(180deg, #E8C66A 0%, #D4AF37 45%, #9A7A22 100%)',
                          color: '#241505', border: '1.5px solid rgba(232,198,106,0.6)',
                          boxShadow: '0 0 18px rgba(212,175,55,0.55), inset 0 1px 1px rgba(255,255,255,0.45), inset 0 -3px 7px rgba(0,0,0,0.35)' }}>
                          {lang === 'en' ? 'Record the week' : 'Consigner la semaine'}
                        </button>
                      </div>
                    </div>
                  )}
                  {wheel.echo?.verdict && (
                    <div className="mt-3 text-center">
                      <p className="text-xs" style={{ color: GOLD_PALE }}>
                        ✓ {wheel.echo.verdictPct ?? (wheel.echo.verdict === 'oui' ? 100 : wheel.echo.verdict === 'partiel' ? 50 : 0)}%
                        {wheel.echo.bestCardIndex !== null && wheel.echo.bestCardIndex !== undefined && (
                          <> · {lang === 'en' ? 'best' : 'tenue'} : {wheel.cards[wheel.echo.bestCardIndex]?.[lang === 'en' ? 'nameEn' : 'name']}</>
                        )}
                      </p>
                      <p className="mt-3 text-[11px]" style={{ color: `${IVORY}99` }}>
                        {lang === 'en' ? 'A new wheel can be cast whenever you’re ready.' : 'Une nouvelle roue peut être posée quand tu es prêt.'}
                      </p>
                      <button onClick={cast} disabled={busy} className="mt-2 rounded-full px-6 py-2 text-[11px] font-bold uppercase tracking-widest" style={{
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.12) 38%, rgba(255,255,255,0) 60%), #4A1931',
                        color: GOLD_PALE, border: '1.5px solid rgba(218,165,32,0.7)' }}>
                        {lang === 'en' ? 'Cast the next wheel' : 'Poser la roue suivante'}
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm"
            style={{ background: 'rgba(24,11,5,0.92)', border: '1px solid rgba(218,165,32,0.6)', color: GOLD_PALE, fontFamily: 'var(--font-cinzel), serif', boxShadow: '0 0 24px rgba(218,165,32,0.35)' }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Paywall « 2 grands tirages » (modale du même hook). */}
      <EntitlementGateModal reason={gateReason} onClose={closeGate} />
      {/* L'attente du tissage (7 éclats + fil rouge) se joue au milieu de l'écran. */}
      <OracleWaitAnimation />
    </div>
  );
}

export default function GatedPage() {
  return <AuthGate><SemainePage /></AuthGate>;
}
