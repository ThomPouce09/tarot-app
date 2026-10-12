'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang, pick4, pickContent, type Lang } from '@/lib/i18n';
import YiSlideNav from '@/components/yi-slide-nav';
import AuthGate from '@/components/auth-gate';
import { useEntitlement, EntitlementGateModal } from '@/lib/use-entitlement';
import WaitPoolLine from '@/components/wait-pool-line';
import { playSound } from '@/lib/sounds';
import { api } from '@/lib/api-client';

// ─── Charte laque noir / rouge / or (identité Yi Jing) ─────────────────────
const L = {
  noir: '#0a0507',
  panel: '#140a0e',
  panelDeep: '#0d0609',
  rouge: '#8e1c22',
  rougeDeep: '#5c0f16',
  rougeGlow: 'rgba(180,40,45,0.35)',
  or: '#f3c969',
  orSoft: '#d9b45c',
  orDim: 'rgba(243,201,105,0.55)',
  ivoire: '#f5ead6',
  jade: '#3f8f7a',
};

type HexShape = {
  numero: number;
  caractere: string;
  pinyin: string;
  name: string;        // nom de l'hexagramme (Ciel, Terre…) — champ DB `element`
  strategie: string;
  attitude: string;
  conseil: string;
  synthese: string;
  lignes: boolean[]; // base → sommet
  nameEn: string | null;
  syntheseEn: string | null;
  nameEs?: string | null;
  syntheseEs?: string | null;
  nameHi?: string | null;
  syntheseHi?: string | null;
};

type ApiResponse = {
  found: boolean;
  date: string;
  alreadyDrawn: boolean;
  hasAdvice: boolean;
  adviceMissing?: boolean;
  dobKnown?: boolean;
  hexagram?: HexShape;
  mutating?: number[];
  transformed?: HexShape | null;
  tomorrow?: { numero: number; caractere: string; pinyin: string } | null;
  collection?: { viewed: number; streak: number; total: number } | null;
  personalAdvice?: string | null;
  error?: string;
  // erreurs gate (402)
  reason?: string;
};

/** Variante linguistique d'un champ (tables sœurs _en/_es/_hi), repli FR. */
const hexVariant = (lang: string, en?: string | null, es?: string | null, hi?: string | null, fr?: string | null) =>
  ((lang === 'en' ? en : lang === 'es' ? es : lang === 'hi' ? hi : null) || fr || '');

// ─── Dictionnaire FR / EN / ES / HI ────────────────────────────────────────
const T = {
  eyebrow: { fr: 'LE YI JING · ORACLE DU JOUR', en: 'THE I CHING · ORACLE OF THE DAY', es: 'EL YI JING · ORÁCULO DEL DÍA', hi: 'ई चिंग · दिन की देववाणी' },
  title: { fr: 'Hexagramme du jour', en: "Today's Hexagram", es: 'Hexagrama del día', hi: 'आज का हैक्सग्राम' },
  sealed: { fr: 'Un sceau vous attend', en: 'A seal awaits you', es: 'Un sello le espera', hi: 'एक मुहर आपकी प्रतीक्षा करती है' },
  open: { fr: 'Briser le sceau et consulter', en: 'Break the seal and consult', es: 'Romper el sello y consultar', hi: 'मुहर तोड़ें और पूछें' },
  // Encadré « comment ça marche » — le user comprend avant de consentir.
  dobHint: { fr: 'Sans date de naissance dans votre profil, le conseil reste juste un peu moins ajusté.', en: 'Without a birth date in your profile, the guidance stays just slightly less tailored.', es: 'Sin fecha de nacimiento en su perfil, la guía queda solo un poco menos ajustada.', hi: 'प्रोफ़ाइल में जन्म तिथि न होने पर मार्गदर्शन थोड़ा कम अनुकूल रहता है।' },
  dobCta: { fr: 'Compléter mon profil', en: 'Complete my profile', es: 'Completar mi perfil', hi: 'अपनी प्रोफ़ाइल पूरी करें' },
  advice: { fr: 'Conseil du jour', en: "Today's guidance", es: 'Consejo del día', hi: 'आज का मार्गदर्शन' },
  strategy: { fr: 'Stratégie', en: 'Strategy', es: 'Estrategia', hi: 'रणनीति' },
  attitude: { fr: 'Attitude', en: 'Attitude', es: 'Actitud', hi: 'दृष्टिकोण' },
  synthesis: { fr: 'Synthèse', en: 'Synthesis', es: 'Síntesis', hi: 'सारांश' },
  readMore: { fr: 'Lire la synthèse', en: 'Read the synthesis', es: 'Leer la síntesis', hi: 'सारांश पढ़ें' },
  close: { fr: 'Fermer', en: 'Close', es: 'Cerrar', hi: 'बंद करें' },
  mutating: { fr: 'Lignes mutantes', en: 'Changing lines', es: 'Líneas mutantes', hi: 'परिवर्तन रेखाएँ' },
  mutatingNone: { fr: 'Journée stable — aucune ligne ne bouge.', en: 'A stable day — no line is moving.', es: 'Jornada estable — ninguna línea se mueve.', hi: 'स्थिर दिन — कोई रेखा नहीं हिलती।' },
  // Légende pédagogique : ce que « mutant » veut dire, en une phrase.
  mutatingLegend: { fr: 'Une ligne mutante est un trait de votre journée en train de basculer : le plein cède, le cassé s\u2019affirme. Elles disent où la journée bouge.', en: 'A changing line is a stroke of your day mid-turn: the solid yields, the broken firms up. They show where the day is moving.', es: 'Una línea mutante es un trazo de su jornada en pleno vuelco: el lleno cede, el roto se afirma. Indican dónde se mueve el día.', hi: 'परिवर्तनशील रेखा आपकी दिन की वह रेखा है जो पलट रही है: ठोस झुकता है, टूटा दृढ़ होता है। वे बताती हैं दिन कहाँ हिल रहा है।' },
  lineNames: { fr: ['', 'ligne initiale', '2ᵉ ligne', '3ᵉ ligne', '4ᵉ ligne', '5ᵉ ligne', 'ligne du haut'], en: ['', 'bottom line', '2nd line', '3rd line', '4th line', '5th line', 'top line'], es: ['', 'línea inicial', '2.ª línea', '3.ª línea', '4.ª línea', '5.ª línea', 'línea superior'], hi: ['', 'प्रारंभिक रेखा', 'दूसरी रेखा', 'तीसरी रेखा', 'चौथी रेखा', 'पाँचवीं रेखा', 'ऊपरी रेखा'] },
  transformsInto: { fr: 'votre journée mûrit vers', en: 'your day ripens into', es: 'su jornada madura hacia', hi: 'आपका दिन इसमें परिपक्व होता है' },
  today: { fr: "Aujourd'hui", en: 'Today', es: 'Hoy', hi: 'आज' },
  tomorrow: { fr: 'Demain', en: 'Tomorrow', es: 'Mañana', hi: 'कल' },
  tomorrowHint: { fr: 'scellé jusqu\u2019au prochain sceau brisé', en: 'sealed until the next broken seal', es: 'sellado hasta la próxima sello roto', hi: 'अगली मुहर टूटने तक सील' },
  collection: { fr: 'Collection', en: 'Collection', es: 'Colección', hi: 'संग्रह' },
  viewed: { fr: 'hexagrammes rencontrés', en: 'hexagrams met', es: 'hexagramas encontrados', hi: 'देखे गए हेक्सग्राम' },
  streakOn: { fr: 'Série en cours', en: 'Current streak', es: 'Racha actual', hi: 'वर्तमान श्रृंखला' },
  streak: { fr: 'jours consécutifs', en: 'consecutive days', es: 'días consecutivos', hi: 'लगातार दिन' },
  share: { fr: 'Partager ma carte du jour', en: 'Share my card', es: 'Compartir mi carta del día', hi: 'आज का अपना कार्ड साझा करें' },
  shareBusy: { fr: 'Gravure de la carte…', en: 'Engraving the card…', es: 'Grabando la carta…', hi: 'कार्ड अंकित हो रहा है…' },
  loading: { fr: 'Lecture du ciel…', en: 'Reading the heavens…', es: 'Lectura del cielo…', hi: 'आकाश का पाठ…' },
  errorTitle: { fr: 'Le ciel est voilé', en: 'The sky is veiled', es: 'El cielo está velado', hi: 'आकाश आच्छादित है' },
  retry: { fr: 'Réessayer', en: 'Retry', es: 'Reintentar', hi: 'पुनः प्रयास करें' },
} as const;

