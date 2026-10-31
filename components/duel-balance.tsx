'use client';

// components/duel-balance.tsx — LA BALANCE DU DUEL (/des-divinatoires/choix v2).
// Scène 100 % SVG (une seule viewBox, tout est dans le même repère — plus de
// superpositions HTML/SVG qui se marchaient dessus) :
//   • pilier central + socle, fléau au sommet,
//   • deux plateaux SUSPENDUS par trois chaînes (géométrie réelle d'une
//     balance : le fléau s'incline, les plateaux restent horizontaux,
//     leurs chaînes pivotent autour des extrémités du fléau),
//   • trois glyphes du tirage qui s'envolent du sommet UN À UN vers leur
//     plateau pendant que l'IA rédige (« le ciel pèse »),
//   • au verdict : chaque élément descend UN PAR UN vers le plateau de sa
//     faveur (vol lent ~3,1 s, impact, la barre bascule à chaque posée) ;
//     3 faces / 2 plateaux → la balance FINIT toujours par pencher (2-1 ou
//     3-0), halo d'or sur le plateau majoritaire. Véritable aide à décider.
// framer-motion anime des attributs/transformations SVG : léger, fluide,
// compatible entrée de gamme et APK/WebView.

import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { playSound } from '@/lib/sounds';
import { DICE_THEME } from '@/app/des-divinatoires/_shared';
import type { Pesee, Side } from '@/lib/duel-structure';

const GOLD = DICE_THEME.gold;       // #D4AF37
const OCRE = DICE_THEME.ocreLight;  // #E8C66A
const CREAM = '#FFF6DC';
// Glyphe : cœur glacé quasi-blanc, liseré d'encre (peinture sous le
// remplissage), halo doré — ressort sur le bol doré comme sur le ciel bleu.
const GLYPH_FILL = '#EAF6FF';
const GLYPH_INK = '#071026';

export type DuelPhase = 'pesee' | 'verdict';

export interface Plateau {
  label: string;
  text: string;
}

// ── Géométrie de la scène (viewBox 320×260) ──
const CX = 160;        // axe du pilier
const BEAM_Y = 58;     // hauteur du fléau
const ARM = 108;       // demi-longueur du fléau (les extrémités à ±108)
const CHAIN = 46;      // longueur des chaînes
const BOWL_RX = 46;    // rayon du bol

// Vol des glyphes : positions de départ (au-dessus du pivot) et arrivée
// (au centre de chaque bol, légèrement posées dedans).
// Rang du haut : les trois éléments alignés côte à côte, sous le libellé.
const START: [number, number][] = [[114, 36], [160, 32], [206, 36]];
// Le bol d'un plateau penché n'est plus à sa position « horizontale » :
// attache à ±ARM tournées de tilt autour du pivot + chaîne verticale.
function landingOf(side: 'A' | 'B', tiltDeg: number): [number, number] {
  const th = (tiltDeg * Math.PI) / 180;
  const dx = side === 'A' ? -ARM : ARM;
  return [CX + dx * Math.cos(th), BEAM_Y + dx * Math.sin(th) + CHAIN + 12];
}

