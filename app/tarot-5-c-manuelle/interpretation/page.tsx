'use client';

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

interface CardInfo {
  id: number;
  name: string;
  reversed: boolean;
}

interface Interpretation {
  situation?: string;
  defis?: string;
  soutien?: string;
  issue?: string;
  conseil?: string;
}

export default function Tarot5ManuelleInterpretationPage() {
  const [interpretation, setInterpretation] = useState<Interpretation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<CardInfo[]>([]);
  const [question, setQuestion] = useState<string>("");
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const storedCards = localStorage.getItem("tarot-5-cards");
    const storedQuestion = localStorage.getItem("tarot-5-question");

    if (!storedCards) {
      setError("Aucun tirage trouvé. Retournez à la page d'accueil pour tirer les cartes.");
      setLoading(false);
      return;
    }

    const parsedCards: CardInfo[] = JSON.parse(storedCards);
    setCards(parsedCards);
    setQuestion(storedQuestion || "");

    // Récupérer l'utilisateur connecté
    let userId: string | undefined;
    try {
      const storedUser = localStorage.getItem("tarot_user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        userId = user.email;
      }
    } catch (e) {}

    const cardIds = parsedCards.map(c => c.id);

    fetch("/api/tarot-5-interpretation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cartes: cardIds,
        question: storedQuestion || undefined,
        userId
      })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setInterpretation(data);
      })
      .catch((err) => {
        setError(err.message);
        setInterpretation(null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <p className="text-yellow-400 text-lg animate-pulse">Les cartes vont révéler leur message ...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center p-4 overflow-y-auto">
      {/* Croix retour */}
      <Link
        href="/"
        className="fixed top-4 right-4 text-yellow-400 text-3xl font-bold hover:text-yellow-300 transition-colors z-50"
        aria-label="Retour à l'accueil"
      >
        ×
      </Link>

      <div className="w-full max-w-md mt-20 text-center">
        <h1 className="text-2xl font-serif text-yellow-400 mb-2">Interprétation du Tirage</h1>

        {question && (
          <div className="mb-4 bg-yellow-950/20 border border-yellow-700/30 rounded-lg p-3">
            <p className="text-yellow-500/70 text-xs uppercase tracking-wide mb-1">Votre question</p>
            <p className="text-yellow-200 italic text-sm">"{question}"</p>
          </div>
        )}

        {error && <p className="text-red-400 mb-4">{error}</p>}
        
        <div className="text-left space-y-4">
          <h2 className="text-yellow-500 font-bold">📍 Situation actuelle</h2>
          <p className="text-gray-200 mb-4">{interpretation?.situation || "L'analyse de la situation..."}</p>

          <h2 className="text-yellow-500 font-bold">⚔️ Défis à surmonter</h2>
          <p className="text-gray-200 mb-4">{interpretation?.defis || "Les obstacles révélés..."}</p>

          <h2 className="text-yellow-500 font-bold">🌟 Soutien disponible</h2>
          <p className="text-gray-200 mb-4">{interpretation?.soutien || "Les forces intérieures..."}</p>

          <h2 className="text-yellow-500 font-bold">🔮 Issue probable</h2>
          <p className="text-gray-200 mb-4">{interpretation?.issue || "L'issue se dessine..."}</p>

          <h2 className="text-yellow-500 font-bold">💡 Conseil des cartes</h2>
          <p className="text-gray-200">{interpretation?.conseil || "Le conseil des arcanes..."}</p>
        </div>

        {/* Croix des cartes */}
        <div className="grid grid-cols-3 grid-rows-3 gap-4 max-w-xs mb-8 mt-8">
          <div></div>
          <div className="flex justify-center">
            <div className="text-center">
              <span className="text-amber-400 text-sm font-bold">Sommet</span>
              {cards[0] && (
                <p className="text-amber-100 text-xs mt-1">{cards[0].name}</p>
              )}
            </div>
          </div>
          <div></div>

          <div className="flex justify-center items-center">
            <span className="text-amber-400 text-sm font-bold mr-2">Orient</span>
            {cards[1] && (
              <p className="text-amber-100 text-xs">{cards[1].name}</p>
            )}
          </div>
          <div className="flex justify-center">
            <div className="text-center">
              <span className="text-amber-400 text-sm font-bold block mb-2">Synthèse</span>
              {cards[2] && (
                <p className="text-amber-100 text-xs">{cards[2].name}</p>
              )}
            </div>
          </div>
          <div className="flex justify-center items-center">
            <span className="text-amber-400 text-sm font-bold mr-2">Occident</span>
            {cards[3] && (
              <p className="text-amber-100 text-xs">{cards[3].name}</p>
            )}
          </div>

          <div></div>
          <div className="flex justify-center">
            <div className="text-center">
              <span className="text-amber-400 text-sm font-bold">Base</span>
              {cards[4] && (
                <p className="text-amber-100 text-xs mt-1">{cards[4].name}</p>
              )}
            </div>
          </div>
          <div></div>
        </div>
      </div>
    </div>
  );
}