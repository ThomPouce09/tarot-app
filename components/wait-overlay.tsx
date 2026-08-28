'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '@/lib/i18n';
import { api } from '@/lib/api-client';

interface WaitConfig {
  messages: string[];
  backgroundType: 'image' | 'video' | 'none';
  backgroundUrls: string[];
  /** URLs de vidéos à jouer UNE seule fois (sans boucle) dans la rotation. */
  noLoopUrls?: string[];
  animation: string;
  minDurationMs: number;
}

const FALLBACK: WaitConfig = {
  messages: ['Chargement de l\'interprétation...'],
  backgroundType: 'none',
  backgroundUrls: [],
  animation: 'fade',
  minDurationMs: 2500,
};

// Config OPTIMISTE : les types tarot / yi-jing ont toujours une vidéo
// d'attente. On initialise avec analyse-tarot1.mp4 (resp. analyse-yi-jing1.mp4)
// pour que la vidéo démarre IMMÉDIATEMENT (pas de fond noir pendant le fetch),
// puis le fetch rafraîchit la liste complète (1..9.mp4) pour la boucle.
const TAROT_OPTIMISTIC: WaitConfig = {
  messages: ['Les cartes se dévoilent…', 'Le tarot médite votre tirage…', 'L’oracle assemble les arcanes…'],
  backgroundType: 'video',
  backgroundUrls: ['/images/analyse-tarot1.mp4'],
  animation: 'fade',
  minDurationMs: 3500,
};

const YIJING_OPTIMISTIC: WaitConfig = {
  messages: ['L’oracle consulte les hexagrammes…', 'Les baguettes d’achillée résonnent…', 'Le Yi Jing médite votre tirage…'],
  backgroundType: 'video',
  backgroundUrls: ['/images/analyse-yi-jing1.mp4'],
  noLoopUrls: ['/images/analyse-yi-jing1.mp4'],
  animation: 'fade',
  minDurationMs: 3500,
};

function optimisticConfig(type: string): WaitConfig | null {
  if (type.startsWith('tarot')) return TAROT_OPTIMISTIC;
  if (type.startsWith('yi-jing') || type === 'yi-qing') return YIJING_OPTIMISTIC;
  return null;
}

// ── Variantes d'animation (framer-motion) ──────────────────
const VARIANTS: Record<string, { initial: any; animate: any; exit: any }> = {
  fade: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  },
  orbit: {
    initial: { opacity: 0, rotate: -12, scale: 0.9 },
    animate: { opacity: 1, rotate: 0, scale: 1, transition: { rotate: { repeat: Infinity, repeatType: 'reverse', duration: 3 } } },
    exit: { opacity: 0, scale: 0.9 },
  },
  sparkle: {
    initial: { opacity: 0, scale: 0.8, filter: 'blur(4px)' },
    animate: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: { scale: { repeat: Infinity, repeatType: 'reverse', duration: 1.8 } } },
    exit: { opacity: 0 },
  },
  ripples: {
    initial: { opacity: 0, scale: 1.1 },
    animate: { opacity: 1, scale: 1, transition: { scale: { repeat: Infinity, repeatType: 'reverse', duration: 2.4 } } },
    exit: { opacity: 0 },
  },
};

/* ------------------------------------------------------------------ */
/* Fond vidéo en BOUCLE : chaque vidéo joue 2 à 4 fois d'affilée        */
/* (tirage aléatoire à chaque changement), puis fondu noir de 400ms et   */
/* passage à la suivante (retour à la 1ère après la dernière). La vidéo  */
/* démarre immédiatement (pas de voile initial). `exiting` déclenche le  */
/* fondu final de sortie.                                                */
/*                                                                       */
/* Relecture via l'attribut natif `loop` (fiable sur mobile, contraire-  */
/* ment à un rejeu programmatique `currentTime=0; play()` qui est bloqué */
/* sans geste utilisateur). Le changement de vidéo est piloté par un     */
/* timer = durée réelle × nombre de relectures.                          */
/* ------------------------------------------------------------------ */
const FADE_MS = 400;
const MIN_PLAYS = 2;
const MAX_PLAYS = 4;
const FALLBACK_DURATION = 8;

