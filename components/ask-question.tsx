'use client';

// components/ask-question.tsx
// Mini champ de question optionnelle, affiché avant le 1er tirage.
// Comporte un champ + bouton "Enregistrer" + bouton "Lancer les dés zodiacaux !"
// qui enregistre la question (ou null) puis appelle onLaunch.

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useT } from '@/lib/i18n';

/** Fonce une couleur hex (facteur 0-1) → gros CTA assorti à l'accent du thème. */
function darkenHex(hex: string, f: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

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
  /** Ref synchronisée avec la valeur courante du champ (pour accès externe) */
  questionValueRef?: React.MutableRefObject<string | null>;
  /** Désactiver l'auto-focus (ex: quand le résultat du tirage est affiché avant) */
  autoFocus?: boolean;
  /** Question obligatoire : le bouton de confirmation reste désactivé tant que le champ est vide. */
  required?: boolean;
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
  questionValueRef,
  autoFocus = true,
  required = false,
}: AskQuestionProps) {
  const t = useT();
  const [question, setQuestion] = useState('');
  const [visible, setVisible] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      const timer = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuestion(val);
    if (questionValueRef) questionValueRef.current = val;
  };

  const handleConfirm = () => {
    const q = question.trim();
    if (required && !q) return; // question obligatoire : rien à enregistrer
    onConfirm(q || null);
    setVisible(false);
    onLaunch?.();
  };

  const handleLaunch = () => {
    const q = question.trim();
    if (required && !q) return;
    onConfirm(q || null);
    setVisible(false);
    onLaunch?.();
  };

  const qEmpty = required && !question.trim();

  // « Enregistrer » : pilule teal glossée fixe (même design que RuneButton
  // variant="save") sur toutes les pages ; accentColor ne teint plus que le
  // cadre, le champ et le gros CTA de lancement.
  const btnBg = '#005f6a';
  const btnGlow = `${btnBg}80`;
  const launchBg = accentColor && accentColor.startsWith('#') ? darkenHex(accentColor, 0.45) : '#005f6a';
  const launchGlow = `${launchBg}80`;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div key="question"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className={`mb-4 text-center rounded-2xl border p-4 ${required ? 'border-2' : ''}`}
          style={{
            borderColor: accentColor
              ? required
                ? `${accentColor}aa`
                : `${accentColor}59`
              : 'rgba(100,180,255,0.35)',
          }}
        >
          {glowLabel && (
            <p className="mb-3 affinage-glow">{glowLabel}</p>
          )}
          {required && (
            <p
              className="mb-2.5 text-sm"
              style={{
                fontFamily: 'var(--font-cinzel), serif',
                color: accentColor || '#8ab4ff',
                textShadow: accentColor ? `0 0 12px ${accentColor}55` : 'none',
              }}
            >
              {t('askQuestion.requiredHint')}
            </p>
          )}
          <div className="flex items-center gap-2 justify-center flex-wrap">
            <input
              ref={inputRef}
              type="text"
              value={question}
              onChange={handleInputChange}
              placeholder={placeholder || t('askQuestion.placeholder')}
              className="rounded-lg px-4 py-2 w-full max-w-sm text-sm"
              style={{
                background: 'rgba(0,0,0,0.35)',
                border: `1px solid ${accentColor || 'rgba(100,180,255,0.4)'}`,
                boxShadow: required && !question.trim() ? `0 0 14px ${accentColor ? `${accentColor}44` : 'rgba(100,180,255,0.25)'}` : 'none',
                color: '#f0e6d3',
                fontFamily: 'var(--font-cormorant), serif',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirm();
              }}
            />
            <button
              onClick={handleConfirm}
              disabled={qEmpty}
              className="rounded-full px-4 py-[9px] text-sm font-semibold transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100"
              style={{
                // Gloss : reflet blanc dégradé par-dessus la couleur de base
                // (même technique que .mystic-btn) + biseau bas ombré.
                background: `
                  linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.12) 38%, rgba(255,255,255,0) 60%),
                  ${btnBg}`,
                color: '#fff',
                fontFamily: 'var(--font-cinzel), serif',
                boxShadow: qEmpty
                  ? 'none'
                  : `0 0 12px ${btnGlow}, inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -3px 7px rgba(0,0,0,0.35)`,
              }}
            >
              {confirmLabel || t('askQuestion.confirm')}
            </button>
          </div>
        </motion.div>
      )}
      {visible && onLaunch && launchLabel && (
        <motion.button key="launch"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          onClick={handleLaunch}
          className="mt-12 rounded-full px-8 py-3.5 text-base font-bold transition-all hover:opacity-80"
          style={{
            background: launchBg,
            color: '#fff',
            fontFamily: 'var(--font-cinzel-deco), serif',
            boxShadow: `0 0 24px ${launchGlow}`,
            border: `1px solid ${launchBg}99`,
            position: 'relative',
            zIndex: 20,
          }}
        >
          {launchLabel}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