export function DuelBalance({
  phase,
  pesees,
  plateaux,
  balance,
  awaiting,
  labelHesite,
}: {
  phase: DuelPhase;
  pesees: Pesee[];
  plateaux: [Plateau, Plateau];
  balance: Side | null;
  awaiting?: string | null;
  labelHesite?: string;
}) {
  // Trois temps : (align) les éléments viennent s'aligner en haut, un à un ;
  // (placed) au verdict, le vol est DÉCLENCHÉ — l'élément glisse du rang vers
  // son plateau pendant 1,5 s ; (landed) à l'arrivée seulement, il rejoint le
  // bol (onde + rebond + la barre bascule). Un seul état « placed » faisait
  // disparaître le glyphe avant la fin du vol (téléportation, retour user).
  const [aligned, setAligned] = useState<boolean[]>([false, false, false]);
  const [placed, setPlaced] = useState<boolean[]>([false, false, false]);
  const [landed, setLanded] = useState<boolean[]>([false, false, false]);
  useEffect(() => {
    // alignement lent : un élément toutes les ~1,1 s, dès la montée de la scène
    const ids = [0, 1, 2].map((i) =>
      window.setTimeout(() => setAligned((r) => r.map((x, j) => (j === i ? true : x))), 500 + i * 1100)
    );
    return () => ids.forEach(clearTimeout);
  }, []);
  // Le verdict (attribution IA ou, à défaut, moteur) déclenche la descente.
  const fingerprint = pesees.map((p) => p.pour).join('|');
  useEffect(() => {
    if (phase === 'verdict') {
      // placement UN PAR UN, cadence user : glissement ~1,5 s, suivant déclenché
      // ~1,5 s après le début du vol du précédent (impact + oscillation vus).
      setPlaced([false, false, false]);
      setLanded([false, false, false]);
      const ids: number[] = [];
      [0, 1, 2].forEach((i) => {
        const t0 = 700 + i * 1500;
        ids.push(window.setTimeout(() => {
          setPlaced((r) => r.map((x, j) => (j === i ? true : x)));
          // le glissement est accompagné du son dédié du Duel (fourni par le
          // user) — scintillement doux calé sur la descente de l'élément.
          playSound('duel-glide', 0.6);
        }, t0));
        ids.push(window.setTimeout(() => setLanded((r) => r.map((x, j) => (j === i ? true : x))), t0 + 1500));
      });
      return () => ids.forEach(clearTimeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, fingerprint]);

  // Inclinaison du fléau : seules les faces DÉJÀ DESCENDUES pèsent — la barre
  // bascule cran par cran, à chaque impact. Chaque face a UNE faveur (la
  // grille « les deux » n'existe plus) : la barre finit toujours penchée.
  // SIGNe : en SVG, rotate(+) LÈVE l'extrémité gauche (Y vers le bas) → pour
  // que le plateau le plus chargé DESCENDE (loi de la balance), le signe est
  // négatif quand A pèse plus que B.
  const tilt = useMemo(() => {
    const posed = pesees.filter((p, i) => landed[i]);
    const wA = posed.filter((p) => p.pour === 'A').length;
    const wB = posed.filter((p) => p.pour === 'B').length;
    return -Math.max(-1, Math.min(1, (wA - wB) / 2)) * 12;
  }, [pesees, landed]);
  const searching = phase === 'pesee';   // l'IA rédige : la barre « cherche »
  const allPlaced = landed.every(Boolean);
  const decisive = phase === 'verdict' && allPlaced;

  // Fléau : en attente, respiration lente et continue (±2.5°, « ça cherche ») ;
  // au verdict, ressort vivant — chaque impact fait osciller la barre.
  const beamRot = searching ? [0, 2.5, 0, -2.5, 0] : tilt;
  const beamTr = searching
    ? { duration: 7, repeat: Infinity, ease: 'easeInOut' as const }
    : { type: 'spring' as const, stiffness: decisive ? 90 : 60, damping: decisive ? 7 : 8 };

  // Chaîne + plateau : CONTRE-ROTATION exacte (les plateaux restent d'aplomb).
  const chainRot = Array.isArray(beamRot) ? beamRot.map((v) => -v) : -beamRot;

  const facesA = pesees.filter((p, i) => landed[i] && p.pour === 'A');
  const facesB = pesees.filter((p, i) => landed[i] && p.pour === 'B');

  return (
    <div className="relative mx-auto my-2 w-full max-w-[560px] select-none overflow-hidden rounded-[28px] border"
      style={{
        borderColor: `${GOLD}3d`,
        background: 'radial-gradient(ellipse 90% 65% at 50% 6%, rgba(233,217,172,0.09), rgba(4,6,15,0.55) 72%)',
        boxShadow: `inset 0 0 60px rgba(4,6,15,0.65), 0 0 26px ${GOLD}12`,
      }}
    >
      <svg viewBox="0 0 320 260" className="block w-full" style={{ height: 'auto' }} aria-hidden>
        <defs>
          <linearGradient id="db-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={CREAM} />
            <stop offset="0.45" stopColor={OCRE} />
            <stop offset="1" stopColor={GOLD} />
          </linearGradient>
          <radialGradient id="db-halo" cx="0.5" cy="0.35" r="0.75">
            <stop offset="0" stopColor={`${OCRE}cc`} />
            <stop offset="1" stopColor={`${OCRE}00`} />
          </radialGradient>
          {/* fonte du bol : lumière en haut du rebord, bronze profond en bas */}
          <linearGradient id="db-bowl" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={CREAM} />
            <stop offset="0.28" stopColor={OCRE} />
            <stop offset="0.68" stopColor={GOLD} />
            <stop offset="1" stopColor="#6d4c1c" />
          </linearGradient>
          {/* l'ouverture du plateau : vue de trois-quarts (avant lumineux) */}
          <linearGradient id="db-plate" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3a2f16" />
            <stop offset="0.5" stopColor={`${GOLD}55`} />
            <stop offset="1" stopColor={`${CREAM}88`} />
          </linearGradient>
          {/* relief = liseré clair en haut + ombre portée en bas (fausse 3D) */}
          <filter id="db-depth" x="-30%" y="-30%" width="160%" height="180%">
            <feDropShadow dx="0" dy="2.4" stdDeviation="2.2" floodColor="#04060f" floodOpacity="0.55" />
          </filter>
          <filter id="db-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.2" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* étincelles de fond */}
        {SPARKS.map((s, i) => (
          <motion.circle key={i} cx={s.x} cy={s.y} r={s.r} fill={OCRE}
            animate={{ opacity: [0.1, 0.55, 0.1] }}
            transition={{ duration: 2.8 + (i % 3) * 0.6, repeat: Infinity, delay: i * 0.4, ease: 'easeInOut' }} />
        ))}

        {/* halo du plateau gagnant (derrière, sous le fléau) */}
        {decisive && (
          <motion.circle
            cx={balance === 'A' ? CX - ARM : CX + ARM}
            cy={BEAM_Y + CHAIN + 6}
            r={52}
            fill="url(#db-halo)"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.45, 0.85, 0.5] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* ══ pilier + socle ══ */}
        <rect x={CX - 2.5} y={BEAM_Y} width={5} height={150} fill="url(#db-gold)" opacity={0.95} filter="url(#db-depth)" />
        <rect x={CX - 2} y={BEAM_Y + 2} width={1.2} height={146} fill={CREAM} opacity={0.5} />
        <rect x={CX + 1.1} y={BEAM_Y + 2} width={1} height={146} fill="#04060f" opacity={0.35} />
        <path d={`M ${CX - 66} 236 L ${CX - 40} 212 L ${CX + 40} 212 L ${CX + 66} 236 Z`} fill="url(#db-gold)" opacity={0.95} filter="url(#db-depth)" />
        <path d={`M ${CX - 40} 212 L ${CX + 40} 212 L ${CX + 34} 219 L ${CX - 34} 219 Z`} fill={CREAM} opacity={0.28} />
        <rect x={CX - 78} y={236} width={156} height={5} rx={2.5} fill={GOLD} opacity={0.75} filter="url(#db-depth)" />

        {/* ══ le fléau (groupe pivotant autour du clou central) ══ */}
        <motion.g
          style={{ transformBox: 'view-box', transformOrigin: `${CX}px ${BEAM_Y}px` } as any}
          initial={false}
          animate={{ rotate: beamRot }}
          transition={beamTr}
        >
          {/* la barre (relief : ombre basse + filet de lumière haut) */}
          <rect x={CX - ARM - 6} y={BEAM_Y - 1.5} width={(ARM + 6) * 2} height={5.5} rx={2.75} fill="#04060f" opacity={0.5} />
          <rect x={CX - ARM - 6} y={BEAM_Y - 2.5} width={(ARM + 6) * 2} height={5} rx={2.5} fill="url(#db-gold)" filter="url(#db-glow)" />
          <rect x={CX - ARM + 2} y={BEAM_Y - 2} width={(ARM - 2) * 2} height={1.1} rx={0.55} fill={CREAM} opacity={0.75} />
          {/* les deux attaches aux extrémités */}
          <circle cx={CX - ARM} cy={BEAM_Y} r={4} fill={CREAM} stroke={GOLD} strokeWidth={1.2} />
          <circle cx={CX + ARM} cy={BEAM_Y} r={4} fill={CREAM} stroke={GOLD} strokeWidth={1.2} />

          {/* chaîne + plateau GAUCHE (sous l'attache, contre-rotation = d'aplomb) */}
          <PlateauArm x={CX - ARM} y={BEAM_Y} rot={chainRot} tr={beamTr}
            faces={facesA} bowl={BOWL_RX} chain={CHAIN}
            tint={balance === 'A' && decisive} />
          <PlateauArm x={CX + ARM} y={BEAM_Y} rot={chainRot} tr={beamTr}
            faces={facesB} bowl={BOWL_RX} chain={CHAIN}
            tint={balance === 'B' && decisive} />
        </motion.g>

        {/* le clou central au-dessus du fléau */}
        <circle cx={CX} cy={BEAM_Y} r={7} fill="url(#db-gold)" filter="url(#db-glow)" />
        <circle cx={CX} cy={BEAM_Y} r={2.6} fill={CREAM} />

        {/* ══ les glyphes en vol (hors fléau : coordonnées absolues) ══ */}
        {pesees.map((p, i) => {
          // descendu vers un plateau : c'est le BOL qui l'affiche (il suit
          // l'inclinaison de la barre). Le glyphe volant s'efface à l'arrivée.
          if (landed[i]) return null; // arrivé : c'est le bol qui l'affiche
          // TROIS états : caché (au-dessus, opacity 0) → ALIGNÉ en haut
          // (rang START, il attend le verdict) → posé sur le plateau de sa
          // faveur (dest, à l'appel du verdict). Le vol vers dest ne part
          // qu'à placed[i] — jamais depuis l'alignement.
          const dest = landingOf(p.pour as 'A' | 'B', tilt);
          const pos = !aligned[i] ? [START[i][0], 16] : placed[i] ? dest : START[i];
          return (
            <motion.text
              key={p.face + '-' + fingerprint}
              x={0} y={0}
              textAnchor="middle"
              fontSize={26}
              fill={GLYPH_FILL}
              stroke={GLYPH_INK}
              strokeWidth={4.5}
              paintOrder="stroke"
              strokeLinejoin="round"
              fontFamily="var(--font-cinzel), serif"
              filter="url(#db-glow)"
              initial={false}
              animate={{ x: pos[0], y: pos[1], opacity: aligned[i] ? 1 : 0, scale: 1 }}
              transition={placed[i]
                // glissement doux du rang d'attente vers le plateau (~1,5 s)
                ? { duration: 1.5, ease: [0.35, 0.1, 0.25, 1] }
                : { duration: 1.1, ease: 'easeOut' }}
              style={{ transformBox: 'view-box', transformOrigin: '0px 0px' } as any}
            >
              {p.glyph}
            </motion.text>
          );
        })}
      </svg>

      {/* libellés + options des plateaux : deux blocs centrés pile sous les
          bols (centres SVG à ±108/320 = 16.25 % et 83.75 % de la largeur) */}
      {plateaux.map((p, i) => {
        const win = decisive && balance === (i === 0 ? 'A' : 'B');
        return (
          <div key={i} className="pointer-events-none absolute w-[30%] text-center"
            style={{ left: i === 0 ? '16.25%' : '83.75%', transform: 'translateX(-50%)', top: '62%' }}>
            <p className="text-[11px] uppercase tracking-[0.18em]"
              style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: win ? GOLD : `${OCRE}bb` }}>
              {p.label}
            </p>
            <p className="mx-auto mt-0.5 line-clamp-2 text-[12px] italic leading-snug"
              style={{ fontFamily: 'var(--font-cormorant), serif', color: win ? CREAM : `${DICE_THEME.glyph}bb` }}>
              « {p.text} »
            </p>
          </div>
        );
      })}

      {/* attente / hésitation */}
      {awaiting && (
        <motion.p
          className="absolute inset-x-0 top-[6px] text-center text-[11px] uppercase tracking-[0.24em]"
          style={{ fontFamily: 'var(--font-cinzel), serif', color: `${OCRE}dd` }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          {awaiting}
        </motion.p>
      )}
    </div>
  );
}

