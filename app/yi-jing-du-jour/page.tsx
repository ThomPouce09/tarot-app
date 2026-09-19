'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang, contentLang } from '@/lib/i18n';
import YiSlideNav from '@/components/yi-slide-nav';
import AuthGate from '@/components/auth-gate';
import { useEntitlement, EntitlementGateModal } from '@/lib/use-entitlement';

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
  element: string;
  strategie: string;
  attitude: string;
  conseil: string;
  synthese: string;
  lignes: boolean[]; // base → sommet
  nameEn: string | null;
  syntheseEn: string | null;
};

type ApiResponse = {
  found: boolean;
  date: string;
  personal: boolean;
  personalAge: number | null;
  personalAdvice: string | null;
  code?: string;
  hexagram: HexShape;
  mutating: number[];
  transformed: HexShape | null;
  yesterday: { numero: number; caractere: string; pinyin: string } | null;
  tomorrow: { numero: number; caractere: string; pinyin: string } | null;
  collection: { viewed: number; streak: number; total: number } | null;
  viewedToday: boolean;
  error?: string;
};

// ─── Dictionnaire FR / EN ───────────────────────────────────────────────────
const T = {
  eyebrow: { fr: 'LE YI JING · ORACLE DU JOUR', en: 'THE I CHING · ORACLE OF THE DAY' },
  title: { fr: 'Hexagramme du jour', en: "Today's Hexagram" },
  sealed: { fr: 'Un sceau vous attend', en: 'A seal awaits you' },
  sealedHint: { fr: 'Touchez pour briser le sceau du jour', en: 'Tap to break today’s seal' },
  open: { fr: 'Briser le sceau', en: 'Break the seal' },
  personalBadge: { fr: 'Tirage personnel', en: 'Personal draw' },
  collectiveBadge: { fr: 'Tirage du jour', en: "Collective draw" },
  switchPersonal: { fr: 'Lecture personnelle', en: 'Personal reading' },
  switchCollective: { fr: 'Tirage du jour', en: "Today's draw" },
  personalInitiated: { fr: 'Initiés & Arkanes', en: 'Initiates & Arkane' },
  dobHint: { fr: 'Sans date de naissance dans votre profil, la lecture personnelle reprend le conseil du jour. Elle devient plus fine une fois votre date renseignée.', en: 'Without a birth date in your profile, the personal reading repeats today\u2019s guidance. It becomes sharper once your date is set.' },
  advice: { fr: 'Conseil du jour', en: "Today's guidance" },
  strategy: { fr: 'Stratégie', en: 'Strategy' },
  attitude: { fr: 'Attitude', en: 'Attitude' },
  synthesis: { fr: 'Synthèse', en: 'Synthesis' },
  readMore: { fr: 'Lire la synthèse', en: 'Read the synthesis' },
  close: { fr: 'Fermer', en: 'Close' },
  mutating: { fr: 'Lignes mutantes', en: 'Changing lines' },
  mutatingNone: { fr: 'Journée stable — aucune ligne ne bouge.', en: 'A stable day — no line is moving.' },
  transformsInto: { fr: 'se transforme en', en: 'transforms into' },
  yesterday: { fr: 'Hier', en: 'Yesterday' },
  today: { fr: "Aujourd'hui", en: 'Today' },
  tomorrow: { fr: 'Demain', en: 'Tomorrow' },
  tomorrowHint: { fr: 'déjà levé sous la lune', en: 'already rising under the moon' },
  collection: { fr: 'Collection', en: 'Collection' },
  viewed: { fr: 'hexagrammes rencontrés', en: 'hexagrams met' },
  streak: { fr: 'jours consécutifs', en: 'consecutive days' },
  streakOn: { fr: 'Série en cours', en: 'Current streak' },
  share: { fr: 'Partager ma carte du jour', en: 'Share my card' },
  shareBusy: { fr: 'Gravure de la carte…', en: 'Engraving the card…' },
  consultAgain: { fr: 'Le sceau se brise à nouveau pour la contemplation.', en: 'The seal breaks again, for contemplation.' },
  loading: { fr: 'Lecture du ciel…', en: 'Reading the heavens…' },
  errorTitle: { fr: 'Le ciel est voilé', en: 'The sky is veiled' },
  retry: { fr: 'Réessayer', en: 'Retry' },
  lineNames: { fr: ['', 'ligne initiale', '2ᵉ ligne', '3ᵉ ligne', '4ᵉ ligne', '5ᵉ ligne', 'ligne du haut'], en: ['', 'bottom line', '2nd line', '3rd line', '4th line', '5th line', 'top line'] },
} as const;

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

