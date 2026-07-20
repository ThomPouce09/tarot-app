'use client';

// components/contact-widget.tsx
// Widget de contact MAISON (local) — remplace le script tiers Abacus.
// Bouton flottant en bas-droite qui ouvre un modal de contact.
// Aucun overlay plein écran ne capture les taps : le voile du modal n'existe
// QUE quand le modal est ouvert, et se ferme au tap extérieur.

import { useState } from 'react';

// Adresse de contact — À REMPLACER par la tienne.
const CONTACT_EMAIL = 'contact@tarot-divinatoire.fr';

export function ContactWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Bouton flottant */}
      <button
        type="button"
        aria-label="Nous contacter"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-[80] flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
        style={{
          background: 'rgba(26, 14, 10, 0.75)',
          border: '1.5px solid rgba(218, 165, 32, 0.6)',
          boxShadow: '0 0 18px rgba(218,165,32,0.35)',
          color: '#FFD700',
          fontFamily: 'var(--font-cinzel-deco), serif',
          fontSize: 20,
          backdropFilter: 'blur(4px)',
          pointerEvents: 'auto',
        }}
      >
        ✉
      </button>

      {/* Modal (voile UNIQUEMENT quand ouvert) */}
      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative mx-4 w-full max-w-sm rounded-2xl p-6 text-center"
            style={{
              background: 'rgba(26, 14, 10, 0.96)',
              border: '1.5px solid rgba(218, 165, 32, 0.4)',
              boxShadow: '0 0 40px rgba(218,165,32,0.2)',
              fontFamily: 'var(--font-cinzel), serif',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Fermer"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-2 text-[#FFD700] text-lg leading-none transition-colors hover:text-amber-300"
            >
              ×
            </button>

            <h3
              className="mb-3 text-xl font-bold"
              style={{
                fontFamily: 'var(--font-cinzel-deco), serif',
                color: '#FFD700',
                textShadow: '0 0 15px rgba(255,215,0,0.5)',
              }}
            >
              Nous contacter
            </h3>
            <p
              className="mb-5 text-sm"
              style={{ color: 'rgba(255,215,0,0.75)' }}
            >
              Une question, une demande ? Écrivez-nous :
            </p>

            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-block rounded-full px-5 py-2.5 font-semibold transition-all hover:scale-[1.03]"
              style={{
                background: 'linear-gradient(135deg, #8B6914 0%, #DAA520 50%, #8B6914 100%)',
                color: '#1a0e0a',
                border: '1px solid rgba(218,165,32,0.5)',
                letterSpacing: '0.03em',
              }}
            >
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
      )}
    </>
  );
}