// Un plateau : chaîne en V contre-rotatée + bol en arc + faces reçues posées
// dans le bol.
function PlateauArm({
  x, y, rot, tr, faces, bowl, chain, tint,
}: {
  x: number; y: number; rot: number | number[]; tr: any;
  faces: Pesee[]; bowl: number; chain: number; tint: boolean;
}) {
  const half = bowl * 0.78;
  const rimY = y + chain;
  // nombre de faces = clé d'impact : chaque atterrissage REMONTE le groupe
  // bol+faces → le keyed motion.g rejoue la chute-rebond (le plateau
  // « encaisse » la face, comme une vraie balance).
  const impact = faces.length;
  return (
    <motion.g
      style={{ transformBox: 'view-box', transformOrigin: `${x}px ${y}px` } as any}
      initial={false}
      animate={{ rotate: rot }}
      transition={tr}
    >
      {/* trois chaînes (doublées : fil d'ombre + fil de lumière = torsadé) */}
      {[-half, 0, half].map((dx, i) => (
        <g key={i}>
          <line x1={x} y1={y} x2={x + dx} y2={rimY + (i === 1 ? 3 : 0)} stroke="#04060f88" strokeWidth={2} />
          <line x1={x} y1={y} x2={x + dx} y2={rimY + (i === 1 ? 3 : 0)} stroke={`${OCRE}99`} strokeWidth={1} />
        </g>
      ))}
      {/* bol + faces : groupe keyed = ressort d'impact à chaque posée */}
      <motion.g
        key={impact}
        initial={impact === 0 ? false : { y: 9, rotate: 0 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 130, damping: 7 }}
      >
        {/* corps du bol : demi-sphère creuse vers le BAS (sweep 0 — en repère
            SVG à Y renversé, sweep 1 dessinerait un dôme « à l'envers ») */}
        <path
          d={`M ${x - bowl} ${rimY} A ${bowl} ${bowl * 0.5} 0 0 0 ${x + bowl} ${rimY} Z`}
          fill="url(#db-bowl)"
          stroke={tint ? CREAM : GOLD}
          strokeWidth={tint ? 2.2 : 1.5}
          filter="url(#db-depth)"
          opacity={tint ? 1 : 0.92}
        />
        {/* ombre du creux : lèvre interne, également vers le bas */}
        <path
          d={`M ${x - bowl + 5} ${rimY + 1} A ${bowl - 5} ${(bowl - 5) * 0.38} 0 0 0 ${x + bowl - 5} ${rimY + 1}`}
          fill="#04060f2e" stroke="none"
        />
        {/* reflet bas (lueur galbée) */}
        <path
          d={`M ${x - bowl * 0.45} ${rimY + bowl * 0.34} Q ${x} ${rimY + bowl * 0.5} ${x + bowl * 0.4} ${rimY + bowl * 0.32}`}
          fill="none" stroke={`${CREAM}44`} strokeWidth={1.6} strokeLinecap="round"
        />
        {/* l'ouverture du plateau : ellipse vue de trois-quarts (3D) */}
        <ellipse cx={x} cy={rimY} rx={bowl} ry={bowl * 0.15} fill="url(#db-plate)" stroke={`${CREAM}66`} strokeWidth={1} />
        {/* onde d'atterrissage : anneau qui s'élargit et s'éteint */}
        {impact > 0 && (
          <motion.ellipse
            key={`wave-${impact}`} cx={x} cy={rimY} fill="none" stroke={OCRE} strokeWidth={1.4}
            initial={{ rx: bowl * 0.35, ry: bowl * 0.06, opacity: 0.9 }}
            animate={{ rx: bowl * 1.12, ry: bowl * 0.19, opacity: 0 }}
            transition={{ duration: 1.3, ease: 'easeOut' }}
          />
        )}
        {/* les faces posées, ancrées par une ombre portée */}
        {faces.map((p, i) => {
          const fx = x - (faces.length - 1) * 14 + i * 28;
          return (
            <g key={p.face}>
              <ellipse cx={fx} cy={rimY + 19} rx={8.5} ry={2.2} fill="#04060f66" />
              <text
                x={fx} y={rimY + 14}
                textAnchor="middle" fontSize="21"
                fill={GLYPH_FILL} stroke={GLYPH_INK} strokeWidth={4.5}
                paintOrder="stroke" strokeLinejoin="round"
                fontFamily="var(--font-cinzel), serif"
                filter="url(#db-glow)"
              >
                {p.glyph}
              </text>
            </g>
          );
        })}
      </motion.g>
    </motion.g>
  );
}

// Étincelles de décor (positions viewBox, déterministes).
const SPARKS = Array.from({ length: 16 }, (_, i) => ({
  x: 14 + ((i * 41) % 292),
  y: 12 + ((i * 67) % 232),
  r: 0.7 + (i % 3) * 0.5,
}));

// Utilitaire : pesees du moteur → pesees corrigées par l'IA.
export function applyIaPesees(base: Pesee[], ia: { face: string; pour: Side; mot: string }[] | null): Pesee[] {
  if (!ia) return base;
  return base.map((p) => {
    const c = ia.find((x) => x.face === p.face);
    if (!c) return p;
    return { ...p, pour: c.pour, motif: c.mot ? `${p.name} — ${c.mot}` : p.motif };
  });
}