// ─── Trigrammes (nom localisé + glyphe) — dérivés des lignes de l'hexagramme ─
// Binaire 3 traits, BASE → sommet. Même table que lib/yi-daily (KING_WEN).
const TRIGRAM_TABLE: Record<string, { glyph: string; fr: string; en: string; es: string; hi: string }> = {
  '111': { glyph: '☰', fr: 'Ciel',      en: 'Heaven',  es: 'Cielo',    hi: 'आकाश' },
  '000': { glyph: '☷', fr: 'Terre',     en: 'Earth',   es: 'Tierra',   hi: 'पृथ्वी' },
  '100': { glyph: '☳', fr: 'Tonnerre',  en: 'Thunder', es: 'Trueno',   hi: 'गर्जन' },
  '010': { glyph: '☵', fr: 'Eau',       en: 'Water',   es: 'Agua',     hi: 'जल' },
  '001': { glyph: '☶', fr: 'Montagne',  en: 'Mountain',es: 'Montaña',  hi: 'पर्वत' },
  '011': { glyph: '☴', fr: 'Vent',      en: 'Wind',    es: 'Viento',   hi: 'वायु' },
  '101': { glyph: '☲', fr: 'Feu',       en: 'Fire',    es: 'Fuego',    hi: 'अग्नि' },
  '110': { glyph: '☱', fr: 'Marais',    en: 'Lake',    es: 'Lago',     hi: 'झील' },
};

/** « Feu sur Eau » (fr/en/es) — l'ordre hindi suit la grammaire postpositionnée. */
function trigramPair(lignes: boolean[], lang: Lang): string {
  const bin = lignes.map((b) => (b ? '1' : '0')).join('');
  const lo = TRIGRAM_TABLE[bin.slice(0, 3)];
  const up = TRIGRAM_TABLE[bin.slice(3, 6)];
  if (!lo || !up) return '';
  if (lang === 'fr') return `${up.glyph} ${up.fr} sur ${lo.glyph} ${lo.fr}`;
  if (lang === 'en') return `${up.glyph} ${up.en} over ${lo.glyph} ${lo.en}`;
  if (lang === 'es') return `${up.glyph} ${up.es} sobre ${lo.glyph} ${lo.es}`;
  return `${lo.glyph} ${lo.hi} के ऊपर ${up.glyph} ${up.hi}`;
}

