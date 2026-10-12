'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang, pick4, pickContent, type Lang } from '@/lib/i18n';
import YiSlideNav from '@/components/yi-slide-nav';
import AuthGate from '@/components/auth-gate';
import { useEntitlement, EntitlementGateModal } from '@/lib/use-entitlement';
import WaitPoolLine from '@/components/wait-pool-line';
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
  breaking: { fr: 'Le sceau se brise…', en: 'The seal breaks…', es: 'El sello se rompe…', hi: 'मुहर टूटती है…' },
  // Encadré « comment ça marche » — le user comprend avant de consentir.
  howTitle: { fr: 'Comment fonctionne ce tirage', en: 'How this draw works', es: 'Cómo funciona esta tirada', hi: 'यह विन्यास कैसे काम करता है' },
  how1: { fr: 'Chaque jour, un hexagramme est tiré pour votre compte seul — personne d\u2019autre ne reçoit le même.', en: 'Each day, a hexagram is drawn for your account alone — no one else receives the same one.', es: 'Cada día se tira un hexagrama solo para su cuenta; nadie más recibe el mismo.', hi: 'हर दिन आपके खाते के लिए अकेले एक हैक्सग्राम खिंचता है — किसी और को वही नहीं मिलता।' },
  how2: { fr: 'L\u2019Oracle en tire un conseil de quelques phrases, ajusté à votre énergie du moment et aux tendances de votre profil.', en: 'The Oracle draws from it a few-sentence guidance, tuned to your energy of the moment and your profile\u2019s tendencies.', es: 'El oráculo extrae una guía de pocas frases, ajustada a su energía del momento y a las tendencias de su perfil.', hi: 'देववाणी उससे कुछ वाक्यों का मार्गदर्शन निकालती है — आपके क्षण की ऊर्जा और प्रोफ़ाइल की प्रवृत्तियों के अनुकूल।' },
  how3: { fr: 'Cette consultation utilise un tirage de base. Le résultat reste consultable toute la journée — et dans votre historique — sans rien relancer.', en: 'This consultation uses one base draw. The result stays readable all day — and in your history — without relaunching anything.', es: 'Esta consulta usa una tirada base. El resultado queda legible todo el día —y en su historial— sin volver a lanzar nada.', hi: 'यह परामर्श एक आधार-पात लेता है। परिणाम सारा दिन — और आपके इतिहास में — बिना पुनःआरंभ पढ़ा जा सकता है।' },
  how4: { fr: 'Une fois brisé, le sceau ne se repose pas : le même conseil vous attend jusqu\u2019au lendemain.', en: 'Once broken, the seal is not re-set: the same guidance waits for you until tomorrow.', es: 'Una vez roto, el sello no vuelve a ponerse: la misma guía le espera hasta mañana.', hi: 'टूटने के बाद मुहर दोबारा नहीं लगती: वही मार्गदर्शन कल तक आपकी प्रतीक्षा करता है।' },
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
              <div className="w-full rounded-full" style={{ height: 9 * size, background: `linear-gradient(180deg, ${L.or}, #b8862f)`, boxShadow: mut ? `0 0 12px ${L.rougeGlow}` : 'none' }} />
            ) : (
              <div className="flex w-full justify-between" style={{ height: 9 * size }}>
                <div className="rounded-full" style={{ width: '42%', background: `linear-gradient(180deg, ${L.or}, #b8862f)` }} />
                <div className="rounded-full" style={{ width: '42%', background: `linear-gradient(180deg, ${L.or}, #b8862f)` }} />
              </div>
            )}
            {mut && (
              <span className="absolute rounded-full" style={{ right: -18 * size, top: '50%', transform: 'translateY(-50%)', width: 9 * size, height: 9 * size, border: `1.5px solid ${L.rouge}`, background: L.noir, boxShadow: `0 0 8px ${L.rougeGlow}` }} />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Sceau (carte scellée à briser pour CONSENTIR au tirage) ───────────────
const TRIGRAMMES = [
  [1, 1, 1], [0, 1, 1], [1, 0, 1], [0, 0, 1],
  [1, 1, 0], [0, 1, 0], [1, 0, 0], [0, 0, 0],
];
const CRACKS = [
  'M130 150 L117 126 L124 102 L111 78',
  'M130 150 L151 133 L174 122 L196 104',
  'M130 150 L139 177 L127 201 L138 226',
  'M130 150 L103 158 L80 151 L56 160',
  'M130 150 L153 167 L177 176 L201 194',
];

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

function SealDisc() {
  return (
    <g>
      <circle cx={130} cy={150} r={56} fill="url(#sealLac)" stroke={L.or} strokeOpacity={0.85} strokeWidth={2.5} />
      <circle cx={130} cy={150} r={48} fill="none" stroke={L.or} strokeOpacity={0.45} strokeWidth={1} />
      <text x={130} y={151} textAnchor="middle" dominantBaseline="central" fontSize={54} fill={L.or} style={{ fontFamily: "'Hoshiko Satsuki', serif", textShadow: '0 2px 6px rgba(0,0,0,0.6)' }}>日</text>
    </g>
  );
}

function SealedCard({ onOpen, busy, lang }: { onOpen: () => void; busy: boolean; lang: Lang }) {
  const [breaking, setBreaking] = useState(false);
  const fire = () => {
    if (breaking || busy) return;
    setBreaking(true);
    setTimeout(onOpen, 950);
  };
  return (
    <motion.button
      type="button"
      onClick={fire}
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
      <div className="absolute inset-3 rounded-xl" style={{ border: `1px solid ${L.or}33` }} />
      <svg viewBox="0 0 260 300" className="relative mt-4" width={260} height={300} aria-hidden>
        <defs>
          <radialGradient id="sealLac" cx="38%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#c22f36" />
            <stop offset="70%" stopColor={L.rougeDeep} />
            <stop offset="100%" stopColor="#3a070c" />
          </radialGradient>
          <clipPath id="sealTop"><rect x="0" y="0" width="260" height="150" /></clipPath>
          <clipPath id="sealBot"><rect x="0" y="150" width="260" height="150" /></clipPath>
        </defs>

        {/* couronne des 8 trigrammes */}
        <motion.g
          animate={breaking ? { opacity: 0 } : { rotate: [0, 2, -2, 0] }}
          transition={breaking ? { duration: 0.3 } : { repeat: Infinity, duration: 9, ease: 'easeInOut' }}
          style={{ originX: '130px', originY: '150px' }}
        >
          {TRIGRAMMES.map((tri, i) => {
            const a = ((i * 45 - 90) * Math.PI) / 180;
            const x = 130 + 82 * Math.cos(a);
            const y = 150 + 82 * Math.sin(a);
            return (
              <g key={i} transform={`translate(${x} ${y}) rotate(${i * 45})`}>
                {tri.map((solid, j) => {
                  const dy = (j - 1) * 6.5;
                  return solid ? (
                    <rect key={j} x={-9} y={dy - 1.4} width={18} height={2.8} rx={1.2} fill={L.or} opacity={0.8} />
                  ) : (
                    <g key={j}>
                      <rect x={-9} y={dy - 1.4} width={7.2} height={2.8} rx={1.2} fill={L.or} opacity={0.8} />
                      <rect x={1.8} y={dy - 1.4} width={7.2} height={2.8} rx={1.2} fill={L.or} opacity={0.8} />
                    </g>
                  );
                })}
              </g>
            );
          })}
        </motion.g>

        <motion.circle
          cx={130} cy={150} r={56} fill="none" stroke={L.or} strokeWidth={2}
          initial={{ opacity: 0 }}
          animate={breaking ? { r: [56, 120], opacity: [0.9, 0] } : {}}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />

        <motion.g clipPath="url(#sealTop)"
          animate={breaking ? { x: -30, y: -38, rotate: -16, opacity: 0 } : {}}
          transition={{ duration: 0.75, ease: 'easeIn', delay: 0.25 }}
          style={{ originX: '130px', originY: '150px' }}
        >
          <SealDisc />
        </motion.g>
        <motion.g clipPath="url(#sealBot)"
          animate={breaking ? { x: 26, y: 44, rotate: 12, opacity: 0 } : {}}
          transition={{ duration: 0.75, ease: 'easeIn', delay: 0.25 }}
          style={{ originX: '130px', originY: '150px' }}
        >
          <SealDisc />
        </motion.g>

        {CRACKS.map((d, i) => (
          <motion.path key={i} d={d} fill="none" stroke="#ffe9b0" strokeWidth={1.4} strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={breaking ? { pathLength: 1, opacity: [0, 1, 0.85, 0] } : {}}
            transition={{ duration: 0.55, delay: i * 0.05, times: [0, 0.2, 0.6, 1] }}
          />
        ))}

        {[...Array(8)].map((_, i) => {
          const a = ((i * 45 + 22) * Math.PI) / 180;
          return (
            <motion.rect key={i} x={128} y={148} width={4.5} height={4.5} rx={1} fill={L.or}
              initial={{ opacity: 0 }}
              animate={breaking ? { x: Math.cos(a) * 95, y: Math.sin(a) * 95, opacity: [0, 1, 0], rotate: 140 } : {}}
              transition={{ duration: 0.85, delay: 0.2 }}
            />
          );
        })}
      </svg>
      <div className="relative -mt-2 flex flex-col items-center gap-5">
        <span className="font-[family-name:var(--font-cinzel-deco)] text-[11px] tracking-[0.4em]" style={{ color: `${L.or}99` }}>
          易經
        </span>
        <span className="font-[family-name:var(--font-cinzel-deco)] text-[13px] tracking-[0.25em]" style={{ color: L.orSoft }}>
          {breaking ? pick4('Le sceau se brise…', 'The seal breaks…', 'El sello se rompe…', 'मुहर टूटती है…')(lang) : pickContent(T.sealed, lang)}
        </span>
      </div>
      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={breaking ? { opacity: 0 } : { x: ['-120%', '120%'] }}
        transition={breaking ? { duration: 0.2 } : { repeat: Infinity, duration: 3.4, repeatDelay: 1.6, ease: 'easeInOut' }}
        style={{ background: 'linear-gradient(105deg, transparent 42%, rgba(243,201,105,0.16) 50%, transparent 58%)' }}
      />
    </motion.button>
  );
}

// ─── Encadré « comment ça marche » + bouton de consentement ────────────────
function HowItWorks({ lang, dobKnown }: { lang: Lang; dobKnown: boolean }) {
  const t = (k: keyof typeof T) => pickContent(T[k] as { fr: string }, lang);
  const rows = ['how1', 'how2', 'how3', 'how4'] as const;
  return (
    <div className="mx-auto w-full rounded-2xl px-4 py-3.5" style={{ background: 'rgba(0,0,0,0.42)', border: `1px solid ${L.or}2e`, maxWidth: '26rem' }}>
      <p className="text-[10px] tracking-[0.35em]" style={{ color: L.orDim }}>{t('howTitle').toUpperCase()}</p>
      <ul className="mt-2 space-y-2">
        {rows.map((k) => (
          <li key={k} className="flex gap-2 text-[12.5px] leading-snug" style={{ color: `${L.ivoire}dd` }}>
            <span className="mt-0.5 shrink-0 text-[10px]" style={{ color: L.or }}>◆</span>
            <span>{t(k)}</span>
          </li>
        ))}
      </ul>
      {!dobKnown && (
        <div className="mt-3 rounded-xl px-3 py-2.5" style={{ background: `rgba(142,28,34,0.16)`, border: `1px dashed ${L.rouge}66` }}>
          <p className="text-[11.5px] leading-snug" style={{ color: `${L.ivoire}cc` }}>{t('dobHint')}</p>
          <a href="/dashboard/account" className="mt-1.5 inline-block text-[11px] font-semibold underline underline-offset-4" style={{ color: L.orSoft }}>
            {t('dobCta')}
          </a>
        </div>
      )}
    </div>
  );
}

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
  const H = 1350;
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
  const bottomLimit = data.transformed ? 1060 : 1200;
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

  // ── Hexagramme transformé (si mutantes) : juste sous le panneau ──
  let curY = panel.top + panelH + 44;
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
  const [error, setError] = useState<string | null>(null);
  const [synthOpen, setSynthOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const startedRef = useRef(false);

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
    <div className="relative min-h-dvh overflow-hidden" style={{ background: `radial-gradient(120% 80% at 50% 0%, ${L.panel} 0%, ${L.panelDeep} 55%, ${L.noir} 100%)` }}>
      <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(60% 35% at 50% 8%, ${L.rougeGlow} 0%, transparent 70%)`, opacity: 0.5 }} />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-28 pt-6">
        {/* En-tête (pas d'eyebrow : « Oracle du jour » est redondant avec le titre) */}
        <div className="text-center">
          <h1 className="font-[family-name:var(--font-cinzel-deco)] text-2xl" style={{ color: L.or }}>{t('title')}</h1>
          <p className="mt-1 text-sm italic" style={{ color: `${L.ivoire}99` }}>{dateLabel}</p>
        </div>

        {/* Corps */}
        <div className="mt-6 flex-1">
          {loading && (
            <div className="flex flex-col items-center gap-4 pt-24">
              <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3, ease: 'linear' }} className="text-4xl" style={{ color: L.or }}>☯</motion.span>
              <p className="text-sm italic" style={{ color: `${L.ivoire}88` }}>{t('loading')}</p>
            </div>
          )}

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
            <div className="flex flex-col items-center gap-5 pt-6">
              <HowItWorks lang={lang} dobKnown={data?.dobKnown !== false} />
              <SealedCard onOpen={draw} busy={drawing} lang={lang} />
              {drawing && (
                <div className="flex w-full flex-col items-center gap-2">
                  <WaitPoolLine
                    universe="yijing"
                    className="text-center text-[12px] italic leading-snug"
                    style={{ color: `${L.ivoire}aa` }}
                  />
                </div>
              )}
              {!drawing && (
                <button
                  type="button"
                  onClick={draw}
                  className="mystic-btn rounded-full px-7 py-2.5 text-[13px]"
                  style={{ background: `linear-gradient(160deg, ${L.rouge}, ${L.rougeDeep})`, color: L.or, border: `1px solid ${L.or}66` }}
                >
                  {t('open')}
                </button>
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
                  <div className="min-w-0">
                    <p className="text-[10px] tracking-[0.3em]" style={{ color: L.orDim }}>#{hex.numero} · {hex.pinyin}</p>
                    <h2 className="mt-1 truncate font-[family-name:var(--font-cinzel-deco)] text-xl" style={{ color: L.or }}>{displayName}</h2>
                    <p className="mt-0.5 text-xs italic" style={{ color: `${L.ivoire}88` }}>{hex.caractere} · {hex.name}</p>
                    {trigramPair(hex.lignes, lang) && (
                      <p className="mt-0.5 text-[10px] tracking-[0.08em]" style={{ color: `${L.or}66` }}>{trigramPair(hex.lignes, lang)}</p>
                    )}
                  </div>
                  <div className="shrink-0 pt-1" style={{ marginRight: '0.75rem' }}>
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
