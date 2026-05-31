'use client';

import { motion } from 'framer-motion';
import { DrawnCardData } from './tarot-app';
import { X, RotateCcw, Sparkles } from 'lucide-react';

interface InterpretationPanelProps {
  drawnCards: DrawnCardData[];
  onClose: () => void;
  onReset: () => void;
}

const POSITION_LABELS = ['Passé', 'Présent', 'Avenir'];

const LOREM_INTERPRETATIONS = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Les forces cosmiques alignées dans cette position révèlent un chemin de transformation intérieure.",
  "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Cette carte illumine votre présent d'une lumière mystique et bienveillante.",
  "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. L'avenir se dessine sous les auspices de forces puissantes et transformatrices.",
];

export default function InterpretationPanel({ drawnCards, onClose, onReset }: InterpretationPanelProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />

      {/* Panel */}
      <motion.div
        className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl"
        style={{
          background: 'linear-gradient(180deg, #1a0e0a 0%, #2d1b0e 50%, #1a0e0a 100%)',
          border: '1px solid rgba(218,165,32,0.3)',
          boxShadow: '0 0 60px rgba(218,165,32,0.15), 0 20px 60px rgba(0,0,0,0.7)',
        }}
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 50 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-5"
          style={{ background: 'linear-gradient(180deg, #1a0e0a, transparent)', borderBottom: '1px solid rgba(218,165,32,0.15)' }}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: '#DAA520' }} />
            <h2
              className="text-xl md:text-2xl tracking-wider"
              style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: '#DAA520' }}
            >
              Interprétation du Tirage
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" style={{ color: '#DAA520' }} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6">
          {(drawnCards ?? [])?.map?.((drawn: DrawnCardData, idx: number) => (
            <motion.div
              key={drawn?.card?.id ?? idx}
              className="rounded-lg p-4"
              style={{
                background: 'rgba(218,165,32,0.05)',
                border: '1px solid rgba(218,165,32,0.12)',
              }}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.2 + 0.3 }}
            >
              {/* Card title row */}
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="text-xs tracking-widest uppercase px-3 py-1 rounded-full"
                  style={{
                    fontFamily: 'var(--font-cinzel), serif',
                    color: '#DAA520',
                    background: 'rgba(218,165,32,0.1)',
                    border: '1px solid rgba(218,165,32,0.2)',
                  }}
                >
                  {POSITION_LABELS[idx] ?? ''}
                </span>
                <h3
                  className="text-base md:text-lg font-semibold"
                  style={{ fontFamily: 'var(--font-cinzel), serif', color: '#e8d5a3' }}
                >
                  {drawn?.card?.name ?? 'Inconnue'}
                  {drawn?.reversed && (
                    <span className="text-sm italic ml-2" style={{ color: 'rgba(218,165,32,0.5)' }}>
                      (Inversée)
                    </span>
                  )}
                </h3>
              </div>

              {/* Keywords */}
              <div className="flex gap-2 mb-3 flex-wrap">
                {(drawn?.card?.keywords ?? [])?.map?.((kw: string, ki: number) => (
                  <span
                    key={ki}
                    className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{
                      color: 'rgba(218,165,32,0.7)',
                      background: 'rgba(218,165,32,0.08)',
                    }}
                  >
                    {kw ?? ''}
                  </span>
                )) ?? []}
              </div>

              {/* Lorem ipsum interpretation */}
              <p
                className="text-sm leading-relaxed reveal-text"
                style={{ color: 'rgba(232,213,163,0.7)', fontFamily: 'var(--font-cinzel), serif' }}
              >
                {LOREM_INTERPRETATIONS[idx] ?? ''}
              </p>
            </motion.div>
          )) ?? []}

          {/* Synthesis */}
          <motion.div
            className="rounded-lg p-4 mt-4"
            style={{
              background: 'rgba(218,165,32,0.08)',
              border: '1px solid rgba(218,165,32,0.2)',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
          >
            <h3
              className="text-base font-semibold mb-2 flex items-center gap-2"
              style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: '#DAA520' }}
            >
              <Sparkles className="w-4 h-4" />
              Synthèse Générale
            </h3>
            <p
              className="text-sm leading-relaxed reveal-text"
              style={{ color: 'rgba(232,213,163,0.7)', fontFamily: 'var(--font-cinzel), serif' }}
            >
              Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet. Les trois cartes tirées ensemble dessinent un récit cosmique unique, tissé par les fils du destin et illuminé par la sagesse ancestrale du tarot.
            </p>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            className="flex justify-center gap-4 pt-2 pb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            <button
              onClick={onReset}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold tracking-wide transition-all"
              style={{
                fontFamily: 'var(--font-cinzel), serif',
                background: 'linear-gradient(135deg, #8B6914 0%, #DAA520 50%, #8B6914 100%)',
                color: '#1a0e0a',
                boxShadow: '0 0 20px rgba(218,165,32,0.3)',
              }}
            >
              <RotateCcw className="w-4 h-4" />
              Nouveau Tirage
            </button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