// ─── Rendu des lignes (base → sommet, affichées sommet → base) ─────────────
function HexLines({ lignes, mutating = [], size = 1 }: { lignes: boolean[]; mutating?: number[]; size?: number }) {
  const rows = [...lignes].reverse(); // sommet en haut
  return (
    <div
      className="relative overflow-hidden rounded-xl"
      style={{
        padding: `${8 * size}px ${12 * size}px`,
        background: 'radial-gradient(120% 90% at 50% 10%, rgba(142,28,34,0.16) 0%, rgba(0,0,0,0.38) 70%)',
        border: `1px solid ${L.or}26`,
        boxShadow: 'inset 0 1px 10px rgba(0,0,0,0.55), inset 0 0 24px rgba(243,201,105,0.05), 0 4px 14px rgba(0,0,0,0.4)',
      }}
    >
    {/* reflet luisant : filet doré qui traverse les traits, puis se retire */}
    <motion.span
      className="pointer-events-none absolute inset-y-0 w-1/3"
      style={{ background: 'linear-gradient(105deg, transparent 0%, rgba(255,240,200,0.14) 45%, rgba(255,247,220,0.32) 50%, rgba(255,240,200,0.14) 55%, transparent 100%)' }}
      initial={{ x: '-140%' }}
      animate={{ x: '380%' }}
      transition={{ duration: 2.8, ease: 'easeInOut', repeat: Infinity, repeatDelay: 3.4 }}
    />
    <div className="flex flex-col justify-between" style={{ height: 66 * size, width: 96 * size, gap: 6 * size }}>
      {rows.map((yang, i) => {
        const lineNo = 6 - i; // numéro réel (1 base … 6 sommet)
        const mut = mutating.includes(lineNo);
        return (
          <motion.div
            key={lineNo}
            initial={{ opacity: 0, scaleX: 0.2 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.15 * (lineNo - 1), duration: 0.35, ease: 'easeOut' }}
            className="relative flex items-center"
            style={{ height: 10 * size }}
          >
            {yang ? (
              <div className="w-full rounded-full" style={{ height: 9 * size, background: 'linear-gradient(180deg, #ffe9b0 0%, ' + L.or + ' 42%, #9c6d22 100%)', boxShadow: 'inset 0 1px 0 rgba(255,244,200,0.85), inset 0 -1px 2px rgba(60,30,0,0.5), 0 2px 6px rgba(0,0,0,0.55)' + (mut ? ', 0 0 14px ' + L.rougeGlow : '') }} />
            ) : (
              <div className="flex w-full justify-between" style={{ height: 9 * size }}>
                <div className="rounded-full" style={{ width: '42%', background: 'linear-gradient(180deg, #ffe9b0 0%, ' + L.or + ' 42%, #9c6d22 100%)', boxShadow: 'inset 0 1px 0 rgba(255,244,200,0.85), inset 0 -1px 2px rgba(60,30,0,0.5), 0 2px 6px rgba(0,0,0,0.55)' + (mut ? ', 0 0 14px ' + L.rougeGlow : '') }} />
                <div className="rounded-full" style={{ width: '42%', background: 'linear-gradient(180deg, #ffe9b0 0%, ' + L.or + ' 42%, #9c6d22 100%)', boxShadow: 'inset 0 1px 0 rgba(255,244,200,0.85), inset 0 -1px 2px rgba(60,30,0,0.5), 0 2px 6px rgba(0,0,0,0.55)' + (mut ? ', 0 0 14px ' + L.rougeGlow : '') }} />
              </div>
            )}
            {mut && (
              <motion.span
                className="absolute rounded-full"
                style={{ right: 8 * size, top: '50%', transform: 'translateY(-50%)', width: 9 * size, height: 9 * size, border: `1.5px solid ${L.rouge}`, background: L.noir }}
                animate={{ boxShadow: [`0 0 4px ${L.rougeGlow}`, `0 0 14px ${L.rougeGlow}`, `0 0 4px ${L.rougeGlow}`] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
              />
            )}
          </motion.div>
        );
      })}
    </div>
    </div>
  );
}

// ─── Attente initiale : « Lecture du ciel » ────────────────────────────────
// Instant signature de l'univers : un taijitu calligraphié respire et tourne,
// cerclé de deux anneaux gravés (points cardinaux + trigrammes) qui tournent à
// contre-temps, une étincelle dorée en orbite, et le souffle du pinceau qui
// balaie le libellé. Tout en SVG/framer — aucun emoji, aucune police système.
function SkyLoader({ lang }: { lang: Lang }) {
  const t = (k: keyof typeof T) => pickContent(T[k] as { fr: string }, lang);
  return (
    <div className="flex w-full items-center justify-center" style={{ minHeight: '54vh' }}>
    <div className="flex flex-col items-center gap-7">
      <div className="relative" style={{ width: 168, height: 168 }}>
        {/* halo de fond qui respire */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(243,201,105,0.14) 0%, rgba(142,28,34,0.10) 45%, transparent 70%)' }}
          animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ repeat: Infinity, duration: 4.6, ease: 'easeInOut' }}
        />
        {/* anneau outer : ponctué (les 64 hexagrammes du livre), rotation lente */}
        <motion.svg viewBox="0 0 168 168" className="absolute inset-0" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 26, ease: 'linear' }}>
          <circle cx="84" cy="84" r="80" fill="none" stroke={L.or} strokeOpacity="0.28" strokeWidth="1" strokeDasharray="2 11" strokeLinecap="round" />
        </motion.svg>
        {/* anneau inner : 8 trigrammes en bâtons, à contre-rotation */}
        <motion.svg viewBox="0 0 168 168" className="absolute inset-0" animate={{ rotate: -360 }} transition={{ repeat: Infinity, duration: 38, ease: 'linear' }}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const a = (i * 45 * Math.PI) / 180;
            const x = 84 + 63 * Math.cos(a);
            const y = 84 + 63 * Math.sin(a);
            const solid = i % 2 === 0;
            return (
              <g key={i} transform={`translate(${x} ${y}) rotate(${i * 45 + 90})`} opacity="0.5">
                {[0, 1, 2].map((j) => {
                  const dy = (j - 1) * 4.2;
                  return solid || j !== 1 ? (
                    <rect key={j} x={-6} y={dy - 0.9} width={12} height={1.8} rx={0.9} fill={L.or} />
                  ) : (
                    <g key={j}>
                      <rect x={-6} y={dy - 0.9} width={4.8} height={1.8} rx={0.9} fill={L.or} />
                      <rect x={1.2} y={dy - 0.9} width={4.8} height={1.8} rx={0.9} fill={L.or} />
                    </g>
                  );
                })}
              </g>
            );
          })}
        </motion.svg>
        {/* étincelle en orbite */}
        <motion.div className="absolute inset-0" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 6.5, ease: 'easeInOut' }}>
          <span className="absolute left-1/2 top-[6px] h-2 w-2 -translate-x-1/2 rounded-full" style={{ background: '#ffe9b0', boxShadow: '0 0 10px 3px rgba(243,201,105,0.75)' }} />
        </motion.div>
        {/* taijitu central : contour or, moitiés laque/ivoire, rotation ample */}
        <motion.div className="absolute inset-0 flex items-center justify-center" animate={{ rotate: [0, 360] }} transition={{ repeat: Infinity, duration: 12, ease: 'easeInOut' }}>
          <svg viewBox="0 0 100 100" width="92" height="92" style={{ filter: 'drop-shadow(0 0 12px rgba(243,201,105,0.35))' }}>
            <defs>
              <linearGradient id="skyYang" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={L.ivoire} />
                <stop offset="100%" stopColor="#d8c9a8" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="46" fill="url(#skyYang)" stroke={L.or} strokeWidth="2" />
            <path d="M50 4 A46 46 0 0 1 50 96 A23 23 0 0 1 50 50 A23 23 0 0 0 50 4" fill={L.panelDeep} stroke={L.or} strokeOpacity="0.5" strokeWidth="1" />
            <circle cx="50" cy="27" r="6.5" fill={L.ivoire} stroke={L.or} strokeWidth="1.4" />
            <circle cx="50" cy="73" r="6.5" fill={L.panelDeep} stroke={L.or} strokeWidth="1.4" />
            <circle cx="50" cy="27" r="2" fill={L.panelDeep} />
            <circle cx="50" cy="73" r="2" fill={L.ivoire} />
          </svg>
        </motion.div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <p className="font-[family-name:var(--font-cinzel-deco)] text-[12px] tracking-[0.4em]" style={{ color: L.orSoft }}>
          {t('loading')}
        </p>
        {/* souffle du pinceau : filet doré qui balaie */}
        <div className="relative h-px w-44 overflow-hidden" style={{ background: `${L.or}22` }}>
          <motion.span
            className="absolute h-px w-12"
            style={{ background: `linear-gradient(90deg, transparent, ${L.or}, transparent)` }}
            animate={{ x: ['-3rem', '11.5rem'] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
          />
        </div>
      </div>
    </div>
    </div>
  );
}

// ─── Sceau (carte scellée à briser pour CONSENTIR au tirage) ───────────────
// Le sceau est une VIDEO (/images/sceau.mp4, 5 s) : seule sa PREMIÈRE IMAGE
// est chargée au départ ; un clic lance la lecture, et la fin de la vidéo
// équivaut au « bris du sceau » → déclenche le tirage (consentement).
// Tous les messages (libellé du sceau, puis attente IA) sont sous la vidéo.
const SEAL_VIDEO = '/images/sceau.mp4';

// Icône de partage : même glyphe à 3 points reliés que l'historique des tirages.
function ShareIcon({ size = 15, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden>
      <circle cx="18" cy="5" r="2.6" /><circle cx="6" cy="12" r="2.6" /><circle cx="18" cy="19" r="2.6" />
      <line x1="8.3" y1="10.8" x2="15.7" y2="6.2" /><line x1="8.3" y1="13.2" x2="15.7" y2="17.8" />
    </svg>
  );
}

const SEAL_PLAYING_LABEL: Record<string, string> = { fr: 'Le sceau se brise…', en: 'The seal breaks…', es: 'El sello se rompe…', hi: 'मुहर टूटती है…' };

type SealHandle = { play: () => void };

