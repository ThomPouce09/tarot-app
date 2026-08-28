'use client';

import { Fragment, Suspense, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import YiSlideNav from '@/components/yi-slide-nav';
import { usePathname, useSearchParams } from 'next/navigation';
import WaitOverlay from '@/components/wait-overlay';
import { useLang, useT } from '@/lib/i18n';
import { getHexagramTrigrams } from '@/lib/yijing-data';
import { TAROT_CARDS } from '@/lib/tarot-data';
import { IconSituation, IconDefis, IconSoutien, IconIssue, IconConseil, IconResume } from '@/components/yi-icons';
import { api } from '@/lib/api-client';

interface Interpretation {
  situation?: string;
  defis?: string;
  soutien?: string;
  issue?: string;
  conseil?: string;
  introduction?: string;
  situationYiJing?: string;
  action?: string;
  conseilYiJing?: string;
  resume?: string;
  numero?: number;
  nom?: string;
  meditation?: string;
  attitude?: string;
  [key: string]: string | number | undefined;
}

function InterpretationInner() {
  const searchParams = useSearchParams();
  const pathname = usePathname(); // e.g., /interpret/tarot-3-cartes
  const lang = useLang();
  const t = useT();

  const [interpretation, setInterpretation] = useState<Interpretation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hexagram, setHexagram] = useState<{
    numero: number;
    name?: string;
    frenchName?: string;
    name_en?: string;
    glyph?: string;
    ideogram?: string;
    pinyin?: string;
    trigramSuperior?: string;
    trigramInferior?: string;
    semanticEssence?: string;
    synthese?: string;
    synthese_en?: string;
  } | null>(null);
  const doneRef = useRef<string | null>(null);
  // Vidéo de chargement Yi Jing : prioritaire, doit jouer en entier avant le relais
  const [videoEnded, setVideoEnded] = useState(false);
  const MIN_VIDEO_MS = 3500;

  // Extract type from pathname: /interpret/tarot-3-cartes -> tarot-3-cartes
  const type = pathname.split('/')[2] || '';

  useEffect(() => {
    if (!type) {
      setError('Type d\'interprétation manquant');
      setLoading(false);
      return;
    }

    // Guard idempotent : searchParams change de référence à chaque render
    // -> sans ça, le effect re-fire et sauvegarde le tirage 2× (doublon).
    const sig = type + '|' + searchParams.toString();
    if (doneRef.current === sig) return;
    doneRef.current = sig;

    const question = searchParams.get('question');
    const userId = searchParams.get('userId');
    const baguette = searchParams.get('baguette');

    // Récupère l'hexagramme correspondant à la baguette tirée (Yi Jing)
    if (baguette && (type.startsWith('yi-jing') || type === 'yi-qing')) {
      const num = parseInt(baguette, 10);
      if (!isNaN(num)) {
        api(`/api/hexagram/${num}`)
          .then((r) => r.json())
          .then((d) => { if (d.found) setHexagram(d.hexagram); })
          .catch(() => {});
      }
    }

    // Determine payload based on type
    const isTarot = type.startsWith('tarot');
    const isYiJing = type.startsWith('yi-jing') || type === 'yi-qing';

    let payload: any = {
      type,
      question: question || undefined,
      userId: userId || undefined,
      lang,
    };

    if (isTarot) {
      const cartes = searchParams.get('cartes');
      if (!cartes) {
        setError('Données de tirage manquantes (cartes)');
        setLoading(false);
        return;
      }
      // Parse cartes from string "1,2,3" to number[]
      let cardIds: number[] = [];
      try {
        cardIds = cartes.split(',').map(Number);
        if (cardIds.some(isNaN)) throw new Error('Invalid card IDs');
      } catch (e) {
        setError('Format des cartes invalide');
        setLoading(false);
        return;
      }
      payload.cartes = cardIds;
    } else if (isYiJing) {
      const baguette = searchParams.get('baguette');
      if (!baguette) {
        setError('Données de tirage manquantes (baguette)');
        setLoading(false);
        return;
      }
      const baguetteNum = parseInt(baguette, 10);
      if (isNaN(baguetteNum)) {
        setError('Format de la baguette invalide');
        setLoading(false);
        return;
      }
      payload.baguette = baguetteNum;
    } else {
      setError('Type d\'interprétation non supporté');
      setLoading(false);
      return;
    }

    api('/api/interpret', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
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
  }, [type, searchParams]);

  if (loading || !videoEnded) {
    // ready = l'interprétation est arrivée → l'overlay peut enchaîner vers la
    // sortie (les vidéos bouclent en attendant).
    return <WaitOverlay type={type} ready={!loading} onVideoEnded={() => setVideoEnded(true)} />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <p className="text-red-400 text-lg">{error}</p>
      </div>
    );
  }

  if (!interpretation) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <p className="text-gray-400">{t('interpret.noInterpretation')}</p>
      </div>
    );
  }

  // Determine if it's Tarot or Yi Jing based on type prefix
  const isTarot = type.startsWith('tarot');
  const isYiJing = type.startsWith('yi-jing') || type === 'yi-qing';
  // Titres d'interprétation : Allura (script féerique) pour le Tarot,
  // Hoshiko Satsuki (calligraphie) pour le Yi Jing.
  const titleFont = isTarot ? "'Allura', cursive" : "'Hoshiko Satsuki', serif";
  const trigs = hexagram ? getHexagramTrigrams(hexagram.numero, lang) : { superior: null, inferior: null };
  // Cartes tirées (Tarot) : id + nom + position, pour le récap visuel en haut de page
  const tarotCards = isTarot
    ? (searchParams.get('cartes') || '')
        .split(',')
        .map((s) => parseInt(s, 10))
        .filter((n) => !isNaN(n))
        .map((id, i) => ({
          id,
          name: TAROT_CARDS.find((c) => c.id === id)?.name || `Carte ${id}`,
          position: i === 0 ? 'Présent' : i === 1 ? 'Passé' : 'Avenir',
        }))
    : [];

  // Sections d'analyse (Tarot 3 cartes : Passé/Présent/Avenir ; sinon situation/défis/...)
  const isTarot3 = isTarot && type === 'tarot-3-cartes';
  const sections: { label: string; value?: string | number; Icon?: React.ComponentType<{ className?: string }> }[] = isTarot3
    ? [
        { label: 'Passé', value: interpretation.passe },
        { label: 'Présent', value: interpretation.present },
        { label: 'Avenir', value: interpretation.avenir },
      ]
    : [
        { label: t('interpret.situation'), value: interpretation.situation, Icon: IconSituation },
        { label: t('interpret.defis'), value: interpretation.defis, Icon: IconDefis },
        { label: t('interpret.soutien'), value: interpretation.soutien, Icon: IconSoutien },
        { label: t('interpret.issue'), value: interpretation.issue, Icon: IconIssue },
        { label: t('interpret.conseil'), value: interpretation.conseil, Icon: IconConseil },
      ];

  return (
    <div
      className="fixed inset-0 bg-black flex flex-col items-center p-4 overflow-y-auto"
      style={{
        backgroundImage: 'url(/backgrounds/interpret-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Voile sombre pour la lisibilité du texte */}
      <div className="pointer-events-none fixed inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} />
      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <YiSlideNav />
        {/* En-tête : titre seul (le menu tiroir remplace la croix) */}
        <div className="w-full max-w-md flex items-center justify-between mt-4 mb-6">
          <h1 className="text-3xl text-yellow-400" style={{ fontFamily: titleFont }}>
            {isTarot ? t('interpret.titleTarot') : t('interpret.yijingSpoke')}
        </h1>
      </div>

      {/* Votre tirage — cartes tirées (miniatures) en haut de page */}
      {isTarot && tarotCards.length > 0 && (
        <div className="w-full max-w-md mb-2">
          <p className="text-yellow-500/80 text-xs uppercase tracking-[0.18em] mb-3 text-center">Votre tirage</p>
          <div className="flex justify-center items-end gap-3">
            {tarotCards.map((c, i) => (
              <div key={c.id} className="flex flex-col items-center gap-1.5 w-1/3 max-w-[110px]">
                <div className="relative rounded-lg overflow-hidden border border-yellow-500/40 shadow-[0_0_14px_rgba(255,200,90,0.35)] bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/cards/arcana/${c.id}.jpg`}
                    alt={c.name}
                    className="w-full h-auto block"
                    style={{ aspectRatio: '764 / 1286' }}
                  />
                </div>
                <span className="text-yellow-300 text-xs font-semibold tracking-wide">{c.position}</span>
                <span className="text-yellow-100/90 text-[11px] leading-tight text-center line-clamp-2">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="w-full max-w-md text-left space-y-5">
          <>

            {/* Récap baguette élue — Yi Jing simple + question */}
            {(type === 'yi-jing-simple' || type === 'yi-jing-question') && hexagram && (
              <div className="p-6 rounded-2xl border border-yellow-500/30 bg-yellow-900/10 backdrop-blur-sm">
                <div className="flex items-center gap-5">
                  {hexagram.glyph && (
                    <span className="shrink-0 text-6xl leading-none text-yellow-400 drop-shadow-[0_0_10px_rgba(255,215,0,0.35)]" style={{ fontFamily: "'Hoshiko Satsuki', serif" }}>
                      {hexagram.glyph}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-yellow-200 text-sm font-semibold tracking-wide mb-1">
                      {t('interpret.baguette')} : {String(hexagram.numero).padStart(2, '0')}
                    </p>
                    <p className="text-yellow-400 font-semibold text-2xl leading-tight" style={{ fontFamily: "'Hoshiko Satsuki', serif", textTransform: 'capitalize' }}>
                      {lang === 'en' ? (hexagram.name_en || hexagram.frenchName || hexagram.name || 'Hexagram') : (hexagram.frenchName || hexagram.name || 'Hexagramme')}
                    </p>
                    {hexagram.pinyin && (
                      <p className="text-yellow-400/90 text-sm italic mt-0.5">
                        {hexagram.pinyin}
                      </p>
                    )}
                  </div>
                </div>

                {/* Traduction : les 2 trigrammes réels (supérieur / inférieur) */}
                {(trigs.superior || trigs.inferior) && (
                  <div className="mt-5 pt-4 border-t border-yellow-500/15">
                    <p className="text-yellow-500/80 text-xs uppercase tracking-[0.18em] mb-3">Traduction</p>
                    <div className="flex flex-col gap-3">
                      {trigs.superior && (
                        <div className="flex items-start gap-3">
                          <span className="shrink-0 text-4xl leading-none text-yellow-300 drop-shadow-[0_0_8px_rgba(255,215,0,0.3)]">
                            {trigs.superior.symbol}
                          </span>
                          <div>
                            <p className="text-yellow-100 font-medium text-sm">
                              {trigs.superior.name} <span className="text-yellow-500/60">(supérieur)</span>
                            </p>
                            <p className="text-gray-300 text-xs">{trigs.superior.meaning}</p>
                          </div>
                        </div>
                      )}
                      {trigs.inferior && (
                        <div className="flex items-start gap-3">
                          <span className="shrink-0 text-4xl leading-none text-yellow-300 drop-shadow-[0_0_8px_rgba(255,215,0,0.3)]">
                            {trigs.inferior.symbol}
                          </span>
                          <div>
                            <p className="text-yellow-100 font-medium text-sm">
                              {trigs.inferior.name} <span className="text-yellow-500/60">(inférieur)</span>
                            </p>
                            <p className="text-gray-300 text-xs">{trigs.inferior.meaning}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Synthèse de l'hexagramme — police réduite sur mobile */}
                {(lang === 'en' ? hexagram.synthese_en : hexagram.synthese) && (
                  <p className="mt-5 pt-4 border-t border-yellow-500/15 text-gray-300/90 text-xs sm:text-sm leading-relaxed" style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'italic' }}>
                    {lang === 'en' ? (hexagram.synthese_en || hexagram.synthese) : hexagram.synthese}
                  </p>
                )}
              </div>
            )}

            {/* Analyse détaillée — Tarot 3 cartes : Passé/Présent/Avenir ; sinon situation/défis/... */}
            {sections.filter((s) => s.value).map((section, idx, arr) => (
              <Fragment key={section.label}>
                <div className="p-5 rounded-2xl border border-yellow-500/20 bg-white/[0.03] backdrop-blur-sm">
                  <h2 className="text-yellow-500 font-semibold text-lg tracking-wide mb-2 flex items-center gap-2.5" style={{ fontFamily: titleFont, textTransform: 'capitalize' }}>
                    {section.Icon && <section.Icon className="w-[22px] h-[22px] text-yellow-400/90 shrink-0" />}
                    {section.label}
                  </h2>
                  <p className="text-gray-200 leading-relaxed text-[15px]">{section.value}</p>
                </div>
                {isTarot3 && idx < arr.length - 1 && (
                  <div className="flex items-center justify-center py-1" aria-hidden>
                    <div className="h-px w-2/3 bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent" />
                    <span className="mx-2 text-yellow-400/70 text-lg leading-none">→</span>
                    <div className="h-px w-2/3 bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent" />
                  </div>
                )}
              </Fragment>
            ))}

            {/* ✶ Résumé du tirage — en fin (synthèse globale) */}
            {interpretation.resume && (
              <div className="relative p-6 rounded-2xl border border-yellow-400/40 bg-gradient-to-b from-yellow-900/25 to-black/50 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-3">
                  <IconResume className="w-5 h-5 text-yellow-400 shrink-0" />
                  <h3 className="text-yellow-300 font-serif text-xl tracking-wide" style={{ fontFamily: titleFont, textTransform: 'capitalize' }}>Résumé</h3>
                </div>
                <p className="text-gray-100 leading-relaxed italic text-[15px]">
                  {interpretation.resume}
                </p>
              </div>
            )}
          </>
        </div>
      </div>
      </div>
  );
}

export default function InterpretationPage() {
  return (
    <Suspense fallback={<WaitOverlay type="" />}>
      <InterpretationInner />
    </Suspense>
  );
}
