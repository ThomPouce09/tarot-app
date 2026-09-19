'use client';

// ═══════════════════════════════════════════════════════════════════
// Modale « question précise » — /tarot-3-cartes (« 3 Cartes · Précis »)
// Le tirage 3 cartes classique (Passé · Présent · Avenir) demande
// désormais une question libre avant la pioche : elle est transmise à
// l'oracle (prompt) et ré-affichée en bandeau sur la page
// d'interprétation. Habillage boudoir tarotique : bois, bordeaux & or
// (palette du hub Tarot).
// ═══════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLang } from '@/lib/i18n';

export default function QuestionModal({
  onSubmit,
}: {
  onSubmit: (question: string) => void;
}) {
  const lang = useLang();
  const [value, setValue] = useState('');

  const handle = () => {
    const q = value.trim();
    if (q) onSubmit(q);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      {/* Voile : le jeu devine derrière la brume */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <motion.div
        className="ts-panel relative w-full max-w-md overflow-hidden rounded-2xl border border-[#DAA520]/35 shadow-[0_0_40px_rgba(74,25,49,0.6),0_18px_50px_rgba(0,0,0,0.7)]"
        style={{
          background:
            'linear-gradient(160deg, #3a2314 0%, #2a1420 55%, #1d0d16 100%)',
        }}
        initial={{ opacity: 0, y: 26, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Bordure intérieure fine, comme un cadre de carte */}
        <div className="pointer-events-none absolute inset-2 rounded-xl border border-[#DAA520]/15" />

        <div className="relative px-6 pt-7 pb-6 sm:px-8">
          {/* En-tête : ☾ ✦ ☼ */}
          <p className="text-center text-[#DAA520]/80 text-sm tracking-[0.5em] mb-3">
            <span className="ts-twinkle">☾</span>
            <span className="ts-twinkle mx-2" style={{ animationDelay: '-0.9s' }}>✦</span>
            <span className="ts-twinkle" style={{ animationDelay: '-1.7s' }}>☼</span>
          </p>

          <h2
            className="text-center text-xl font-bold text-[#FFD700]"
            style={{
              fontFamily: 'var(--font-cinzel-deco), serif',
              textShadow: '0 0 14px rgba(218,165,32,0.45), 0 2px 4px rgba(0,0,0,0.8)',
            }}
          >
            {lang === 'en' ? 'Your precise question' : 'Votre question précise'}
          </h2>

          <p
            className="mt-2 text-center text-xs italic leading-relaxed text-[#E2B8AC]/80"
            style={{ fontFamily: 'var(--font-cinzel), serif' }}
          >
            {lang === 'en'
              ? 'The cards answer best what the heart asks clearly. Formulate your question — Passé, Présent and Avenir will unfold around it.'
              : 'Les cartes répondent mieux à ce que le cœur demande clairement. Formulez votre question — Passé, Présent et Avenir se déploieront autour d’elle.'}
          </p>

          <div className="mx-auto mt-4 h-px w-2/3 bg-gradient-to-r from-transparent via-[#DAA520]/50 to-transparent" />

          <textarea
            autoFocus
            rows={3}
            maxLength={500}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handle();
              }
            }}
            placeholder={
              lang === 'en'
                ? 'e.g. What do I need to understand about this relationship?'
                : 'Ex : Que dois-je comprendre de cette relation ?'
            }
            className="mt-4 w-full resize-none rounded-xl border border-[#DAA520]/40 p-3.5 text-[15px] leading-relaxed text-[#FFF6E8] italic placeholder-[#DAA520]/55 transition-colors focus:border-[#DAA520]/70 focus:outline-none focus:shadow-[0_0_18px_rgba(218,165,32,0.25)]"
            style={{
              // Fond opaque bordeaux profond (le bg translucide rendait le
              // champ blanc sur Android/WebView) + palette sombre forcée.
              fontFamily: 'var(--font-cormorant), Georgia, serif',
              background: 'linear-gradient(160deg, #170a12 0%, #1d0d16 100%)',
              colorScheme: 'dark',
              caretColor: '#FFD700',
              boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.65)',
            }}
          />

          <motion.button
            type="button"
            onClick={handle}
            disabled={!value.trim()}
            className="tarot-btn mt-4 w-full disabled:cursor-not-allowed disabled:opacity-40"
            whileHover={value.trim() ? { scale: 1.03 } : {}}
            whileTap={value.trim() ? { scale: 0.97 } : {}}
          >
            {lang === 'en' ? 'Ask the cards and draw' : 'Interroger les cartes et tirer'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
