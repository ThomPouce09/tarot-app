'use client';

import { useState } from "react";
import { motion } from "framer-motion";
import { useLang, pick4 } from '@/lib/i18n';
import YiSlideNav from '@/components/yi-slide-nav';
import AuthGate from '@/components/auth-gate';
// Configuration du rig, extraite a l'etape 1 du decoupage.
import { YI_QING_BG, TITLE_TOP } from './rig-config';
// Le rig, extrait a l'etape 2 du decoupage.
import { YiQingRig } from './rig';



// --- Main Page ---
function YiQingPage() {
  const lang = useLang();
  const [question, setQuestion] = useState('');
  const [questionAsked, setQuestionAsked] = useState(false);
  const [qOpen, setQOpen] = useState(false);

  const handleSubmitQuestion = () => {
    if (question.trim()) setQuestionAsked(true);
  };

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

      {/* YI QING RIG */}
      <YiQingRig questionAsked={questionAsked} question={question} />

      {/* MODALE QUESTION — visible avant le tirage (même pattern que /yi-jing-question) */}
      {!questionAsked && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <div className="w-full max-w-md bg-black/70 backdrop-blur-md rounded-2xl p-5 border border-yellow-700/30 shadow-2xl">
            <p
              className="text-center text-yellow-300/80 text-sm mb-3"
              style={{ fontFamily: 'var(--font-cinzel), serif' }}
            >
              {pick4('Formulez votre question', 'Ask your question', "Formule su pregunta", "अपना प्रश्न बनाएँ")(lang)}
            </p>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitQuestion();
                }
              }}
              placeholder={pick4('Ex: Dois-je accepter cette opportunité professionnelle ?', 'e.g. Should I accept this career opportunity?', "Ej.: ¿Debo aceptar esta oportunidad profesional?", "जैसे: क्या मुझे यह करियर का अवसर स्वीकार करना चाहिए?")(lang)}
              className="w-full bg-black/50 text-yellow-100 placeholder-yellow-700/50 rounded-lg p-3 text-sm border border-yellow-800/30 focus:border-yellow-500/50 focus:outline-none transition-colors resize-none"
              rows={3}
              style={{ fontFamily: 'serif' }}
              autoFocus
            />
            <motion.button
              onClick={handleSubmitQuestion}
              disabled={!question.trim()}
              className="w-full mt-3 yi-btn text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={question.trim() ? { scale: 1.03 } : {}}
              whileTap={question.trim() ? { scale: 0.97 } : {}}
            >
              {lang === 'fr'
                ? 'Valider et tirer une baguette'
                : lang === 'en' ? <>Validate and draw<br />a yarrow stalk</>
                : lang === 'es' ? <>Validar y sacar<br />una varilla</>
                : <>सत्यापित करें और<br />एक डंडी निकालें</>}
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Question posée — tiroir discret en BAS d'écran (n'interfère plus avec la
          barre de progression du tirage). Partiellement visible, étirable au tap. */}
      {questionAsked && (
        <motion.div
          className="absolute left-0 z-30 w-full px-4"
          style={{ bottom: 14 }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <button
            type="button"
            onClick={() => setQOpen((v) => !v)}
            aria-expanded={qOpen}
            className="inline-flex max-w-full items-center gap-2.5 rounded-xl border border-yellow-700/25 bg-black/55 backdrop-blur-sm px-4 py-2.5 text-left shadow-[0_2px_14px_rgba(0,0,0,0.5)] active:bg-black/70 transition-colors"
          >
            <span
              className="shrink-0 text-yellow-500/70 text-[10px] uppercase tracking-[0.18em]"
              style={{ fontFamily: 'var(--font-cinzel), serif' }}
            >
              {pick4('Votre question', 'Your question', "Su pregunta", "आपका प्रश्न")(lang)}
            </span>
            {!qOpen && (
              <span className="min-w-0 max-w-[46vw] truncate text-yellow-200/75 italic text-xs" style={{ fontFamily: 'serif' }}>
                « {question} »
              </span>
            )}
            <svg
              viewBox="0 0 16 16"
              className={`shrink-0 transition-transform duration-300 ${qOpen ? 'rotate-180' : ''}`}
              style={{ width: 14, height: 14 }}
              fill="none"
              stroke="#F3C969"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 6l5 5 5-5" />
            </svg>
          </button>
          {qOpen && (
            <div
              className="mt-1.5 w-full max-h-[38dvh] overflow-y-auto rounded-xl border border-yellow-700/30 bg-black/70 backdrop-blur px-4 py-3"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <p className="text-yellow-100/90 italic text-sm leading-relaxed" style={{ fontFamily: 'serif' }}>
                « {question} »
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Google Material Symbols */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=swipe"
      />

      {/* TITLE */}
      <div
        style={{
          position: "absolute",
          top: TITLE_TOP,
          left: 0,
          right: 0,
          zIndex: 30,
          textAlign: 'center',
          padding: '0 16px',
          pointerEvents: 'none',
        }}
      >
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
          {pick4('La sagesse des hexagrammes', 'The wisdom of the hexagrams', "La sabiduría de los hexagramas", "षट्कोणों का ज्ञान")(lang)}
        </p>
      </div>
    </div>
  );
}

export default function GatedPage() {
  return <AuthGate><YiQingPage /></AuthGate>;
}