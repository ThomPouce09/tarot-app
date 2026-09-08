'use client';

// ═══════════════════════════════════════════════════════════════════
// /tarot-3-cartes-simplifie — « 3 Cartes Simplifié »
// Étape 1 : intention (4 arcanes-guides × 5 intentions, même mécanique
// que /yi-jing-simplifie et /runes simplifiés). Étape 2 : le tirage des
// 3 arcanes MAJEURS, exactement celui de /tarot-3-cartes (TarotApp
// majorsOnly), avec le libellé discret de l'intention en HAUT-GAUCHE
// (le titre reste centré, les cartes ne sont jamais chevauchées).
// Le bouton « Consulter l'Oracle » passe par la passerelle /interpretation
// qui transmet cartes + question « Arcane — intention » à l'interprétation
// (prompt Oracle ancré sur l'intention + bandeau au-dessus du message).
// ═══════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useLang } from '@/lib/i18n';
import AuthGate from '@/components/auth-gate';
import TarotApp from '../components/tarot-app';
import { TarotThemeSelector, parseTarotQuestion, TAROT_NIGHT } from './theme-selector';

const TABLE_BG = '/backgrounds/table-tarot-bg.jpg?v=11';

function SimplifiePage() {
  const lang = useLang();
  const router = useRouter();
  // Intention choisie (« Arcane — intention »). Le tirage n'apparaît qu'après.
  const [question, setQuestion] = useState<string | null>(null);
  const theme = parseTarotQuestion(question);
  const themeLabel = theme ? `${theme.theme.label[lang]} · ${theme.sub}` : undefined;

  /* ── ÉTAPE 1 — l'intention (flux scrollable, rien ne se superpose) ── */
  if (question === null) {
    return (
      <div className="relative w-full select-none overflow-y-auto" style={{ minHeight: '100dvh' }}>
        {/* Fond : la table du tarot, voilée — cohérente avec l'étape de tirage */}
        <div
          className="fixed inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${TABLE_BG})`, filter: 'brightness(0.5) saturate(1.05)', pointerEvents: 'none' }}
        />
        <div className="fixed inset-0 z-0" style={{ background: 'linear-gradient(180deg, rgba(30,9,18,0.72) 0%, rgba(30,9,18,0.55) 45%, rgba(30,9,18,0.82) 100%)', pointerEvents: 'none' }} />

        <div className="relative z-10 mx-auto max-w-2xl px-3 pt-16 sm:pt-20 pb-24">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="text-center" style={{ padding: '0 16px' }}>
              <h1
                className="title-glow"
                style={{
                  fontFamily: 'var(--font-cinzel-deco), serif',
                  color: '#DAA520',
                  letterSpacing: '0.2em',
                  textShadow: '0 0 40px rgba(218,165,32,0.4), 0 0 80px rgba(74,25,49,0.65)',
                  fontSize: 'clamp(1.6rem, 6vw, 4.5rem)',
                  textTransform: 'uppercase',
                  marginBottom: '0.25rem',
                }}
              >
                {lang === 'en' ? 'The Tarot' : 'Le Tarot'}
              </h1>
              <p
                style={{
                  fontFamily: 'var(--font-cinzel), serif',
                  color: '#F5EAD6',
                  textShadow: '0 0 10px rgba(74,25,49,0.9), 0 1px 4px rgba(0,0,0,0.9)',
                  letterSpacing: '0.05em',
                  fontStyle: 'italic',
                  fontSize: 'clamp(0.7rem, 2vw, 1rem)',
                }}
              >
                {lang === 'en' ? 'Simplified — guided by your guide-arcana' : 'Simplifié — guidé par votre arcane'}
              </p>
            </div>
          </motion.div>

          <motion.div
            className="mt-6 rounded-2xl"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut', delay: 0.15 }}
            style={{ boxShadow: `0 0 0 1px ${TAROT_NIGHT.gold}44, 0 0 30px rgba(0,0,0,0.6)` }}
          >
            <TarotThemeSelector
              onConfirm={(q) => {
                try { localStorage.setItem('tarot-3-simplifie-question', q); } catch {}
                setQuestion(q);
              }}
            />
          </motion.div>
        </div>
      </div>
    );
  }

  /* ── ÉTAPE 2 — le tirage des 3 arcanes majeurs (mécanique /tarot-3-cartes) ── */
  const handleInterpret = (cardIds: number[]) => {
    try {
      localStorage.setItem('tarot-3-cartes-simplifie-cards', JSON.stringify(cardIds));
    } catch {}
    router.push('/tarot-3-cartes-simplifie/interpretation');
  };

  return (
    <div className="relative w-full select-none" style={{ height: '100dvh' }}>
      <TarotApp
        majorsOnly
        title={lang === 'en' ? '3 Cards · Simplified' : '3 Cartes Simplifié'}
        onInterpret={handleInterpret}
        themeLabel={themeLabel}
      />
    </div>
  );
}

export default function GatedPage() {
  return <AuthGate><SimplifiePage /></AuthGate>;
}
