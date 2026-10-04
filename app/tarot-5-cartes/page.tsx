'use client';

import { tr } from '@/lib/i18n';
import { cardDisplayName } from '@/lib/i18n/cards';
import { getRuntimeLang } from '@/lib/i18n';
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { TAROT_CARDS } from "@/lib/tarot-data";
import YiSlideNav from '@/components/yi-slide-nav';
import AuthGate from '@/components/auth-gate';

const CARD_WIDTH = 85;
const CARD_HEIGHT = 145;
const CARD_COUNT = TAROT_CARDS.length; // 78

interface Card {
  id: number;
  name: string;
  reversed: boolean;
}

function getRandomCards(): Card[] {
  const indices = Array.from({ length: CARD_COUNT }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const selected = indices.slice(0, 5);
  return selected.map(id => {
    const card = TAROT_CARDS.find(c => c.id === id);
    return {
      id,
      name: card?.name || `Carte ${id}`,
      reversed: Math.random() < 0.3
    };
  });
}

function CardComponent({ card, label }: { card: Card; label?: string }) {
  return (
    <div
      className="relative flex flex-col items-center"
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
      }}
    >
      <div
        className="relative w-full h-full rounded-lg overflow-hidden"
        style={{
          background: "#000",
          boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
          border: "1px solid rgba(218,165,32,0.25)",
        }}
      >
        <Image
          src={`/cards/arcana/${card.id}.jpg`}
          alt={cardDisplayName(card, getRuntimeLang())}
          fill
          style={{ objectFit: "contain", backgroundColor: "#000" }}
          priority
        />
      </div>
      <p
        className="text-center text-yellow-300 text-[11px] mt-1 font-serif whitespace-nowrap"
        style={{
          fontFamily: "var(--font-cinzel), serif",
          textShadow: "0 0 6px rgba(218,165,32,0.6)",
        }}
      >
        {cardDisplayName(card, getRuntimeLang())}
      </p>
    </div>
  );
}

