'use client';

// components/ask-question.tsx
// Mini champ de question optionnelle, affiché avant le 1er tirage.
// Fondu si l'utilisateur ne veut pas poser de question.

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useT } from '@/lib/i18n';

interface AskQuestionProps {
  /** Appelé avec la question une fois validée (ou null si ignorée). */
  onConfirm: (question: string | null) => void;
  /** Couleur principale (texte au choix dans le thème) */
  accentColor?: string;
  placeholder?: string;
}

export function AskQuestion({ onConfirm, accentColor, placeholder }: AskQuestionProps) {
  const t = useT();
  const [question, setQuestion] = useState('');
  const [visible, setVisible] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus automatique
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleConfirm = () => {
    const q = question.trim();
    onConfirm(q || null);
    setVisible(false);
  };

  const handleSkip = () => {
    onConfirm(null);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="mb-6 text-center"
        >
          <label
            className="block text-sm mb-2"
            style={{ fontFamily: 'var(--font-cinzel), serif', color: accentColor || '#D4B483' }}
          >
            {t('askQuestion.label')}
          </label>
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
                border: `1px solid ${accentColor || 'rgba(212,180,131,0.4)'}`,
                color: '#f0e6d3',
                fontFamily: 'var(--font-cormorant), serif',
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
            />
            <button
              onClick={handleConfirm}
              className="rounded-lg px-4 py-[9px] text-sm font-semibold transition-all hover:opacity-80"
              style={{
                background: accentColor || 'linear-gradient(135deg, #D4B483, #B8860B)',
                color: '#1a0e0a',
                fontFamily: 'var(--font-cinzel), serif',
              }}
            >
              {t('askQuestion.confirm')}
            </button>
          </div>
          <button
            onClick={handleSkip}
            className="mt-1.5 text-xs underline opacity-50 hover:opacity-80 transition-all"
            style={{ color: accentColor || '#D4B483', fontFamily: 'var(--font-cinzel), serif' }}
          >
            {t('askQuestion.skip')}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
