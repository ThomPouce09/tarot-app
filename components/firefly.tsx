'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '@/lib/i18n';
import { FIREFLY_CONFIG } from '@/config/firefly';
import CreaturePopup from './creature-popup';

type Creature = { id: string; slug: string; name: string; image: string; color: string | null };
type PopupData = { creature: Creature; text: string; category: string };

// Tirage aléatoire dans une plage [min, max]
function rand([a, b]: [number, number]) {
  return a + Math.random() * (b - a);
}

// Couleur dorée du point lumineux (indépendante de la créature)
const GOLD = '#F3C969';

export default function Firefly({ page }: { page: string }) {
  const lang = useLang();
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [creature, setCreature] = useState<Creature | null>(null);
  const [pending, setPending] = useState<PopupData | null>(null); // message récupéré au spawn
  const [popup, setPopup] = useState<PopupData | null>(null);
  const aliveRef = useRef(true);
  const wanderResolveRef = useRef<null | (() => void)>(null); // permet au clic de court-circuiter l'attente
  const popupActiveRef = useRef(false); // une créature/popup est-elle active ? (bloque tout nouveau spawn)
  const resumeRef = useRef<null | (() => void)>(null); // reprend le cycle quand le popup se ferme

  // Cycle de vie : attente -> apparition -> errance -> disparition -> attente
  // On attend un tick (50ms) avant le 1er spawn pour laisser LanguageProvider
  // appliquer la langue depuis localStorage (sinon 1ère luciole fetch en 'fr').
  useEffect(() => {
    aliveRef.current = true;
    let started = false;
    const startTimer = setTimeout(() => {
      started = true;
      cycle(true);
    }, 50);
    const cycle = async (first = false): Promise<void> => {
      // INVARIANT : jamais de luciole tant qu'une créature/popup est active.
      if (popupActiveRef.current) {
        // en pause : on reprendra quand le popup se fermera (resumeRef)
        await new Promise<void>((resolve) => {
          resumeRef.current = resolve;
        });
        if (!aliveRef.current) return;
      }
      await new Promise((r) => setTimeout(r, first ? FIREFLY_CONFIG.firstSpawnMs : rand(FIREFLY_CONFIG.spawnIntervalMs)));
      if (!aliveRef.current) return;

      try {
        const res = await fetch(`/api/creature?page=${encodeURIComponent(page)}&lang=${lang}`);
        const data = await res.json();
        if (!aliveRef.current || !data.creature) return cycle();

        setCreature(data.creature as Creature);
        setPending(
          data.message
            ? { creature: data.creature, text: data.message.text, category: data.message.category }
            : { creature: data.creature, text: '', category: '' },
        );
        // Place la luciole au milieu de l'écran (pas de frame au centre extrême)
        setPos({
          x: 30 + Math.random() * 40, // 30–70%
          y: 28 + Math.random() * 44, // 28–72%
        });
        setVisible(true);

        // Reste visible le temps du fondu d'entrée + l'errance, puis disparaît.
        // Le clic résout cette promesse AVANT l'échéance (voir wanderResolveRef) :
        // la luciole s'éteint immédiatement sans attendre le reste de wanderMs.
        await new Promise<void>((resolve) => {
          wanderResolveRef.current = resolve;
          setTimeout(resolve, rand(FIREFLY_CONFIG.fadeInMs) + rand(FIREFLY_CONFIG.wanderMs));
        });
        wanderResolveRef.current = null;
        if (!aliveRef.current) return;
        setVisible(false);

        await new Promise((r) => setTimeout(r, rand(FIREFLY_CONFIG.fadeOutMs)));
        if (!aliveRef.current) return;
        setCreature(null);
        setPending(null);
        cycle();
      } catch {
        if (aliveRef.current) cycle();
      }
    };
    return () => {
      aliveRef.current = false;
      clearTimeout(startTimer);
    };
  }, [page, lang]);

  // Errance : marche aléatoire CONTINUE au milieu de l'écran (jamais de saut).
  // Léger rappel vers le centre (50/50) pour rester majoritairement centrale,
  // mais bornes élargies à [-8, 108]% : la luciole peut chevaucher/dépasser les bords.
  useEffect(() => {
    if (!visible) return;
    setPos({ x: 30 + Math.random() * 40, y: 28 + Math.random() * 44 }); // départ central
    const PULL = 0.04; // rappel doux vers le centre
    const id = setInterval(() => {
      setPos((p) => {
        const dx = (Math.random() - 0.5) * 16 + (50 - p.x) * PULL; // ±8% + rappel
        const dy = (Math.random() - 0.5) * 16 + (50 - p.y) * PULL;
        return {
          x: Math.min(108, Math.max(-8, p.x + dx)),
          y: Math.min(108, Math.max(-8, p.y + dy)),
        };
      });
    }, FIREFLY_CONFIG.moveStepMs);
    return () => clearInterval(id);
  }, [visible]);

  const glow = creature?.color || GOLD;

  return (
    <>
      <AnimatePresence>
        {visible && creature && (
          <motion.button
            aria-label={creature.name}
            title={creature.name}
            onClick={() => {
              if (!pending) return;
              setPopup(pending);
              popupActiveRef.current = true; // une créature est active : bloque tout nouveau spawn
              setVisible(false); // la luciole s'éteint : la créature (popup) prend le relais
              wanderResolveRef.current?.();
            }}
            className="fixed z-[60] cursor-pointer rounded-full"
            style={{
              // Taille VISUELLE stricte : 12px, aucun padding
              width: FIREFLY_CONFIG.dotSize,
              height: FIREFLY_CONFIG.dotSize,
              background: `radial-gradient(circle, ${GOLD} 0%, rgba(243,201,105,0) 70%)`,
              boxShadow: `0 0 ${FIREFLY_CONFIG.glowSpread}px ${FIREFLY_CONFIG.glowSpread / 2}px ${GOLD}`,
              pointerEvents: 'auto',
              border: 'none',
              padding: 0,
            }}
            initial={{ opacity: 0, scale: 0.3, left: `${pos.x}%`, top: `${pos.y}%` }}
            animate={{
              opacity: 1,
              scale: 1,
              left: `${pos.x}%`,
              top: `${pos.y}%`,
            }}
            exit={{ opacity: 0, scale: 0.3 }}
            transition={{
              opacity: { duration: FIREFLY_CONFIG.fadeInMs[1] / 1000, ease: 'easeOut' },
              scale: { duration: FIREFLY_CONFIG.fadeInMs[1] / 1000, ease: 'easeOut' },
              // trajectoire continue : on glisse vers la nouvelle cible sur toute la durée du pas
              left: { duration: FIREFLY_CONFIG.moveStepMs / 1000, ease: 'linear' },
              top: { duration: FIREFLY_CONFIG.moveStepMs / 1000, ease: 'linear' },
            }}
          >
            {/* Hit-area invisible (44px) centrée sur la luciole : ne change PAS sa taille visuelle */}
            <span
              aria-hidden
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ width: 44, height: 44, pointerEvents: 'auto' }}
            />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {popup && (
          <CreaturePopup
            data={popup}
            onClose={() => {
              setPopup(null);
              popupActiveRef.current = false; // la créature n'est plus active
              // Reprend le cycle : la prochaine luciole apparaîtra après spawnIntervalMs (5–45s)
              const resume = resumeRef.current;
              resumeRef.current = null;
              resume?.();
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