function VideoBackground({
  urls,
  noLoopUrls = [],
  exiting,
}: {
  urls: string[];
  /** URLs à jouer UNE seule fois (sans boucle). Les autres bouclent 2-4 fois. */
  noLoopUrls?: string[];
  exiting: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);
  const [duration, setDuration] = useState(0);
  const playsRef = useRef(MIN_PLAYS + Math.floor(Math.random() * (MAX_PLAYS - MIN_PLAYS + 1)));
  const switchingRef = useRef(false);

  const url = urls[idx % urls.length];
  const isNoLoop = noLoopUrls.includes(url);

  // `loop` natif rejoue la même vidéo sans interruption ; ce timer calcule
  // quand passer à la suivante (durée × relectures), avec fondu 400ms.
  // Une vidéo "noLoop" (ex. analyse-yi-jing1/2.mp4) joue UNE seule fois
  // (plays=1) et n'est jamais rejouée en boucle : le timer passe à la vidéo
  // suivante dès sa fin.
  useEffect(() => {
    if (exiting) return;
    const d = duration > 0 ? duration : FALLBACK_DURATION;
    const plays = isNoLoop ? 1 : playsRef.current;
    const totalMs = d * plays * 1000;
    const timer = setTimeout(() => {
      if (switchingRef.current) return;
      switchingRef.current = true;
      setFading(true);
      setTimeout(() => {
        setIdx((i) => (i + 1) % urls.length);
        setDuration(0); // sera re-rempli par loadedmetadata de la suivante
        playsRef.current = MIN_PLAYS + Math.floor(Math.random() * (MAX_PLAYS - MIN_PLAYS + 1));
        setFading(false);
        switchingRef.current = false;
      }, FADE_MS);
    }, totalMs);
    return () => clearTimeout(timer);
  }, [idx, duration, exiting, urls.length, isNoLoop]);

  return (
    <>
      <video
        key={url}
        className="absolute inset-0 w-full h-full object-cover bg-black"
        style={{
          opacity: fading || exiting ? 0 : 1,
          transition: `opacity ${FADE_MS}ms ease`,
          backgroundColor: 'black',
        }}
        poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect width='1' height='1' fill='black'/%3E%3C/svg%3E"
        src={url}
        autoPlay
        muted
        loop={!isNoLoop}
        playsInline
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />
      {/* Voile noir : simple fondu entre les vidéos */}
      <div
        className="pointer-events-none absolute inset-0 bg-black"
        style={{ opacity: fading || exiting ? 1 : 0, transition: `opacity ${FADE_MS}ms ease` }}
      />
    </>
  );
}

function ImageBackground({ urls }: { urls: string[] }) {
  const url = urls[0];
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />;
}