const SealedCard = forwardRef<SealHandle, { onOpen: () => void; onSealTap: () => void; busy: boolean; drawing: boolean; lang: Lang }>(function SealedCard({ onOpen, onSealTap, busy, drawing, lang }, ref) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  // Le dégradé masqué (anneau brossé + specular) n'est peint que si le moteur
  // gère mask-composite ; sinon il recouvrirait la vidéo d'un plein cadre or.
  const [ringShine, setRingShine] = useState(false);
  useEffect(() => {
    try {
      setRingShine(
        typeof CSS !== 'undefined' &&
        (CSS.supports('mask-composite', 'exclude') || CSS.supports('-webkit-mask-composite', 'source-out')),
      );
    } catch { setRingShine(false); }
  }, []);
  const firedRef = useRef(false);

  const open = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    onOpen();
  };

  const tap = () => {
    if (playing || busy || firedRef.current) return;
    onSealTap(); // le parent fait fondre le CTA « Briser le sceau » (~2 s)
    playSound('open-seal'); // sceau qui se brise — simultané à l'animation
    const v = videoRef.current;
    if (!v) { open(); return; } // vidéo indisponible → on ouvre quand même
    setPlaying(true);
    v.play().catch(() => open());
    // Filet : certains WebViews ne déclenchent jamais 'ended' (5 s de vidéo).
    setTimeout(open, 6200);
  };

  // Le CTA « Briser le sceau et consulter » (extérieur) passe par ici :
  // même parcours que le tap sur la vidéo — lecture, puis tirage à la fin.
  useImperativeHandle(ref, () => ({ play: () => tap() }));

  return (
    <div className="mx-auto flex w-full flex-col items-center">
      {/* Plaque du sceau : AU-DESSUS de la vidéo, plus large et plus épaisse.
          Décor (易經 en grand) — le libellé se lit sous la vidéo. */}
      <div
        className="pointer-events-none mb-3 flex w-[320px] items-center justify-center rounded-2xl py-4"
        style={{
          background: 'linear-gradient(160deg, rgba(20,10,14,0.92), rgba(13,6,9,0.95))',
          border: '1.5px solid rgba(243,201,105,0.34)',
          boxShadow: '0 6px 22px rgba(0,0,0,0.55), inset 0 0 16px rgba(243,201,105,0.06)',
        }}
        aria-hidden
      >
        <div className="flex flex-col items-center gap-1">
          <span className="font-[family-name:var(--font-cinzel-deco)] text-[20px] leading-none tracking-[0.55em]" style={{ color: 'rgba(243,201,105,0.85)', textShadow: '0 0 16px rgba(243,201,105,0.25)' }}>
            易經
          </span>
          <span className="text-[9.5px] italic tracking-[0.14em]" style={{ color: 'rgba(245,234,214,0.55)', fontFamily: 'var(--font-cormorant), serif' }}>
            {pick4('Yì Jīng — Le Livre des Mutations', 'Yì Jīng — The Book of Changes', 'Yì Jīng — El Libro de las Mutaciones', 'ई चिंग — परिवर्तनों का ग्रंथ')(lang)}
          </span>
        </div>
      </div>
      <motion.button
        type="button"
        onClick={tap}
        whileTap={{ scale: 0.97 }}
        className="relative mx-auto block overflow-hidden rounded-2xl"
        style={{
          width: 260,
          height: 360,
          background: `linear-gradient(165deg, ${L.rouge} 0%, ${L.rougeDeep} 55%, #3a070c 100%)`,
          border: `1.5px solid ${L.or}66`,
          boxShadow: `0 18px 50px rgba(0,0,0,0.6), 0 0 40px ${L.rougeGlow}, inset 0 0 30px rgba(0,0,0,0.35)`,
        }}
        aria-label={pickContent(T.open, lang)}
      >
      {/* Image d'attente = première image de la vidéo (aucune lecture avant le clic). */}
      <video
        ref={videoRef}
        src={SEAL_VIDEO}
        muted
        playsInline
        preload="auto"
        onLoadedMetadata={(e) => {
          // Force l'affichage de la frame 0 sur les WebViews qui n'exposent
          // pas la première image sans seek.
          const v = e.currentTarget;
          try { v.currentTime = 0.001; } catch { /* refusé sur de rares WebView : la frame suit au play */ }
        }}
        onEnded={open}
        onError={() => { /* vidéo absente : la carte reste, le CLIC ouvrira (consentement) */ }}
        className="absolute inset-0 h-full w-full rounded-[12px] object-cover"
      />
      {/* Cadre or posé AU-DESSUS de la vidéo. Base universelle : anneau 4 px
          « or massif » (filets sombre/clair + halo). */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          border: '4px solid #d4af37',
          boxShadow:
            '0 0 0 1.5px #6b4d12, 0 0 0 3px rgba(255,236,180,0.28), '
            + 'inset 0 0 0 1px rgba(40,20,0,0.55), inset 0 0 14px rgba(255,236,180,0.30), '
            + '0 0 22px rgba(243,201,105,0.5)',
        }}
        aria-hidden
      />
      {/* Sur les WebView récentes (mask-composite dispo) : dégradé métallique
          brossé + reflet specular qui balaie l'anneau uniquement. */}
      {ringShine && (
        <>
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{
              border: '4px solid transparent',
              background:
                'linear-gradient(135deg, #f7d774 0%, #b8860b 22%, #fff3c4 44%, #e6bd52 60%, #7a5410 82%, #f0cd6a 100%) border-box',
              WebkitMask: 'linear-gradient(#000 0 0) padding-box, linear-gradient(#000 0 0)',
              WebkitMaskComposite: 'source-out',
              mask: 'linear-gradient(#000 0 0) padding-box, linear-gradient(#000 0 0)',
              maskComposite: 'exclude',
            }}
            aria-hidden
          />
          <motion.div
            className="pointer-events-none absolute rounded-2xl"
            style={{
              inset: -4,
              border: '4px solid transparent',
              backgroundImage: 'linear-gradient(115deg, transparent 42%, rgba(255,255,240,0.95) 50%, transparent 58%)',
              backgroundSize: '250% 100%',
              WebkitMask: 'linear-gradient(#000 0 0) padding-box, linear-gradient(#000 0 0)',
              WebkitMaskComposite: 'source-out',
              mask: 'linear-gradient(#000 0 0) padding-box, linear-gradient(#000 0 0)',
              maskComposite: 'exclude',
            }}
            initial={{ backgroundPosition: '0% 0%' }}
            animate={{ backgroundPosition: ['0% 0%', '100% 0%', '0% 0%'] }}
            transition={{ duration: 5.5, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' }}
            aria-hidden
          />
        </>
      )}
      </motion.button>
      {/* Message sous la vidéo — un seul emplacement, une seule typographie :
          libellé du sceau, « Le sceau se brise… », puis messages d'attente IA. */}
      {drawing ? (
        <WaitPoolLine
          universe="yijing"
          className="mt-4 max-w-[20rem] text-center text-[17px] italic leading-relaxed font-semibold"
          style={{ color: L.or, fontFamily: 'var(--font-cormorant), serif', textShadow: '0 0 16px rgba(243,201,105,0.45), 0 1px 4px rgba(0,0,0,0.9)' }}
        />
      ) : (
        <p
          className="mt-4 max-w-[20rem] text-center text-[17px] italic leading-relaxed font-semibold"
          style={{ color: L.or, fontFamily: 'var(--font-cormorant), serif', textShadow: '0 0 16px rgba(243,201,105,0.45), 0 1px 4px rgba(0,0,0,0.9)' }}
        >
          {playing ? (SEAL_PLAYING_LABEL[lang] || SEAL_PLAYING_LABEL.fr) : pickContent(T.sealed, lang)}
        </p>
      )}
    </div>
  );
});

