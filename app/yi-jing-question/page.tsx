'use client';

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useLang, pick4, tr } from '@/lib/i18n';
import YiSlideNav from '@/components/yi-slide-nav';
import AuthGate from '@/components/auth-gate';

// Reglage du rig, extrait a l'etape 1 du decoupage (le reste est consomme par ./rig).
import { YI_QING_BG, TITLE_TOP } from './rig-config';

// Le rig, extrait a l'etape 2 du decoupage.
import { YiJingQuestionRig } from './rig';


// --- Main Page ---
function YiJingQuestionPage() {
  const lang = useLang();
  const [question, setQuestion] = useState('');
  const [questionAsked, setQuestionAsked] = useState(false);
  const [drawProgress, setDrawProgress] = useState(0);
  const [drawPhase, setDrawPhase] = useState('idle');
  const handleProgress = useCallback((p: number, ph: string) => {
    setDrawProgress(p);
    setDrawPhase(ph);
  }, []);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const user = localStorage.getItem('tarot_user');
    if (!user) {
      router.push('/auth/login');
      return;
    }
    setIsLoggedIn(true);
    setCheckingAuth(false);
  }, []);

  const handleSubmitQuestion = () => {
    if (question.trim()) {
      localStorage.setItem('yi-jing-question-question', question.trim());
      setQuestionAsked(true);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-[#e8b84b]">{tr("Vérification...", "Verifying...", "Verificación...", "सत्यापन...")}</p>
      </div>
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden select-none"
      style={{ height: '100dvh', minHeight: '-webkit-fill-available' }}
    >
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

      {/* Languette de navigation (prototype) — bord gauche, tap pour ouvrir */}
      <YiSlideNav />

      {/* YI JING QUESTION RIG */}
      <YiJingQuestionRig questionAsked={questionAsked} onProgress={handleProgress} />

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
            fontSize: 'clamp(1.4rem, 5vw, 3.5rem)',
            textTransform: 'uppercase',
            marginBottom: '0.25rem',
          }}
        >
          {pick4('Yi Jing', 'I Ching', "Yi Jing", "इ चिंग")(lang)}
        </h1>
      </div>

      {/* CHAMP QUESTION — visible avant le tirage */}
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
              🪶 {pick4('Formulez votre question', 'Ask your question', "Formule su pregunta", "अपना प्रश्न पूछें")(lang)}
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
              placeholder={pick4('Ex: Dois-je accepter cette opportunité professionnelle ?', 'e.g. Should I accept this career opportunity?', "Ej.: ¿Debo aceptar esta oportunidad profesional?", "जैसे: क्या मुझे यह व्यावसायिक अवसर स्वीकार करना चाहिए?")(lang)}
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
              ✨ {lang === 'fr'
                ? 'Valider et tirer une baguette'
                : lang === 'en' ? <>Validate and draw<br />a yarrow stalk</>
                : lang === 'es' ? <>Validar y sacar<br />una varilla</>
                : <>सत्यापित करें और<br />एक डंडी निकालें</>}
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Affichage de la question posée */}
      {questionAsked && (
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 z-30 w-full max-w-sm px-6"
          style={{ top: TITLE_TOP + 36 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="bg-yellow-950/30 backdrop-blur-sm rounded-lg px-4 py-2 border border-yellow-700/20 text-center">
            <p className="text-yellow-500/60 text-xs uppercase tracking-wide mb-0.5">{pick4('Votre question', 'Your question', "Su pregunta", "आपका प्रश्न")(lang)}</p>
            <p className="text-yellow-200 italic text-sm">&quot;{question}&quot;</p>
          </div>

          {/* Barre de progression du tirage : toujours juste sous la question */}
          {drawPhase === 'idle' && (
            <div className="mx-auto mt-3 w-32 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255, 215, 0, 0.2)' }}>
              <div
                style={{
                  width: `${drawProgress * 100}%`,
                  height: '100%',
                  backgroundColor: '#FFD700',
                  transition: 'width 0.1s',
                }}
              />
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

export default function GatedPage() {
  return <AuthGate><YiJingQuestionPage /></AuthGate>;
}