// ─── Sceau (carte scellée à briser avant ouverture) ────────────────────────
// Les 8 trigrammes du ciel antérieur (1 = trait plein, 0 = trait cassé)
const TRIGRAMMES = [
  [1, 1, 1], [0, 1, 1], [1, 0, 1], [0, 0, 1],
  [1, 1, 0], [0, 1, 0], [1, 0, 0], [0, 0, 0],
];
// Fissures qui irradient depuis le sceau au moment du bris
const CRACKS = [
  'M130 150 L117 126 L124 102 L111 78',
  'M130 150 L151 133 L174 122 L196 104',
  'M130 150 L139 177 L127 201 L138 226',
  'M130 150 L103 158 L80 151 L56 160',
  'M130 150 L153 167 L177 176 L201 194',
];

function SealDisc() {
  return (
    <g>
      <circle cx={130} cy={150} r={56} fill="url(#sealLac)" stroke={L.or} strokeOpacity={0.85} strokeWidth={2.5} />
      <circle cx={130} cy={150} r={48} fill="none" stroke={L.or} strokeOpacity={0.45} strokeWidth={1} />
      <text x={130} y={151} textAnchor="middle" dominantBaseline="central" fontSize={54} fill={L.or} style={{ fontFamily: "'Hoshiko Satsuki', serif", textShadow: '0 2px 6px rgba(0,0,0,0.6)' }}>日</text>
    </g>
  );
}