// ─── Export PNG de la carte du jour ────────────────────────────────────────
// Rendu soigné dans l'esprit de la page : fond laque + halo rouge, cadre or double,
// identité (glyphe, nom, pinyin, trigrammes) en tête, lignes dorées à bouts ronds
// avec marqueur rouge des mutantes, panneau « Conseil du jour » à taille
// auto-ajustée (tout le conseil tient, plus de troncature), flèche vers l'hexagramme
// transformé, pied de carte. Polices : celles du site (chargées par la page).

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Chemin d'un rectangle arrondi (le canvas natif roundRect n'existe pas partout). */
function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Trait d'hexagramme : barre pleine ou cassée, extrémités rondes, dégradé or. */
function drawHexLine(ctx: CanvasRenderingContext2D, cx: number, y: number, w: number, h: number, yang: boolean) {
  const grad = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
  grad.addColorStop(0, L.or);
  grad.addColorStop(1, '#b8862f');
  ctx.strokeStyle = grad;
  ctx.lineWidth = h;
  ctx.lineCap = 'round';
  if (yang) {
    ctx.beginPath(); ctx.moveTo(cx - w / 2, y); ctx.lineTo(cx + w / 2, y); ctx.stroke();
  } else {
    const seg = w * 0.42;
    ctx.beginPath(); ctx.moveTo(cx - w / 2, y); ctx.lineTo(cx - w / 2 + seg, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + w / 2 - seg, y); ctx.lineTo(cx + w / 2, y); ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

async function exportCardPng(data: ApiResponse, lang: Lang, dateLabel: string): Promise<string> {
  const W = 1080;
  const H = 1750;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx || !data.hexagram) throw new Error('canvas indisponible');
  const hex = data.hexagram;
  const mutating = data.mutating ?? [];

  // Polices du site (déjà chargées par la page ; filet si indispo → serif).
  try {
    await Promise.all([
      document.fonts.load('600 52px "Cinzel Decorative"'),
      document.fonts.load('italic 32px "Cormorant Garamond"'),
      document.fonts.load('400 170px "Hoshiko Satsuki"'),
    ]);
  } catch { /* polices système en repli */ }

  // ── Fond laque + halo ──
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, L.panel);
  bg.addColorStop(0.55, L.panelDeep);
  bg.addColorStop(1, L.noir);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const halo = ctx.createRadialGradient(W / 2, 60, 40, W / 2, 60, 620);
  halo.addColorStop(0, 'rgba(180,40,45,0.30)');
  halo.addColorStop(1, 'rgba(180,40,45,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, W, 640);

  // ── Cadre or double ──
  ctx.strokeStyle = 'rgba(243,201,105,0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(36, 36, W - 72, H - 72);
  ctx.strokeStyle = 'rgba(243,201,105,0.18)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(52, 52, W - 104, H - 104);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // ── En-tête : titre + date ──
  ctx.fillStyle = L.or;
  ctx.font = '600 52px "Cinzel Decorative", Georgia, serif';
  ctx.fillText(pickContent(T.title, lang), W / 2, 168);
  ctx.fillStyle = 'rgba(245,234,214,0.75)';
  ctx.font = 'italic 32px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(dateLabel, W / 2, 220);

  // petit séparateur or (filet + losange)
  ctx.strokeStyle = 'rgba(243,201,105,0.4)';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(W / 2 - 190, 258); ctx.lineTo(W / 2 - 18, 258); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W / 2 + 18, 258); ctx.lineTo(W / 2 + 190, 258); ctx.stroke();
  ctx.fillStyle = 'rgba(243,201,105,0.65)';
  ctx.save();
  ctx.translate(W / 2, 258); ctx.rotate(Math.PI / 4);
  ctx.fillRect(-6, -6, 12, 12);
  ctx.restore();

  // ── Identité (colonne gauche) : glyphe, nom, pinyin, trigrammes ──
  const idX = 360;
  ctx.fillStyle = L.or;
  ctx.shadowColor = 'rgba(243,201,105,0.45)';
  ctx.shadowBlur = 26;
  ctx.font = '170px "Hoshiko Satsuki", serif';
  ctx.fillText(hex.caractere, idX, 450);
  ctx.shadowBlur = 0;

  const name = hexVariant(lang, hex.nameEn, hex.nameEs, hex.nameHi, hex.name);
  ctx.fillStyle = L.ivoire;
  ctx.font = '46px "Cinzel Decorative", Georgia, serif';
  const nameLine = `#${hex.numero} — ${name}`;
  // repli taille si nom long
  let nf = 46;
  while (ctx.measureText(nameLine).width > 540 && nf > 30) {
    nf -= 2;
    ctx.font = `${nf}px "Cinzel Decorative", Georgia, serif`;
  }
  ctx.fillText(nameLine, idX, 520);
  ctx.fillStyle = 'rgba(243,201,105,0.85)';
  ctx.font = 'italic 30px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(hex.pinyin, idX, 562);
  const tri = trigramPair(hex.lignes, lang);
  if (tri) {
    ctx.fillStyle = 'rgba(243,201,105,0.55)';
    ctx.font = '24px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(tri, idX, 600);
  }

  // ── Lignes (colonne droite), sommet → base, marqueur mutante ──
  const linesX = 780;
  const lineW = 250;
  const barH = 20;
  const step = 46;
  const top = 330;
  for (let k = 0; k < 6; k++) {
    const idx = 5 - k;            // ligne réelle 6 (k=0) → 1 (k=5)
    drawHexLine(ctx, linesX, top + k * step, lineW, barH, hex.lignes[idx]);
    if (mutating.includes(idx + 1)) {
      ctx.strokeStyle = L.rouge;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(linesX + lineW / 2 + 34, top + k * step, 10, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // ── Panneau « Conseil du jour » (taille auto pour tout contenir) ──
  const advice = (data.personalAdvice
    || hexVariant(lang, hex.syntheseEn, hex.syntheseEs, hex.syntheseHi, hex.conseil)
    || '').trim();
  const panel = { x: 92, w: W - 184, top: 660, r: 26, padX: 34, labelH: 56, padB: 34 };
  const maxTextW = panel.w - panel.padX * 2;
  // police ajustée : de 30 à 21, pour tenir dans la hauteur dispo
  const bottomLimit = data.transformed ? 1220 : 1360;
  const availH = bottomLimit - panel.top - panel.labelH - panel.padB;
  let fs2 = 30;
  let lines = wrapText(ctx, advice, maxTextW);
  for (;;) {
    ctx.font = `${fs2}px "Cormorant Garamond", Georgia, serif`;
    lines = wrapText(ctx, advice, maxTextW);
    if (lines.length * fs2 * 1.55 <= availH || fs2 <= 21) break;
    fs2 -= 1;
  }
  const lh = Math.round(fs2 * 1.55);
  // Filet de sécurité : si même à 21 px ça ne tient pas, on borne le nombre de
  // lignes au strict disponible (la dernière reçoit des points de suspension).
  const maxLines = Math.floor(availH / lh);
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[lines.length - 1] = lines[lines.length - 1].replace(/\s*\S{0,10}$/, '') + ' …';
  }
  const textH = lines.length * lh;
  const panelH = panel.labelH + textH + panel.padB;
  const pg = ctx.createLinearGradient(0, panel.top, 0, panel.top + panelH);
  pg.addColorStop(0, 'rgba(142,28,34,0.30)');
  pg.addColorStop(1, 'rgba(0,0,0,0.42)');
  rrect(ctx, panel.x, panel.top, panel.w, panelH, panel.r);
  ctx.fillStyle = pg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(142,28,34,0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = 'rgba(243,201,105,0.7)';
  ctx.font = '600 24px "Cinzel", Georgia, serif';
  const label = pickContent(T.advice, lang).toUpperCase();
  // letter-spacing maison pour le label (ctx.letterSpacing non universel)
  {
    const sp = 6;
    const total = Array.from(label).reduce((a, ch) => a + ctx.measureText(ch).width + sp, -sp);
    let cx = W / 2 - total / 2;
    ctx.textAlign = 'left';
    for (const ch of Array.from(label)) {
      ctx.fillText(ch, cx, panel.top + 42);
      cx += ctx.measureText(ch).width + sp;
    }
    ctx.textAlign = 'center';
  }
  ctx.fillStyle = L.ivoire;
  ctx.font = `${fs2}px "Cormorant Garamond", Georgia, serif`;
  lines.forEach((ln, i2) => ctx.fillText(ln, W / 2, panel.top + panel.labelH + fs2 + i2 * lh));

  // ── Panneau « Synthèse » : la lecture complète de l'oracle, sous le conseil ──
  const synth = (hexVariant(lang, hex.syntheseEn, hex.syntheseEs, hex.syntheseHi, hex.synthese) || '').trim();
  let curY = panel.top + panelH + 40;
  if (synth) {
    const sy = { x: panel.x, w: panel.w, r: 22, padX: panel.padX, labelH: 44, padB: 26 };
    const bottomSy = data.transformed ? H - 420 : H - 300;
    const availSy = Math.max(120, bottomSy - curY - sy.labelH - sy.padB);
    let fs3 = 24;
    let slines: string[] = [];
    for (;;) {
      ctx.font = `italic ${fs3}px "Cormorant Garamond", Georgia, serif`;
      slines = wrapText(ctx, synth, sy.w - sy.padX * 2);
      if (slines.length * fs3 * 1.5 <= availSy || fs3 <= 20) break;
      fs3 -= 1;
    }
    const lh3 = Math.round(fs3 * 1.5);
    const maxL3 = Math.floor(availSy / lh3);
    if (slines.length > maxL3) {
      slines = slines.slice(0, maxL3);
      slines[slines.length - 1] = slines[slines.length - 1].replace(/\s*\S{0,10}$/, '') + ' …';
    }
    const syH = sy.labelH + slines.length * lh3 + sy.padB;
    const sg = ctx.createLinearGradient(0, curY, 0, curY + syH);
    sg.addColorStop(0, 'rgba(0,0,0,0.30)');
    sg.addColorStop(1, 'rgba(0,0,0,0.46)');
    rrect(ctx, sy.x, curY, sy.w, syH, sy.r);
    ctx.fillStyle = sg; ctx.fill();
    ctx.strokeStyle = 'rgba(243,201,105,0.30)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = 'rgba(243,201,105,0.75)';
    ctx.font = '600 22px "Cinzel", Georgia, serif';
    const sl = pickContent(T.synthesis, lang).toUpperCase();
    {
      const sp3 = 5;
      const total = Array.from(sl).reduce((a, ch) => a + ctx.measureText(ch).width + sp3, -sp3);
      let cx = W / 2 - total / 2;
      ctx.textAlign = 'left';
      for (const ch of Array.from(sl)) { ctx.fillText(ch, cx, curY + 34); cx += ctx.measureText(ch).width + sp3; }
      ctx.textAlign = 'center';
    }
    ctx.fillStyle = 'rgba(245,234,214,0.85)';
    ctx.font = `italic ${fs3}px "Cormorant Garamond", Georgia, serif`;
    slines.forEach((ln, i2) => ctx.fillText(ln, W / 2, curY + sy.labelH + fs3 + i2 * lh3));
    curY += syH + 44;
  }

  // ── Hexagramme transformé (si mutantes) : juste sous la synthèse ──
  if (data.transformed) {
    const tn = hexVariant(lang, data.transformed.nameEn, data.transformed.nameEs, data.transformed.nameHi, data.transformed.name);
    ctx.fillStyle = 'rgba(245,234,214,0.62)';
    ctx.font = 'italic 26px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(pickContent(T.transformsInto, lang), W / 2, curY);
    ctx.fillStyle = L.or;
    ctx.font = '34px "Hoshiko Satsuki", serif';
    ctx.fillText(`${data.transformed.caractere}  #${data.transformed.numero} — ${tn}`, W / 2, curY + 46);
    curY += 60;
  }

  // ── Pied de carte ──
  const footY = Math.min(curY + 30, H - 150);
  ctx.strokeStyle = 'rgba(243,201,105,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W / 2 - 150, footY); ctx.lineTo(W / 2 + 150, footY); ctx.stroke();
  ctx.fillStyle = 'rgba(243,201,105,0.6)';
  ctx.font = '26px "Cinzel", Georgia, serif';
  ctx.fillText(pick4('Hexagramme du jour — tirage personnel', 'Hexagram of the day — personal draw', 'Hexagrama del día — tirada personal', 'दिन का हैक्सग्राम — व्यक्तिगत विन्यास')(lang), W / 2, footY + 44);
  ctx.fillStyle = 'rgba(245,234,214,0.4)';
  ctx.font = 'italic 22px "Cormorant Garamond", Georgia, serif';
  ctx.fillText('Oracle des Étoiles', W / 2, footY + 76);

  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) throw new Error('toBlob');
  const url = URL.createObjectURL(blob);
  const fname = `hexagramme-${data.date}.png`;
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare && nav.canShare({ files: [new File([blob], fname, { type: 'image/png' })] })) {
    try {
      await nav.share({ files: [new File([blob], fname, { type: 'image/png' })], title: pickContent(T.title, lang) });
      URL.revokeObjectURL(url);
      return 'shared';
    } catch {
      /* l'utilisateur a annulé → on retombe sur le téléchargement */
    }
  }
  const a = document.createElement('a');
  a.href = url;
  a.download = fname;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
}

// ─── Page ───────────────────────────────────────────────────────────────────
function YiJingDuJourPage() {
  const lang = useLang();
  const t = (k: keyof typeof T) => pickContent(T[k] as { fr: string; en?: string | null; es?: string | null; hi?: string | null }, lang);
  const { email, loaded, openGate, gateReason, closeGate } = useEntitlement();

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);   // état GET initial
  const [drawing, setDrawing] = useState(false);  // POST en cours (consentement)
  const [sealTapped, setSealTapped] = useState(false); // tap vidéo/bouton → fondu du CTA
  const [error, setError] = useState<string | null>(null);
  const [synthOpen, setSynthOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const startedRef = useRef(false);
  const sealRef = useRef<{ play: () => void } | null>(null);

  // Lecture d'état : AUCUN débit, AUCUNE IA. alreadyDrawn=true → le résultat
  // stocké s'affiche directement (le sceau est déjà brisé aujourd'hui).
  const load = () => {
    setLoading(true);
    setError(null);
    api('/api/yi-jing-du-jour')
      .then(async (r) => {
        const j = (await r.json()) as ApiResponse;
        if (!j.found) throw new Error(j.error || 'API indisponible');
        setData(j);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  // Fond de la page = noir profond : le `html, body` du site est marron
  // (#1a0e0a) et cette teinte réapparaissait en bas d'écran (barre de
  // navigation mobile, rebond élastique de la WebView) — bande « marron »
  // signalée sous la modale de chargement. Peinture globale assumée par la
  // page Yi Jing du Jour, restaurée à la sortie.
  useEffect(() => {
    const prevBody = document.body.style.background;
    const prevHtml = document.documentElement.style.background;
    document.body.style.background = L.noir;
    document.documentElement.style.background = L.noir;
    return () => {
      document.body.style.background = prevBody;
      document.documentElement.style.background = prevHtml;
    };
  }, []);

  useEffect(() => {
    if (!loaded || !email || startedRef.current) return;
    startedRef.current = true;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, loaded]);

  // Consentement : briser le sceau → débit 1 base + génération IA (une seule fois).
  const draw = () => {
    setDrawing(true);
    setError(null);
    api('/api/yi-jing-du-jour', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, lang }),
    })
      .then(async (r) => {
        const j = (await r.json()) as ApiResponse & { gated?: boolean };
        if (r.status === 402 && j.reason) {
          // Quota (base mensuelle / pack / crédits) : modale d'offres dédiée.
          setDrawing(false);
          openGate(j.reason as Parameters<typeof openGate>[0]);
          return;
        }
        if (!r.ok) throw new Error(j.error || 'Le ciel est voilé');
        if (j.alreadyDrawn) { load(); return; } // un autre onglet a tiré entre-temps
        setData((prev) => ({ ...prev, ...j, alreadyDrawn: true } as ApiResponse));
        setDrawing(false);
      })
      .catch((e: Error) => {
        setDrawing(false);
        setError(e.message);
      });
  };

  const dateLabel = useMemo(() => {
    const d = data?.date ? new Date(`${data.date}T12:00:00`) : new Date();
    return new Intl.DateTimeFormat(({ fr: 'fr-FR', en: 'en-GB', es: 'es-ES', hi: 'hi-IN' } as Record<string, string>)[lang] ?? 'fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }).format(d);
  }, [data?.date, lang]);

  const hex = data?.hexagram;
  const mutating = data?.mutating ?? [];
  const displayName = hex ? hexVariant(lang, hex.nameEn, hex.nameEs, hex.nameHi, hex.name) : '';
  // Conseil : IA du jour (personnelle) en priorité ; repli = conseil socle.
  const displayAdvice = hex
    ? (data?.personalAdvice || hexVariant(lang, hex.syntheseEn, hex.syntheseEs, hex.syntheseHi, hex.conseil))
    : '';
  const displaySynth = hex ? hexVariant(lang, hex.syntheseEn, hex.syntheseEs, hex.syntheseHi, hex.synthese) : '';

  return (
    <div className="relative min-h-dvh overflow-hidden" style={{ background: L.noir }}>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-28 pt-9">
        {/* En-tête (pas d'eyebrow : « Oracle du jour » est redondant avec le titre) */}
        <div className="text-center">
          <h1 className="font-[family-name:var(--font-cinzel-deco)] text-2xl" style={{ color: L.or }}>{t('title')}</h1>
          <p className="mt-1 text-sm italic" style={{ color: `${L.ivoire}99` }}>{dateLabel}</p>
        </div>

        {/* Corps */}
        <div className="mt-1 flex-1">
          {loading && <SkyLoader lang={lang} />}

          {!loading && error && !data && (
            <div className="mt-16 rounded-2xl p-6 text-center" style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${L.or}33` }}>
              <p className="font-[family-name:var(--font-cinzel-deco)] text-lg" style={{ color: L.or }}>{t('errorTitle')}</p>
              <p className="mt-2 text-sm" style={{ color: `${L.ivoire}aa` }}>{error}</p>
              <button type="button" onClick={load} className="mystic-btn mt-5 rounded-full px-6 py-2 text-sm" style={{ background: `linear-gradient(160deg, ${L.rouge}, ${L.rougeDeep})`, color: L.or, border: `1px solid ${L.or}66` }}>
                {t('retry')}
              </button>
            </div>
          )}

          {/* Volet consentement : jamais tiré aujourd'hui → sceau + explications */}
          {!loading && !data?.alreadyDrawn && (
            <div className="flex flex-col items-center gap-4 pt-1">
              <SealedCard ref={sealRef} onOpen={draw} onSealTap={() => setSealTapped(true)} busy={drawing} drawing={drawing} lang={lang} />
              {!drawing && (
                <motion.div
                  className="flex flex-col items-center gap-3"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: sealTapped ? 0 : 1 }}
                  transition={{ duration: 2, ease: 'easeOut' }}
                  style={{ pointerEvents: sealTapped ? 'none' : 'auto' }}
                >
                  {data?.dobKnown === false && (
                    <div className="flex items-center gap-2 rounded-xl px-3 py-1.5" style={{ background: 'rgba(0,0,0,0.35)', border: `1px dashed ${L.or}33` }}>
                      <p className="text-[11px]" style={{ color: `${L.ivoire}aa` }}>{t('dobHint')}</p>
                      <a href="/dashboard/account" className="text-[11px] font-semibold underline underline-offset-4" style={{ color: L.orSoft }}>{t('dobCta')}</a>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => { if (sealRef.current) sealRef.current.play(); else draw(); }}
                    className="yi-btn rounded-xl border border-[#f3c969]/40 px-7 py-2.5 text-[13.5px] tracking-[0.06em]"
                  >
                    {t('open')}
                  </button>
                </motion.div>
              )}
            </div>
          )}

          {/* Volet résultat : déjà tiré (hier→aujourd'hui relisible, sans re-débit) */}
          {!loading && data?.alreadyDrawn && hex && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="space-y-5">
              {error && (
                <p className="rounded-xl px-4 py-2 text-center text-[12px]" style={{ background: 'rgba(142,28,34,0.18)', color: `${L.ivoire}cc`, border: `1px dashed ${L.rouge}55` }}>
                  {error}
                </p>
              )}

              {/* Carte principale */}
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="relative overflow-hidden rounded-2xl p-5"
                style={{ background: `linear-gradient(165deg, ${L.panel} 0%, ${L.panelDeep} 100%)`, border: `1.5px solid ${L.or}4d`, boxShadow: `0 14px 44px rgba(0,0,0,0.55), 0 0 26px rgba(243,201,105,0.08)` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-nowrap text-[10px] tracking-[0.3em]" style={{ color: L.orDim }}>#{hex.numero} · {hex.pinyin}</p>
                    <h2 className={`mt-1 whitespace-nowrap font-[family-name:var(--font-cinzel-deco)] ${displayName.length > 26 ? 'text-base' : displayName.length > 18 ? 'text-lg' : 'text-xl'}`} style={{ color: L.or }}>{displayName}</h2>
                    <p className="mt-0.5 whitespace-nowrap text-xs italic" style={{ color: `${L.ivoire}88` }}>{hex.caractere} · {hex.name}</p>
                    {trigramPair(hex.lignes, lang) && (
                      <p className="mt-0.5 text-[10px] tracking-[0.08em]" style={{ color: `${L.or}66` }}>{trigramPair(hex.lignes, lang)}</p>
                    )}
                  </div>
                  <div className="shrink-0 pt-1">
                    <HexLines lignes={hex.lignes} mutating={mutating} />
                  </div>
                </div>

                {/* Conseil du jour (IA personnelle, ou socle si IA muette) */}
                <div className="mt-8 rounded-xl px-4 py-3.5" style={{ background: `linear-gradient(160deg, rgba(142,28,34,0.28), rgba(0,0,0,0.35))`, border: `1px solid ${L.rouge}55` }}>
                  <p className="text-[10px] tracking-[0.35em]" style={{ color: L.orDim }}>{t('advice').toUpperCase()}</p>
                  <p className="mt-1.5 text-[16px] leading-relaxed" style={{ color: L.ivoire }}>{displayAdvice}</p>
                  {data.adviceMissing && (
                    <p className="mt-2 text-[11px] italic" style={{ color: `${L.or}99` }}>{t('dobHint')}</p>
                  )}
                </div>

                {/* Stratégie + Attitude */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {([['strategy', hex.strategie], ['attitude', hex.attitude]] as const).map(([k, v]) => (
                    <div key={k} className="rounded-xl px-3.5 py-3" style={{ background: 'rgba(0,0,0,0.35)', border: `1px solid ${L.or}22` }}>
                      <p className="text-[9px] tracking-[0.3em]" style={{ color: L.orDim }}>{t(k).toUpperCase()}</p>
                      <p className="mt-1 text-[12.5px] leading-snug" style={{ color: `${L.ivoire}dd` }}>{v}</p>
                    </div>
                  ))}
                </div>

                {/* Synthèse (modale) */}
                <button type="button" onClick={() => setSynthOpen(true)} className="mt-4 w-full rounded-full py-2 text-[12px] underline-offset-4 hover:underline" style={{ color: L.orSoft, border: `1px solid ${L.or}33` }}>
                  {t('readMore')}
                </button>

                {/* Lignes mutantes + légende + transformé nommé */}
                <div className="mt-4 rounded-xl px-4 py-3" style={{ background: 'rgba(0,0,0,0.3)', border: `1px dashed ${L.or}33` }}>
                  {mutating.length === 0 ? (
                    <p className="text-[12px] italic" style={{ color: `${L.ivoire}88` }}>{t('mutatingNone')}</p>
                  ) : (
                    <>
                      <p className="text-[9px] tracking-[0.3em]" style={{ color: L.orDim }}>{t('mutating').toUpperCase()}</p>
                      <p className="mt-1 text-[12.5px]" style={{ color: L.ivoire }}>
                        {mutating.map((l) => (({ fr: T.lineNames.fr, en: T.lineNames.en, es: T.lineNames.es, hi: T.lineNames.hi } as unknown as Record<string, readonly string[]>)[lang] ?? T.lineNames.fr)[l]).join(', ')}
                      </p>
                      <p className="mt-2 text-[11.5px] leading-snug" style={{ color: `${L.ivoire}99` }}>{t('mutatingLegend')}</p>
                      {data.transformed && (
                        <div className="mt-3 flex items-center gap-3 border-t pt-3" style={{ borderColor: `${L.or}22` }}>
                          <span className="text-[11px] italic" style={{ color: `${L.ivoire}99` }}>{t('transformsInto')}</span>
                          <span className="text-2xl" style={{ color: L.or }}>{data.transformed.caractere}</span>
                          <span className="min-w-0 text-[11.5px] leading-snug" style={{ color: `${L.ivoire}cc` }}>
                            #{data.transformed.numero} {hexVariant(lang, data.transformed.nameEn, data.transformed.nameEs, data.transformed.nameHi, data.transformed.name)}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>

              {/* Aujourd'hui (résultat) + Demain (teaser scellé) — pas de Hier */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl px-2 py-3 text-center" style={{ background: `linear-gradient(160deg, rgba(142,28,34,0.3), rgba(0,0,0,0.4))`, border: `1px solid ${L.or}66` }}>
                  <p className="text-[9px] tracking-[0.25em]" style={{ color: L.orDim }}>{t('today').toUpperCase()}</p>
                  <p className="mt-1 text-[26px] leading-none" style={{ color: L.or }}>{hex.caractere}</p>
                  <p className="mt-1 text-[9.5px] italic" style={{ color: `${L.ivoire}77` }}>#{hex.numero} {hex.pinyin}</p>
                </div>
                {data.tomorrow && (
                  <div className="rounded-xl px-2 py-3 text-center" style={{ background: 'rgba(0,0,0,0.32)', border: `1px solid ${L.or}22` }}>
                    <p className="text-[9px] tracking-[0.25em]" style={{ color: L.orDim }}>{t('tomorrow').toUpperCase()}</p>
                    <p className="mt-1 text-[26px] leading-none" style={{ color: `${L.ivoire}66`, filter: 'blur(0.2px)' }}>{data.tomorrow.caractere}</p>
                    <p className="mt-1 text-[9.5px] italic" style={{ color: `${L.ivoire}55` }}>#{data.tomorrow.numero} ? ? ?</p>
                    <p className="mt-0.5 text-[8.5px] italic" style={{ color: `${L.or}66` }}>{t('tomorrowHint')}</p>
                  </div>
                )}
              </div>

              {/* Collection + streak */}
              {data.collection && (
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ background: 'rgba(0,0,0,0.32)', border: `1px solid ${L.or}22` }}
                >
                  <div>
                    <p className="text-[9px] tracking-[0.3em]" style={{ color: L.orDim }}>{t('collection').toUpperCase()}</p>
                    <p className="mt-1 text-[13px]" style={{ color: L.ivoire }}>
                      <span style={{ color: L.or }}>{data.collection.viewed}</span> / {data.collection.total} {t('viewed')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] tracking-[0.3em]" style={{ color: L.orDim }}>{t('streakOn').toUpperCase()}</p>
                    <p className="mt-1 text-[13px]" style={{ color: L.ivoire }}>
                      <span style={{ color: L.or }}>{data.collection.streak}</span> {t('streak')}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-3 pt-1">
                <button
                  type="button"
                  disabled={sharing}
                  onClick={() => {
                    setSharing(true);
                    exportCardPng(data, lang, dateLabel)
                      .catch(() => undefined)
                      .finally(() => setSharing(false));
                  }}
                  className="flex items-center justify-center gap-2 rounded-full py-2.5 text-center text-[13px] disabled:opacity-60"
                  style={{ background: 'rgba(0,0,0,0.35)', color: L.orSoft, border: `1px solid ${L.or}44` }}
                >
                  {sharing ? t('shareBusy') : t('share')}
                  <ShareIcon size={14} style={{ color: L.orSoft }} />
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Modale synthèse */}
      <AnimatePresence>
        {synthOpen && hex && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.72)' }}
            onClick={() => setSynthOpen(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl p-5"
              style={{ background: `linear-gradient(165deg, ${L.panel}, ${L.panelDeep})`, border: `1.5px solid ${L.or}55`, boxShadow: `0 20px 60px rgba(0,0,0,0.7)` }}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-[family-name:var(--font-cinzel-deco)] text-lg" style={{ color: L.or }}>{t('synthesis')}</h3>
                <span className="text-2xl" style={{ color: `${L.or}cc` }}>{hex.caractere}</span>
              </div>
              <p className="mt-3 max-h-[55dvh] overflow-y-auto whitespace-pre-line text-[13.5px] leading-relaxed" style={{ color: `${L.ivoire}dd` }}>
                {displaySynth}
              </p>
              <button type="button" onClick={() => setSynthOpen(false)} className="mt-4 w-full rounded-full py-2 text-[13px]" style={{ background: `linear-gradient(160deg, ${L.rouge}, ${L.rougeDeep})`, color: L.or, border: `1px solid ${L.or}55` }}>
                {t('close')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <YiSlideNav />
      <EntitlementGateModal reason={gateReason} onClose={closeGate} />
    </div>
  );
}

export default function GatedPage() {
  return <AuthGate><YiJingDuJourPage /></AuthGate>;
}