export default function WaitOverlay({
  type,
  ready = false,
  onVideoEnded,
}: {
  type: string;
  /** true quand l'interprétation est arrivée → on peut sortir (après 2 cycles
   *  de vidéos minimum, sauf si ready est déjà là). */
  ready?: boolean;
  onVideoEnded?: () => void;
}) {
  const lang = useLang();
  const [cfg, setCfg] = useState<WaitConfig | null>(() => optimisticConfig(type));
  const [msgIdx, setMsgIdx] = useState(0);
  const [startedAt] = useState(Date.now());
  const [exiting, setExiting] = useState(false);
  const endedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    api(`/api/interpretation-wait?type=${encodeURIComponent(type)}&lang=${encodeURIComponent(lang)}`)
      .then((r) => r.json())
      .then((d) => { if (alive) setCfg(d); })
      .catch(() => { if (alive) setCfg(FALLBACK); });
    return () => { alive = false; };
  }, [type, lang]);

  const c = cfg ?? FALLBACK;

  // 🎬 Sortie : dès que l'interprétation est prête (ready), la vidéo s'efface
  // en fondu 400ms et l'interprétation devient lisible. Tant que ready est
  // false, les vidéos tournent en boucle en permanence.
  useEffect(() => {
    if (endedRef.current || exiting) return;
    if (!ready) return;
    // Petit minimum anti-flash : on laisse la première vidéo s'afficher.
    const elapsed = Date.now() - startedAt;
    const minShow = Math.min(Math.max(c.minDurationMs || 3500, 3500), 1500);
    const fire = () => {
      if (endedRef.current) return;
      endedRef.current = true;
      setExiting(true);
    };
    if (elapsed < minShow) {
      const t = setTimeout(fire, minShow - elapsed);
      return () => clearTimeout(t);
    }
    fire();
  }, [ready, startedAt, c, exiting]);

  // Exécution de la sortie : quand `exiting` passe à true, fondu 400ms puis
  // onVideoEnded. Sépare la décision de l'exécution — sinon le re-render
  // déclenché par setExiting annulait le timer (overlay bloqué à jamais).
  useEffect(() => {
    if (!exiting) return;
    const t = setTimeout(() => onVideoEnded?.(), FADE_MS + 50);
    return () => clearTimeout(t);
  }, [exiting, onVideoEnded]);

  // Garde-fou de securite : si la config arrive avec un fond non-vidéo
  // (fallback), on bascule après minDurationMs — uniquement si l'interprétation
  // est prête (même logique que le garde-fou vidéo : ne jamais brûler endedRef
  // prématurément, sinon la sortie est bloquée pour toujours).
  useEffect(() => {
    if (c.backgroundType === 'video' && c.backgroundUrls.length > 0) return;
    const wait = Math.max(c.minDurationMs || 3500, 3500);
    const t = setTimeout(() => {
      if (!endedRef.current && ready) {
        endedRef.current = true;
        onVideoEnded?.();
      }
    }, wait);
    return () => clearTimeout(t);
  }, [cfg, c, ready, onVideoEnded]);

  // Garde-fou de sécurité : ne force la sortie que si l'interprétation est
  // déjà prête (ready) mais que la sortie n'a pas eu lieu. Si l'interprétation
  // n'est pas encore prête, les vidéos continuent de boucler (comportement
  // voulu) — on n'appelle JAMAIS onVideoEnded prématurément, sinon endedRef
  // bloquerait la sortie future quand l'API répondra enfin.
  useEffect(() => {
    const t = setTimeout(() => {
      if (!endedRef.current && ready) {
        endedRef.current = true;
        onVideoEnded?.();
      }
    }, 60000);
    return () => clearTimeout(t);
  }, [onVideoEnded, ready]);

  // Défilement des messages d'attente (min 5s entre chaque)
  useEffect(() => {
    if (c.messages.length <= 1) return;
    const t = setInterval(() => setMsgIdx((i) => (i + 1) % c.messages.length), 5000);
    return () => clearInterval(t);
  }, [c]);

  const v = VARIANTS[c.animation] || VARIANTS.fade;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden bg-black pb-20">
      {c.backgroundType === 'video' && c.backgroundUrls.length > 0 ? (
        <VideoBackground
          urls={c.backgroundUrls}
          noLoopUrls={c.noLoopUrls}
          exiting={exiting}
        />
      ) : c.backgroundType === 'image' && c.backgroundUrls.length > 0 ? (
        <ImageBackground urls={c.backgroundUrls} />
      ) : (
        <div className="absolute inset-0 bg-black/45" />
      )}

      <motion.div
        key={c.animation}
        initial={v.initial}
        animate={v.animate}
        exit={v.exit}
        transition={{ duration: 0.6 }}
        className="relative z-10 flex flex-col items-center gap-6 px-6 text-center"
      >
        <div className="min-h-[3rem] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={msgIdx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="text-amber-200 text-lg md:text-xl font-medium"
              style={{ fontFamily: 'var(--font-cinzel), serif', textShadow: '0 0 18px rgba(218,165,32,0.5)' }}
            >
              {c.messages[msgIdx] || c.messages[0]}
            </motion.p>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