function SealedCard({ onOpen, lang }: { onOpen: () => void; lang: 'fr' | 'en' }) {
  const [breaking, setBreaking] = useState(false);
  const fire = () => {
    if (breaking) return;
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
      aria-label={T.open[contentLang(lang)]}
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

        {/* halo doré à l'instant du bris */}
        <motion.circle
          cx={130} cy={150} r={56} fill="none" stroke={L.or} strokeWidth={2}
          initial={{ opacity: 0 }}
          animate={breaking ? { r: [56, 120], opacity: [0.9, 0] } : {}}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />

        {/* sceau : deux moitiés qui se disloquent */}
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

        {/* fissures */}
        {CRACKS.map((d, i) => (
          <motion.path key={i} d={d} fill="none" stroke="#ffe9b0" strokeWidth={1.4} strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={breaking ? { pathLength: 1, opacity: [0, 1, 0.85, 0] } : {}}
            transition={{ duration: 0.55, delay: i * 0.05, times: [0, 0.2, 0.6, 1] }}
          />
        ))}

        {/* éclats d'or */}
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
          {breaking ? (lang === 'fr' ? 'Le sceau se brise…' : 'The seal breaks…') : T.sealed[contentLang(lang)]}
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

// ─── Export PNG de la carte du jour ────────────────────────────────────────
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

async function exportCardPng(data: ApiResponse, lang: 'fr' | 'en', dateLabel: string): Promise<string> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas indisponible');

  // fond laque
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#140a0e');
  bg.addColorStop(0.6, '#0d0609');
  bg.addColorStop(1, '#0a0507');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // liseré or
  ctx.strokeStyle = 'rgba(243,201,105,0.5)';
  ctx.lineWidth = 3;
  ctx.strokeRect(36, 36, W - 72, H - 72);
  ctx.strokeStyle = 'rgba(243,201,105,0.18)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(52, 52, W - 104, H - 104);

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(243,201,105,0.75)';
  ctx.font = '34px serif';
  ctx.fillText(T.eyebrow[contentLang(lang)].replace('·', '·'), W / 2, 150);
  ctx.fillStyle = '#f5ead6';
  ctx.font = 'italic 40px Georgia, serif';
  ctx.fillText(dateLabel, W / 2, 215);

  // hexagramme (lignes) centré
  const lignes = data.hexagram.lignes;
  const mutating = data.mutating;
  const lineW = 340;
  const lineH = 30;
  const gap = 26;
  const totalH = 6 * lineH + 5 * gap;
  let y = 300;
  for (let i = 5; i >= 0; i--) {
    const yang = lignes[i];
    const yy = y + (5 - i) * (lineH + gap);
    ctx.fillStyle = '#f3c969';
    if (yang) {
      ctx.fillRect(W / 2 - lineW / 2, yy, lineW, lineH);
    } else {
      ctx.fillRect(W / 2 - lineW / 2, yy, lineW * 0.44, lineH);
      ctx.fillRect(W / 2 + lineW / 2 - lineW * 0.44, yy, lineW * 0.44, lineH);
    }
    if (mutating.includes(i + 1)) {
      ctx.strokeStyle = '#8e1c22';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(W / 2 + lineW / 2 + 46, yy + lineH / 2, 13, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  void totalH;

  // caractère + nom
  ctx.fillStyle = '#f3c969';
  ctx.font = '170px serif';
  ctx.fillText(data.hexagram.caractere, W / 2, y + totalH + 230);
  const name = lang === 'en' && data.hexagram.nameEn ? data.hexagram.nameEn : data.hexagram.element;
  ctx.font = '52px Georgia, serif';
  ctx.fillStyle = '#f5ead6';
  ctx.fillText(`#${data.hexagram.numero} — ${name}`, W / 2, y + totalH + 315);
  ctx.font = 'italic 34px Georgia, serif';
  ctx.fillStyle = 'rgba(243,201,105,0.8)';
  ctx.fillText(data.hexagram.pinyin, W / 2, y + totalH + 365);

  // conseil
  const advice = lang === 'en' && data.hexagram.syntheseEn ? data.hexagram.syntheseEn : data.hexagram.conseil;
  ctx.font = '36px Georgia, serif';
  ctx.fillStyle = '#f5ead6';
  const lines = wrapText(ctx, advice, W - 260).slice(0, 6);
  lines.forEach((ln, i) => ctx.fillText(ln, W / 2, y + totalH + 450 + i * 50));

  // pied
  ctx.font = '28px serif';
  ctx.fillStyle = 'rgba(243,201,105,0.55)';
  ctx.fillText(data.personal ? T.personalBadge[contentLang(lang)] : T.collectiveBadge[contentLang(lang)], W / 2, H - 90);

  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) throw new Error('toBlob');
  const url = URL.createObjectURL(blob);
  const fname = `hexagramme-${data.date}.png`;
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare && nav.canShare({ files: [new File([blob], fname, { type: 'image/png' })] })) {
    try {
      await nav.share({ files: [new File([blob], fname, { type: 'image/png' })], title: T.title[contentLang(lang)] });
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
  const t = (k: keyof typeof T) => T[k][contentLang(lang)] as string;
  const { email, sub, loaded, openGate, gateReason, closeGate } = useEntitlement();

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Le tirage du jour est la vue par défaut ; la lecture personnelle (Initiés
  // & Arkanes) est une option explicite.
  const [mode, setMode] = useState<'personal' | 'collective'>('collective');
  const [opened, setOpened] = useState(false);
  const [synthOpen, setSynthOpen] = useState(false);
  const [sharing, setSharing] = useState(false);

  const canPersonal = sub?.level === 'initie' || sub?.level === 'arkane';

  // Le sceau n'est brisé qu'une fois par visite : changer de mode ne le
  // re-scelle pas, la lecture personnelle suit immédiatement.
  const seenSeal = useRef(false);

  const load = () => {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams();
    if (mode === 'personal' && email) {
      qs.set('email', email);
      qs.set('personal', '1');
    }
    fetch(`/api/yi-jing-du-jour?${qs.toString()}`)
      .then(async (r) => {
        const j = (await r.json()) as ApiResponse;
        // Accès personnel refusé (abonnement expiré entre-temps) → retour au
        // tirage du jour + modale d'offres.
        if (r.status === 402) {
          setMode('collective');
          openGate('personal-only');
          throw new Error('upgrade');
        }
        if (!j.found) throw new Error(j.error || 'API indisponible');
        setData(j);
        // le sceau reste brisé si on change de mode après l'avoir déjà ouvert
        if (seenSeal.current) setOpened(true); else setOpened(false);
        // un compte qui ouvre la page valide sa vue du jour (collection/streak)
        if (email) {
          fetch('/api/yi-jing-du-jour', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, numero: j.hexagram.numero, date: j.date }),
          }).catch(() => undefined);
        }
      })
      .catch((e: Error) => {
        if (e.message === 'upgrade') return; // 402 → retour collectif déjà déclenché, pas de bannière
        setError(e.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!loaded) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, loaded]);

  const dateLabel = useMemo(() => {
    const d = data?.date ? new Date(`${data.date}T12:00:00`) : new Date();
    return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }).format(d);
  }, [data?.date, lang]);

  const hex = data?.hexagram;
  const displayName = hex ? (lang === 'en' && hex.nameEn ? hex.nameEn : hex.element) : '';
  // En lecture personnelle, l'IA a réécrit le conseil du jour selon l'âge ;
  // sans date de naissance (ou IA muette), on garde le conseil standard.
  const displayAdvice = hex
    ? (data?.personal && data.personalAdvice)
      ? data.personalAdvice
      : (lang === 'en' && hex.syntheseEn ? hex.syntheseEn : hex.conseil)
    : '';
  const displaySynth = hex ? (lang === 'en' && hex.syntheseEn ? hex.syntheseEn : hex.synthese) : '';

  return (
    <div className="relative min-h-dvh overflow-hidden" style={{ background: `radial-gradient(120% 80% at 50% 0%, ${L.panel} 0%, ${L.panelDeep} 55%, ${L.noir} 100%)` }}>
      <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(60% 35% at 50% 8%, ${L.rougeGlow} 0%, transparent 70%)`, opacity: 0.5 }} />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-28 pt-6">
        {/* En-tête */}
        <div className="text-center">
          <p className="font-[family-name:var(--font-cinzel-deco)] text-[10px] tracking-[0.45em]" style={{ color: `${L.or}88` }}>{t('eyebrow')}</p>
          <h1 className="mt-1 font-[family-name:var(--font-cinzel-deco)] text-2xl" style={{ color: L.or }}>{t('title')}</h1>
          <p className="mt-1 text-sm italic" style={{ color: `${L.ivoire}99` }}>{dateLabel}</p>
        </div>

        {/* Bascule : le tirage du jour est la vue par défaut, la lecture
            personnelle est réservée aux Initiés & Arkanes */}
        {email && data && (
          <div className="mt-4 flex justify-center">
            <div className="flex rounded-full p-1" style={{ background: 'rgba(0,0,0,0.45)', border: `1px solid ${L.or}33` }}>
              {(['collective', 'personal'] as const).map((m) => {
                const locked = m === 'personal' && !canPersonal;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { if (locked) openGate('personal-only'); else setMode(m); }}
                    title={locked ? t('personalInitiated') : undefined}
                    className="rounded-full px-4 py-1.5 text-[11px] font-medium transition-colors"
                    style={{
                      background: mode === m ? `linear-gradient(160deg, ${L.rouge}, ${L.rougeDeep})` : 'transparent',
                      color: mode === m ? L.or : `${L.ivoire}77`,
                      border: mode === m ? `1px solid ${L.or}66` : '1px solid transparent',
                    }}
                  >
                    {m === 'personal' ? `${t('personalBadge')}${locked ? ` · ${t('personalInitiated')}` : ''}` : t('collectiveBadge')}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Corps */}
        <div className="mt-6 flex-1">
          {loading && (
            <div className="flex flex-col items-center gap-4 pt-24">
              <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3, ease: 'linear' }} className="text-4xl" style={{ color: L.or }}>☯</motion.span>
              <p className="text-sm italic" style={{ color: `${L.ivoire}88` }}>{t('loading')}</p>
            </div>
          )}

          {!loading && error && (
            <div className="mt-16 rounded-2xl p-6 text-center" style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${L.or}33` }}>
              <p className="font-[family-name:var(--font-cinzel-deco)] text-lg" style={{ color: L.or }}>{t('errorTitle')}</p>
              <p className="mt-2 text-sm" style={{ color: `${L.ivoire}aa` }}>{error}</p>
              <button type="button" onClick={load} className="mystic-btn mt-5 rounded-full px-6 py-2 text-sm" style={{ background: `linear-gradient(160deg, ${L.rouge}, ${L.rougeDeep})`, color: L.or, border: `1px solid ${L.or}66` }}>
                {t('retry')}
              </button>
            </div>
          )}

          {!loading && !error && data && hex && !opened && (
            <div className="flex flex-col items-center gap-5 pt-8">
              <SealedCard onOpen={() => { seenSeal.current = true; setOpened(true); }} lang={contentLang(lang)} />
              <p className="text-center text-xs italic" style={{ color: `${L.ivoire}77` }}>{t('sealedHint')}</p>
              {data.viewedToday && (
                <p className="text-center text-[10px]" style={{ color: L.orDim }}>{t('consultAgain')}</p>
              )}
            </div>
          )}

          {!loading && !error && data && hex && opened && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="space-y-5">
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
                    <p className="mt-0.5 text-xs italic" style={{ color: `${L.ivoire}88` }}>{hex.caractere} · {lang === 'fr' ? 'élément' : 'element'} {hex.element}</p>
                  </div>
                  <div className="shrink-0 pt-1">
                    <HexLines lignes={hex.lignes} mutating={data.mutating} />
                  </div>
                </div>

                {/* Conseil du jour (réécrit par l'IA en lecture personnelle) */}
                <div className="mt-5 rounded-xl px-4 py-3.5" style={{ background: `linear-gradient(160deg, rgba(142,28,34,0.28), rgba(0,0,0,0.35))`, border: `1px solid ${L.rouge}55` }}>
                  <p className="text-[10px] tracking-[0.35em]" style={{ color: L.orDim }}>{t('advice').toUpperCase()}</p>
                  <p className="mt-1.5 text-[17px] leading-snug" style={{ color: L.ivoire }}>{displayAdvice}</p>
                  {data.personal && data.personalAge === null && (
                    <p className="mt-2 text-[11px] italic" style={{ color: `${L.or}99` }}>{t('dobHint')}</p>
                  )}
                </div>

                {/* Stratégie + Attitude */}
                {lang === 'fr' && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {([['strategy', hex.strategie], ['attitude', hex.attitude]] as const).map(([k, v]) => (
                      <div key={k} className="rounded-xl px-3.5 py-3" style={{ background: 'rgba(0,0,0,0.35)', border: `1px solid ${L.or}22` }}>
                        <p className="text-[9px] tracking-[0.3em]" style={{ color: L.orDim }}>{t(k).toUpperCase()}</p>
                        <p className="mt-1 text-[12.5px] leading-snug" style={{ color: `${L.ivoire}dd` }}>{v}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Synthèse (modale) */}
                <button type="button" onClick={() => setSynthOpen(true)} className="mt-4 w-full rounded-full py-2 text-[12px] underline-offset-4 hover:underline" style={{ color: L.orSoft, border: `1px solid ${L.or}33` }}>
                  {t('readMore')}
                </button>

                {/* Lignes mutantes */}
                <div className="mt-4 rounded-xl px-4 py-3" style={{ background: 'rgba(0,0,0,0.3)', border: `1px dashed ${L.or}33` }}>
                  {data.mutating.length === 0 ? (
                    <p className="text-[12px] italic" style={{ color: `${L.ivoire}88` }}>{t('mutatingNone')}</p>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] tracking-[0.3em]" style={{ color: L.orDim }}>{t('mutating').toUpperCase()}</p>
                        <p className="mt-1 text-[12.5px]" style={{ color: L.ivoire }}>
                          {data.mutating.map((l) => T.lineNames[contentLang(lang)][l]).join(lang === 'fr' ? ', ' : ', ')}
                        </p>
                      </div>
                      {data.transformed && (
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-[11px] italic" style={{ color: `${L.ivoire}99` }}>{t('transformsInto')}</span>
                          <span className="text-2xl" style={{ color: L.or }}>{data.transformed.caractere}</span>
                          <span className="text-[10px]" style={{ color: L.orDim }}>#{data.transformed.numero}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Hier → Aujourd'hui → Demain */}
              <div className="grid grid-cols-3 gap-3">
                {([
                  [t('yesterday'), data.yesterday],
                  [t('today'), { numero: hex.numero, caractere: hex.caractere, pinyin: hex.pinyin }],
                  [t('tomorrow'), data.tomorrow],
                ] as const).map(([label, item], i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.15 }}
                    className="rounded-xl px-2 py-3 text-center"
                    style={{
                      background: i === 1 ? `linear-gradient(160deg, rgba(142,28,34,0.3), rgba(0,0,0,0.4))` : 'rgba(0,0,0,0.32)',
                      border: `1px solid ${i === 1 ? `${L.or}66` : `${L.or}22`}`,
                    }}
                  >
                    <p className="text-[9px] tracking-[0.25em]" style={{ color: L.orDim }}>{label.toUpperCase()}</p>
                    {item ? (
                      <>
                        <p className="mt-1 text-[26px] leading-none" style={{ color: i === 1 ? L.or : `${L.ivoire}bb` }}>{item.caractere}</p>
                        <p className="mt-1 text-[9.5px] italic" style={{ color: `${L.ivoire}77` }}>#{item.numero} {item.pinyin}</p>
                      </>
                    ) : (
                      <p className="mt-2 text-[10px]" style={{ color: `${L.ivoire}44` }}>—</p>
                    )}
                    {i === 2 && <p className="mt-0.5 text-[8.5px] italic" style={{ color: `${L.or}66` }}>{t('tomorrowHint')}</p>}
                  </motion.div>
                ))}
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
                    exportCardPng(data, contentLang(lang), dateLabel)
                      .catch(() => undefined)
                      .finally(() => setSharing(false));
                  }}
                  className="rounded-full py-2.5 text-center text-[13px] disabled:opacity-60"
                  style={{ background: 'rgba(0,0,0,0.35)', color: L.orSoft, border: `1px solid ${L.or}44` }}
                >
                  {sharing ? t('shareBusy') : t('share')}
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
