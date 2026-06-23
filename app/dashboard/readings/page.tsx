'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TAROT_CARDS } from '@/lib/tarot-data';

interface Reading {
  id: string;
  userId?: string;
  type: string;
  question?: string | null;
  spread: string;
  cards: any[];
  interpretation?: string | null;
  createdAt: string;
}

export default function ReadingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [openReading, setOpenReading] = useState<string | null>(null);
  const [openDates, setOpenDates] = useState<Set<string>>(new Set());
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('tarot_user');
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);
      fetch(`/api/readings?userId=${encodeURIComponent(u.email)}`)
        .then(res => res.json())
        .then((data: { readings: Reading[] }) => {
          const r = Array.isArray(data?.readings) ? data.readings : [];
          // Trier par date la plus récente en premier
          r.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setReadings(r);
          setLoading(false);
        })
        .catch(err => {
          console.error('Fetch readings error:', err);
          setFetchError('Impossible de charger les tirages');
          setLoading(false);
        });
    } else {
      router.push('/auth/login');
    }
  }, [router]);

  // Grouper les tirages par date
  const groupedByDate = useMemo(() => {
    const groups: { dateKey: string; dateLabel: string; readings: Reading[] }[] = [];
    const map = new Map<string, Reading[]>();

    readings.forEach((r) => {
      const d = new Date(r.createdAt);
      const dateKey = d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        timeZone: 'Europe/Paris',
      });
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(r);
    });

    // Les readings sont déjà triés par date décroissante
    map.forEach((reads, dateKey) => {
      groups.push({ dateKey, dateLabel: dateKey, readings: reads });
    });

    return groups;
  }, [readings]);

  // Ouvrir automatiquement la première date au chargement (une seule fois)
  useEffect(() => {
    if (groupedByDate.length > 0 && !hasInitialized) {
      setOpenDates(new Set([groupedByDate[0].dateKey]));
      setHasInitialized(true);
    }
  }, [groupedByDate, hasInitialized]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-amber-950/20 to-gray-950 flex items-center justify-center p-4">
        <p className="text-amber-300 animate-pulse text-lg">Chargement de l'historique...</p>
      </div>
    );
  }
  if (!user) return null;

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Paris',
      });
    } catch {
      return '';
    }
  };

  // Détecter le type de tirage
  const isYiQing = (r: Reading) => {
    const t = (r.type || '').toLowerCase().replace(/[_-]/g, '');
    return t === 'yiqing';
  };

  // Parser l'interprétation Tarot 3 cartes (Passé/Présent/Avenir)
  const parseTarot3Interpretation = (raw: string) => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.carte1 || parsed.carte2 || parsed.carte3) return { kind: 'tarot3' as const, data: parsed };
    } catch (e) {}
    return { kind: 'tarot3' as const, data: { carte1: raw } };
  };

  // Parser l'interprétation Tarot 5 cartes (Croix)
  const parseTarot5Interpretation = (raw: string) => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.situation || parsed.defis || parsed.soutien || parsed.issue || parsed.conseil) {
        return { kind: 'tarot5' as const, data: parsed };
      }
    } catch (e) {}
    return null;
  };

  // Parser l'interprétation Yi Jing
  const parseYiQingInterpretation = (raw: string) => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.meditation || parsed.conseil || parsed.attitude) return parsed;
    } catch (e) {}
    return null;
  };

  // Positions pour le tarot 3 cartes
  const tarot3Positions = [
    { key: 'carte1', position: 'past', icon: '🕰️', name: 'Passé', titleColor: 'text-blue-300', cardColor: 'bg-blue-950/20 border-blue-800/30' },
    { key: 'carte2', position: 'present', icon: '⚔️', name: 'Présent', titleColor: 'text-amber-300', cardColor: 'bg-amber-950/20 border-amber-800/30' },
    { key: 'carte3', position: 'future', icon: '💫', name: 'Avenir', titleColor: 'text-green-300', cardColor: 'bg-green-950/20 border-green-800/30' },
  ];

  // 5 positions pour le tirage en croix
  const tarot5Positions = [
    { key: 'situation', icon: '⬆️', name: 'Le Sommet', titleColor: 'text-yellow-300', cardColor: 'bg-yellow-950/20 border-yellow-700/40' },
    { key: 'defis',     icon: '👈', name: "L'Orient",  titleColor: 'text-red-300',    cardColor: 'bg-red-950/20 border-red-800/40' },
    { key: 'soutien',   icon: '🎯', name: 'La Synthèse', titleColor: 'text-purple-300', cardColor: 'bg-purple-950/20 border-purple-800/40' },
    { key: 'issue',     icon: '👉', name: "L'Occident", titleColor: 'text-orange-300', cardColor: 'bg-orange-950/20 border-orange-800/40' },
    { key: 'conseil',   icon: '⬇️', name: 'La Base',     titleColor: 'text-cyan-300',    cardColor: 'bg-cyan-950/20 border-cyan-800/40' },
  ];

  // Détecter le type de tarot d'un reading (3 ou 5)
  const detectTarotType = (r: Reading): 'tarot3' | 'tarot5' | null => {
    const is5 = parseTarot5Interpretation(r.interpretation || '');
    if (is5) return 'tarot5';
    const is3 = parseTarot3Interpretation(r.interpretation || '');
    if (is3) return 'tarot3';
    return null;
  };

  const toggleReading = (id: string) => {
    setOpenReading(openReading === id ? null : id);
  };

  const toggleDate = (dateKey: string) => {
    setOpenDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };

  // Icône et label selon le type
  const getTypeDisplay = (r: Reading) => {
    if (isYiQing(r)) {
      return { icon: '☯', label: 'Yi Jing', color: 'text-purple-300', bg: 'bg-purple-900/30', border: 'border-purple-700/40' };
    }
    return { icon: '🎴', label: 'Tarot', color: 'text-amber-300', bg: 'bg-amber-900/30', border: 'border-amber-700/40' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-amber-950/20 to-gray-950 p-4 relative">
      {/* Croix en haut à droite */}
      <Link
        href="/"
        className="fixed top-4 right-4 text-amber-400 text-3xl font-bold hover:text-amber-300 transition-colors z-50 leading-none"
        aria-label="Retour à l'accueil"
        style={{ textShadow: '0 0 12px rgba(251, 191, 36, 0.3)' }}
      >
        ×
      </Link>

      <div className="max-w-2xl mx-auto pt-2">
        <h1 className="text-2xl font-bold text-amber-300 mb-8 text-center" style={{ fontFamily: 'var(--font-cinzel), serif' }}>
          ✨ Vos tirages précédents
        </h1>

        {fetchError && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 mb-4">
            <p className="text-red-300 text-sm">{fetchError}</p>
          </div>
        )}

        {readings.length === 0 ? (
          <div className="bg-gray-900/60 border border-amber-800/30 rounded-lg p-8 text-center">
            <p className="text-amber-200/60 text-sm mb-2">Aucun tirage pour le moment.</p>
            <p className="text-gray-500 text-xs mb-4">Vos tirages Tarot et Yi Jing apparaîtront ici.</p>
            <div className="flex gap-3 justify-center">
              <Link href="/tarot" className="inline-block px-4 py-2 bg-amber-600/30 rounded text-amber-300 text-sm hover:bg-amber-600/50 transition-colors">
                🎴 Faire un tirage Tarot
              </Link>
              <Link href="/yi-jing" className="inline-block px-4 py-2 bg-purple-600/30 rounded text-purple-300 text-sm hover:bg-purple-600/50 transition-colors">
                ☯ Tirer Yi Jing
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-5 max-h-[78vh] overflow-y-auto pr-1">
            {groupedByDate.map((group) => {
              const isOpen = openDates.has(group.dateKey);
              const tarotCount = group.readings.filter(r => !isYiQing(r)).length;
              const yiQingCount = group.readings.filter(r => isYiQing(r)).length;

              return (
                <div key={group.dateKey}>
                  {/* En-tête de date */}
                  <button
                    onClick={() => toggleDate(group.dateKey)}
                    className="w-full flex items-center justify-between bg-gray-900/60 border border-amber-800/30 rounded-lg px-4 py-3 hover:bg-gray-800/50 transition-colors mb-2"
                  >
                    <span className="text-amber-200 font-semibold text-sm flex items-center gap-2">
                      <span className={`text-xs transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}>
                        ▶
                      </span>
                      📅 {group.dateLabel}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs">
                      {tarotCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-amber-900/40 text-amber-300 rounded-full">
                          🎴 {tarotCount}
                        </span>
                      )}
                      {yiQingCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-purple-900/40 text-purple-300 rounded-full">
                          ☯ {yiQingCount}
                        </span>
                      )}
                    </span>
                  </button>

                  {/* Tirages de cette date */}
                  {isOpen && (
                    <div className="space-y-2 pl-2 transition-all duration-300">
                      {group.readings.map((r) => {
                        const typeDisp = getTypeDisplay(r);
                        const yiQing = isYiQing(r);
                        const yiQingInterp = yiQing ? parseYiQingInterpretation(r.interpretation || '') : null;
                        // Note: tarot5/tarot3 parsers sont utilisés inline dans le rendu ci-dessous
                        const _unused = null;

                        return (
                          <div
                            key={r.id}
                            className={`bg-gray-900/80 border ${typeDisp.border} rounded-lg overflow-hidden shadow-lg`}
                          >
                            {/* En-tête du tirage */}
                            <button
                              onClick={() => toggleReading(r.id)}
                              className="w-full p-3 text-left hover:bg-gray-800/50 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-sm font-medium flex items-center gap-2 ${typeDisp.color}`}>
                                  <span className="text-base">{typeDisp.icon}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-xs ${typeDisp.bg}`}>
                                    {typeDisp.label}
                                  </span>
                                </span>
                                <span className="text-gray-400 text-xs">🕐 {formatTime(r.createdAt)}</span>
                              </div>
                            </button>

                            {/* Contenu détaillé */}
                            {openReading === r.id && (
                              <div className="px-4 pb-4 border-t border-amber-800/20 max-h-96 overflow-y-auto">

                                {/* === RENDU YI JING === */}
                                {yiQing && (
                                  <div className="mt-4 space-y-4">
                                    {/* Titre de l'hexagramme */}
                                    {r.cards && Array.isArray(r.cards) && r.cards.length > 0 && (
                                      <div className="text-center">
                                        <h3 className="text-xl font-serif text-purple-300 mb-1">
                                          {r.cards[0]?.name || r.cards[0]?.name?.name || `Hexagramme`}
                                        </h3>
                                        {r.cards[0]?.id && (
                                          <p className="text-purple-400/60 text-xs">Hexagramme n°{r.cards[0].id}</p>
                                        )}
                                      </div>
                                    )}

                                    {/* Méditation */}
                                    {yiQingInterp?.meditation && (
                                      <div className="bg-purple-950/20 border border-purple-800/30 rounded-lg p-3">
                                        <h4 className="text-purple-300 font-semibold text-sm mb-2 flex items-center gap-2">
                                          <span>🧘</span> Méditation
                                        </h4>
                                        <p className="text-gray-200 text-sm leading-relaxed">
                                          {yiQingInterp.meditation}
                                        </p>
                                      </div>
                                    )}

                                    {/* Conseil */}
                                    {yiQingInterp?.conseil && (
                                      <div className="bg-amber-950/20 border border-amber-800/30 rounded-lg p-3">
                                        <h4 className="text-amber-300 font-semibold text-sm mb-2 flex items-center gap-2">
                                          <span>💡</span> Conseil
                                        </h4>
                                        <p className="text-gray-200 text-sm leading-relaxed">
                                          {yiQingInterp.conseil}
                                        </p>
                                      </div>
                                    )}

                                    {/* Attitude */}
                                    {yiQingInterp?.attitude && (
                                      <div className="bg-green-950/20 border border-green-800/30 rounded-lg p-3">
                                        <h4 className="text-green-300 font-semibold text-sm mb-2 flex items-center gap-2">
                                          <span>🌿</span> Attitude
                                        </h4>
                                        <p className="text-gray-200 text-sm leading-relaxed">
                                          {yiQingInterp.attitude}
                                        </p>
                                      </div>
                                    )}

                                    {/* Fallback si pas d'interprétation parsée */}
                                    {!yiQingInterp && r.interpretation && (
                                      <div className="bg-gray-800/40 rounded-lg p-3">
                                        <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                                          {r.interpretation}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* === RENDU TAROT 5 CARTES (CROIX) === */}
                                {!yiQing && (() => {
                                  const tarot5 = parseTarot5Interpretation(r.interpretation || '');
                                  if (tarot5 && Array.isArray(r.cards) && r.cards.length >= 5) {
                                    return (
                                      <div className="mt-4 space-y-3">
                                        {/* Section question si présente */}
                                        {r.question && (
                                          <div className="bg-amber-950/15 border border-amber-700/30 rounded-lg p-3 text-center">
                                            <p className="text-amber-500/70 text-[10px] uppercase tracking-wide mb-1">Votre question</p>
                                            <p className="text-amber-200 italic text-sm">"{r.question}"</p>
                                          </div>
                                        )}

                                        {/* 5 sections en couleurs */}
                                        {tarot5Positions.map((pos, idx) => {
                                          const card = r.cards[idx];
                                          if (!card) return null;
                                          const cardData = TAROT_CARDS.find(t => t.id === card.id);
                                          const cardName = cardData?.name || card.name?.name || card.name || `Carte ${idx + 1}`;
                                          const text = tarot5.data[pos.key as keyof typeof tarot5.data] as string | undefined;
                                          if (!text) return null;
                                          return (
                                            <div
                                              key={pos.key}
                                              className={`${pos.cardColor} border rounded-lg p-3 shadow-sm`}
                                            >
                                              <h4 className={`${pos.titleColor} font-semibold text-sm mb-2 flex items-center gap-2`}>
                                                <span className="text-base">{pos.icon}</span>
                                                <span>{pos.name}</span>
                                                <span className="text-gray-500">—</span>
                                                <span className="text-gray-100 font-serif italic">{cardName}</span>
                                              </h4>
                                              <p className="text-gray-200 text-sm leading-relaxed">
                                                {text}
                                              </p>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}

                                {/* === RENDU TAROT 3 CARTES === */}
                                {!yiQing && (() => {
                                  // Ne s'affiche que si on a pas déjà affiché le tarot 5 cartes
                                  const tarot5 = parseTarot5Interpretation(r.interpretation || '');
                                  if (tarot5) return null;
                                  if (!r.cards || !Array.isArray(r.cards) || r.cards.length === 0) return null;

                                  const tarot3 = parseTarot3Interpretation(r.interpretation || '');
                                  const interpData = tarot3?.data;

                                  return (
                                    <div className="mt-4 space-y-3">
                                      {r.question && (
                                        <div className="bg-amber-950/15 border border-amber-700/30 rounded-lg p-3 text-center">
                                          <p className="text-amber-500/70 text-[10px] uppercase tracking-wide mb-1">Votre question</p>
                                          <p className="text-amber-200 italic text-sm">"{r.question}"</p>
                                        </div>
                                      )}

                                      {r.cards.map((c: any, idx: number) => {
                                        if (idx >= 3) return null;
                                        const pos = tarot3Positions[idx];
                                        const cardData = TAROT_CARDS.find(t => t.id === c.id);
                                        const cardName = cardData?.name || c.name?.name || c.name || `Carte ${idx + 1}`;
                                        const interpText = interpData?.[pos.key as keyof typeof interpData] as string | undefined;
                                        return (
                                          <div
                                            key={idx}
                                            className={`${pos.cardColor} border rounded-lg p-3 shadow-sm`}
                                          >
                                            <h4 className={`${pos.titleColor} font-semibold text-sm mb-2 flex items-center gap-2`}>
                                              <span className="text-base">{pos.icon}</span>
                                              <span>{pos.name}</span>
                                              <span className="text-gray-500">—</span>
                                              <span className="text-gray-100 font-serif italic">{cardName}</span>
                                              {c.reversed && <em className="text-amber-400 text-xs">(renversée)</em>}
                                            </h4>
                                            {interpText && (
                                              <p className="text-gray-200 text-sm leading-relaxed">
                                                {interpText}
                                              </p>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}

                                {/* Question seule si pas d'affichage spécifique (Yi Jing) */}
                                {!yiQing && !r.interpretation && r.question && (
                                  <p className="text-gray-400 text-xs italic mt-3">"{r.question}"</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