function Tarot5CartesPage() {
  const [question, setQuestion] = useState("");
  const [questionSubmitted, setQuestionSubmitted] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const [drawnCards, setDrawnCards] = useState<Card[] | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [windowHeight, setWindowHeight] = useState(0);
  const router = useRouter();

  useEffect(() => {
    setWindowHeight(window.innerHeight);
  }, []);

  const handleSubmit = () => {
    if (question.trim()) {
      localStorage.setItem("tarot-5-question", question.trim());
      setQuestionSubmitted(true);
      setShuffling(true);

      setTimeout(() => {
        setDrawnCards(getRandomCards());
        setShuffling(false);

        setTimeout(() => setRevealed(true), 500);
      }, 2500);
    }
  };

  const handleInterpretation = () => {
    if (drawnCards) {
      localStorage.setItem("tarot-5-cards", JSON.stringify(drawnCards));
      router.push("/tarot-5-cartes/interpretation");
    }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col items-center justify-center p-4">
      {/* Menu parchemin (remplace la croix) */}
      <YiSlideNav />

      <div className="absolute top-14 text-center z-20 pointer-events-none">
        <h1
          className="text-2xl md:text-3xl font-serif text-yellow-400 mb-1"
          style={{
            fontFamily: "var(--font-cinzel-deco), serif",
            letterSpacing: "0.15em",
            textShadow: "0 0 30px rgba(255,215,0,0.5)",
          }}
        >
          {tr("Tirage en Croix", "Cross Spread", "Tirada en Cruz", "क्रॉस खींच")}
        </h1>
        <p
          className="text-yellow-300 text-xs md:text-sm"
          style={{ fontFamily: "var(--font-cinzel), serif" }}
        >
          {tr("Posez votre question aux cartes", "Pose your question to the cards", "Haga su pregunta a las cartas", "पत्तियों से अपना प्रश्न पूछें")}
        </p>
      </div>

      {/* Champ question centré */}
      {!questionSubmitted && (
        <motion.div
          className="fixed inset-0 z-30 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-full max-w-sm bg-black/70 backdrop-blur-md rounded-2xl p-4 border border-yellow-700/30">
            <p
              className="text-center text-yellow-300/80 text-xs mb-2"
              style={{ fontFamily: "var(--font-cinzel), serif" }}
            >
              🃏 Formulez votre question
            </p>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={tr("Ex: Quel chemin choisir ?", "Ex: Which path to choose?", "Ej: ¿Qué camino elegir?", "उदा: कौन-सा मार्ग चुनूँ ?")}
              className="w-full rounded-lg p-2 text-xs border border-yellow-800/30 focus:border-yellow-500/50 focus:outline-none transition-colors resize-none text-[#FFF6E8] placeholder-yellow-700/50"
              style={{ background: 'linear-gradient(160deg, #170a12 0%, #1d0d16 100%)', colorScheme: 'dark', caretColor: '#FFD700' }}
              rows={2}
              autoFocus
            />
            <motion.button
              onClick={handleSubmit}
              disabled={!question.trim()}
              className="w-full mt-2 tarot-btn text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              ✨ Valider et tirer les 5 cartes
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Affichage question */}
      {questionSubmitted && !shuffling && !drawnCards && (
        <motion.div
          className="absolute top-24 z-20 text-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="bg-yellow-950/30 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-yellow-700/20 max-w-xs">
            <p className="text-yellow-500/60 text-[10px] uppercase tracking-wide mb-0.5">{tr("Votre question", "Your question", "Su pregunta", "आपका प्रश्न")}</p>
            <p className="text-yellow-200 italic text-xs">&ldquo;{question}&rdquo;</p>
          </div>
        </motion.div>
      )}

      {/* Animation de mélange */}
      {questionSubmitted && shuffling && (
        <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ top: "35%" }}>
          <p className="text-yellow-400 text-sm animate-pulse">{tr("Mélange des cartes...", "Shuffling the cards...", "Mezclando las cartas...", "पत्तियाँ मिलाई जा रही हैं...")}</p>
        </div>
      )}

      {/* Tirage - Croix avec Grid CSS pour éviter les chevauchements */}
      {drawnCards && (
        <div className="absolute top-1/2 -translate-y-1/2 z-20 w-full px-4">
          <div className="grid grid-cols-3 gap-x-4 max-w-md mx-auto">
            {/* Ligne 1 : vide - vide - Sommet (3) */}
            <div></div>
            <div className="flex justify-center">
              <CardComponent card={drawnCards[2]} label={tr("Le Sommet", "The Summit", "La Cima", "शिखर")} />
            </div>
            <div></div>

            {/* Ligne 2 : Orient (1) - Synthèse (5) - Occident (2) */}
            <div className="flex justify-center">
              <CardComponent card={drawnCards[0]} label="L'Orient" />
            </div>
            <div className="flex justify-center">
              <CardComponent card={drawnCards[4]} label={tr("La Synthèse", "The Synthesis", "La Síntesis", "सारांश")} />
            </div>
            <div className="flex justify-center">
              <CardComponent card={drawnCards[1]} label="L'Occident" />
            </div>

            {/* Ligne 3 : vide - Base (4) - vide */}
            <div></div>
            <div className="flex justify-center">
              <CardComponent card={drawnCards[3]} label={tr("La Base", "The Foundation", "La Base", "आधार")} />
            </div>
            <div></div>
          </div>
        </div>
      )}

      {/* Bouton Interprétation */}
      {drawnCards && revealed && (
        <motion.div
          className="absolute bottom-24 w-full text-center z-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.button
            onClick={handleInterpretation}
            className="tarot-btn px-6 py-3 text-sm font-bold tracking-wide"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
          >
            ✨ Voir l&rsquo;interprétation
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}

export default function GatedPage() {
  return <AuthGate><Tarot5CartesPage /></AuthGate>;
}
