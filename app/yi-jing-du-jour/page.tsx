'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// ─── Types ───────────────────────────────────────────────
interface HexagramData {
  numero: number;
  caractere: string;
  pinyin: string;
  dateDebut: string;
  dateFin: string;
  element: string;
  strategie: string;
  attitude: string;
  conseil: string;
  synthese: string;
  lignes: string[];
}

interface ApiResponse {
  found: boolean;
  today: string;
  hexagram?: HexagramData;
  message?: string;
  error?: string;
}

// ─── Helpers ─────────────────────────────────────────────
function todayFrench(): string {
  const d = new Date();
  const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const mois = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
  return jours[d.getDay()] + ' ' + d.getDate() + ' ' + mois[d.getMonth()] + ' ' + d.getFullYear();
}

function parseLignes(raw: string[] | string): string[] {
  if (Array.isArray(raw)) return raw;
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

// ─── Composant Ligne d'hexagramme ────────────────────────
function HexagramLine({ line, index }: { line: string; index: number }) {
  const isYang = line.includes('━━━━━') || line.includes('━━━━');
  return (
    <div className="flex items-center gap-4 group">
      <span className="text-[10px] font-mono text-purple-300/80 w-4 text-right">
        {index + 1}
      </span>
      <div className="flex-1 flex justify-center">
        {isYang ? (
          <div className="h-[6px] w-4/5 max-w-[200px] rounded-full bg-gradient-to-r from-purple-400 via-fuchsia-300 to-purple-400 shadow-[0_0_12px_rgba(180,140,200),0.5)]" />
        ) : (
          <div className="flex gap-3 items-center justify-center w-4/5 max-w-[200px]">
            <div className="h-[6px] w-[40%] rounded-full bg-gradient-to-r from-purple-700/60 to-purple-600/40" />
            <div className="h-[6px] w-[40%] rounded-full bg-gradient-to-r from-purple-600/40 to-purple-700/60" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Composant Particule Etincelle ───────────────────────
function Sparkles() {
  const [sparks, setSparks] = useState<{ id: number; left: string; delay: string; size: string }[]>([]);
  useEffect(() => {
    const arr = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100 + '%',
      delay: Math.random() * 8 + 's',
      size: 2 + Math.random() * 4 + 'px',
    }));
    setSparks(arr);
  }, []);

  if (sparks.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {sparks.map((s) => (
        <div
          key={s.id}
          className="absolute bottom-0 rounded-full bg-purple-300/40 animate-sparkle-float"
          style={{
            left: s.left,
            width: s.size,
            height: s.size,
            animationDelay: s.delay,
            animationDuration: 4 + Math.random() * 6 + 's',
          }}
        />
      ))}
    </div>
  );
}

// ─── Page Principale ─────────────────────────────────────
export default function YiJingDuJourPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSynthese, setShowSynthese] = useState(false);

  useEffect(() => {
    fetch('/api/yi-jing-du-jour')
      .then((r) => r.json())
      .then((json: ApiResponse) => {
        setData(json);
        if (json.hexagram && typeof json.hexagram.lignes === 'string') {
          json.hexagram.lignes = parseLignes(json.hexagram.lignes);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const hex = data?.hexagram;

  return (
      <div className="relative min-h-screen w-full" style={{ backgroundImage: `url("/backgrounds/yi-jing-bg.jpg")`, backgroundRepeat: "repeat-y", backgroundSize: "contain", backgroundPosition: "center top" }}>
        {/* Croix retour vers /yi-jing */}
        <Link
          href="/yi-jing"
          className="fixed top-4 right-4 text-purple-300 text-3xl font-bold hover:text-purple-200 transition-colors z-50 leading-none p-2 -m-2"
          aria-label="Retour au Yi Jing"
          style={{ textShadow: "0 0 12px rgba(180,140,200,0.35)" }}
        >
          ×
        </Link>

        {/* Overlay sombre pour assombrir le background */}
        <div className="absolute inset-0 bg-black/30 z-0" />
      
        <Sparkles />
      
        <div className="relative z-10 flex flex-col items-center px-4 py-12 md:py-20 min-h-screen" style={{ height: "auto" }}>
        {/* En-tete */}
        <header className="text-center mb-8 md:mb-14 animate-fade-in">
          <p className="text-purple-300/70 text-xs md:text-sm tracking-[0.3em] uppercase mb-2">
            Yi Jing &bull; Oracle ancestral
          </p>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-purple-300/90 title-glow tracking-wider">
            Hexagramme du Jour
          </h1>
          <p className="text-purple-300/70 text-sm md:text-base mt-3 italic">
            {todayFrench()}
          </p>
        </header>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-4 mt-20">
            <div className="w-12 h-12 border-2 border-purple-600/30 border-t-purple-400 rounded-full animate-spin" />
            <p className="text-purple-300/80 text-sm">Consultation des astres...</p>
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="mt-20 text-center">
            <p className="text-red-400/80">{'\\u26A0'} {error}</p>
          </div>
        )}

        {/* Aucun hexagramme */}
        {!loading && !error && data && !data.found && (
          <div className="mt-20 text-center">
            <p className="text-purple-300/80 text-lg">Aucun hexagramme pour cette periode.</p>
            <p className="text-purple-300/70 text-sm mt-2">Les cycles cosmiques sont en transition.</p>
          </div>
        )}

        {/* Carte Hexagramme */}
        {!loading && hex && (
          <div className="w-full max-w-2xl animate-rise-up">
            <div className="relative rounded-2xl border border-purple-800/30 bg-gradient-to-b from-[#1a1230]/90 via-[#120a26]/95 to-[#0d0820]/90 backdrop-blur-sm p-6 md:p-10 shadow-[0_0_60px_rgba(180,140,200),0.08)]">
              {/* Coins decoratifs */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-purple-700/30 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-purple-700/30 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-purple-700/30 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-purple-700/30 rounded-br-xl" />

              {/* Numero + Dates */}
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-purple-900/20">
                <div className="flex items-center gap-3">
                  <span className="text-5xl md:text-6xl font-bold text-purple-400/30 select-none">
                    {String(hex.numero).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="text-purple-300/90 text-xs tracking-widest uppercase">Hexagramme</p>
                    <p className="text-purple-300/90 text-xl md:text-2xl font-bold">{hex.numero}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-purple-300/80 text-xs tracking-wide">Periode</p>
                  <p className="text-purple-300/90 text-sm font-medium">
                    {hex.dateDebut} &mdash; {hex.dateFin}
                  </p>
                </div>
              </div>

              {/* Lignes hexagramme */}
              <div className="flex flex-col gap-2 py-6 mb-6 border-y border-purple-900/20">
                {[...(hex.lignes || [])].reverse().map((line, i) => (
                  <HexagramLine key={i} line={line} index={5 - i} />
                ))}
              </div>

              {/* Caractere + Pinyin */}
              <div className="text-center my-8">
                <p className="text-7xl md:text-9xl text-purple-200/90 drop-shadow-[0_0_30px_rgba(180,140,200),0.15)] animate-pulse-glow">
                  {hex.caractere}
                </p>
                <p className="text-2xl md:text-3xl text-purple-300/90 mt-3 tracking-widest">
                  {hex.pinyin}
                </p>
              </div>

              {/* Mots-cles (element uniquement en haut) */}
              {(hex.element) && (
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  {[hex.element].filter(Boolean).map((kw, i) => (
                    <span
                      key={i}
                      className="px-4 py-1.5 text-xs md:text-sm rounded-full border border-purple-700/30 bg-purple-950/30 text-purple-300/80 tracking-wider"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}

              {/* Bloc STRATEGIE */}
              {hex.strategie && (
                <div className="relative mt-6 p-5 rounded-xl bg-purple-950/10 border border-purple-800/20">
                  <p className="text-purple-300/80 text-[10px] uppercase tracking-[0.3em] mb-2">{'✦'} Stratégie</p>
                  <p className="text-purple-200/80 text-sm md:text-base leading-relaxed">
                    {hex.strategie}
                  </p>
                </div>
              )}

              {/* Bloc ATTITUDE */}
              {hex.attitude && (
                <div className="relative mt-4 p-5 rounded-xl bg-purple-950/10 border border-purple-800/20">
                  <p className="text-purple-300/80 text-[10px] uppercase tracking-[0.3em] mb-2">{'☯'} Attitude</p>
                  <p className="text-purple-200/80 text-sm md:text-base leading-relaxed">
                    {hex.attitude}
                  </p>
                </div>
              )}

              {/* Bloc CONSEIL (encadré, mis en avant) */}
              {hex.conseil && (
                <div className="relative mt-6 p-6 rounded-2xl bg-gradient-to-b from-purple-900/25 via-[#1a1230]/95 to-[#0d0820]/95 border border-purple-600/40 shadow-[0_0_40px_rgba(180,140,200),0.12)]">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-0.5 rounded-full bg-[#1a1230] border border-purple-700/30 text-purple-300/80 text-[10px] uppercase tracking-[0.3em]">
                    {'✶'} Conseil
                  </div>
                  <p className="text-purple-100/90 text-base md:text-lg leading-relaxed text-center mt-2">
                    {hex.conseil}
                  </p>
                  {hex.synthese && (
                    <div className="mt-5 flex justify-center">
                      <button
                        onClick={() => setShowSynthese(true)}
                        className="px-6 py-2.5 rounded-full border border-purple-500/50 bg-purple-500/10 text-purple-300/90 text-sm tracking-wider hover:bg-purple-500/20 hover:border-purple-400/70 transition-all duration-300 shadow-[0_0_20px_rgba(180,140,200),0.15)] hover:shadow-[0_0_30px_rgba(180,140,200),0.3)]"
                      >
                        En savoir plus
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Pied */}
              <div className="mt-8 pt-4 border-t border-purple-900/20 text-center">
                <p className="text-purple-300/70 text-[10px] tracking-[0.2em]">
                  Yi Jing &bull; Livre des transformations
                </p>
              </div>
            </div>

            {/* Bouton Tirage personnel (implémenté plus tard) */}
            <div className="mt-10 flex justify-center">
              <button
                disabled
                title="Bientôt disponible"
                className="px-8 py-3.5 rounded-full border border-purple-800/30 bg-purple-950/20 text-purple-500/60 text-sm md:text-base tracking-[0.2em] uppercase cursor-not-allowed opacity-60"
              >
                Tirage personnel pour cette période
              </button>
            </div>

            {/* Legende */}
            <div className="mt-6 flex justify-center gap-8 text-xs text-purple-300/70">
              <div className="flex items-center gap-2">
                <div className="w-8 h-[3px] rounded-full bg-gradient-to-r from-purple-400 to-fuchsia-300 shadow-[0_0_6px_rgba(180,140,200),0.3)]" />
                <span>Yang &bull; Plein</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-3 h-[3px] rounded-full bg-purple-700/40" />
                  <div className="w-3 h-[3px] rounded-full bg-purple-700/40" />
                </div>
                <span>Yin &bull; Ouvert</span>
              </div>
            </div>
          </div>
        )}

        {/* ─── Layer Synthèse (modal mystique) ─── */}
        {showSynthese && hex?.synthese && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setShowSynthese(false)}
          >
            {/* Fond assombri */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            {/* Carte */}
            <div
              className="relative max-w-lg w-full rounded-2xl border border-purple-600/40 bg-gradient-to-b from-[#1a1230]/95 via-[#120a26]/95 to-[#0d0820]/95 p-8 md:p-10 shadow-[0_0_80px_rgba(180,140,200),0.18)] animate-rise-up"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Coins decoratifs */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-purple-700/30 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-purple-700/30 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-purple-700/30 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-purple-700/30 rounded-br-xl" />

              <p className="text-purple-500/60 text-[11px] uppercase tracking-[0.3em] text-center mb-3">
                &bull; Synthèse de la période &bull;
              </p>
              <p className="text-4xl text-purple-300/90 text-center mb-6 title-glow">
                {hex.caractere}
              </p>
              <p className="text-purple-100/90 text-base md:text-lg leading-relaxed italic text-center">
                &ldquo;{hex.synthese}&rdquo;
              </p>

              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => setShowSynthese(false)}
                  className="px-8 py-2.5 rounded-full border border-purple-600/50 bg-purple-500/10 text-purple-300/90 text-sm tracking-wider hover:bg-purple-500/20 transition-all duration-300"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        html, body {
          overflow: auto !important;
          height: auto !important;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes rise-up {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes sparkle-float {
          0%   { opacity: 0; transform: translateY(0) scale(0); }
          20%  { opacity: 0.6; }
          100% { opacity: 0; transform: translateY(-90vh) scale(1); }
        }
        @keyframes pulse-glow {
          0%, 100% { filter: drop-shadow(0 0 20px rgba(180,140,200),0.15)); }
          50%      { filter: drop-shadow(0 0 40px rgba(180,140,200),0.30)); }
        }
        .animate-fade-in       { animation: fade-in 0.8s ease-out forwards; }
        .animate-rise-up       { animation: rise-up 1s ease-out forwards; }
        .animate-sparkle-float { animation: sparkle-float 6s linear infinite; }
        .animate-pulse-glow    { animation: pulse-glow 4s ease-in-out infinite; }
        .title-glow {
          text-shadow:
            0 0 20px rgba(180,140,200,0.2),
            0 0 40px rgba(140,100,180,0.1);
        }
      `}</style>
    </div>
  );
}