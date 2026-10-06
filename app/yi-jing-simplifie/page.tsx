'use client';

// app/yi-jing-simplifie/page.tsx — « Le Yi Jing simplifié » : même tirage
// d'achillées que /yi-jing-simple (boîte de 64 baguettes, secouage, élue),
// mais précédé de la mécanique du Fil des Nornes (nornes2) : le consultant
// choisit un DOMAINE (4 gardiens du ciel chinois) puis UN sous-thème. La
// question composée « Domaine — intention » est transmise à l'interprétation
// IA et à l'historique. Une pastille discrète en bas à gauche permet d'en
// relire le libellé sans masquer le titre ni la zone de tirage.

import { useState } from "react";
import { motion } from "framer-motion";
import { useLang, pick4 } from '@/lib/i18n';
import YiSlideNav from '@/components/yi-slide-nav';
import AuthGate from '@/components/auth-gate';
import { YiThemeSelector, YI_LACQUER } from './theme-selector';

// Reglage du rig, extrait a l'etape 1 du decoupage (le reste est consomme par ./rig).
import { YI_QING_BG, TITLE_TOP } from './rig-config';

// Le rig, extrait a l'etape 2 du decoupage.
import { YiQingRig } from './rig';


// --- Main Page ---
function YiQingPage() {
  const lang = useLang();
  // Intention choisie (domaine — sous-thème). Le tirage n'apparaît qu'après.
  const [question, setQuestion] = useState<string | null>(null);
  // Relecture discrète : la pastille se déplie au tap.
  const [peek, setPeek] = useState(false);

  // Bloc titre — même markup dans les deux étapes, position différente :
  // à la suite du sélecteur (étape intention, façon /nornes2) ou superposé
  // en haut de l'écran pendant le tirage (la boîte est centrée en absolu).
  const titleBlock = (
    <div className="text-center" style={{ padding: '0 16px', pointerEvents: 'none' }}>
      <h1
        className="title-glow"
        style={{
          fontFamily: 'var(--font-cinzel-deco), serif',
          color: '#F3C969',
          letterSpacing: '0.2em',
          textShadow: '0 0 40px rgba(180,40,45,0.7), 0 0 80px rgba(92,15,22,0.4)',
          fontSize: 'clamp(1.6rem, 6vw, 4.5rem)',
          textTransform: 'uppercase',
          marginBottom: '0.25rem',
        }}
      >
        {pick4('Le Yi Jing', 'The I Ching', "El Yi Jing", "इ चिंग")(lang)}
      </h1>
      <p
        style={{
          fontFamily: 'var(--font-cinzel), serif',
          color: '#F5EAD6',
          textShadow: '0 0 10px rgba(180,40,45,0.6), 0 1px 4px rgba(0,0,0,0.9)',
          letterSpacing: '0.05em',
          fontStyle: 'italic',
          fontSize: 'clamp(0.7rem, 2vw, 1rem)',
        }}
      >
        {pick4('Simplifié — guidé par votre intention', 'Simplified — guided by your intention', "Simplificado — guiado por su intención", "सरलीकृत — आपके संकल्प से निर्देशित")(lang)}
      </p>
    </div>
  );

  return (
    <div
      className="relative w-full overflow-hidden select-none"
      style={{
        height: '100dvh',
        minHeight: '-webkit-fill-available',
      }}
    >
      <YiSlideNav />

      {/* VIDEO BACKGROUND */}
      <div className="absolute inset-0 z-0 bg-black" style={{ pointerEvents: 'none' }}>
        <video
          src={YI_QING_BG}
          poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect width='1' height='1' fill='black'/%3E%3C/svg%3E"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: 'cover', objectPosition: 'center center', pointerEvents: 'none' }}
        />
        <div className="absolute inset-0 bg-black/40" style={{ pointerEvents: 'none' }} />
      </div>

      {/* ÉTAPE 1 — Intention (domaine + sous-thème), puis ÉTAPE 2 — le tirage
          des achillées démarre immédiatement après la confirmation. */}
      {question === null ? (
        // Façon /nornes2 : titre puis encart, à la suite dans le flux, page
        // scrollable — plus rien ne se superpose.
        <div
          className="absolute inset-0 z-20 overflow-y-auto"
          style={{ touchAction: 'pan-y' }}
        >
          <div className="mx-auto max-w-2xl px-3 pt-16 sm:pt-20 pb-24">
            {titleBlock}
            <motion.div
              className="mt-6 rounded-2xl"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              style={{
                boxShadow: `0 0 0 1px ${YI_LACQUER.gold}44, 0 0 30px rgba(0,0,0,0.6)`,
              }}
            >
              <YiThemeSelector onConfirm={setQuestion} />
            </motion.div>
          </div>
        </div>
      ) : (
        <>
          {/* YI QING RIG — même mécanique que /yi-jing-simple */}
          <YiQingRig question={question} />

          {/* Relecture DISCRÈTE de l'intention : pastille en bas à gauche
              (jamais sur le titre, centré en haut, ni sur la boîte, centrée).
              Un tap déplie le libellé complet ; un second la referme. */}
          <div className="fixed bottom-3 left-3 z-40 max-w-[62vw]">
            <motion.button
              type="button"
              onClick={() => setPeek((p) => !p)}
              aria-expanded={peek}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-left"
              style={{
                background: 'rgba(12,7,22,0.55)',
                border: `1px solid ${YI_LACQUER.gold}3a`,
                backdropFilter: 'blur(3px)',
              }}
            >
              <span className="text-[8px]" style={{ color: `${YI_LACQUER.gold}cc` }}>◆</span>
              <span
                className="truncate text-[10px] italic leading-none"
                style={{ fontFamily: 'var(--font-cinzel), serif', color: `${YI_LACQUER.lilacDim}cc` }}
              >
                {peek ? 'Intention' : question}
              </span>
            </motion.button>
            {peek && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1.5 rounded-xl px-3 py-2 text-[11px] italic leading-snug"
                style={{
                  fontFamily: 'var(--font-cinzel), serif',
                  color: YI_LACQUER.lilac,
                  background: 'rgba(12,7,22,0.78)',
                  border: `1px solid ${YI_LACQUER.gold}33`,
                }}
              >
                {question}
              </motion.p>
            )}
          </div>
        </>
      )}

      {/* Google Material Symbols */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=swipe"
      />

      {/* TITLE — superposé en haut de l'écran uniquement PENDANT le tirage
      (l'étape intention l'affiche dans le flux, à la suite du sélecteur). */}
      {question !== null && (
        <div
          style={{
            position: "absolute",
            top: TITLE_TOP,
            left: 0,
            right: 0,
            zIndex: 30,
            pointerEvents: 'none',
          }}
        >
          {titleBlock}
        </div>
      )}
    </div>
  );
}

export default function GatedPage() {
  return <AuthGate><YiQingPage /></AuthGate>;
}