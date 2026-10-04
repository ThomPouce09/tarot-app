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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang, contentLang, pick4, pickContent } from '@/lib/i18n';
import { useEntitlement, EntitlementGateModal } from '@/lib/use-entitlement';
import AuthGate from '@/components/auth-gate';
import YiSlideNav from '@/components/yi-slide-nav';
import SemaineDecoction from './semaine-decoction';
import { api } from '@/lib/api-client';
import { playSound } from '@/lib/sounds';

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
  // Archivage : `canCastNext` = les 7 jours sont écoulés, une nouvelle roue
  // peut être posée (l'ancienne reste dans l'historique), augure scellée ou non.
  archived: boolean;
  canCastNext: boolean;
  echo: { id: string; textFr: string; textEn: string | null; dueAt: string; verdict: string | null; verdictPct: number | null; bestCardIndex: number | null } | null;
}

function emailLocal(): string {
  try { return JSON.parse(localStorage.getItem('tarot_user') || '{}')?.email ?? ''; } catch { return ''; }
}

// Date (discrète) du `day`-ième jour de la roue, calculée en jour LOCAL depuis
// la date de pose — même découpage que le serveur (les jours basculent à
// minuit local). L'ordre des composants suit la langue : JJ/MM en français,
// MM/JJ en anglais. L'année n'est ajoutée que si la roue n'est pas de l'année
// en cours (utile pour une roue archivée dans l'historique).
function wheelDayLabel(castAt: string, day: number, lang: string): string {
  const d = new Date(castAt);
  if (Number.isNaN(d.getTime())) return '';
  const base = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  base.setDate(base.getDate() + day);
  const dd = String(base.getDate()).padStart(2, '0');
  const mm = String(base.getMonth() + 1).padStart(2, '0');
  const yyyy = base.getFullYear();
  const dm = lang === 'en' ? `${mm}/${dd}` : `${dd}/${mm}`;
  return yyyy === new Date().getFullYear() ? dm : `${dm}/${String(yyyy).slice(2)}`;
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

  // ── Attente : une seule fenêtre continue dès l'ouverture, ≥ 4 s ──
  // L'animation est visible DÈS le premier rendu (pendant le fetch du GET —
  // c'est lui qui prend du temps), et se prolonge jusqu'à min(4 s, résolution) :
  //  - roue trouvée → tenue au moins 4 s au total depuis le montage ;
  //  - rien à afficher (wheel null) → fermeture quasi immédiate (closeFast),
  //    le CTA « Poser la roue » s'affiche sans animation qui traîne ;
  //  - fetch très lent → l'attente est déjà couverte par la scène, pas de
  //    trou blanc entre ouverture et arrivée des données.
  // La page n'a PAS d'autre timer parallèle (l'ancien double pilotage tenait
  // « l'appli s'est lancée deux fois »).
  const [minDone, setMinDone] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setMinDone(true), 4000);
    return () => window.clearTimeout(t);
  }, []);
  // Fenêtre de chargement : ouverte tant que le fetch initial n'a pas rendu,
  // et jusqu'à écoulement des 4 s si une roue est affichable.
  const booting = wheel === undefined || (wheel !== null && !minDone);

  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(null), 2600); };

  /* ── Focus visuel : caler la couronne des cartes en haut de l'écran ── */
  // Espace conservé au-dessus (26px) : sous le menu parchemin (YiSlideNav) fixé
  // en haut à droite, marge assez courte pour garder le focus esthétique.
  // Utilisé : au rechargement d'une roue en cours (fin de la fenêtre
  // « Chargement des arcanes »), après le tap sur la carte du jour, et après
  // une nouvelle roue.
  const wheelTopRef = useRef<HTMLDivElement | null>(null);
  const focusWheel = useCallback(() => {
    // délai court : laisser la couronne se monter avant de la mesurer
    window.setTimeout(() => {
      const el = wheelTopRef.current;
      if (!el) return;
      const y = Math.max(0, el.getBoundingClientRect().top + window.scrollY - 26);
      if (Math.abs(window.scrollY - y) < 4) return; // déjà en place
      window.scrollTo({ top: y, behavior: 'smooth' });
    }, 80);
  }, []);

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

  // Le focus de la couronne se joue quand la fenêtre de chargement se referme
  // sur une roue affichable (rechargement d'un tirage en cours).
  const prevBootingRef = useRef(true);
  useEffect(() => {
    if (prevBootingRef.current && !booting && wheel) focusWheel();
    prevBootingRef.current = booting;
  }, [booting, wheel, focusWheel]);

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
        body: JSON.stringify({ email: e, action: 'cast', cards, lang }),
      });
      const d = await res.json();
      if (!res.ok) { flash(d.error || 'Le tirage a échoué.'); return; }
      await reload();
      focusWheel();
      flash(pick4('La roue est posée. Le jour 1 luit.', 'The wheel is cast. Day one glows.', "La rueda está lanzada. El día 1 resplandece.", "चक्र बिछा दिया गया है। दिन 1 दमक रहा है।")(lang));
    } finally { setBusy(false); }
  };

  /* ── Ouvrir le jour courant ── */
  const reveal = async (day: number) => {
    if (!wheel || day !== wheel.nowDay) return;
    if (wheel.cards[day]?.revealed) return; // déjà retournée : plus de son ni d'appel
    playSound('flip-day-card', 0.9); // froissement du voile au retournement
    const e = emailLocal();
    const res = await api('/api/tarot-semaine', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: e, action: 'reveal', day }),
    });
    if (res.ok) { const d = await res.json(); setWheel(d.wheel); focusWheel(); }
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
  // L'attente IA n'est plus l'overlay cosmique des Dés (OracleWaitAnimation) :
  // c'est la scène tarotique ArcanumWait, pilotée par l'état local de la page
  // (en bas du JSX). setOracleWait global retiré d'ici → plus de doublon.

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
      if (!res.ok) flash(d.reason === 'echo-cap' ? d.error : (pick4('Sceau impossible.', 'Could not seal.', "Sello imposible.", "मुहर लगाना असंभव।")(lang)));
      else flash(pick4('Ton augure est scellé jusqu’à la fin de la semaine.', 'Your augury is sealed for the week’s end.', "Tu augurio queda sellado hasta el fin de la semana.", "तुम्हारा शगुन सप्ताह के अंत तक मुहरबंद है।")(lang));
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
      if (!res.ok) { flash(pick4('L’enregistrement a échoué.', 'The record failed.', "El registro falló.", "रिकॉर्ड विफल रहा।")(lang)); return; }
      await reload();
      flash(pick4('Semaine consignée — la Ferveur grandit.', 'Week recorded — the Fervor grows.', "Semana consignada — el Fervor crece.", "सप्ताह दर्ज — ज्वर बढ़ता है।")(lang));
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
            {pick4('Les Arcanes de la Semaine', 'Arcana of the Week', "Los Arcanos de la Semana", "सप्ताह के अर्कान")(lang)}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-xs italic leading-relaxed" style={{ color: IVORY, opacity: 0.75 }}>
            {pick4('Sept arcanes majeurs, un par jour planétaire. Posée d’un seul geste, la semaine se déplie d’elle-même : les jours passés se révèlent, celui d’aujourd’hui luit, et le fil rouge tisse les sept en un conseil — scellé en augure.', 'Seven major arcana, one per planetary day. Once cast, the week unfolds on its own: past days reveal themselves, today’s card glows, and the thread weaves the seven into one counsel — sealed as an augury.', "Siete arcanos mayores, uno por día planetario. Lanzada de un solo gesto, la semana se despliega sola: los días pasados se revelan, el de hoy resplandece, y el hilo rojo teje los siete en un consejo — sellado como augurio.", "सात मुख्य अर्कान, एक प्रत्येक ग्रह-दिन के लिए। एक ही इशारे में बिछी सप्ताह अपने आप खुल जाती है: बीते दिन प्रकट होते हैं, आज का दिन दमकता है, और लाल धागा सातों को एक परामर्श में बुनता है — शगुन की भाँति मुहरबंद।")(lang)}
          </p>
          {wheel === null && !booting && (
            <p className="mt-1 text-[10px] tracking-widest" style={{ color: `${GOLD}99` }}>
              {pick4('poser la roue débite deux grands tirages', 'casting the wheel spends two advanced readings', "lanzar la rueda consume dos tiradas avanzadas", "चक्र बिछाने पर दो उन्नत वाचन खर्च होते हैं")(lang)}
            </p>
          )}
        </div>

        {/* ── Pas de roue : proposer l'office (jamais pendant la fenêtre de
            chargement initial : `booting` couvre le fetch ET les 4 s s'il y a une roue) ── */}
        {wheel === null && !booting && (
          <div className="mt-16 text-center">
            <motion.button type="button" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={cast} disabled={busy}
              className="rounded-full px-8 py-3 font-[family-name:var(--font-cinzel-deco)] text-sm font-bold uppercase tracking-widest disabled:opacity-50"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.12) 38%, rgba(255,255,255,0) 60%), #4A1931',
                color: GOLD_PALE, border: '1.5px solid rgba(218,165,32,0.7)',
                boxShadow: '0 0 22px rgba(218,165,32,0.35), inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -3px 7px rgba(0,0,0,0.4)',
              }}>
              {busy ? '…' : pick4('Poser la roue de la semaine', 'Cast this week’s wheel', "Lanzar la rueda de la semana", "सप्ताह का चक्र बिछाएँ")(lang)}
            </motion.button>
            <p className="mt-3 text-[11px]" style={{ color: IVORY, opacity: 0.65 }}>
              {pick4('N’importe quel jour ouvre ta semaine à toi — la roue suit 7 jours depuis aujourd’hui.', 'Any day begins your own week — the wheel follows you, 7 days from today.', "Cualquier día abre tu propia semana — la rueda te sigue 7 días desde hoy.", "कोई भी दिन तुम्हारा अपना सप्ताह खोलता है — चक्र आज से 7 दिन तुम्हारे साथ चलता है।")(lang)}
            </p>
          </div>
        )}

        {/* ── La roue posée : couronne 4 + 3 (masquée tant que la fenêtre de
            fenêtre `booting` n'est pas levée) ── */}
        {wheel && !booting && (
          <>
            <div ref={wheelTopRef} className="mt-8 flex flex-col items-center gap-2">
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
                          {/* Date du jour de la roue — discrète, pour situer le tirage
                              dans le calendrier (jour local). */}
                          <div className="text-[8px] sm:text-[9px] tabular-nums" style={{ color: isToday ? GOLD_PALE : `${GOLD}88`, opacity: isToday ? 0.8 : 0.5, letterSpacing: '0.06em' }}>
                            {wheelDayLabel(wheel.castAt, idx, lang)}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              ))}
            </div>
            <p className="mt-2 text-center text-[10px]" style={{ color: `${GOLD}aa` }}>
              {pick4('✦ = la carte résonne avec la planète du jour', '✦ = the card resonates with its day’s planet', "✦ = la carta resuena con el planeta del día", "✦ = पत्र उस दिन के ग्रह से गूँजता है")(lang)}
              {' · '}
              {weekDone ? (pick4('semaine bouclée — tisse le fil', 'week complete — weave the thread', "semana completada — teje el hilo", "सप्ताह पूर्ण — धागा बुनो")(lang)) :
                `${pick4('jour', 'day', "día", "दिन")(lang)} ${wheel.nowDay + 1}/7 — ${pick4('touche la carte qui luit', 'tap the glowing card', "toca la carta que resplandece", "दमकते पत्र को छूओ")(lang)}`}
            </p>

            {/* ── L'éclat du jour : la portion IA de LA carte courante, mise en vedette ── */}
            {(() => {
              const today = wheel.cards[wheel.nowDay];
              const shown = today?.revealed ? today : wheel.cards.slice(0, Math.min(wheel.nowDay, 7)).reverse().find(c => c.revealed);
              if (!shown || wheel.nowDay >= 7) return null;
              if (weaving) return (
                <p className="mt-4 text-center text-xs italic" style={{ color: IVORY, opacity: 0.7 }}>
                  {pick4('L’oracle éclaire tes sept jours…', 'The oracle is lighting your seven days…', "El oráculo ilumina tus siete días…", "ओरैकल तुम्हारे सातों दिन रोशन कर रहा है…")(lang)}
                </p>
              );
              if (!shown.insight) return (
                <div className="mt-4 text-center">
                  {weaveErr && <p className="mb-2 text-xs italic" style={{ color: '#E2B8AC' }}>{pick4('L’oracle s’est tu.', 'The oracle fell silent.', "El oráculo se ha callado.", "ओरैकल मौन हो गया।")(lang)}</p>}
                  <button onClick={askWeave} className="rounded-full px-6 py-2 text-[11px] font-bold uppercase tracking-widest" style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.12) 38%, rgba(255,255,255,0) 60%), linear-gradient(180deg, #E8C66A 0%, #D4AF37 45%, #9A7A22 100%)',
                    color: '#241505', border: '1.5px solid rgba(232,198,106,0.6)', boxShadow: '0 0 16px rgba(212,175,55,0.55), inset 0 1px 1px rgba(255,255,255,0.45), inset 0 -3px 7px rgba(0,0,0,0.35)' }}>
                    {pick4('Éclairer la semaine', 'Light the week', "Iluminar la semana", "सप्ताह को रोशन करें")(lang)}
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
                    {pick4('L’éclat du jour', 'The card’s light', "El resplandor del día", "दिन की ज्योति")(lang)}
                  </p>
                  {/* Le nom de l'arcane en tête d'analyse, flanqué du jour du
                      tirage (glyphe planétaire + nom du jour) en pastille. */}
                  <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2.5">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[9px] uppercase tracking-[0.18em] whitespace-nowrap"
                      style={{
                        color: GOLD_PALE, fontFamily: 'var(--font-cinzel), serif',
                        border: `1px solid ${GOLD}55`, background: 'rgba(218,165,32,0.08)',
                        boxShadow: `inset 0 0 8px rgba(218,165,32,0.15)`,
                      }}
                    >
                      {DAYS[shown.weekday].planet} {DAYS[shown.weekday][lang as 'fr' | 'en']}
                    </span>
                    <p className="font-[family-name:var(--font-cinzel-deco)] text-base font-semibold uppercase tracking-[0.12em]" style={{
                      color: GOLD_PALE, textShadow: `0 0 14px ${GOLD}88, 0 1px 2px rgba(0,0,0,0.8)`,
                    }}>
                      {shown[lang === 'en' ? 'nameEn' : 'name']}{shown.resonant && ' ✦'}
                    </p>
                  </div>
                  <p className="mt-2 text-sm italic leading-relaxed" style={{ color: IVORY, fontFamily: 'var(--font-cinzel), serif' }}>
                    « {pickContent(shown.insight, lang)} »
                  </p>
                  <div className="mx-auto mt-3 h-px w-24" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}88, transparent)` }} />
                  {/* Le rendez-vous du lendemain, bien apparent en bas d'analyse. */}
                  <p className="mt-3 text-[11px] font-bold leading-relaxed" style={{
                    color: GOLD_PALE, fontFamily: 'var(--font-cinzel-deco), serif',
                    textShadow: `0 0 14px ${GOLD}77, 0 1px 2px rgba(0,0,0,0.8)`,
                  }}>
                    {'✦ '}
                    {pick4('N’oubliez pas de venir consulter l’influence de votre prochaine arcane demain !', 'Remember to come consult the influence of your next arcana tomorrow!', "¡No olvide venir mañana a consultar la influencia de su próxima arcana!", "कल अपनी अगली अर्कान का प्रभाव ज़रूर देख आइए!")(lang)}
                  </p>
                </motion.div>
              );
            })()}

            {/* ── Fil rouge + sceau + bilan ── */}
            {(weekDone || echoDue) && (
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-8 max-w-xl">
                <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(160deg,#4A2C1A 0%,#2A1408 60%,#180B05 100%)', border: '1.5px solid rgba(218,165,32,0.45)', boxShadow: '0 0 30px rgba(0,0,0,0.55), inset 0 0 30px rgba(74,25,49,0.35)' }}>
                  <h3 className="text-center font-[family-name:var(--font-cinzel-deco)] text-base" style={{ color: GOLD }}>
                    {pick4('Le Fil rouge de l’Oracle', 'The Red Thread', "El Hilo Rojo del Oráculo", "ओरैकल का लाल धागा")(lang)}
                  </h3>
                  {!wheel.filRouge && !wheel.echo && (
                    <div className="mt-4 text-center">
                      {weaving ? <p className="text-xs italic" style={{ color: IVORY, opacity: 0.7 }}>{pick4('Les sept cartes se tissent…', 'The seven cards are weaving…', "Las siete cartas se tejen…", "सातों पत्र बुने जा रहे हैं…")(lang)}</p> : (
                        <>
                          {weaveErr && <p className="mb-2 text-xs italic" style={{ color: '#E2B8AC' }}>{pick4('L’oracle s’est tu.', 'The oracle fell silent.', "El oráculo se ha callado.", "ओरैकल मौन हो गया।")(lang)}</p>}
                          <button onClick={askWeave} className="rounded-full px-7 py-2.5 text-xs font-bold uppercase tracking-widest" style={{
                            background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.12) 38%, rgba(255,255,255,0) 60%), linear-gradient(180deg, #E8C66A 0%, #D4AF37 45%, #9A7A22 100%)',
                            color: '#241505', border: '1.5px solid rgba(232,198,106,0.6)', boxShadow: '0 0 16px rgba(212,175,55,0.55), inset 0 1px 1px rgba(255,255,255,0.45), inset 0 -3px 7px rgba(0,0,0,0.35)' }}>
                            {pick4('Tisser le fil rouge', 'Weave the thread', "Tejer el hilo rojo", "लाल धागा बुनें")(lang)}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {wheel.filRouge && <p className="mt-3 text-center text-sm italic leading-relaxed" style={{ color: IVORY, fontFamily: 'var(--font-cinzel), serif' }}>« {pickContent(wheel.filRouge, lang)} »</p>}
                  {wheel.filRouge && !wheel.echo && (
                    <div className="mt-4 text-center">
                      <button onClick={seal} disabled={sealedBusy} className="rounded-full px-7 py-2.5 text-xs font-bold uppercase tracking-widest disabled:opacity-50" style={{
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.12) 38%, rgba(255,255,255,0) 60%), linear-gradient(180deg, #E8C66A 0%, #D4AF37 45%, #9A7A22 100%)',
                        color: '#241505', boxShadow: '0 0 16px rgba(212,175,55,0.55), inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -3px 7px rgba(0,0,0,0.35)' }}>
                        {pick4('Le sceller en augure', 'Seal it as an augury', "Sellarlo como augurio", "उसे शगुन के रूप में मुहरबंद करें")(lang)}
                      </button>
                      <p className="mt-1.5 text-[10px]" style={{ color: `${IVORY}88` }}>
                        {pick4('échéance fin de semaine — puis tu le jugeras', 'due at the week’s end — then you’ll judge it', "vencimiento al fin de la semana — después lo juzgarás", "अंतिम तिथि सप्ताह के अंत तक — फिर तुम इसे परखोगे")(lang)}
                      </p>
                    </div>
                  )}
                  {wheel.echo && !wheel.echo.verdict && (
                    <div className="mt-4">
                      <p className="text-center text-[11px] italic" style={{ color: `${IVORY}aa` }}>
                        {pick4('La semaine a-t-elle tourné comme tissée ?', 'Did the week turn out as woven?', "¿La semana giró como fue tejida?", "क्या सप्ताह वैसा चला जैसा बुना गया था?")(lang)}
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
                        {pick4('la carte la mieux accomplie (facultatif)', 'best-kept card (optional)', "la carta mejor cumplida (opcional)", "सर्वाधिक सफल पत्र (वैकल्पिक)")(lang)}
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
                          {pick4('Consigner la semaine', 'Record the week', "Registrar la semana", "सप्ताह दर्ज करें")(lang)}
                        </button>
                      </div>
                    </div>
                  )}
                  {wheel.echo?.verdict && (
                    <div className="mt-3 text-center">
                      <p className="text-xs" style={{ color: GOLD_PALE }}>
                        ✓ {wheel.echo.verdictPct ?? (wheel.echo.verdict === 'oui' ? 100 : wheel.echo.verdict === 'partiel' ? 50 : 0)}%
                        {wheel.echo.bestCardIndex !== null && wheel.echo.bestCardIndex !== undefined && (
                          <> · {pick4('tenue', 'best', "cumplida", "निभाई गई")(lang)} : {wheel.cards[wheel.echo.bestCardIndex]?.[lang === 'en' ? 'nameEn' : 'name']}</>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── Semaine écoulée : la roue passée est archivée dans l'historique
                   et une nouvelle peut être posée — augure scellée ou non. ── */}
            {wheel.canCastNext && (
              <div className="mx-auto mt-6 max-w-md text-center">
                <p className="text-[11px] italic" style={{ color: `${IVORY}99` }}>
                  {pick4('Cette semaine est écoulée. Sa roue est archivée dans votre historique', 'This week is over. Its wheel is archived in your history.', "Esta semana ha pasado. Su rueda está archivada en su historial", "यह सप्ताह बीत गया। इसका चक्र आपके इतिहास में संग्रहित है")(lang)}
                </p>
                <button onClick={cast} disabled={busy}
                  className="mt-3 rounded-full px-7 py-2.5 text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.12) 38%, rgba(255,255,255,0) 60%), linear-gradient(180deg, #E8C66A 0%, #D4AF37 45%, #9A7A22 100%)',
                    color: '#241505', border: '1.5px solid rgba(232,198,106,0.6)',
                    boxShadow: '0 0 16px rgba(212,175,55,0.55), inset 0 1px 1px rgba(255,255,255,0.45), inset 0 -3px 7px rgba(0,0,0,0.35)',
                  }}>
                  {busy ? '…' : pick4('Poser la roue suivante', 'Cast the next wheel', "Lanzar la rueda siguiente", "अगला चक्र बिछाएँ")(lang)}
                </button>
              </div>
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
      {/* Attente TAROTIQUE « La Roue des Sept + fiole de décoction »
          (semaine-decoction.tsx, variante B du labo retenue par le user) :
          UNE SEULE fenêtre continue ≥ 4 s, sans redémarrage, partagée par le
          chargement d'ouverture (`booting`), le cast (`busy`) et l'analyse IA
          (`weaving`). Aucune animation si rien à afficher au chargement.
          Coupé net si un paywall se déclenche (la modale prime, z-[100]). */}
      <SemaineDecoction
        on={(booting || weaving || busy) && gateReason === null}
        label={
          booting && !weaving && !busy
            ? (pick4('Chargement des arcanes', 'Loading the arcana', "Carga de los arcanos", "अर्कान लोड हो रहे हैं")(lang))
            : (pick4('Tirage de la semaine en cours de décoction ...', 'The weekly reading is brewing ...', "La tirada de la semana está en decocción ...", "सप्ताह का वाचन अभी बन रहा है ...")(lang))
        }
      />
    </div>
  );
}

export default function GatedPage() {
  return <AuthGate><SemainePage /></AuthGate>;
}
