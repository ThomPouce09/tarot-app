'use client';

// components/ask-question.tsx
// Mini champ de question optionnelle, affiché avant le 1er tirage.
// Comporte un champ + bouton "Enregistrer" + bouton "Lancer les dés zodiacaux !"
// qui enregistre la question (ou null) puis appelle onLaunch.

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useT } from '@/lib/i18n';

interface AskQuestionProps {
  /** Appelé avec la question une fois validée (ou null si ignorée). */
  onConfirm: (question: string | null) => void;
  /** Couleur principale (texte au choix dans le thème) */
  accentColor?: string;
  /** Texte du label au-dessus du champ */
  label?: string;
  /** Placeholder du champ */
  placeholder?: string;
  /** Texte du bouton de confirmation (ex: 'Enregistrer') */
  confirmLabel?: string;
  /** Texte du bouton « Lancer les dés » */
  launchLabel?: string;
  /** Appelé quand on clique sur le bouton de lancement */
  onLaunch?: () => void;
  /** Texte à afficher en glow au-dessus du champ (B) */
  glowLabel?: string;
}

export function AskQuestion({
  onConfirm,
  accentColor,
  label,
  placeholder,
  confirmLabel,
  launchLabel,
  onLaunch,
  glowLabel,
}: AskQuestionProps) {
  const t = useT();
  const [question, setQuestion] = useState('');
  const [visible, setVisible] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleConfirm = () => {
    const q = question.trim();
    onConfirm(q || null);
    setVisible(false);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const handleLaunch = () => {
    const q = question.trim();
    onConfirm(q || null);
    setVisible(false);
    onLaunch?.();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="mb-4 text-center rounded-2xl border p-4"
          style={{
            borderColor: 'rgba(100,180,255,0.35)',
          }}
        >
          {glowLabel && (
            <p className="mb-3 affinage-glow">{glowLabel}</p>
          )}
          <div className="flex items-center gap-2 justify-center flex-wrap">
            <input
              ref={inputRef}
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={placeholder || t('askQuestion.placeholder')}
              className="rounded-lg px-4 py-2 w-full max-w-sm text-sm"
              style={{
                background: 'rgba(0,0,0,0.35)',
                border: `1px solid ${accentColor || 'rgba(100,180,255,0.4)'}`,
                color: '#f0e6d3',
                fontFamily: 'var(--font-cormorant), serif',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirm();
              }}
            />
            <button
              onClick={handleConfirm}
              className="rounded-full px-4 py-[9px] text-sm font-semibold transition-all hover:opacity-80"
              style={{
                background: '#005f6a',
                color: '#fff',
                fontFamily: 'var(--font-cinzel), serif',
                boxShadow: '0 0 12px rgba(0,95,106,0.5)',
              }}
            >
              {confirmLabel || t('askQuestion.confirm')}
            </button>
          </div>
        </motion.div>
      )}
      {visible && onLaunch && launchLabel && (
        <motion.button
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          onClick={handleLaunch}
          className="mt-12 rounded-full px-8 py-3.5 text-base font-bold transition-all hover:opacity-80"
          style={{
            background: '#005f6a',
            color: '#fff',
            fontFamily: 'var(--font-cinzel-deco), serif',
            boxShadow: '0 0 24px rgba(0,95,106,0.45)',
            border: '1px solid rgba(0,95,106,0.6)',
          }}
        >
          {launchLabel}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
